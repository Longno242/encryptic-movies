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

  const requestAppFullscreen = useCallback(() => {
    setPlayerFullscreen((on) => {
      if (on) return true;
      exitNativeInWebview();
      applyDomFullscreen(true);
      setWindowFullscreen(true);
      return true;
    });
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

  /** Embed exited native fullscreen — do not tear down Encryptic in-app fullscreen. */
  useEffect(() => {
    if (!playing) return;
    const leaveH = window.electron?.onWebviewLeaveFullscreen?.(() => {
      exitNativeInWebview();
    });
    return () => {
      if (leaveH) window.electron?.offWebviewLeaveFullscreen?.(leaveH);
    };
  }, [playing, exitNativeInWebview]);

  /** Some hosts repeatedly request native fullscreen while we are in app fullscreen. */
  useEffect(() => {
    if (!playing || !playerFullscreen) return;
    exitNativeInWebview();
    const id = window.setInterval(() => exitNativeInWebview(), 2500);
    return () => clearInterval(id);
  }, [playing, playerFullscreen, exitNativeInWebview]);

  /** Embed fullscreen button / API → Encryptic app fullscreen. */
  useEffect(() => {
    if (!playing) return;
    const wv = webviewRefStable.current?.current;

    const onRequest = () => requestAppFullscreen();

    const mainH = window.electron?.onWebviewRequestAppFullscreen?.(onRequest);

    const onIpc = (e) => {
      if (e?.channel === "encryptic-app-fullscreen") onRequest();
    };

    if (wv) wv.addEventListener("ipc-message", onIpc);

    return () => {
      if (mainH) window.electron?.offWebviewRequestAppFullscreen?.(mainH);
      if (wv) wv.removeEventListener("ipc-message", onIpc);
    };
  }, [playing, requestAppFullscreen]);

  useEffect(
    () => () => {
      document.documentElement.removeAttribute("data-player-fullscreen");
      setWindowFullscreen(false);
    },
    [setWindowFullscreen],
  );

  return {
    playerFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
    requestAppFullscreen,
  };
}
