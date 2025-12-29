const Store = require('electron-store');

const schema = {
    pollInterval: {
        type: 'number',
        default: 5000,
        minimum: 1000,
        maximum: 30000
    },
    theme: {
        type: 'string',
        default: 'tokyo-night',
        enum: ['tokyo-night', 'dracula', 'nord']
    },
    enableNotifications: {
        type: 'boolean',
        default: true
    },
    startWithWindows: {
        type: 'boolean',
        default: false
    },
    windowPosition: {
        type: 'object',
        properties: {
            x: { type: 'number' },
            y: { type: 'number' }
        },
        default: null
    }
};

const store = new Store({
    schema,
    clearInvalidConfig: true
});

module.exports = store;
