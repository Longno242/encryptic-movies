import { useState, useCallback } from "react";
import { PLAYER_SOURCES } from "../utils/api";

export function useSourceStatus() {
  const [status, setStatus] = useState(null);

  const labelFor = (id) =>
    PLAYER_SOURCES.find((s) => s.id === id)?.label || id;

  const reportTrying = useCallback((sourceId) => {
    setStatus({ phase: "trying", sourceId, message: `Loading ${labelFor(sourceId)}…` });
  }, []);

  const reportSuccess = useCallback((sourceId) => {
    setStatus({ phase: "ok", sourceId, message: `Playing on ${labelFor(sourceId)}` });
    const t = setTimeout(() => setStatus(null), 3500);
    return () => clearTimeout(t);
  }, []);

  const reportFailover = useCallback((fromId, toId) => {
    setStatus({
      phase: "failover",
      sourceId: toId,
      message: `${labelFor(fromId)} failed — trying ${labelFor(toId)}…`,
    });
  }, []);

  const clearStatus = useCallback(() => setStatus(null), []);

  return { status, reportTrying, reportSuccess, reportFailover, clearStatus };
}
