import { useCallback, useRef } from "react";
import {
  getNextAnimeSource,
  rememberAnimeSource,
} from "../utils/animePlayback";

/**
 * Auto-advance anime sources when embed fails to load.
 */
export function useAnimeSourceFallback({
  enabled,
  tmdbId,
  playerSource,
  setPlayerSource,
  setWebviewLoading,
  onFailover,
  onSourceSuccess,
}) {
  const failStreak = useRef(0);
  const lastUrl = useRef("");

  const onLoadSuccess = useCallback(() => {
    failStreak.current = 0;
    if (tmdbId && playerSource) rememberAnimeSource(tmdbId, playerSource);
    onSourceSuccess?.(playerSource);
  }, [tmdbId, playerSource, onSourceSuccess]);

  const onLoadFail = useCallback(
    (event) => {
      if (!enabled) return;
      const code = event?.errorCode ?? event?.detail?.errorCode;
      if (code === -3) return;
      failStreak.current += 1;
      if (failStreak.current > 2) {
        const next = getNextAnimeSource(playerSource);
        if (next && next !== playerSource) {
          failStreak.current = 0;
          onFailover?.(playerSource, next);
          setWebviewLoading?.(true);
          setPlayerSource(next);
        }
      }
    },
    [enabled, playerSource, setPlayerSource, setWebviewLoading, onFailover],
  );

  const resetFallback = useCallback(() => {
    failStreak.current = 0;
    lastUrl.current = "";
  }, []);

  return { onLoadSuccess, onLoadFail, resetFallback };
}
