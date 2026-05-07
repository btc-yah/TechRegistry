const AudioContextClass = window.AudioContext || window.webkitAudioContext;

const $frequency = $("#frequency");
const $volume = $("#volume");
const $waveform = $("#waveform");
const $playBtn = $("#playBtn");
const $stopBtn = $("#stopBtn");
const $freqValue = $("#freqValue");
const $volValue = $("#volValue");
const $audioFile = $("#audioFile");
const $audioPlayer = $("#audioPlayer");
const $tonePanel = $("#tonePanel");
const $filePanel = $("#filePanel");
const $statusText = $("#statusText");
const $channelReadout = $("#channelReadout");
const $sourceInputs = $('input[name="sourceMode"]');
const $channelButtons = $("[data-channel]");

const audioPlayer = $audioPlayer.get(0);

let audioContext = null;
let gainNode = null;
let panNode = null;
let mediaSourceNode = null;
let oscillator = null;
let currentMode = "tone";
let currentChannel = "stereo";
let fileUrl = null;

const channelPanMap = {
  left: -1,
  stereo: 0,
  right: 1,
};

function setStatus(message) {
  $statusText.text(message);
}

function ensureAudioContext() {
  if (!AudioContextClass) {
    setStatus("Web Audio not supported");
    throw new Error("Web Audio is not supported in this browser.");
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
    gainNode = audioContext.createGain();
    panNode = audioContext.createStereoPanner();

    gainNode.gain.value = Number($volume.val());
    panNode.pan.value = channelPanMap[currentChannel];

    gainNode.connect(panNode);
    panNode.connect(audioContext.destination);
  }

  if (audioContext.state === "suspended") {
    return audioContext.resume();
  }

  return Promise.resolve();
}

function updateReadouts() {
  $freqValue.text($frequency.val());
  $volValue.text(`${Math.round(Number($volume.val()) * 100)}%`);
  $channelReadout.text(
    currentChannel.charAt(0).toUpperCase() + currentChannel.slice(1)
  );
}

function applyVolume() {
  if (gainNode) {
    gainNode.gain.value = Number($volume.val());
  }

  updateReadouts();
}

function applyChannel(channel) {
  currentChannel = channel;

  $channelButtons.each((_, button) => {
    const $button = $(button);
    $button.toggleClass("active", $button.data("channel") === channel);
  });

  if (panNode) {
    panNode.pan.value = channelPanMap[channel];
  }

  updateReadouts();
  setStatus(`Routing ${channel} channel`);
}

function stopTone() {
  if (!oscillator) {
    return;
  }

  oscillator.onended = null;
  oscillator.stop();
  oscillator.disconnect();
  oscillator = null;
}

function stopFilePlayback() {
  audioPlayer.pause();
  audioPlayer.currentTime = 0;
}

function stopPlayback(options = {}) {
  stopTone();
  stopFilePlayback();

  if (!options.keepStatus) {
    setStatus("Stopped");
  }
}

function applySourceMode(mode) {
  currentMode = mode;
  const isTone = mode === "tone";

  $tonePanel.toggleClass("d-none", !isTone);
  $filePanel.toggleClass("d-none", isTone);
  $audioPlayer.toggleClass("d-none", isTone);

  stopPlayback({ keepStatus: true });
  setStatus(isTone ? "Tone generator armed" : "Upload an audio file to test speakers");
}

function connectFileSource() {
  if (!audioContext) {
    return;
  }

  if (!mediaSourceNode) {
    mediaSourceNode = audioContext.createMediaElementSource(audioPlayer);
    mediaSourceNode.connect(gainNode);
  }
}

async function playTone() {
  await ensureAudioContext();
  stopPlayback({ keepStatus: true });

  oscillator = audioContext.createOscillator();
  oscillator.type = $waveform.val();
  oscillator.frequency.value = Number($frequency.val());
  oscillator.connect(gainNode);
  oscillator.start();

  setStatus(`Playing ${currentChannel} tone`);
}

async function playFile() {
  if (!audioPlayer.src) {
    setStatus("Choose an audio file first");
    window.appToast?.("Choose an audio file first", "error");
    return;
  }

  await ensureAudioContext();
  connectFileSource();
  stopPlayback({ keepStatus: true });

  try {
    await audioPlayer.play();
    setStatus(`Playing file on ${currentChannel}`);
  } catch (error) {
    setStatus("Playback blocked");
    window.appToast?.("Browser blocked playback. Try clicking play again.", "error");
  }
}

$frequency.on("input", () => {
  if (oscillator) {
    oscillator.frequency.value = Number($frequency.val());
  }

  updateReadouts();
});

$volume.on("input", applyVolume);

$waveform.on("change", () => {
  if (oscillator) {
    oscillator.type = $waveform.val();
  }
});

$sourceInputs.on("change", function onSourceModeChange() {
  if (this.checked) {
    applySourceMode(this.value);
  }
});

$channelButtons.on("click", function onChannelClick() {
  applyChannel($(this).data("channel"));
});

$playBtn.on("click", async () => {
  if (currentMode === "tone") {
    await playTone();
    return;
  }

  await playFile();
});

$stopBtn.on("click", () => {
  stopPlayback();
});

$audioFile.on("change", (event) => {
  const file = event.target.files?.[0];

  if (fileUrl) {
    URL.revokeObjectURL(fileUrl);
    fileUrl = null;
  }

  if (!file) {
    $audioPlayer.removeAttr("src");
    audioPlayer.load();
    setStatus("Upload an audio file to test speakers");
    return;
  }

  fileUrl = URL.createObjectURL(file);
  $audioPlayer.attr("src", fileUrl);
  audioPlayer.load();
  setStatus(`Loaded ${file.name}`);
});

$audioPlayer.on("ended", () => {
  setStatus("Playback finished");
});

$(window).on("beforeunload", () => {
  stopPlayback({ keepStatus: true });

  if (fileUrl) {
    URL.revokeObjectURL(fileUrl);
  }
});

updateReadouts();
applySourceMode(currentMode);
applyChannel(currentChannel);
