const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const ffprobeStatic = require('ffprobe-static');

const execAsync = util.promisify(exec);

/**
 * Get video duration using ffprobe
 * @param {string} filePath - Full path to video file
 * @returns {Promise<number|null>} Duration in seconds
 */
async function getVideoDuration(filePath) {
    try {
        const { stdout } = await execAsync(
            `"${ffprobeStatic.path}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
            { timeout: 5000 }
        );

        const duration = parseFloat(stdout.trim());
        return isNaN(duration) ? null : Math.floor(duration);
    } catch (error) {
        return null;
    }
}

/**
 * Extract file path from PotPlayer window title
 * Removes: [HH:MM:SS / HH:MM:SS], " - PotPlayer", metadata tags
 */
function extractFilePathFromTitle(title) {
    if (!title) return null;

    // Remove time if exists
    let clean = title.replace(/\[(\d{2}:\d{2}:\d{2})\s*\/\s*(\d{2}:\d{2}:\d{2})\]/g, '').trim();

    // Remove " - PotPlayer" suffix
    clean = clean.replace(/\s*-\s*PotPlayer\s*$/i, '').trim();

    // If it's a full path, return as-is
    if (clean.match(/^[A-Z]:\\/i)) {
        return clean;
    }

    // Otherwise it's just the filename - we can't get duration without full path
    return null;
}

module.exports = {
    getVideoDuration,
    extractFilePathFromTitle
};
