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
const { parseAnimeEpisode } = require('./utils/episode-parser');
const { getPotPlayerData, secondsToTime } = require('./utils/potplayer-api');
const { getPotPlayerFile, getVideoDuration } = require('./utils/file-info');

const execAsync = util.promisify(exec);
const clientId = '1376009895677001798';
const startupDir = path.resolve(process.env.APPDATA, 'Microsoft/Windows/Start Menu/Programs/Startup');

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
        if (dashboardWindow) {
            dashboardWindow.show();
            dashboardWindow.focus();
        }
    });

    app.whenReady().then(() => {
        if (process.platform === 'darwin') app.dock.hide();

        const splash = createSplashScreen();
        setupIPC();
        createTray();
        createDashboardWindow();

        initDiscord().then(() => {
            const pollInterval = config.get('pollInterval');
            checkInterval = setInterval(updateActivity, pollInterval);

            setTimeout(() => {
                if (splash && !splash.isDestroyed()) {
                    splash.close();
                }
                initAutoUpdater();
            }, 2000);
        }).catch(err => {
            logger.error('Discord init failed', { error: err.message });
            setTimeout(() => {
                if (splash && !splash.isDestroyed()) splash.close();
            }, 2000);
        });
    });
}

// --- SPLASH SCREEN ---
function createSplashScreen() {
    const splash = new BrowserWindow({
        width: 400,
        height: 300,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    splash.loadFile(path.join(__dirname, '../splash.html'));
    splash.center();
    return splash;
}

// --- DASHBOARD WINDOW ---
function createDashboardWindow() {
    dashboardWindow = new BrowserWindow({
        width: 500,
        height: 220,
        show: false,
        frame: false,
        resizable: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false // Changed to false for security, using preload
        },
        backgroundColor: '#1a1b26',
        icon: path.join(__dirname, '../tray.ico')
    });

    dashboardWindow.loadFile(path.join(__dirname, 'dashboard/index.html'));

    dashboardWindow.on('close', (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            dashboardWindow.hide();
        }
    });
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
        dashboardWindow.webContents.executeJavaScript(`
            document.body.style.transition = 'opacity 0.2s';
            document.body.style.opacity = '0';
        `).then(() => {
            setTimeout(() => dashboardWindow.hide(), 200);
        });
    } else {
        dashboardWindow.center();
        dashboardWindow.show();
        dashboardWindow.focus();

        dashboardWindow.webContents.executeJavaScript(`
            document.body.style.opacity = '0';
            document.body.style.transition = 'opacity 0.3s ease-out';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    document.body.style.opacity = '1';
                });
            });
        `);
    }
}

function toggleStartup() {
    const settings = app.getLoginItemSettings();
    app.setLoginItemSettings({
        openAtLogin: !settings.openAtLogin,
        path: process.execPath
    });
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
    ipcMain.handle('get-settings', () => {
        return {
            pollInterval: config.get('pollInterval'),
            theme: config.get('theme'),
            enableNotifications: config.get('enableNotifications')
        };
    });

    ipcMain.handle('save-settings', (event, settings) => {
        config.set('pollInterval', settings.pollInterval);
        config.set('theme', settings.theme);
        config.set('enableNotifications', settings.enableNotifications);

        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = setInterval(updateActivity, settings.pollInterval);
        }

        logger.info('Settings updated', settings);
    });

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
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    setTimeout(() => {
        autoUpdater.checkForUpdates();
    }, 3000);

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

    autoUpdater.on('update-not-available', () => {
        logger.info('App is up to date');
    });

    autoUpdater.on('download-progress', (progress) => {
        logger.info('Download progress', { percent: progress.percent.toFixed(2) });
    });

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
    }
}

// ... CleanTitle, FetchAnime, TimeToSeconds logic ...
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
        logger.debug('PotPlayer process not found');
        return null;
    }
}

// --- UPDATED TIMER LOGIC ---
let currentFileStartTime = 0; // Tracks start time

async function updateActivity() {
    const rawTitle = await getPotPlayerTitle();

    if (!rawTitle || rawTitle === 'PotPlayer') {
        // IDLE handling
        if (lastFileFound !== 'IDLE') {
            lastFileFound = 'IDLE';
            currentFileStartTime = 0; // RESET TIMER
            if (isConnectedToDiscord) rpcClient.clearActivity().catch(() => { });
            if (dashboardWindow) {
                dashboardWindow.webContents.send('update-status', {
                    state: 'idle',
                    title: 'PotPlayer Fechado',
                    current: '--:--:--',
                    total: '--:--:--',
                    progress: 0,
                    image: null
                });
            }
        }
        return;
    }

    // Parse Title
    const episodeInfo = parseAnimeEpisode(rawTitle);

    // Attempt to get file path and duration
    let totalSecs = 0;
    let totalTimeStr = '??:??:??';

    if (episodeInfo) {
        const filePath = await getPotPlayerFile();
        if (filePath) {
            const duration = await getVideoDuration(filePath);
            if (duration > 0) {
                totalSecs = duration;
                totalTimeStr = secondsToTime(duration);
            }
        }
    }

    const now = Date.now();
    let currentSecs = 0;

    // Detect file change
    if (lastFileFound !== episodeInfo.animeName) {
        lastFileFound = episodeInfo.animeName;
        currentFileStartTime = now; // START TIMER for new episode

        logger.info('Now playing', {
            anime: episodeInfo.animeName,
            episode: episodeInfo.episode,
            duration: totalTimeStr
        });

        const animeData = await fetchAnimeData(episodeInfo.animeName);

        const discordDetails = episodeInfo.episode
            ? `${episodeInfo.animeName} - EP ${episodeInfo.episode}`
            : episodeInfo.animeName;

        // Discord Activity
        const activity = {
            details: discordDetails,
            state: totalSecs > 0 ? `Duração: ${totalTimeStr}` : '📺 Assistindo anime',
            largeImageKey: animeData?.image || 'potplayer_icon',
            largeImageText: episodeInfo.cleanTitle,
            instance: false,
            startTimestamp: currentFileStartTime // Discord shows "Elapsed" automatically
        };

        if (animeData?.url) {
            activity.buttons = [{ label: '📖 Ver no MyAnimeList', url: animeData.url }];
        }

        if (isConnectedToDiscord) {
            try {
                await rpcClient.setActivity(activity);
            } catch (error) {
                logger.error('RPC Error', { error: error.message });
            }
        }

        // Initial Dashboard Update
        if (dashboardWindow) {
            dashboardWindow.webContents.send('update-status', {
                state: 'playing',
                title: episodeInfo.cleanTitle,
                current: '00:00:00',
                total: totalTimeStr,
                progress: 0,
                image: animeData?.image || null,
                malUrl: animeData?.url || null
            });
        }
    } else {
        // CONTINUOUS UPDATE (Same File)
        if (currentFileStartTime > 0) {
            // Calculate elapsed time from start
            currentSecs = Math.floor((now - currentFileStartTime) / 1000);
            if (totalSecs > 0 && currentSecs > totalSecs) currentSecs = totalSecs; // Cap at max
        }

        const currentTimeStr = secondsToTime(currentSecs);
        const progress = totalSecs > 0 ? (currentSecs / totalSecs) * 100 : 0;

        if (dashboardWindow) {
            dashboardWindow.webContents.send('update-status', {
                state: 'playing',
                title: episodeInfo.cleanTitle,
                current: currentTimeStr,
                total: totalTimeStr,
                progress: progress
            });
        }
    }
}
