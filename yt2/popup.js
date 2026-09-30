const enabledEl = document.getElementById("enabled");
const normalEl = document.getElementById("normalSpeed");
const musicEl = document.getElementById("musicSpeed");
const controlsEl = document.getElementById("controls");

function reflectEnabled(enabled) {
  controlsEl.classList.toggle("disabled-area", !enabled);
}

chrome.storage.sync.get(DEFAULTS, (stored) => {
  const s = sanitizeSettings(stored);
  enabledEl.checked = s.enabled;
  normalEl.value = String(s.normalSpeed);
  musicEl.value = String(s.musicSpeed);
  reflectEnabled(s.enabled);
});

enabledEl.addEventListener("change", () => {
  chrome.storage.sync.set({ enabled: enabledEl.checked });
  reflectEnabled(enabledEl.checked);
});

normalEl.addEventListener("change", () => {
  const speed = sanitizeSpeed(parseFloat(normalEl.value), DEFAULTS.normalSpeed, false);
  chrome.storage.sync.set({ normalSpeed: speed });
});

musicEl.addEventListener("change", () => {
  const speed = sanitizeSpeed(parseFloat(musicEl.value), DEFAULTS.musicSpeed, true);
  chrome.storage.sync.set({ musicSpeed: speed });
});

// Per-channel music override: ask the active tab's content script which
// channel is playing; section stays hidden off watch pages.
const channelSectionEl = document.getElementById("channelSection");
const channelNameEl = document.getElementById("channelName");
const channelMusicEl = document.getElementById("channelMusic");
let currentChannel = null;

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "getChannel" }, (resp) => {
    if (chrome.runtime.lastError || !resp?.channelId) return;
    currentChannel = resp;
    channelNameEl.textContent = resp.channelName || resp.channelId;
    channelMusicEl.checked = resp.overridden;
    channelSectionEl.hidden = false;
  });
});

channelMusicEl.addEventListener("change", () => {
  if (!currentChannel) return;
  const { channelId, channelName } = currentChannel;
  chrome.storage.sync.get({ musicChannels: {} }, (s) => {
    const map = s.musicChannels || {};
    if (channelMusicEl.checked) {
      map[channelId] = channelName || "";
    } else {
      delete map[channelId];
    }
    chrome.storage.sync.set({ musicChannels: map });
  });
});
