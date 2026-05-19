import { DownloadIcon } from "./Icons";

export default function CloseConfirmModal({ count, onConfirm, onCancel }) {
  const plural = count > 1;

  return (
    <div className="close-confirm-overlay" role="dialog" aria-modal="true">
      <div className="close-confirm-modal">
        <div className="close-confirm-icon-wrap">
          <div className="close-confirm-icon-ring">
            <DownloadIcon />
          </div>
        </div>

        <h2 className="close-confirm-title">
          Download{plural ? "s" : ""} in progress
        </h2>

        <p className="close-confirm-body">
          <span className="close-confirm-count">
            {count} active download{plural ? "s" : ""}
          </span>{" "}
          will be cancelled and incomplete files will be removed.
        </p>

        <div className="close-confirm-actions">
          <button type="button" className="btn close-confirm-btn-cancel" onClick={onCancel}>
            Keep downloading
          </button>
          <button type="button" className="btn close-confirm-btn-confirm" onClick={onConfirm}>
            Cancel &amp; close Encryptic Movies
          </button>
        </div>
      </div>
    </div>
  );
}
