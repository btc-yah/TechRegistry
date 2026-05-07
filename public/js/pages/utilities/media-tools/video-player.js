const videoInput = document.getElementById('videoFile');
const video = document.getElementById('videoPlayer');
const emptyState = document.getElementById('videoEmptyState');
const status = document.getElementById('videoStatus');
const fileLabel = document.getElementById('videoFileLabel');

let activeObjectUrl = '';
let selectedFileName = '';

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const precision = unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const setEmptyStateVisible = (isVisible) => {
  emptyState.classList.toggle('is-hidden', !isVisible);
};

const hasLoadedVideo = () => Boolean(video.currentSrc);

const setStatus = (message) => {
  status.textContent = message;
};

const openFilePicker = () => {
  videoInput.click();
};

const updatePlaybackStatus = () => {
  if (!hasLoadedVideo()) {
    setStatus('Choose a video file to begin');
    return;
  }

  const namePrefix = selectedFileName ? `${selectedFileName} | ` : '';
  setStatus(`${namePrefix}${video.paused ? 'Paused' : 'Playing'}`);
};

const tryPlaySelectedVideo = () => {
  const playAttempt = video.play();
  if (playAttempt && typeof playAttempt.catch === 'function') {
    playAttempt.catch(() => {
      setStatus('Video loaded. Press play if autoplay is blocked by your browser.');
    });
  }
};

const seekBy = (seconds) => {
  if (!hasLoadedVideo() || !Number.isFinite(video.duration)) {
    return;
  }

  video.currentTime = clamp(video.currentTime + seconds, 0, video.duration);
  setStatus(`${selectedFileName || 'Video'} | ${seconds > 0 ? 'Forward' : 'Backward'} ${Math.abs(seconds)} seconds`);
};

videoInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];

  if (!file) {
    selectedFileName = '';
    setStatus('Choose a video file to begin');
    fileLabel.textContent = 'No file selected yet';
    setEmptyStateVisible(true);
    video.removeAttribute('src');
    video.load();
    return;
  }

  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
  }

  activeObjectUrl = URL.createObjectURL(file);
  selectedFileName = file.name;
  video.src = activeObjectUrl;
  video.load();

  const details = [file.name];
  const sizeLabel = formatFileSize(file.size);
  if (sizeLabel) {
    details.push(sizeLabel);
  }

  fileLabel.textContent = file.name;
  setStatus(`Loaded ${details.join(' | ')}`);
  setEmptyStateVisible(true);
});

video.addEventListener('loadeddata', () => {
  setEmptyStateVisible(false);
});

video.addEventListener('loadedmetadata', () => {
  setEmptyStateVisible(false);
  tryPlaySelectedVideo();
});

video.addEventListener('play', updatePlaybackStatus);
video.addEventListener('pause', updatePlaybackStatus);

video.addEventListener('volumechange', () => {
  if (!hasLoadedVideo()) {
    return;
  }

  if (video.muted) {
    setStatus(`${selectedFileName || 'Video'} | Muted`);
    return;
  }

  setStatus(`${selectedFileName || 'Video'} | Volume ${Math.round(video.volume * 100)}%`);
});

video.addEventListener('ended', () => {
  setStatus(`${selectedFileName || 'Video'} | Playback finished`);
});

video.addEventListener('emptied', () => {
  setEmptyStateVisible(true);
  if (!selectedFileName) {
    setStatus('Choose a video file to begin');
  }
});

emptyState.addEventListener('click', openFilePicker);

emptyState.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openFilePicker();
  }
});

document.addEventListener('keydown', (event) => {
  const target = event.target;
  const isEditable = target instanceof HTMLElement && (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  );

  if (isEditable || event.altKey || event.ctrlKey || event.metaKey || !hasLoadedVideo()) {
    return;
  }

  switch (event.key) {
    case 'j':
    case 'J':
      event.preventDefault();
      seekBy(-10);
      break;
    case 'l':
    case 'L':
      event.preventDefault();
      seekBy(10);
      break;
    case 'Home':
      event.preventDefault();
      if (Number.isFinite(video.duration)) {
        video.currentTime = 0;
        setStatus(`${selectedFileName || 'Video'} | Jumped to start`);
      }
      break;
    case 'End':
      event.preventDefault();
      if (Number.isFinite(video.duration)) {
        video.currentTime = video.duration;
        setStatus(`${selectedFileName || 'Video'} | Jumped to end`);
      }
      break;
    default:
      break;
  }
});

window.addEventListener('beforeunload', () => {
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
  }
});
