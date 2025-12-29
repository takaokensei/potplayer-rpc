// Auto-Updater Implementation
// Add this after setupIPC function (around line 225)

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

// ADD THIS FUNCTION TO src/main.js after setupIPC (around line 225)
