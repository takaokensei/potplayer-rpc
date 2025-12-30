/**
 * Multi-Player Support Architecture
 * Detects and integrates with: PotPlayer, VLC, MPV
 */

const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

// Player detection patterns
const PLAYERS = {
    POTPLAYER: {
        processNames: ['PotPlayer', 'PotPlayer64', 'PotPlayerMini64'],
        hasAPI: false,
        needsFFprobe: true
    },
    VLC: {
        processNames: ['vlc'],
        hasAPI: true,
        apiType: 'http',
        apiPort: 8080
    },
    MPV: {
        processNames: ['mpv'],
        hasAPI: true,
        apiType: 'ipc'
    }
};

/**
 * Detect which player is currently running
 */
async function detectActivePlayer() {
    try {
        const { stdout } = await execAsync(
            'powershell -Command "Get-Process | Select-Object ProcessName | Format-Table -HideTableHeaders"',
            { timeout: 2000 }
        );

        const processes = stdout.toLowerCase().split('\n').map(p => p.trim());

        // Check in priority order
        for (const [playerName, config] of Object.entries(PLAYERS)) {
            for (const procName of config.processNames) {
                if (processes.some(p => p.includes(procName.toLowerCase()))) {
                    return { name: playerName, config };
                }
            }
        }

        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Get window title for a specific player
 */
async function getPlayerWindowTitle(playerName) {
    const config = PLAYERS[playerName];
    if (!config) return null;

    const processFilter = config.processNames.map(p => `$_.ProcessName -eq '${p}'`).join(' -or ');

    try {
        const { stdout } = await execAsync(
            `powershell -Command "Get-Process | Where-Object {${processFilter}} | Select-Object -First 1 | ForEach-Object { $_.MainWindowTitle }"`,
            { timeout: 1000 }
        );

        return stdout.trim() || null;
    } catch (error) {
        return null;
    }
}

module.exports = {
    PLAYERS,
    detectActivePlayer,
    getPlayerWindowTitle
};
