const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const ffprobe = require('ffprobe-static');
const logger = require('./logger');

const execAsync = util.promisify(exec);

/**
 * Get video file path from PotPlayer process command line
 */
async function getPotPlayerFile() {
    try {
        // Use WMIC to get Command Line
        const { stdout } = await execAsync(
            'wmic process where "name=\'PotPlayerMini64.exe\'" get commandline',
            { timeout: 2000 }
        );

        // Output format is usually: CommandLine \n "C:\Path\To\PotPlayer.exe" "C:\Path\To\Video.mp4"
        const lines = stdout.trim().split('\n');
        if (lines.length < 2) return null;

        const commandLine = lines[1].trim();

        // Extract paths quoted in ""
        const matches = commandLine.match(/"([^"]+)"/g);

        if (matches && matches.length >= 2) {
            // Usually the second argument is the file path (first is exe)
            // But we should filter for video extensions to be sure
            const videoExtensions = ['.mp4', '.mkv', '.avi', '.flv', '.webm', '.mov', '.wmv'];

            for (let match of matches) {
                // Remove quotes
                const rawPath = match.replace(/"/g, '');
                const ext = path.extname(rawPath).toLowerCase();

                if (videoExtensions.includes(ext)) {
                    return rawPath;
                }
            }
        }

        return null;
    } catch (error) {
        logger.debug('Error getting process command line', { error: error.message });
        return null;
    }
}

/**
 * Get duration using ffprobe
 */
async function getVideoDuration(filePath) {
    if (!filePath) return null;

    try {
        const { stdout } = await execAsync(
            `"${ffprobe.path}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
            { timeout: 5000 }
        );

        const duration = parseFloat(stdout.trim());
        return isNaN(duration) ? 0 : Math.floor(duration);
    } catch (error) {
        logger.error('FFprobe error', { error: error.message });
        return 0;
    }
}

module.exports = {
    getPotPlayerFile,
    getVideoDuration
};
