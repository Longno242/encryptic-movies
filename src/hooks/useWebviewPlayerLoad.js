import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Faster perceived embed load: dom-ready clears spinner; fail + slow-load fallback.
 */
export function useWebviewPlayerLoad({
  playing,
  webviewRef,
  playerSource,
  itemKey,
  onLoadSuccess,
  onLoadFail,
}) {
  const [webviewLoading, setWebviewLoading] = useState(false);
  const [loadSlow, setLoadSlow] = useState(false);
  const loadGen = useRef(0);

  const bumpLoading = useCallback(() => {
    loadGen.current += 1;
    setLoadSlow(false);
    setWebviewLoading(true);
  }, []);

  useEffect(() => {
    if (playing) bumpLoading();
    else {
      setWebviewLoading(false);
      setLoadSlow(false);
    }
  }, [playing, bumpLoading]);

  useEffect(() => {
    if (!playing) return;
    bumpLoading();
  }, [playerSource, itemKey, playing, bumpLoading]);

  useEffect(() => {
    if (!playing || !webviewLoading) return;
    const gen = loadGen.current;
    const slowTimer = window.setTimeout(() => {
      if (gen === loadGen.current) setLoadSlow(true);
    }, 12000);
    const hardTimer = window.setTimeout(() => {
      if (gen === loadGen.current) {
        setWebviewLoading(false);
        setLoadSlow(true);
      }
    }, 45000);
    return () => {
      clearTimeout(slowTimer);
      clearTimeout(hardTimer);
    };
  }, [playing, webviewLoading, playerSource, itemKey]);

  useEffect(() => {
    if (!playing) return;
    const wv = webviewRef.current;
    if (!wv) return;

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      setWebviewLoading(false);
      setLoadSlow(false);
      onLoadSuccess?.();
    };

    const onFail = (e) => {
      setWebviewLoading(false);
      setLoadSlow(true);
      onLoadFail?.(e);
    };

    wv.addEventListener("dom-ready", finish);
    wv.addEventListener("did-finish-load", finish);
    wv.addEventListener("did-fail-load", onFail);
    return () => {
      wv.removeEventListener("dom-ready", finish);
      wv.removeEventListener("did-finish-load", finish);
      wv.removeEventListener("did-fail-load", onFail);
    };
  }, [playing, playerSource, itemKey, webviewRef, onLoadSuccess, onLoadFail]);

  const retryLoad = useCallback(() => {
    const wv = webviewRef.current;
    if (!wv?.src || wv.src === "about:blank") return;
    bumpLoading();
    try {
      const url = wv.src;
      wv.src = "about:blank";
      requestAnimationFrame(() => {
        try {
          wv.src = url;
        } catch {
          /* ignore */
        }
      });
    } catch {
      /* ignore */
    }
  }, [webviewRef, bumpLoading]);

  return {
    webviewLoading,
    setWebviewLoading,
    loadSlow,
    retryLoad,
    bumpLoading,
  };
}
