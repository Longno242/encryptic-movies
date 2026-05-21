import { useEffect, useRef } from "react";

/**
 * Interval polling that pauses when the tab is hidden (saves CPU / IPC).
 * @param {{ enabled: boolean, intervalMs?: number, startDelayMs?: number, onPoll: () => void | Promise<void> }} opts
 */
export function usePlaybackPoll({
  enabled,
  intervalMs = 5000,
  startDelayMs = 1000,
  onPoll,
}) {
  const onPollRef = useRef(onPoll);
  onPollRef.current = onPoll;

  useEffect(() => {
    if (!enabled) return undefined;

    let interval = null;
    let cancelled = false;

    const tick = () => {
      if (cancelled || document.hidden) return;
      void onPollRef.current();
    };

    const startTimer = setTimeout(() => {
      tick();
      interval = setInterval(tick, intervalMs);
    }, startDelayMs);

    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, intervalMs, startDelayMs]);
}
