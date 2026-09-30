// Isolated-world orchestrator: receives detection data from main.js,
// decides music vs normal, applies playback rate, tracks manual overrides,
// reports state for the toolbar badge.
(() => {
  "use strict";

  // microformat.category may be localized; musicVideoType (checked first)
  // is locale-independent but only set on official music content.
  const MUSIC_CATEGORY_NAMES = new Set([
    "Music", "Muzyka", "Musik", "Musique", "Música", "Musica", "Muziek",
    "Müzik", "Hudba", "Zene", "Muzică", "Muusika", "Mūzika", "Muzika",
    "Musiikki", "Glazba", "Muzikë", "Музыка", "Музика", "Μουσική",
    "音楽", "音乐", "音樂", "음악", "موسيقى", "موسیقی", "संगीत", "সংগীত",
    "เพลง", "Nhạc", "Âm nhạc",
  ]);

  const OVERRIDE_GRACE_MS = 1500;
  const UNKNOWN_RETRY_MS = 3000;
  const APPLY_RETRY_MS = 500;
  const APPLY_MAX_RETRIES = 240; // ~2 min — outlasts ads, avoids polling forever

  let settings = { ...DEFAULTS };
  let musicChannels = {}; // channelId -> channel name, user-marked as music
  let lastData = null; // last watch-page detection payload
  let userOverride = false;
  let currentMode = null; // "normal" | "music" | "unknown" | null
  let expectedRate = null;
  let appliedAt = 0;
  let applyTimer = null;
  let boundVideo = null;
  let retriedVideoId = null;

  chrome.storage.sync.get({ ...DEFAULTS, musicChannels: {} }, (stored) => {
    musicChannels = stored.musicChannels || {};
    settings = sanitizeSettings({ ...DEFAULTS, ...stored });
    // Re-evaluate in case detection arrived before settings loaded.
    if (lastData) currentMode = computeMode(lastData);
    if (!currentMode) return;
    if (settings.enabled) reportBadge();
    else setBadge("off");
    applyForMode();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (changes.musicChannels) {
      musicChannels = changes.musicChannels.newValue || {};
      if (lastData) currentMode = computeMode(lastData);
    }
    const updated = { ...settings };
    for (const key of Object.keys(changes)) {
      updated[key] = changes[key].newValue;
    }
    settings = sanitizeSettings(updated);
    if (!settings.enabled) {
      // Disabled: cancel any pending apply and restore the rate WE set
      // (a manual user rate is left alone). Fixes the stale-speed half of #6.
      if (applyTimer) {
        clearTimeout(applyTimer);
        applyTimer = null;
      }
      const autoRate = expectedRate;
      userOverride = false;
      expectedRate = null;
      const video = getVideo();
      if (video && autoRate !== null &&
          Math.abs(video.playbackRate - autoRate) < 0.001) {
        video.playbackRate = 1;
      }
      setBadge("off");
      return;
    }
    if (currentMode && !userOverride) {
      applyForMode();
      reportBadge();
    }
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type !== "getChannel") return;
    const channelId = lastData?.channelId || null;
    sendResponse({
      channelId,
      channelName: lastData?.channelName || null,
      overridden: !!(channelId && musicChannels[channelId]),
    });
  });

  function setBadge(state, speed) {
    try {
      chrome.runtime.sendMessage({ type: "badge", state, speed });
    } catch {
      // Extension was reloaded; old content script can no longer message.
    }
  }

  // Mode names double as badge states; speed is only shown for "normal".
  function reportBadge() {
    setBadge(currentMode, settings.normalSpeed);
  }

  function targetRate() {
    return currentMode === "normal" ? settings.normalSpeed : settings.musicSpeed;
  }

  function getVideo() {
    return document.querySelector("#movie_player video");
  }

  function adShowing() {
    const player = document.getElementById("movie_player");
    return !!player && player.classList.contains("ad-showing");
  }

  function bindVideo(video) {
    if (boundVideo === video) return;
    boundVideo = video;
    video.addEventListener("ratechange", () => {
      if (expectedRate === null || adShowing()) return;
      if (Math.abs(video.playbackRate - expectedRate) < 0.001) return;
      if (Date.now() - appliedAt < OVERRIDE_GRACE_MS) {
        // YouTube reset the rate right after navigation — reassert ours.
        video.playbackRate = expectedRate;
      } else {
        userOverride = true;
        expectedRate = null;
        if (settings.enabled) setBadge("manual", video.playbackRate);
      }
    });
  }

  function applyForMode(retries = 0) {
    if (applyTimer) {
      clearTimeout(applyTimer);
      applyTimer = null;
    }
    if (!settings.enabled || userOverride || !currentMode) return;

    const video = getVideo();
    if (!video || adShowing()) {
      if (retries >= APPLY_MAX_RETRIES) return;
      applyTimer = setTimeout(() => applyForMode(retries + 1), APPLY_RETRY_MS);
      return;
    }

    const rate = targetRate();
    if (!rate) return; // musicSpeed 0 = leave the player's rate alone

    bindVideo(video);
    expectedRate = rate;
    appliedAt = Date.now();
    if (Math.abs(video.playbackRate - rate) > 0.001) {
      video.playbackRate = rate;
    }
  }

  // User-marked channels win over YouTube's own classification.
  function computeMode(data) {
    if (data.channelId && musicChannels[data.channelId]) return "music";
    if (data.detectionFailed || (!data.category && !data.musicVideoType)) {
      // Fail-safe per spec: unknown is treated as music (left at music speed).
      return "unknown";
    }
    if (data.musicVideoType || MUSIC_CATEGORY_NAMES.has(data.category)) {
      return "music";
    }
    return "normal";
  }

  // Events from the MAIN world cross a trust boundary: any page script can
  // dispatch a lookalike "yt2-player-data" CustomEvent. Clamp everything to
  // expected types/sizes before use (mitigates #5).
  function sanitizePayload(d) {
    if (!d || typeof d !== "object") return null;
    const str = (v, max) =>
      typeof v === "string" && v.length <= max ? v : null;
    return {
      page: d.page === "watch" ? "watch" : "other",
      videoId: str(d.videoId, 32),
      category: str(d.category, 64),
      musicVideoType: str(d.musicVideoType, 64),
      channelId: str(d.channelId, 128),
      channelName: str(d.channelName, 128),
      isLive: !!d.isLive,
      detectionFailed: !!d.detectionFailed,
    };
  }

  window.addEventListener("yt2-player-data", (event) => {
    const data = sanitizePayload(event.detail);

    if (!data || data.page !== "watch" || data.isLive) {
      lastData = null;
      currentMode = null;
      userOverride = false;
      expectedRate = null;
      if (applyTimer) {
        clearTimeout(applyTimer);
        applyTimer = null;
      }
      setBadge(data?.isLive ? "live" : "none");
      return;
    }

    // Per-video state resets only on an actual video change — the redetect
    // retry fires another "yt2-player-data" for the SAME video and must not
    // wipe the user's manual override (fixes #1), and revisiting a failing
    // video must be allowed a fresh retry (fixes #2).
    if (!lastData || data.videoId !== lastData.videoId) {
      userOverride = false;
      expectedRate = null;
      retriedVideoId = null;
    }

    lastData = data;
    currentMode = computeMode(data);
    if (currentMode === "unknown" && data.videoId !== retriedVideoId) {
      // The player API often comes up late; re-detect once.
      retriedVideoId = data.videoId;
      setTimeout(() => {
        window.dispatchEvent(new Event("yt2-redetect"));
      }, UNKNOWN_RETRY_MS);
    }

    if (!settings.enabled) {
      setBadge("off");
      return;
    }
    reportBadge();
    applyForMode();
  });
})();
