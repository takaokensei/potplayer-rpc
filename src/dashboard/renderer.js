const elStatus = document.getElementById('status');
const elTitle = document.getElementById('title');
const elTime = document.getElementById('time');
const elProgress = document.getElementById('progress');
const elCover = document.getElementById('cover');
const elPlaceholder = document.getElementById('placeholder');
const elCoverBox = document.getElementById('coverBox');

let currentMalUrl = null;

// Click handler for cover image
elCoverBox.addEventListener('click', () => {
    if (currentMalUrl) {
        require('electron').shell.openExternal(currentMalUrl);
    }
});

window.electronAPI.onUpdateStatus((data) => {
    if (data.state === 'idle') {
        // Idle state with smooth transition
        elStatus.innerText = 'OCIOSO';
        elStatus.classList.add('idle');
        elTitle.innerText = 'PotPlayer Fechado';
        elTime.innerText = '--:--:-- / --:--:--';
        elProgress.style.width = '0%';

        // Hide cover smoothly
        elCover.classList.remove('loaded');
        elPlaceholder.style.display = 'flex';
        elCoverBox.classList.remove('loading', 'clickable');
        currentMalUrl = null;
    } else {
        // Playing state
        elStatus.innerText = 'REPRODUZINDO';
        elStatus.classList.remove('idle');

        elTitle.innerText = data.title || 'Sem título';
        elTime.innerText = `${data.current} / ${data.total}`;
        elProgress.style.width = `${data.progress}%`;

        // Handle cover image - SÓ atualiza se vier nova imagem
        if (data.image && data.image.startsWith('http')) {
            elCoverBox.classList.add('loading');
            elCover.src = data.image;

            elCover.onload = () => {
                elCoverBox.classList.remove('loading');
                elCover.classList.add('loaded');
                elPlaceholder.style.display = 'none';
            };

            elCover.onerror = () => {
                elCoverBox.classList.remove('loading');
            };
        }

        // Store MAL URL and make clickable
        if (data.malUrl) {
            currentMalUrl = data.malUrl;
            elCoverBox.classList.add('clickable');
            elCoverBox.title = 'Clique para ver no MyAnimeList';
        }
        // Se não veio imagem, MANTÉM a que já está carregada
    }
});
