import { useCallback, useRef } from "react";

/**
 * Auto-advance embed sources when the webview fails to load.
 * Tracks tried sources so failover never loops (e.g. A→Neon→A).
 */
export function usePlayerSourceFallback({
  enabled,
  playerSource,
  setPlayerSource,
  setWebviewLoading,
  getNextSource,
  primaryFailoverSource = null,
  failThreshold = 2,
  onRemember,
  onFailover,
  onSourceSuccess,
}) {
  const failStreak = useRef(0);
  const slowFailTimer = useRef(null);
  const stuckHandled = useRef(false);
  const triedSources = useRef(new Set());

  const onLoadSuccess = useCallback(() => {
    failStreak.current = 0;
    stuckHandled.current = false;
    triedSources.current.clear();
    if (slowFailTimer.current) {
      clearTimeout(slowFailTimer.current);
      slowFailTimer.current = null;
    }
    onRemember?.(playerSource);
    onSourceSuccess?.(playerSource);
  }, [playerSource, onRemember, onSourceSuccess]);

  const tryFailover = useCallback(() => {
    triedSources.current.add(playerSource);

    let next = null;
    if (
      primaryFailoverSource &&
      !triedSources.current.has(primaryFailoverSource)
    ) {
      next = primaryFailoverSource;
    } else {
      let candidate = getNextSource(playerSource);
      const seen = new Set();
      while (candidate && !seen.has(candidate)) {
        seen.add(candidate);
        if (!triedSources.current.has(candidate)) {
          next = candidate;
          break;
        }
        candidate = getNextSource(candidate);
      }
    }

    if (next && next !== playerSource) {
      failStreak.current = 0;
      onFailover?.(playerSource, next);
      setWebviewLoading?.(true);
      setPlayerSource(next);
      return true;
    }
    return false;
  }, [
    playerSource,
    primaryFailoverSource,
    getNextSource,
    onFailover,
    setPlayerSource,
    setWebviewLoading,
  ]);

  const onLoadFail = useCallback(
    (event) => {
      if (!enabled) return;
      const code = event?.errorCode ?? event?.detail?.errorCode;
      if (code === -3) return;
      failStreak.current += 1;
      if (failStreak.current >= failThreshold) tryFailover();
    },
    [enabled, failThreshold, tryFailover],
  );

  const onLoadStuck = useCallback(() => {
    if (!enabled || stuckHandled.current) return;
    stuckHandled.current = true;
    tryFailover();
  }, [enabled, tryFailover]);

  const resetFallback = useCallback(() => {
    failStreak.current = 0;
    stuckHandled.current = false;
    triedSources.current.clear();
    if (slowFailTimer.current) {
      clearTimeout(slowFailTimer.current);
      slowFailTimer.current = null;
    }
  }, []);

  return { onLoadSuccess, onLoadFail, onLoadStuck, resetFallback };
}
