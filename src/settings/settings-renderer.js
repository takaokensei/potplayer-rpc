const pollIntervalInput = document.getElementById('pollInterval');
const themeSelect = document.getElementById('theme');
const notificationsCheckbox = document.getElementById('enableNotifications');

// Load current settings
window.electronAPI.getSettings().then((settings) => {
    pollIntervalInput.value = settings.pollInterval;
    themeSelect.value = settings.theme;
    notificationsCheckbox.checked = settings.enableNotifications;
});

// Save settings
function saveSettings() {
    const settings = {
        pollInterval: parseInt(pollIntervalInput.value),
        theme: themeSelect.value,
        enableNotifications: notificationsCheckbox.checked
    };

    window.electronAPI.saveSettings(settings);
    window.close();
}

// Reset to defaults
function resetDefaults() {
    window.electronAPI.resetSettings().then((defaults) => {
        pollIntervalInput.value = defaults.pollInterval;
        themeSelect.value = defaults.theme;
        notificationsCheckbox.checked = defaults.enableNotifications;
    });
}
