import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Live blocked-request counters from the Electron main process.
 *
 * @param {string|number} resetKey — changing this clears session stats
 *   (movie id, or `showId_s{n}e{m}` for TV).
 */
export function useBlockedStats(resetKey) {
  const [sessionTotal, setSessionTotal] = useState(0);
  const [alltimeTotal, setAlltimeTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const domainsBySession = useRef({});

  useEffect(() => {
    const api = window.electron;
    if (!api?.getBlockStats) return;

    let alive = true;
    api.getBlockStats().then((stats) => {
      if (alive && stats) setAlltimeTotal(stats.total || 0);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setSessionTotal(0);
    domainsBySession.current = {};
  }, [resetKey]);

  useEffect(() => {
    const api = window.electron;
    if (!api?.onBlockedUpdate) return;

    const onBatch = (payload) => {
      if (!payload) return;
      const delta = payload.total || 0;

      setAlltimeTotal((n) => n + delta);
      setSessionTotal((n) => n + delta);

      const bucket = domainsBySession.current;
      for (const [host, count] of Object.entries(payload.domains || {})) {
        bucket[host] = (bucket[host] || 0) + count;
      }
    };

    api.onBlockedUpdate(onBatch);
    return () => api.offBlockedUpdate?.(onBatch);
  }, []);

  const getSessionDomains = useCallback(
    () =>
      Object.entries(domainsBySession.current).sort(
        ([, a], [, b]) => b - a,
      ),
    [],
  );

  return {
    sessionTotal,
    alltimeTotal,
    showModal,
    setShowModal,
    getSessionDomains,
  };
}
