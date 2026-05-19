import { useEffect } from "react";
import { CloseIcon, ExternalLinkIcon } from "./Icons";

const SECTIONS = [
  {
    id: "overview",
    title: "What is Encryptic Movies?",
    body: (
      <p>
        A desktop app for movies, TV, and anime. Metadata from TMDB; playback
        through in-app embed providers. Your watchlist, progress, and settings
        stay on this PC.
      </p>
    ),
  },
  {
    id: "first-run",
    title: "First launch — TMDB token",
    body: (
      <>
        <ol>
          <li>
            Create a free API key at{" "}
            <DocLink href="https://www.themoviedb.org/settings/api">
              themoviedb.org → Settings → API
            </DocLink>
            .
          </li>
          <li>
            Copy the <strong>API Read Access Token</strong> (JWT starting with{" "}
            <code>eyJ</code>), not the short API Key field.
          </li>
          <li>
            Paste on the welcome screen and click <strong>Save token & continue</strong>.
          </li>
        </ol>
        <p>You can skip once, but browse/search need a token to work.</p>
      </>
    ),
  },
  {
    id: "storage",
    title: "How your API key is stored",
    body: (
      <>
        <p>
          <strong>Your token is not saved as plain text</strong> in a file you can
          open in Notepad.
        </p>
        <h4>Windows (recommended)</h4>
        <p>Stored in <strong>Windows Credential Manager</strong>:</p>
        <ul>
          <li>Win → search <strong>Credential Manager</strong></li>
          <li>
            <strong>Windows Credentials</strong> → <strong>Encryptic Movies</strong>{" "}
            → <code>apikey</code>
          </li>
        </ul>
        <p>
          Only your Windows user account can read it through the OS. Encryptic Movies
          loads it <strong>automatically</strong> every time you open the app.
        </p>
        <h4>Optional subtitle keys</h4>
        <p>
          Wyzie and SubDL keys use the same vault (<code>wyzieApiKey</code>,{" "}
          <code>subdlApiKey</code>).
        </p>
        <h4>Fallback file</h4>
        <p>
          If Credential Manager is unavailable, an encrypted file may be used
          (DPAPI on Windows). The app migrates to Credential Manager when possible.
        </p>
      </>
    ),
  },
  {
    id: "remove-key",
    title: "Remove or change your token",
    body: (
      <>
        <ul>
          <li>
            <strong>In app:</strong> Settings → General → Change API Token
          </li>
          <li>
            <strong>Windows:</strong> Credential Manager → Encryptic Movies → Remove
          </li>
        </ul>
        <p>Next launch shows the welcome screen again.</p>
      </>
    ),
  },
  {
    id: "home",
    title: "Home & categories",
    body: (
      <>
        <p>
          Use the <strong>Release year</strong> dropdown and category chips for
          Recently Added, Most Popular, Top Viewed, genres, and more.
        </p>
        <p>Customize rows in Settings → Home layout.</p>
      </>
    ),
  },
  {
    id: "privacy",
    title: "Privacy",
    body: (
      <ul>
        <li>TMDB token is sent only to api.themoviedb.org.</li>
        <li>Streams load from third-party sites you configure.</li>
        <li>No Encryptic-operated streaming servers.</li>
      </ul>
    ),
  },
];

function DocLink({ href, children }) {
  return (
    <a
      href={href}
      className="docs-link"
      onClick={(e) => {
        e.preventDefault();
        window.electron?.openExternal?.(href);
      }}
    >
      {children}
    </a>
  );
}

async function openFullDocumentation() {
  if (!window.electron?.getInstallPath) return;
  const base = await window.electron.getInstallPath();
  const path = `${base.replace(/\\/g, "/")}/DOCUMENTATION.md`;
  window.electron.openPath?.(path);
}

export default function DocsModal({ onClose, onShowShortcuts }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="modal-overlay docs-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Documentation"
    >
      <div className="docs-modal" onClick={(e) => e.stopPropagation()}>
        <header className="docs-modal-header">
          <h2 className="docs-modal-title">Documentation</h2>
          <button
            type="button"
            className="docs-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="docs-modal-body">
          {SECTIONS.map((s) => (
            <section key={s.id} id={`docs-${s.id}`} className="docs-section">
              <h3 className="docs-section-title">{s.title}</h3>
              <div className="docs-section-body">{s.body}</div>
            </section>
          ))}
        </div>

        <footer className="docs-modal-footer">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={openFullDocumentation}
          >
            <ExternalLinkIcon /> Open full guide (DOCUMENTATION.md)
          </button>
          {onShowShortcuts && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                onClose();
                onShowShortcuts();
              }}
            >
              Keyboard shortcuts
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
