export default function SourceStatusBanner({ status, onDismiss }) {
  if (!status?.message) return null;
  const cls =
    status.phase === "ok"
      ? "source-status source-status--ok"
      : status.phase === "failover"
        ? "source-status source-status--warn"
        : "source-status source-status--load";

  return (
    <div className={cls} role="status">
      {status.phase === "load" || status.phase === "trying" ? (
        <span className="source-status__spinner" />
      ) : null}
      <span>{status.message}</span>
      {onDismiss && (
        <button type="button" className="source-status__dismiss" onClick={onDismiss}>
          ×
        </button>
      )}
    </div>
  );
}
