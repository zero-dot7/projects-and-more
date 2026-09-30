const BADGES = {
  normal: { text: (speed) => String(speed), color: "#1565c0" },
  music: { text: () => "♪", color: "#2e7d32" },
  unknown: { text: () => "?", color: "#ef6c00" },
  manual: { text: (speed) => String(speed), color: "#6a1b9a" },
  live: { text: () => "LIVE", color: "#c62828" },
  off: { text: () => "off", color: "#757575" },
  none: { text: () => "", color: "#757575" },
};

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type !== "badge" || !sender.tab) return;
  const badge = BADGES[msg.state] || BADGES.none;
  const tabId = sender.tab.id;
  chrome.action.setBadgeText({ tabId, text: badge.text(msg.speed) });
  chrome.action.setBadgeBackgroundColor({ tabId, color: badge.color });
});
