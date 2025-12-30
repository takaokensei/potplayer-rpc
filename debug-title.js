const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

/**
 * Get PotPlayer window title
 */
async function getPotPlayerTitle() {
    try {
        const { stdout } = await execAsync(
            `powershell -Command "Get-Process | Where-Object {$_.ProcessName -eq 'PotPlayerMini64' -or $_.ProcessName -eq 'PotPlayer64' -or $_.ProcessName -eq 'PotPlayer'} | Select-Object -First 1 | ForEach-Object { $_.MainWindowTitle }"`,
            { timeout: 1000 }
        );

        const title = stdout.trim();
        console.log('[DEBUG] Raw PotPlayer title:', title);
        return title || null;
    } catch (error) {
        console.error('[DEBUG] Error getting title:', error.message);
        return null;
    }
}

// Test directly
getPotPlayerTitle().then(title => {
    console.log('Title:', title);

    // Check for time pattern
    const timeMatch = title?.match(/\[(\d{2}:\d{2}:\d{2})\s*\/\s*(\d{2}:\d{2}:\d{2})\]/);
    console.log('Time match:', timeMatch);

    if (timeMatch) {
        console.log('Current:', timeMatch[1]);
        console.log('Total:', timeMatch[2]);
    } else {
        console.log('❌ NO TIME IN TITLE!');
        console.log('Title format may be different. Check PotPlayer settings.');
    }
});
