const $startBtn = $('#startBtn');
const $stopBtn = $('#stopBtn');
const $captureBtn = $('#captureBtn');
const $downloadBtn = $('#downloadBtn');
const $webcam = $('#webcam');
const $canvas = $('#canvas');
const $photo = $('#photo');
const $photoContainer = $('#photoContainer');
const $deviceInfo = $('#deviceInfo');
const $statusBadge = $('#status');
let stream;
let capturedPhoto = null;

const updateStatus = (text, color = 'secondary') => {
  $statusBadge.text(text);
  $statusBadge.attr('class', `badge bg-${color}`);
  $statusBadge.css('fontSize', '0.85rem');
};

$(function() {
$startBtn.on('click', async () => {
  updateStatus('Requesting access...', 'warning');
  $deviceInfo.html('<p class="text-warning">⏳ Requesting camera access...</p>');
  
  // Timeout promise to detect antivirus blocking
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('timeout')), 5000);
  });
  
  try {
    const constraints = {
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: 'user'
      },
      audio: false
    };
    
    stream = await Promise.race([navigator.mediaDevices.getUserMedia(constraints), timeout]); // Keep native for getUserMedia
    
    $webcam[0].srcObject = stream; // Access native DOM element for srcObject
    updateStatus('Starting...', 'info');
    
    $webcam.on('loadedmetadata', () => {
      $webcam[0].play(); // Access native DOM element for play()
      updateStatus('Active', 'success');
      $startBtn.prop('disabled', true);
      $stopBtn.prop('disabled', false);
      $captureBtn.prop('disabled', false);
      
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      deviceInfo.innerHTML = `
        <small>
          <strong>Status:</strong> <span class="badge bg-success">✓ Active</span><br>
          <strong>Camera:</strong> ${track.label || 'Default Camera'}<br>
          <strong>Resolution:</strong> ${settings.width || '1920'}×${settings.height || '1080'}<br>
          <strong>Frame Rate:</strong> ${settings.frameRate || '30'} fps
        </small>
      `);
    };
  } catch (e) {
    let errorMsg = e.message;
    let errorType = 'danger';
    
    if (e.message === 'timeout') {
      errorMsg = '⏱️ Camera timeout - likely blocked by antivirus';
      errorType = 'warning';
    } else if (e.name === 'NotAllowedError') {
      errorMsg = '🔒 Camera permission denied - check antivirus settings';
      errorType = 'warning';
    } else if (e.name === 'NotFoundError') {
      errorMsg = '❌ No camera found';
    } else if (e.name === 'NotReadableError') {
      errorMsg = '🔴 Camera is in use by another application';
      errorType = 'warning';
    }
    
    updateStatus('Error', 'danger');
    $deviceInfo.html(`<div class="alert alert-${errorType} mb-0" style="font-size:0.9rem;"><strong>Error:</strong><br>${errorMsg}</div>`);
    $startBtn.prop('disabled', false);
  }
});

$stopBtn.on('click', () => {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
  }
  $webcam[0].srcObject = null;
  $startBtn.prop('disabled', false);
  $stopBtn.prop('disabled', true);
  $captureBtn.prop('disabled', true);
  $downloadBtn.prop('disabled', true);
  updateStatus('Stopped', 'secondary');
  $deviceInfo.html('<p class="text-muted">🛑 Camera stopped</p>');
});


$captureBtn.on('click', () => {
  if ($webcam[0].videoWidth && $webcam[0].videoHeight) {
    $canvas[0].width = $webcam[0].videoWidth;
    $canvas[0].height = $webcam[0].videoHeight;
    const ctx = $canvas[0].getContext('2d');
    ctx.drawImage($webcam[0], 0, 0);
    capturedPhoto = $canvas[0].toDataURL('image/png');
    $photo.attr('src', capturedPhoto);
    $photo.css('display', 'block');
    $downloadBtn.prop('disabled', false);
    
    // Clear placeholder text
    const $placeholder = $photoContainer.find('.text-muted');
    if ($placeholder.length) $placeholder.remove();
  }
});

$downloadBtn.on('click', () => {
  if (capturedPhoto) {
    const $a = $('<a>');
    $a.attr('href', capturedPhoto);
    $a.attr('download', 'webcam_' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.png');
    $a[0].click();
  }
});
});
