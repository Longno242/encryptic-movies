import { ExternalLinkIcon } from "./Icons";

const TMDB_API_URL = "https://www.themoviedb.org/settings/api";

const SHORTCUTS = [
  { keys: ["Ctrl", "F"], desc: "Open search" },
  { keys: ["Ctrl", "K"], desc: "Search on current page" },
  { keys: ["Esc"], desc: "Close search or modal" },
  { keys: ["Ctrl", "Z"], desc: "Navigate back" },
  { keys: ["Ctrl", "R"], desc: "Reload Encryptic Movies" },
  { keys: ["?"], desc: "Show this shortcuts panel" },
];

function openExternal(url) {
  window.electron?.openExternal?.(url);
}

export default function KeyboardShortcutsModal({ onClose }) {
  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5000,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "36px 40px",
          minWidth: 380,
          maxWidth: 480,
          width: "90%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 28,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: 22,
              letterSpacing: 1,
              color: "var(--text)",
            }}
          >
            Encryptic Movies shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--text3)",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              width: 28,
              height: 28,
            }}
          >
            ×
          </button>
        </header>

        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {SHORTCUTS.map(({ keys, desc }) => (
            <li
              key={desc}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "10px 14px",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 14, color: "var(--text2)" }}>{desc}</span>
              <span style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {keys.map((k) => (
                  <kbd
                    key={k}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "3px 9px",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderBottom: "2px solid rgba(255,255,255,0.12)",
                      borderRadius: 5,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text)",
                      fontFamily: "monospace",
                      minWidth: 28,
                    }}
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>

        <div
          style={{
            marginTop: 20,
            padding: "14px 16px",
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>
              TMDB token issues?
            </div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>
              Regenerate your Read Access Token if browsing stops working.
            </div>
          </div>
          <button
            type="button"
            onClick={() => openExternal(TMDB_API_URL)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text)",
              cursor: "pointer",
            }}
          >
            <ExternalLinkIcon size={13} />
            TMDB API
          </button>
        </div>

        <p style={{ marginTop: 12, fontSize: 12, color: "var(--text3)", textAlign: "center" }}>
          Press <kbd>?</kbd> or <kbd>Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}
