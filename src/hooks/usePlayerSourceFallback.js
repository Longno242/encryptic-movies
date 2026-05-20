import { useCallback, useRef } from "react";

/**
 * Auto-advance embed sources when the webview fails to load.
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

  const onLoadSuccess = useCallback(() => {
    failStreak.current = 0;
    stuckHandled.current = false;
    if (slowFailTimer.current) {
      clearTimeout(slowFailTimer.current);
      slowFailTimer.current = null;
    }
    onRemember?.(playerSource);
    onSourceSuccess?.(playerSource);
  }, [playerSource, onRemember, onSourceSuccess]);

  const tryFailover = useCallback(() => {
    const next =
      primaryFailoverSource && primaryFailoverSource !== playerSource
        ? primaryFailoverSource
        : getNextSource(playerSource);
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
    [enabled, tryFailover],
  );

  const onLoadStuck = useCallback(() => {
    if (!enabled || stuckHandled.current) return;
    stuckHandled.current = true;
    tryFailover();
  }, [enabled, tryFailover]);

  const resetFallback = useCallback(() => {
    failStreak.current = 0;
    stuckHandled.current = false;
    if (slowFailTimer.current) {
      clearTimeout(slowFailTimer.current);
      slowFailTimer.current = null;
    }
  }, []);

  return { onLoadSuccess, onLoadFail, onLoadStuck, resetFallback };
}
