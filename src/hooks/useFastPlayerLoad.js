import { useState, useEffect, useRef, useCallback } from "react";
import { nudgeEmbedPlayback, restoreEmbedAudio } from "../utils/playerAutoplay";

const SLOW_HINT_MS = 4000;
const STALL_FAILOVER_MS = 5000;
const HEALTH_POLL_MS = 2000;

function isBlankPlayerUrl(url) {
  if (!url) return true;
  const u = String(url).trim();
  return u === "about:blank" || u.startsWith("about:");
}

function isPlaybackActive(health) {
  if (!health) return false;
  if (health.currentTime > 0.25) return true;
  if (!health.paused && health.readyState >= 2) return true;
  if (health.readyState >= 3 && health.duration > 0 && !health.paused)
    return true;
  return false;
}

/**
 * Player load UX: wait for real playback, nudge embeds, auto-reload / failover when stuck.
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

  const bumpLoading = useCallback(() => {
    loadGenRef.current += 1;
    shellReadyRef.current = false;
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
    let healthPoll = null;

    const tryMarkPlaying = async () => {
      if (cancelled || gen !== loadGenRef.current || shellReadyRef.current) return;
      const health = await checkEmbedHealth();
      if (isPlaybackActive(health)) {
        markReady();
        return true;
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

      void nudgeEmbedPlayback(wv);
      if (await tryMarkPlaying()) return;

      stallTimer = window.setTimeout(async () => {
        if (cancelled || gen !== loadGenRef.current || shellReadyRef.current) return;
        void nudgeEmbedPlayback(wv);
        if (await tryMarkPlaying()) return;
        onLoadStuck?.();
      }, STALL_FAILOVER_MS);
    };

    const onFail = (e) => {
      if (gen !== loadGenRef.current) return;
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
    playerWrapClass: webviewLoading ? " player-wrap--loading" : "",
  };
}
