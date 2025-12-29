const elStatus = document.getElementById('status');
const elTitle = document.getElementById('title');
const elTime = document.getElementById('time');
const elProgress = document.getElementById('progress');
const elCover = document.getElementById('cover');
const elPlaceholder = document.getElementById('placeholder');

window.electronAPI.onUpdateStatus((data) => {
    if (data.state === 'idle') {
        elStatus.innerText = 'OCIOSO';
        elStatus.style.color = '#565f89';
        elTitle.innerText = 'PotPlayer Fechado';
        elTime.innerText = '--:--';
        elProgress.style.width = '0%';
        elCover.style.display = 'none';
        elPlaceholder.style.display = 'flex';
    } else {
        elStatus.innerText = 'REPRODUZINDO';
        elStatus.style.color = '#7aa2f7'; // Tokyo Night Blue

        elTitle.innerText = data.title;
        elTime.innerText = `${data.current} / ${data.total}`;
        elProgress.style.width = `${data.progress}%`;

        if (data.image && data.image.startsWith('http')) {
            elCover.src = data.image;
            elCover.style.display = 'block';
            elPlaceholder.style.display = 'none';
        } else {
            elCover.style.display = 'none';
            elPlaceholder.style.display = 'flex';
        }
    }
});
