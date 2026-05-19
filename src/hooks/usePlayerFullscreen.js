import { useState, useEffect, useCallback } from "react";
import { NEEDS_INTERCEPT } from "../utils/api";

/**
 * In-app player fullscreen (CSS overlay). Works for all sources;
 * vidsrc/2embed also sync when the embed requests native fullscreen.
 */
export function usePlayerFullscreen(playing, playerSource) {
  const [playerFullscreen, setPlayerFullscreen] = useState(false);

  const enterFullscreen = useCallback(() => {
    setPlayerFullscreen(true);
    document.documentElement.setAttribute("data-player-fullscreen", "1");
  }, []);

  const exitFullscreen = useCallback(() => {
    setPlayerFullscreen(false);
    document.documentElement.removeAttribute("data-player-fullscreen");
    if (document.fullscreenElement) document.exitFullscreen?.();
  }, []);

  const toggleFullscreen = useCallback(() => {
    setPlayerFullscreen((on) => {
      const next = !on;
      if (next) {
        document.documentElement.setAttribute("data-player-fullscreen", "1");
      } else {
        document.documentElement.removeAttribute("data-player-fullscreen");
        if (document.fullscreenElement) document.exitFullscreen?.();
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!playing) exitFullscreen();
  }, [playing, exitFullscreen]);

  useEffect(() => {
    if (!playing || !playerFullscreen) return;
    const onKey = (e) => {
      if (e.key === "Escape") exitFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, playerFullscreen, exitFullscreen]);

  useEffect(() => {
    if (!playing) return;
    if (!NEEDS_INTERCEPT.includes(playerSource)) return;
    const enterH = window.electron?.onWebviewEnterFullscreen?.(() => {
      enterFullscreen();
    });
    const leaveH = window.electron?.onWebviewLeaveFullscreen?.(() => {
      exitFullscreen();
    });
    return () => {
      if (enterH) window.electron?.offWebviewEnterFullscreen?.(enterH);
      if (leaveH) window.electron?.offWebviewLeaveFullscreen?.(leaveH);
    };
  }, [playing, playerSource, enterFullscreen, exitFullscreen]);

  useEffect(
    () => () => document.documentElement.removeAttribute("data-player-fullscreen"),
    [],
  );

  return { playerFullscreen, toggleFullscreen, exitFullscreen };
}
