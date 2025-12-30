async function updateActivity() {
    const rawTitle = await getPotPlayerTitle();

    // Get playback data from API or fallback to window title
    const playbackData = await getPotPlayerData(rawTitle);

    if (!playbackData) {
        // Idle state
        if (lastFileFound !== 'IDLE') {
            lastFileFound = 'IDLE';
            logger.info('PotPlayer closed - going idle');

            if (isConnectedToDiscord) {
                try {
                    await rpcClient.clearActivity();
                } catch (error) {
                    logger.error('Failed to clear Discord activity', { error: error.message });
                }
            }
            if (dashboardWindow) {
                dashboardWindow.webContents.send('update-status', {
                    state: 'idle',
                    title: 'PotPlayer Fechado',
                    current: '--:--:--',
                    total: '--:--:--',
                    progress: 0,
                    image: null
                });
            }
        }
        return;
    }

    // Parse episode information from title
    const episodeInfo = parseAnimeEpisode(playbackData.title);
    if (!episodeInfo) {
        logger.warn('Failed to parse episode', { title: playbackData.title });
        return;
    }

    // Only update if file changed
    if (lastFileFound !== episodeInfo.animeName) {
        lastFileFound = episodeInfo.animeName;

        logger.info('Now playing', {
            anime: episodeInfo.animeName,
            episode: episodeInfo.episode,
            apiEnabled: playbackData.hasApi
        });

        // Fetch anime data from Jikan API
        const animeData = await fetchAnimeData(episodeInfo.animeName);

        // Update Discord RPC
        if (isConnectedToDiscord) {
            try {
                const discordDetails = episodeInfo.episode
                    ? `${episodeInfo.animeName} - EP ${episodeInfo.episode}`
                    : episodeInfo.animeName;

                const stateText = playbackData.isPaused ? '⏸️ Pausado' : '📺 Assistindo anime';

                const activity = {
                    details: discordDetails,
                    state: stateText,
                    largeImageKey: animeData?.image || 'potplayer_icon',
                    largeImageText: episodeInfo.cleanTitle,
                    instance: false,
                };

                // Add timestamps (only if playing)
                if (playbackData.isPlaying && playbackData.totalSecs > 0) {
                    const now = Date.now();
                    activity.startTimestamp = now - (playbackData.currentSecs * 1000);
                    activity.endTimestamp = now + ((playbackData.totalSecs - playbackData.currentSecs) * 1000);
                }

                // Add MAL button
                if (animeData?.url) {
                    activity.buttons = [{ label: '📖 Ver no MyAnimeList', url: animeData.url }];
                }

                await rpcClient.setActivity(activity);
            } catch (error) {
                logger.error('Failed to set Discord activity', { error: error.message });
            }
        }

        // Update Dashboard
        if (dashboardWindow) {
            dashboardWindow.webContents.send('update-status', {
                state: playbackData.isPaused ? 'paused' : 'playing',
                title: episodeInfo.cleanTitle,
                current: playbackData.currentTime,
                total: playbackData.totalTime,
                progress: playbackData.progress,
                image: animeData?.image || null,
                malUrl: animeData?.url || null
            });
        }
    } else {
        // Update time/progress only
        if (dashboardWindow) {
            dashboardWindow.webContents.send('update-status', {
                state: playbackData.isPaused ? 'paused' : 'playing',
                title: episodeInfo.cleanTitle,
                current: playbackData.currentTime,
                total: playbackData.totalTime,
                progress: playbackData.progress
            });
        }
    }
}
