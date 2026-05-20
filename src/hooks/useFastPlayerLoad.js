import { useState, useEffect, useRef, useCallback } from "react";
import { nudgeEmbedPlayback, restoreEmbedAudio } from "../utils/playerAutoplay";

const SLOW_HINT_MS = 5000;
const STALL_FAILOVER_MS = 6000;
const NUDGE_INTERVAL_MS = 3000;
const HEALTH_POLL_MS = 1500;

function isBlankPlayerUrl(url) {
  if (!url) return true;
  const u = String(url).trim();
  return u === "about:blank" || u.startsWith("about:");
}

function isPlaybackActive(health) {
  if (!health) return false;
  if (health.currentTime > 0.25) return true;
  if (
    health.duration > 0 &&
    Number.isFinite(health.duration) &&
    !health.paused &&
    health.readyState >= 2
  ) {
    return true;
  }
  return false;
}

function isEmbedStalled(health, elapsedMs) {
  if (health?.unavailable) return true;
  if (isPlaybackActive(health)) return false;
  if (!health) return elapsedMs >= STALL_FAILOVER_MS;
  if (health.hasVideo === false) return elapsedMs >= 8000;
  if (health.stuck) return elapsedMs >= 7000;
  const d = health.duration;
  if ((!d || d <= 0) && (health.currentTime || 0) < 0.25) {
    return elapsedMs >= STALL_FAILOVER_MS;
  }
  return elapsedMs >= STALL_FAILOVER_MS + 5000;
}

/**
 * Player load UX: keep overlay until video plays; failover when embed stuck at 0:00.
 */
export function useFastPlayerLoad({
  playing,
  webviewRef,
  playerSource,
  itemKey,
  episodeKey = "",
  streamReadyKey = "",
  onLoadSuccess,
  onLoadFail,
  onLoadStuck,
}) {
  const [webviewLoading, setWebviewLoading] = useState(false);
  const [loadSlow, setLoadSlow] = useState(false);
  const loadGenRef = useRef(0);
  const shellReadyRef = useRef(false);
  const shellAtRef = useRef(0);

  const bumpLoading = useCallback(() => {
    loadGenRef.current += 1;
    shellReadyRef.current = false;
    shellAtRef.current = 0;
    setLoadSlow(false);
    setWebviewLoading(true);
  }, []);

  const clearLoading = useCallback(() => {
    setWebviewLoading(false);
    setLoadSlow(false);
  }, []);

  const markReady = useCallback(() => {
    if (shellReadyRef.current) return;
    shellReadyRef.current = true;
    clearLoading();
    const wv = webviewRef.current;
    if (wv) void restoreEmbedAudio(wv);
    onLoadSuccess?.();
  }, [clearLoading, onLoadSuccess, webviewRef]);

  useEffect(() => {
    if (playing) bumpLoading();
    else {
      setWebviewLoading(false);
      setLoadSlow(false);
      shellReadyRef.current = false;
      shellAtRef.current = 0;
    }
  }, [playing, playerSource, itemKey, episodeKey, bumpLoading]);

  useEffect(() => {
    if (!playing || !webviewLoading) return;
    const gen = loadGenRef.current;
    const slowT = window.setTimeout(() => {
      if (gen === loadGenRef.current) setLoadSlow(true);
    }, SLOW_HINT_MS);
    return () => clearTimeout(slowT);
  }, [playing, webviewLoading, playerSource, itemKey, episodeKey]);

  const reloadWebview = useCallback(() => {
    const wv = webviewRef.current;
    if (!wv) return;
    const url = (() => {
      try {
        return wv.getURL?.() || wv.src || "";
      } catch {
        return wv.src || "";
      }
    })();
    if (isBlankPlayerUrl(url)) return;
    bumpLoading();
    try {
      wv.src = "about:blank";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            wv.src = url;
          } catch {
            /* ignore */
          }
        });
      });
    } catch {
      /* ignore */
    }
  }, [webviewRef, bumpLoading]);

  const checkEmbedHealth = useCallback(async () => {
    const wv = webviewRef.current;
    if (!wv || typeof wv.getWebContentsId !== "function") return null;
    try {
      return await window.electron?.queryEmbedHealth?.(wv.getWebContentsId());
    } catch {
      return null;
    }
  }, [webviewRef]);

  useEffect(() => {
    if (!playing) return;
    const wv = webviewRef.current;
    if (!wv) return;

    const gen = loadGenRef.current;
    let cancelled = false;
    let stallTimer = null;
    let nudgeTimer = null;
    let healthPoll = null;

    const tryMarkPlaying = async () => {
      if (cancelled || gen !== loadGenRef.current || shellReadyRef.current) return false;
      const health = await checkEmbedHealth();
      if (isPlaybackActive(health)) {
        markReady();
        return true;
      }
      if (health?.unavailable && shellAtRef.current > 0) {
        onLoadStuck?.();
        return false;
      }
      if (shellAtRef.current > 0 && isEmbedStalled(health, Date.now() - shellAtRef.current)) {
        onLoadStuck?.();
        return false;
      }
      return false;
    };

    let shellHandled = false;
    const onShellReady = async () => {
      if (shellHandled) return;
      const url = (() => {
        try {
          return wv.getURL?.() || wv.src || "";
        } catch {
          return wv.src || "";
        }
      })();
      if (isBlankPlayerUrl(url)) return;
      if (cancelled || gen !== loadGenRef.current) return;
      shellHandled = true;
      shellAtRef.current = Date.now();

      void nudgeEmbedPlayback(wv);
      if (await tryMarkPlaying()) return;

      stallTimer = window.setTimeout(() => {
        void tryMarkPlaying();
      }, STALL_FAILOVER_MS);

      nudgeTimer = window.setInterval(() => {
        if (cancelled || shellReadyRef.current) return;
        void nudgeEmbedPlayback(wv);
      }, NUDGE_INTERVAL_MS);
    };

    const onFail = (e) => {
      if (gen !== loadGenRef.current) return;
      const code = e?.errorCode ?? e?.detail?.errorCode;
      if (code === -3) return;
      clearLoading();
      setLoadSlow(true);
      onLoadFail?.(e);
    };

    wv.addEventListener("dom-ready", onShellReady);
    wv.addEventListener("did-finish-load", onShellReady);
    wv.addEventListener("did-fail-load", onFail);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) void onShellReady();
      });
    });

    healthPoll = window.setInterval(() => {
      void tryMarkPlaying();
    }, HEALTH_POLL_MS);

    return () => {
      cancelled = true;
      wv.removeEventListener("dom-ready", onShellReady);
      wv.removeEventListener("did-finish-load", onShellReady);
      wv.removeEventListener("did-fail-load", onFail);
      if (stallTimer) clearTimeout(stallTimer);
      if (nudgeTimer) clearInterval(nudgeTimer);
      if (healthPoll) clearInterval(healthPoll);
    };
  }, [
    playing,
    playerSource,
    itemKey,
    episodeKey,
    webviewRef,
    clearLoading,
    markReady,
    onLoadFail,
    onLoadStuck,
    reloadWebview,
    checkEmbedHealth,
  ]);

  useEffect(() => {
    if (!playing || !streamReadyKey) return;
    void (async () => {
      const wv = webviewRef.current;
      if (wv) await nudgeEmbedPlayback(wv);
      if (await checkEmbedHealth().then(isPlaybackActive)) {
        markReady();
      }
    })();
  }, [streamReadyKey, playing, webviewRef, checkEmbedHealth, markReady]);

  const retryLoad = useCallback(() => {
    reloadWebview();
  }, [reloadWebview]);

  return {
    webviewLoading,
    setWebviewLoading,
    loadSlow,
    retryLoad,
    bumpLoading,
    clearLoading,
    playerWrapClass: webviewLoading
      ? " player-wrap--loading player-wrap--show-controls"
      : loadSlow
        ? " player-wrap--show-controls"
        : "",
  };
}
