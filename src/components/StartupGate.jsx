import { EncrypticLogo } from "./Icons";

/** Shown while secure storage / TMDB check runs — never a blank screen. */
export default function StartupGate({ status = "Starting Encryptic Movies…" }) {
  return (
    <div
      className="apikey-modal"
      style={{ zIndex: 200 }}
      role="status"
      aria-live="polite"
    >
      <div className="apikey-box" style={{ maxWidth: 420 }}>
        <div className="apikey-logo-wrap">
          <EncrypticLogo className="apikey-logo-img" />
        </div>
        <p className="apikey-lead" style={{ marginBottom: 8 }}>
          Encryptic Movies
        </p>
        <p className="apikey-sub" style={{ marginBottom: 0 }}>
          {status}
        </p>
      </div>
    </div>
  );
}
