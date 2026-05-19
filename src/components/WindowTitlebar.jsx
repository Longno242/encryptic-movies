import { useState, useEffect, useCallback } from "react";

/** Windows-only custom title bar with minimize / maximize / close. */
export default function WindowTitlebar() {
  const [maximized, setMaximized] = useState(false);

  const applyMaximized = useCallback((value) => {
    setMaximized(value);
    if (value) {
      document.documentElement.setAttribute("data-maximized", "1");
    } else {
      document.documentElement.removeAttribute("data-maximized");
    }
  }, []);

  useEffect(() => {
    if (!window.electron) return;

    window.electron.windowIsMaximized?.().then(applyMaximized);
    const handler = window.electron.onWindowMaximize?.(applyMaximized);

    return () => {
      window.electron?.offWindowMaximize?.(handler);
      document.documentElement.removeAttribute("data-maximized");
    };
  }, [applyMaximized]);

  return (
    <header
      className="window-titlebar"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 32,
        zIndex: 10000,
        background: "var(--bg)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        userSelect: "none",
        WebkitAppRegion: "drag",
      }}
    >
      <span
        className="window-titlebar-brand"
        style={{
          paddingLeft: 12,
          fontSize: 11,
          flexGrow: 1,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          fontFamily: "var(--font-display)",
        }}
      >
        Encryptic Movies
      </span>

      <nav
        aria-label="Window controls"
        style={{ display: "flex", height: "100%", WebkitAppRegion: "no-drag" }}
      >
        <WinBtn title="Minimize" hoverBg="rgba(255,255,255,0.08)" onClick={() => window.electron?.windowMinimize?.()}>
          <line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.2" />
        </WinBtn>
        <WinBtn
          title={maximized ? "Restore" : "Maximize"}
          hoverBg="rgba(255,255,255,0.08)"
          onClick={() => window.electron?.windowToggleMaximize?.()}
        >
          {maximized ? <RestoreGlyph /> : <MaximizeGlyph />}
        </WinBtn>
        <WinBtn
          title="Close"
          hoverBg="rgba(139,92,246,0.85)"
          onClick={() => window.electron?.windowClose?.()}
        >
          <CloseGlyph />
        </WinBtn>
      </nav>
    </header>
  );
}

function WinBtn({ children, onClick, hoverBg, title }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 46,
        height: "100%",
        background: hovered ? hoverBg : "transparent",
        border: "none",
        cursor: "default",
        color: hovered ? "#fff" : "rgba(255,255,255,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.15s, color 0.15s",
        flexShrink: 0,
      }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
        {children}
      </svg>
    </button>
  );
}

function MaximizeGlyph() {
  return (
    <rect x="0.5" y="0.5" width="9" height="9" rx="0.5" stroke="currentColor" strokeWidth="1" />
  );
}

function RestoreGlyph() {
  return (
    <>
      <rect x="2" y="0" width="8" height="8" rx="0.5" stroke="currentColor" strokeWidth="1" />
      <rect x="0" y="2" width="8" height="8" rx="0.5" stroke="currentColor" strokeWidth="1" style={{ fill: "var(--bg)" }} />
    </>
  );
}

function CloseGlyph() {
  return (
    <>
      <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2" />
      <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.2" />
    </>
  );
}
