/**
 * PotPlayer Data Extractor
 * Uses window title parsing only (Win32 API not supported by PotPlayer)
 */

/**
 * Convert seconds to HH:MM:SS format
 */
function secondsToTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Parse time from window title
 */
function timeToSeconds(timeStr) {
    const parts = timeStr.split(':').map(Number);
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

/**
 * Get playback data from window title
 */
async function getPotPlayerData(windowTitle) {
    if (!windowTitle || windowTitle === 'PotPlayer') {
        return null;
    }

    // Extract time from title: [HH:MM:SS / HH:MM:SS]
    const timeMatch = windowTitle.match(/\[(\d{2}:\d{2}:\d{2})\s*\/\s*(\d{2}:\d{2}:\d{2})\]/);

    const currentTime = timeMatch ? timeMatch[1] : '00:00:00';
    const totalTime = timeMatch ? timeMatch[2] : '00:00:00';

    const currentSecs = timeToSeconds(currentTime);
    const totalSecs = timeToSeconds(totalTime);

    return {
        title: windowTitle,
        currentTime,
        totalTime,
        currentSecs,
        totalSecs,
        progress: totalSecs > 0 ? (currentSecs / totalSecs) * 100 : 0,
        isPlaying: true,  // Assume playing when window title exists
        isPaused: false   // Cannot detect pause from title alone
    };
}

module.exports = {
    getPotPlayerData,
    secondsToTime
};
