const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const ffprobe = require('ffprobe-static');
const logger = require('./logger');

const execAsync = util.promisify(exec);

/**
 * Get video file path from PotPlayer process command line
 * Uses a temporary PowerShell script to avoid CLI escaping issues and handle Unicode
 */
async function getPotPlayerFile() {
    const tempScriptPath = path.join(os.tmpdir(), `potplayer_cmd_${Date.now()}.ps1`);

    try {
        // PowerShell script to get command line and encode as Base64 to avoid console encoding issues
        const psScript = `
            $proc = Get-CimInstance Win32_Process -Filter "Name = 'PotPlayerMini64.exe' OR Name = 'PotPlayer64.exe'" | Select-Object -ExpandProperty CommandLine -ErrorAction SilentlyContinue
            if ($proc) {
                $Bytes = [System.Text.Encoding]::UTF8.GetBytes($proc)
                [Convert]::ToBase64String($Bytes)
            }
        `;

        // Write script to temp file
        await fs.writeFile(tempScriptPath, psScript, 'utf8');

        // Execute script
        const { stdout } = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempScriptPath}"`, {
            timeout: 2000,
            encoding: 'utf8'
        });

        // Clean up immediately
        await fs.unlink(tempScriptPath).catch(() => { });

        const base64Output = stdout.trim();
        if (!base64Output) return null;

        // Decode Base64
        const commandLine = Buffer.from(base64Output, 'base64').toString('utf8');
        logger.debug('Decoded CommandLine:', { commandLine });

        // Extract paths quoted in ""
        const matches = commandLine.match(/"([^"]+)"/g);

        if (matches && matches.length >= 2) {
            const videoExtensions = ['.mp4', '.mkv', '.avi', '.flv', '.webm', '.mov', '.wmv', '.m4v'];

            for (let match of matches) {
                const rawPath = match.replace(/"/g, '');
                const ext = path.extname(rawPath).toLowerCase();

                if (videoExtensions.includes(ext)) {
                    logger.debug('Found video file:', { rawPath });
                    return rawPath;
                }
            }
        }

        return null;
    } catch (error) {
        // Ensure cleanup on error
        await fs.unlink(tempScriptPath).catch(() => { });
        logger.error('Error getting process command line', { error: error.message });
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
