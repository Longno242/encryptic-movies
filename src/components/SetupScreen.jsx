import { useState, useEffect, useRef } from "react";
import { EncrypticLogo, PlayIcon } from "./Icons";

const TMDB_BASE = "https://api.themoviedb.org/3";

async function validateToken(token) {
  try {
    const configRes = await fetch(`${TMDB_BASE}/configuration`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(7000),
    });

    if (configRes.status === 401) return { ok: false, reason: "invalid_token" };
    if (configRes.status === 403) return { ok: false, reason: "forbidden" };
    if (!configRes.ok) {
      return { ok: false, reason: "tmdb_error", status: configRes.status };
    }

    const trendingRes = await fetch(`${TMDB_BASE}/trending/movie/week`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(7000),
    });
    if (!trendingRes.ok) {
      return { ok: false, reason: "api_error", status: trendingRes.status };
    }

    return { ok: true };
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "unreachable" };
  }
}

function describeError(reason, status) {
  switch (reason) {
    case "invalid_token":
      return {
        title: "Invalid token",
        body: "TMDB rejected the token (401). Copy the long JWT Read Access Token from your API settings, not the shorter API Key.",
      };
    case "forbidden":
      return {
        title: "Access denied",
        body: "TMDB returned 403. Your account may be suspended or the token may have been revoked.",
      };
    case "timeout":
      return {
        title: "Request timed out",
        body: "TMDB took too long to respond. Check your connection and try again.",
      };
    case "unreachable":
      return {
        title: "Cannot reach TMDB",
        body: "No connection to api.themoviedb.org. Check your internet connection.",
      };
    default:
      return {
        title: "Something went wrong",
        body: `TMDB returned an unexpected error${status ? ` (HTTP ${status})` : ""}. Try again shortly.`,
      };
  }
}

function ExternalLink({ href, className, children }) {
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        window.electron?.openExternal?.(href);
      }}
    >
      {children}
    </a>
  );
}

async function openTutorial() {
  if (!window.electron?.getInstallPath) return;
  const base = await window.electron.getInstallPath();
  const path = `${base.replace(/\\/g, "/")}/tmdb-tutorial.md`;
  window.electron.openPath?.(path);
}

export default function SetupScreen({ onSave, onSkip, onBack, onOpenDocs }) {
  const [key, setKey] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [focused, setFocused] = useState(false);
  const [storeInfo, setStoreInfo] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => {
      window.focus();
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!window.electron?.getSecureStoreInfo) return;
    window.electron.getSecureStoreInfo().then((info) => {
      if (info?.ok) setStoreInfo(info);
    });
  }, []);

  const submit = async () => {
    const token = key.trim();
    if (!token) return;

    setChecking(true);
    setError(null);
    const result = await validateToken(token);
    setChecking(false);

    if (result.ok) onSave(token);
    else setError(describeError(result.reason, result.status));
  };

  const storageLabel =
    storeInfo?.storageType === "credential-manager"
      ? "Windows Credential Manager (not a readable text file)"
      : storeInfo?.encrypted
        ? "an encrypted file on this PC (DPAPI — not readable as plain text)"
        : "a protected file on this PC";

  return (
    <div className="apikey-modal">
      <div className="apikey-box">
        <div className="apikey-logo-wrap">
          <EncrypticLogo className="apikey-logo-img" />
        </div>

        <p className="apikey-lead">Connect your free TMDB account</p>

        <p className="apikey-sub">
          Paste your <strong>Read Access Token</strong> below. Get one at{" "}
          <ExternalLink
            className="apikey-link"
            href="https://www.themoviedb.org/settings/api"
          >
            themoviedb.org → Settings → API
          </ExternalLink>
          . Use the long JWT starting with <code>eyJ</code>, not the shorter API
          Key.{" "}
          <button
            type="button"
            className="apikey-link apikey-link-btn"
            onClick={openTutorial}
          >
            Step-by-step guide
          </button>
          {onOpenDocs && (
            <>
              {" · "}
              <button
                type="button"
                className="apikey-link apikey-link-btn"
                onClick={onOpenDocs}
              >
                Documentation
              </button>
            </>
          )}
        </p>

        <div className="apikey-secure-note" role="note">
          <div className="apikey-secure-title">🔒 Saved securely on this device</div>
          <p>
            Your token is saved in {storageLabel} and loaded{" "}
            <strong>automatically</strong> every time you open Encryptic Movies.
            It is <strong>not</strong> stored as plain text you can read in Notepad.
          </p>
          {storeInfo?.path && (
            <code className="apikey-secure-path">{storeInfo.path}</code>
          )}
          {storeInfo?.legacyFile && (
            <p className="apikey-secure-legacy">
              Old copy at <code>{storeInfo.legacyFile}</code> will be removed after
              you save again.
            </p>
          )}
        </div>

        <label className="apikey-input-label" htmlFor="tmdb-token">
          TMDB Read Access Token
        </label>
        <input
          id="tmdb-token"
          ref={inputRef}
          className={`apikey-input${error ? " apikey-input-error" : ""}`}
          placeholder="Paste your token (eyJ…)…"
          value={key}
          disabled={checking}
          onChange={(e) => {
            setKey(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && !checking && submit()}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            borderColor: error ? "#f44336" : focused ? "var(--red)" : undefined,
          }}
          autoComplete="off"
          spellCheck={false}
        />

        {error && (
          <div className="apikey-error-box" role="alert">
            <div className="apikey-error-title">⚠ {error.title}</div>
            <div className="apikey-error-body">{error.body}</div>
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary apikey-submit"
          disabled={!key.trim() || checking}
          onClick={submit}
        >
          {checking ? (
            <>
              <span className="apikey-spinner" /> Saving &amp; verifying…
            </>
          ) : (
            <>
              <PlayIcon /> Save token &amp; continue
            </>
          )}
        </button>

        {onBack && (
          <button type="button" className="apikey-skip" onClick={onBack}>
            ← Back
          </button>
        )}
        {onSkip && !onBack && (
          <button type="button" className="apikey-skip" onClick={onSkip}>
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
