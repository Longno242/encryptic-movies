import { useEffect, useRef, useState, useCallback } from "react";
import { CloseIcon, ExternalLinkIcon } from "./Icons";
import { storage } from "../utils/storage";

export const DEFAULT_INVIDIOUS_BASE = "https://inv.nadeko.net";

const FALLBACK_INSTANCES = [
  "https://invidious.privacyredirect.com",
  "https://inv.tux.pizza",
  "https://yt.cdaut.de",
  "https://invidious.lunar.icu",
  "https://invidious.protokolla.fi",
  "https://invidious.nerdvpn.de",
  "https://iv.melmac.space",
  "https://invidious.perennialte.ch",
];

export function getInvidiousBase() {
  return (storage.get("invidiousBase") || DEFAULT_INVIDIOUS_BASE).replace(/\/$/, "");
}

const DETECT_BOT_JS = `
(function() {
  var title = (document.title || '').toLowerCase()
  var body  = (document.body  && document.body.innerText || '').toLowerCase()
  var botKeywords = ['verifying', 'antibot', 'challenge', 'ddos', 'please wait', 'checking your browser', 'just a moment']
  return botKeywords.some(function(k) { return title.includes(k) || body.includes(k) })
})()
`;

const SETUP_JS = `
(function() {
  if (window.__trailerSetup) return
  window.__trailerSetup = true
  var style = document.createElement('style')
  style.textContent = '.player-container .invidious-link, a[href*="/watch"], .vjs-invidious-button { display: none !important; }'
  document.head.appendChild(style)
  var attachEnded = function() {
    var video = document.querySelector('video')
    if (!video) return false
    video.addEventListener('ended', function() { window.__trailerEnded = true })
    return true
  }
  if (!attachEnded()) {
    var obs = new MutationObserver(function() { if (attachEnded()) obs.disconnect() })
    obs.observe(document.body, { childList: true, subtree: true })
  }
})()
`;

function openExternal(url) {
  window.electron?.openExternal?.(url);
}

export default function TrailerModal({ trailerKey, title, onClose }) {
  const webviewRef = useRef(null);
  const [currentSrc, setCurrentSrc] = useState(null);
  const [statusMsg, setStatusMsg] = useState("Loading trailer…");
  const [failed, setFailed] = useState(false);
  const instanceIndexRef = useRef(-1);

  const tryNextInstance = useCallback(() => {
    const preferred = getInvidiousBase();
    const list = [preferred, ...FALLBACK_INSTANCES.filter((i) => i !== preferred)];
    instanceIndexRef.current += 1;
    const idx = instanceIndexRef.current;

    if (idx >= list.length) {
      setFailed(true);
      setStatusMsg(
        "All Invidious instances failed. Set a custom instance in Encryptic Movies Settings.",
      );
      return;
    }

    const instance = list[idx];
    const label = instance.replace(/^https?:\/\//, "");
    setStatusMsg(idx === 0 ? "Loading trailer…" : `Trying ${label}…`);
    setCurrentSrc(`${instance}/embed/${trailerKey}?autoplay=1&listen=0`);
  }, [trailerKey]);

  useEffect(() => {
    instanceIndexRef.current = -1;
    tryNextInstance();
  }, [tryNextInstance]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const openInBrowser = () => {
    openExternal(`${getInvidiousBase()}/watch?v=${trailerKey}`);
  };

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv || !currentSrc) return;

    const onLoad = () => {
      wv.executeJavaScript(DETECT_BOT_JS)
        .then((isBot) => {
          if (isBot) tryNextInstance();
          else {
            wv.executeJavaScript(SETUP_JS).catch(() => {});
            setStatusMsg(null);
          }
        })
        .catch(() => tryNextInstance());
    };

    const onFailLoad = () => tryNextInstance();

    const onWillNavigate = (e) => {
      const instanceBase = currentSrc.split("/embed/")[0];
      if (!e.url.startsWith(instanceBase)) {
        e.preventDefault();
        openExternal(e.url);
      }
    };

    const endedPoll = setInterval(() => {
      wv.executeJavaScript("!!window.__trailerEnded")
        .then((ended) => {
          if (ended) {
            clearInterval(endedPoll);
            setTimeout(onClose, 1200);
          }
        })
        .catch(() => {});
    }, 800);

    wv.addEventListener("did-finish-load", onLoad);
    wv.addEventListener("did-fail-load", onFailLoad);
    wv.addEventListener("will-navigate", onWillNavigate);

    return () => {
      clearInterval(endedPoll);
      wv.removeEventListener("did-finish-load", onLoad);
      wv.removeEventListener("did-fail-load", onFailLoad);
      wv.removeEventListener("will-navigate", onWillNavigate);
    };
  }, [currentSrc, tryNextInstance, onClose]);

  return (
    <div className="trailer-overlay" onClick={onClose}>
      <div className="trailer-modal" onClick={(e) => e.stopPropagation()}>
        <header className="trailer-modal-header">
          <span className="trailer-modal-title">{title} — Trailer</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={openInBrowser}
              title="Open in browser"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 6,
                color: "rgba(255,255,255,0.75)",
                cursor: "pointer",
                fontSize: 12,
                padding: "4px 10px",
                display: "flex",
                alignItems: "center",
                gap: 5,
                whiteSpace: "nowrap",
              }}
            >
              <ExternalLinkIcon size={13} />
              Open in browser
            </button>
            <button type="button" className="trailer-close-btn" onClick={onClose} title="Close">
              <CloseIcon />
            </button>
          </div>
        </header>

        <div className="trailer-embed-wrap" style={{ background: "#000", position: "relative" }}>
          {(statusMsg || failed) && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "#000",
                color: failed ? "#ff3860" : "rgba(255,255,255,0.6)",
                fontSize: 14,
                textAlign: "center",
                padding: "0 32px",
                gap: 10,
              }}
            >
              {failed ? (
                <>
                  <span style={{ fontSize: 28 }}>⚠</span>
                  <span>{statusMsg}</span>
                </>
              ) : (
                <>
                  <span style={{ opacity: 0.5 }}>⏳</span>
                  <span>{statusMsg}</span>
                </>
              )}
            </div>
          )}

          {currentSrc && (
            <webview
              ref={webviewRef}
              src={currentSrc}
              partition="persist:trailer"
              allowpopups="false"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                border: "none",
                opacity: statusMsg ? 0 : 1,
                transition: "opacity 0.2s",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
