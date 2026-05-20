import { useState, useEffect, useCallback, useRef } from "react";
import { exitWebviewNativeFullscreen } from "../utils/exitWebviewNativeFullscreen";

/**
 * In-app player fullscreen (CSS overlay + OS window fullscreen).
 * Does not sync embed native fullscreen (that caused resize loops with vidsrc-style players).
 */
export function usePlayerFullscreen(playing, playerSource, webviewRef) {
  const [playerFullscreen, setPlayerFullscreen] = useState(false);
  const webviewRefStable = useRef(webviewRef);
  webviewRefStable.current = webviewRef;

  const setWindowFullscreen = useCallback((on) => {
    window.electron?.setPlayerWindowFullscreen?.(on)?.catch?.(() => {});
  }, []);

  const exitNativeInWebview = useCallback(() => {
    exitWebviewNativeFullscreen(webviewRefStable.current?.current);
  }, []);

  const applyDomFullscreen = useCallback((on) => {
    if (on) {
      document.documentElement.setAttribute("data-player-fullscreen", "1");
    } else {
      document.documentElement.removeAttribute("data-player-fullscreen");
    }
  }, []);

  const enterFullscreen = useCallback(() => {
    exitNativeInWebview();
    setPlayerFullscreen(true);
    applyDomFullscreen(true);
    setWindowFullscreen(true);
  }, [exitNativeInWebview, applyDomFullscreen, setWindowFullscreen]);

  const exitFullscreen = useCallback(() => {
    setPlayerFullscreen(false);
    applyDomFullscreen(false);
    if (document.fullscreenElement) document.exitFullscreen?.();
    exitNativeInWebview();
    setWindowFullscreen(false);
  }, [exitNativeInWebview, applyDomFullscreen, setWindowFullscreen]);

  const toggleFullscreen = useCallback(() => {
    setPlayerFullscreen((on) => {
      const next = !on;
      if (next) {
        exitNativeInWebview();
        applyDomFullscreen(true);
        setWindowFullscreen(true);
      } else {
        applyDomFullscreen(false);
        if (document.fullscreenElement) document.exitFullscreen?.();
        exitNativeInWebview();
        setWindowFullscreen(false);
      }
      return next;
    });
  }, [exitNativeInWebview, applyDomFullscreen, setWindowFullscreen]);

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

  /** Sync UI when the user exits OS fullscreen (e.g. Esc on Windows). */
  useEffect(() => {
    const h = window.electron?.onPlayerWindowFullscreenChanged?.((on) => {
      if (on) return;
      setPlayerFullscreen(false);
      applyDomFullscreen(false);
      exitNativeInWebview();
    });
    return () => {
      if (h) window.electron?.offPlayerWindowFullscreenChanged?.(h);
    };
  }, [applyDomFullscreen, exitNativeInWebview]);

  /** Keep embed inside the layout when the host page requests native fullscreen. */
  useEffect(() => {
    if (!playing) return;
    const leaveH = window.electron?.onWebviewLeaveFullscreen?.(() => {
      exitFullscreen();
    });
    return () => {
      if (leaveH) window.electron?.offWebviewLeaveFullscreen?.(leaveH);
    };
  }, [playing, exitFullscreen]);

  useEffect(
    () => () => {
      document.documentElement.removeAttribute("data-player-fullscreen");
      setWindowFullscreen(false);
    },
    [setWindowFullscreen],
  );

  return { playerFullscreen, toggleFullscreen, exitFullscreen };
}
