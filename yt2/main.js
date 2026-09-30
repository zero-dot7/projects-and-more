// Runs in the page's MAIN world: only here the YouTube player API
// (#movie_player.getPlayerResponse) is reachable. window.ytInitialPlayerResponse
// goes stale after the first SPA navigation, so the live player is the
// authoritative source.
(() => {
  "use strict";

  const POLL_INTERVAL = 250;
  const POLL_TIMEOUT = 8000;
  let detectToken = 0;

  function currentVideoId() {
    if (location.pathname !== "/watch") return null;
    return new URLSearchParams(location.search).get("v");
  }

  function readPlayerResponse() {
    const player = document.getElementById("movie_player");
    if (player && typeof player.getPlayerResponse === "function") {
      const pr = player.getPlayerResponse();
      if (pr) return pr;
    }
    return window.ytInitialPlayerResponse || null;
  }

  function send(detail) {
    window.dispatchEvent(new CustomEvent("yt2-player-data", { detail }));
  }

  function detect() {
    const token = ++detectToken;

    const videoId = currentVideoId();
    if (!videoId) {
      send({ page: "other" });
      return;
    }

    const startedAt = Date.now();

    const attempt = () => {
      if (token !== detectToken) return; // superseded by a newer detection

      const pr = readPlayerResponse();
      const details = pr && pr.videoDetails;

      // Stale-data guard: only trust a response that belongs to the
      // video currently in the URL.
      if (details && details.videoId === videoId) {
        const micro =
          pr.microformat && pr.microformat.playerMicroformatRenderer;
        send({
          page: "watch",
          videoId,
          category: (micro && micro.category) || null,
          musicVideoType: details.musicVideoType || null,
          channelId: details.channelId || null,
          channelName: details.author || null,
          isLive: !!details.isLive,
        });
        return;
      }

      if (Date.now() - startedAt > POLL_TIMEOUT) {
        send({ page: "watch", videoId, category: null, musicVideoType: null, isLive: false, detectionFailed: true });
        return;
      }
      setTimeout(attempt, POLL_INTERVAL);
    };

    attempt();
  }

  window.addEventListener("yt-navigate-finish", detect);
  window.addEventListener("yt2-redetect", detect);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", detect);
  } else {
    detect();
  }
})();
