const { app, BrowserWindow, Tray, Menu, ipcMain, shell, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const RPC = require('discord-rpc');
const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const logger = require('./utils/logger');
const config = require('./config');
const { autoUpdater } = require('electron-updater');

const execAsync = util.promisify(exec);
const clientId = '1376009895677001798';
const startupDir = path.resolve(process.env.APPDATA, 'Microsoft/Windows/Start Menu/Programs/Startup');
// We will use the electron app itself for startup in the future, but for now let's reuse logic or use electron's setLoginItemSettings
// actually, electron has apis for this.

// --- GLOBAL STATE ---
let tray = null;
let dashboardWindow = null;
let settingsWindow = null;
let rpcClient = null;
let isConnectedToDiscord = false;
let lastFileFound = 'IDLE';
let animeCache = {};
let checkInterval = null;

// --- SINGLE INSTANCE LOCK ---
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        // Someone tried to run a second instance, we should focus our window.
        if (dashboardWindow) {
            dashboardWindow.show();
            dashboardWindow.focus();
        }
    });

    app.whenReady().then(() => {
        // Hide dock icon on macOS/Linux (not relevant for Windows but good practice)
        if (process.platform === 'darwin') app.dock.hide();

        // Setup IPC handlers
        setupIPC();

        // Initialize auto-updater
        initAutoUpdater();

        createTray();
        createDashboardWindow(); // Prepare window but keep hidden
        initDiscord();

        // Start Polling Loop
        const pollInterval = config.get('pollInterval');
        checkInterval = setInterval(updateActivity, pollInterval);
    });
}

// --- DASHBOARD WINDOW ---
function createDashboardWindow() {
    dashboardWindow = new BrowserWindow({
        width: 500,
        height: 220,
        show: false, // Start hidden
        frame: false, // Frameless
        resizable: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        backgroundColor: '#1a1b26',
        icon: path.join(__dirname, '../tray.ico')
    });

    dashboardWindow.loadFile(path.join(__dirname, 'dashboard/index.html'));

    // Hide instead of close on "close"
    dashboardWindow.on('close', (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            dashboardWindow.hide();
        }
    });

    // Handle losing focus (optional: auto-hide?)
    // dashboardWindow.on('blur', () => dashboardWindow.hide());
}

// --- SYSTEM TRAY ---
function createTray() {
    const iconPath = path.join(__dirname, '../tray.ico');
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon);
    tray.setToolTip('PotPlayer RPC');

    updateTrayMenu();

    tray.on('click', () => {
        toggleDashboard();
    });
}

function updateTrayMenu() {
    // Icons (using Emoji for now as reliable fallback, or could use nativeImage resize)
    const contextMenu = Menu.buildFromTemplate([
        { label: '  PotPlayer RPC', enabled: false },
        { label: isConnectedToDiscord ? '◉  Monitorando' : '⊗  Desconectado', enabled: false },
        { type: 'separator' },
        {
            label: '📊  Painel Visual',
            click: () => toggleDashboard()
        },
        {
            label: '⚙️  Configurações',
            click: () => openSettings()
        },
        { type: 'separator' },
        {
            label: '🚀  Iniciar com Windows',
            type: 'checkbox',
            checked: app.getLoginItemSettings().openAtLogin,
            click: () => toggleStartup()
        },
        { type: 'separator' },
        {
            label: '✕  Encerrar Aplicação',
            click: () => {
                app.isQuiting = true;
                app.quit();
            }
        }
    ]);
    tray.setContextMenu(contextMenu);
}

function toggleDashboard() {
    if (dashboardWindow.isVisible()) {
        dashboardWindow.hide();
    } else {
        // Position window near tray? Or center? 
        // Let's center for now, user requested "wallpaper engine" style so maybe center is better.
        // Or get tray position:
        // const trayBounds = tray.getBounds();
        // dashboardWindow.setPosition(...)

        // Center on primary display
        dashboardWindow.center();
        dashboardWindow.show();
        dashboardWindow.focus();
    }
}

function toggleStartup() {
    const settings = app.getLoginItemSettings();
    app.setLoginItemSettings({
        openAtLogin: !settings.openAtLogin,
        path: process.execPath
    });
    // Wait a tick for settings to apply
    setTimeout(updateTrayMenu, 100);
}

function openSettings() {
    if (settingsWindow) {
        settingsWindow.focus();
        return;
    }

    settingsWindow = new BrowserWindow({
        width: 550,
        height: 500,
        show: true,
        frame: false,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        backgroundColor: '#1a1b26',
        icon: path.join(__dirname, '../tray.ico')
    });

    settingsWindow.loadFile(path.join(__dirname, 'settings/index.html'));

    settingsWindow.on('closed', () => {
        settingsWindow = null;
    });
}

function setupIPC() {
    // Get current settings
    ipcMain.handle('get-settings', () => {
        return {
            pollInterval: config.get('pollInterval'),
            theme: config.get('theme'),
            enableNotifications: config.get('enableNotifications')
        };
    });

    // Save settings
    ipcMain.handle('save-settings', (event, settings) => {
        config.set('pollInterval', settings.pollInterval);
        config.set('theme', settings.theme);
        config.set('enableNotifications', settings.enableNotifications);

        // Restart polling with new interval
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = setInterval(updateActivity, settings.pollInterval);
        }

        logger.info('Settings updated', settings);
    });

    // Reset to defaults
    ipcMain.handle('reset-settings', () => {
        config.clear();
        return {
            pollInterval: config.get('pollInterval'),
            theme: config.get('theme'),
            enableNotifications: config.get('enableNotifications')
        };
    });
}

function initAutoUpdater() {
    // Configure updater
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Check for updates on startup (after 3 seconds delay)
    setTimeout(() => {
        autoUpdater.checkForUpdates();
    }, 3000);

    // Update available
    autoUpdater.on('update-available', (info) => {
        logger.info('Update available', { version: info.version });

        dialog.showMessageBox({
            type: 'info',
            title: 'Atualização Disponível',
            message: `Nova versão ${info.version} disponível!`,
            detail: 'Deseja baixar agora?',
            buttons: ['Sim', 'Mais Tarde'],
            defaultId: 0,
            cancelId: 1
        }).then((result) => {
            if (result.response === 0) {
                autoUpdater.downloadUpdate();
            }
        });
    });

    // Update not available
    autoUpdater.on('update-not-available', () => {
        logger.info('App is up to date');
    });

    // Download progress
    autoUpdater.on('download-progress', (progress) => {
        logger.info('Download progress', { percent: progress.percent.toFixed(2) });
    });

    // Update downloaded
    autoUpdater.on('update-downloaded', (info) => {
        logger.info('Update downloaded', { version: info.version });

        dialog.showMessageBox({
            type: 'info',
            title: 'Atualização Pronta',
            message: 'A atualização foi baixada.',
            detail: 'O aplicativo será reiniciado para instalar.',
            buttons: ['Reiniciar Agora', 'Reiniciar Depois'],
            defaultId: 0,
            cancelId: 1
        }).then((result) => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall(false, true);
            }
        });
    });

    // Error
    autoUpdater.on('error', (err) => {
        logger.error('Auto-updater error', { error: err.message });
    });
}


// --- DISCORD & POTPLAYER LOGIC ---

async function initDiscord() {
    rpcClient = new RPC.Client({ transport: 'ipc' });

    rpcClient.on('ready', () => {
        logger.info(`Discord RPC connected: ${rpcClient.user.username}`);
        isConnectedToDiscord = true;
        updateTrayMenu();
        updateActivity();
    });

    rpcClient.on('disconnected', () => {
        logger.warn('Discord RPC disconnected');
        isConnectedToDiscord = false;
        updateTrayMenu();
    });

    try {
        await rpcClient.login({ clientId });
        logger.info('Discord RPC login successful');
    } catch (e) {
        logger.error('Discord RPC login failed', { error: e.message, stack: e.stack });
        // Retry logic could go here
    }
}

// ... CleanTitle, FetchAnime, TimeToSeconds logic from previous index.js ...
function cleanTitle(rawTitle) {
    if (!rawTitle) return '';
    return rawTitle
        .replace(/PotPlayer/gi, '')
        .replace(/\[\d{2}:\d{2}:\d{2}\s\/\s\d{2}:\d{2}:\d{2}\]/, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/\.mp4|\.mkv|\.avi|\.mov/gi, '')
        .replace(/-\s*\d+\s*$/g, '')
        .replace(/ep\s*\d+/gi, '')
        .replace(/[\-|_]/g, ' ')
        .trim();
}

async function fetchAnimeData(query) {
    if (!query || query.length < 3) return null;
    if (animeCache[query]) return animeCache[query];
    try {
        const response = await axios.get(`https://api.jikan.moe/v4/anime`, {
            params: { q: query, limit: 1 }
        });
        if (response.data.data && response.data.data.length > 0) {
            const anime = response.data.data[0];
            const data = {
                title: anime.title,
                url: anime.url,
                image: anime.images.jpg.large_image_url
            };
            animeCache[query] = data;
            logger.debug(`Anime data cached: ${query}`);
            return data;
        }
    } catch (e) {
        logger.error('Jikan API request failed', { query, error: e.message });
    }
    return null;
}

function timeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
}

async function getPotPlayerTitle() {
    try {
        const { stdout } = await execAsync('powershell "Get-Process PotPlayerMini64 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty MainWindowTitle"');
        return stdout.trim();
    } catch (e) {
        // Process not found is expected when PotPlayer is closed
        logger.debug('PotPlayer process not found');
        return null;
    }
}

async function updateActivity() {
    // If not connected, try to reconnect occasionally? 
    if (!isConnectedToDiscord) {
        // logic to reconnect could go here
        return;
    }

    const windowTitle = await getPotPlayerTitle();

    // Prepare Data for Dashboard
    let dashboardData = {
        state: 'idle',
        title: 'Nenhuma Mídia',
        current: '--:--:--',
        total: '--:--:--',
        progress: 0,
        image: ''
    };

    if (!windowTitle || windowTitle === 'PotPlayer') {
        if (lastFileFound !== 'IDLE') {
            rpcClient.clearActivity().catch(() => { });
            lastFileFound = 'IDLE';
        }
        // Send Idle Data to Window
        if (dashboardWindow) dashboardWindow.webContents.send('update-status', dashboardData);
        return;
    }

    const cleaned = cleanTitle(windowTitle);
    const timeMatch = windowTitle.match(/\[(\d{2}:\d{2}:\d{2})\s\/\s(\d{2}:\d{2}:\d{2})\]/);
    let animeData = cleaned ? await fetchAnimeData(cleaned) : null;

    const activity = {
        details: animeData ? animeData.title : cleaned.substring(0, 128),
        state: 'Assistindo',
        largeImageKey: animeData ? animeData.image : 'potplayer_icon',
        largeImageText: animeData ? animeData.title : 'PotPlayer',
        instance: false,
    };

    if (animeData && animeData.url && animeData.url.startsWith('http')) {
        activity.buttons = [{ label: 'Ver no MyAnimeList', url: animeData.url }];
    }

    // Process Time
    let currentStr = '00:00:00';
    let totalStr = '00:00:00';
    let progress = 0;

    if (timeMatch) {
        const currentSeconds = timeToSeconds(timeMatch[1]);
        const totalSeconds = timeToSeconds(timeMatch[2]);
        const now = Date.now();
        activity.startTimestamp = now - (currentSeconds * 1000);
        activity.endTimestamp = activity.startTimestamp + (totalSeconds * 1000);

        currentStr = timeMatch[1];
        totalStr = timeMatch[2];
        if (totalSeconds > 0) {
            progress = (currentSeconds / totalSeconds) * 100;
        }
    }

    // Send RPC
    rpcClient.setActivity(activity).catch(() => { });

    // Update Dashboard
    dashboardData = {
        state: 'playing',
        title: animeData ? animeData.title : cleaned,
        current: currentStr,
        total: totalStr,
        progress: progress.toFixed(1),
        image: animeData ? animeData.image : ''
    };

    if (dashboardWindow) dashboardWindow.webContents.send('update-status', dashboardData);
    lastFileFound = dashboardData.title;
}
