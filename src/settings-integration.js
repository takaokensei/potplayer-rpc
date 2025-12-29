// Settings Window Creation and IPC Handlers
// Add this after the toggleStartup function

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

// ADD THESE FUNCTIONS TO src/main.js after line 160 (after toggleStartup)
