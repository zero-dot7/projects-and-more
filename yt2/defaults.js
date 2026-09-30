// Shared by the content script and the popup (loaded before each).
"use strict";

const DEFAULTS = Object.freeze({ enabled: true, normalSpeed: 1.2, musicSpeed: 1.0 });

// A musicSpeed of 0 means "don't touch the rate".
function sanitizeSpeed(value, fallback, allowZero) {
  if (typeof value !== "number" || !isFinite(value)) return fallback;
  if (value === 0) return allowZero ? 0 : fallback;
  return value >= 0.25 && value <= 4 ? value : fallback;
}

function sanitizeSettings(raw) {
  return {
    enabled: raw.enabled !== false,
    normalSpeed: sanitizeSpeed(raw.normalSpeed, DEFAULTS.normalSpeed, false),
    musicSpeed: sanitizeSpeed(raw.musicSpeed, DEFAULTS.musicSpeed, true),
  };
}
