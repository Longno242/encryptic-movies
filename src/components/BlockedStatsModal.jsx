import { useEffect } from "react";
import { CloseIcon, ShieldBlockIcon } from "./Icons";

export default function BlockedStatsModal({
  sessionDomains,
  sessionTotal,
  alltimeTotal,
  onClose,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="blocked-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="blocked-modal" onClick={(e) => e.stopPropagation()}>
        <header className="blocked-modal-header">
          <h2 className="blocked-modal-title">
            <ShieldBlockIcon size={15} />
            Encryptic Shield
          </h2>
          <button type="button" className="blocked-modal-close" onClick={onClose} title="Close">
            <CloseIcon />
          </button>
        </header>

        <p className="blocked-modal-subtitle">
          {sessionTotal > 0
            ? `${sessionTotal} ad / scam block${sessionTotal === 1 ? "" : "s"} this session`
            : "Play something to see Encryptic Shield activity."}
        </p>

        <ul className="blocked-modal-list">
          {sessionDomains.length === 0 ? (
            <li className="blocked-modal-empty">
              Nothing blocked yet — start playback to populate this list.
            </li>
          ) : (
            sessionDomains.map(([domain, count]) => (
              <li key={domain} className="blocked-modal-row">
                <span className="blocked-modal-domain">{domain}</span>
                <span className="blocked-modal-count">{count.toLocaleString()}</span>
              </li>
            ))
          )}
        </ul>

        <footer className="blocked-modal-footer">
          <ShieldBlockIcon size={13} />
          All-time:&nbsp;
          <strong>
            {alltimeTotal.toLocaleString()} request{alltimeTotal === 1 ? "" : "s"}
          </strong>
          &nbsp;blocked in Encryptic Movies
        </footer>
      </div>
    </div>
  );
}
