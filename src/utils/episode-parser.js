/**
 * Smart episode parser - extracts anime name and episode number from messy filenames
 * No ML needed - regex patterns are faster and more accurate for structured text
 */

/**
 * Parse anime filename and extract clean title + episode number
 * @param {string} rawTitle - Raw PotPlayer window title
 * @returns {object} { animeName, episode, cleanTitle }
 */
function parseAnimeEpisode(rawTitle) {
    if (!rawTitle) return null;

    // Remove PotPlayer text
    let filename = rawTitle.replace(/PotPlayer/gi, '').trim();

    // Remove time info [00:12:34 / 01:23:45]
    filename = filename.replace(/\[\d{2}:\d{2}:\d{2}\s*\/\s*\d{2}:\d{2}:\d{2}\]/g, '');

    // Pattern 1: [Group] Anime Name - Episode [Quality]
    // Example: "[FF] Ragna Crimson - 01 [WEBRip][1080p][AAC][8bits][77E52A74].mp4"
    let match = filename.match(/\[([^\]]+)\]\s*([^-\[]+)\s*-\s*(\d+)/);
    if (match) {
        return {
            fansub: match[1].trim(),
            animeName: match[2].trim(),
            episode: parseInt(match[3]),
            cleanTitle: `${match[2].trim()} - Episódio ${match[3]}`
        };
    }

    // Pattern 2: [Group] Anime Name - Episode Number
    // Example: "[Erai-raws] Karakai Jouzu no Takagi-san - 03 [1080p][Multiple Subtitle].mkv"
    match = filename.match(/\[([^\]]+)\]\s*(.+?)\s*-\s*(\d+)/);
    if (match) {
        const animeName = match[2].replace(/\[.*?\]/g, '').trim();
        return {
            fansub: match[1].trim(),
            animeName: animeName,
            episode: parseInt(match[3]),
            cleanTitle: `${animeName} - Episódio ${match[3]}`
        };
    }

    // Pattern 3: Anime Name Episode without group
    // Example: "Sword Art Online 12.mkv"
    match = filename.match(/^([^-\[]+?)\s+(\d+)[\.\[\s]/);
    if (match) {
        return {
            fansub: null,
            animeName: match[1].trim(),
            episode: parseInt(match[2]),
            cleanTitle: `${match[1].trim()} - Episódio ${match[2]}`
        };
    }

    // Pattern 4: Anime Name - Episode
    // Example: "Attack on Titan - 05.mp4"
    match = filename.match(/^([^-]+)\s*-\s*(\d+)/);
    if (match) {
        const animeName = match[1].replace(/\[.*?\]/g, '').trim();
        return {
            fansub: null,
            animeName: animeName,
            episode: parseInt(match[2]),
            cleanTitle: `${animeName} - Episódio ${match[2]}`
        };
    }

    // Pattern 5: Episode in filename with "ep", "episode", "e"
    // Example: "One Piece ep 1000.mkv"
    match = filename.match(/([^-\[]+?)\s*(?:ep|episode|e)?\s*(\d+)/i);
    if (match) {
        const animeName = match[1].replace(/\[.*?\]/g, '').trim();
        return {
            fansub: null,
            animeName: animeName,
            episode: parseInt(match[2]),
            cleanTitle: `${animeName} - Episódio ${match[2]}`
        };
    }

    // Fallback: just clean the title without episode
    const cleanName = filename
        .replace(/\[.*?\]/g, '') // Remove all brackets
        .replace(/\(.*?\)/g, '') // Remove parentheses
        .replace(/\.(mp4|mkv|avi|mov)$/i, '') // Remove extension
        .replace(/[\-_]/g, ' ') // Replace dashes/underscores with spaces
        .trim();

    return {
        fansub: null,
        animeName: cleanName,
        episode: null,
        cleanTitle: cleanName
    };
}

module.exports = { parseAnimeEpisode };
