import { useState } from "react";
import { secureStorage, STORAGE_KEYS } from "../utils/storage";

const CARD_STYLE = {
  background: "var(--bg2)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "28px 32px",
  width: 440,
  maxWidth: "90vw",
  boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
};

export default function WyzieKeyModal({ onDone, onSkip }) {
  const [manualKey, setManualKey] = useState("");
  const [phase, setPhase] = useState("prompt");
  const [errorMsg, setErrorMsg] = useState("");

  const isElectron = typeof window !== "undefined" && !!window.electron;

  const finish = async (key) => {
    const trimmed = key.trim();
    await secureStorage.set(STORAGE_KEYS.WYZIE_API_KEY, trimmed);
    setPhase("success");
    setTimeout(() => onDone(trimmed), 1000);
  };

  const submitManual = async () => {
    const key = manualKey.trim();
    if (!key) return;
    setPhase("validating");
    setErrorMsg("");
    try {
      const res = isElectron
        ? await window.electron.wyzieValidateKey(key)
        : { ok: true };
      if (res.ok) await finish(key);
      else {
        setPhase("manual");
        setErrorMsg(res.error || "Invalid key — try again.");
      }
    } catch (e) {
      setPhase("manual");
      setErrorMsg(e.message);
    }
  };

  const redeem = async () => {
    if (!isElectron) return;
    setPhase("redeeming");
    setErrorMsg("");
    try {
      const res = await window.electron.wyzieOpenRedeem();
      if (res.cancelled) {
        setPhase("prompt");
        return;
      }
      if (res.timeout) {
        setPhase("timeout");
        return;
      }
      if (res.ok && res.key) await finish(res.key);
      else {
        setPhase("prompt");
        setErrorMsg("Could not read the API key. Paste it manually instead.");
      }
    } catch (e) {
      setPhase("prompt");
      setErrorMsg(e.message);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => e.target === e.currentTarget && onSkip()}
      role="dialog"
      aria-modal="true"
    >
      <div style={CARD_STYLE}>
        <header style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "rgba(180,130,255,0.15)",
              border: "1px solid rgba(180,130,255,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            🔑
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
              Wyzie Subs API key
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text3)" }}>
              Free — no account required
            </p>
          </div>
        </header>

        {(phase === "prompt" || phase === "error") && (
          <>
            <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.65, marginBottom: 22 }}>
              Encryptic Movies uses Wyzie for subtitle search. Claim a free key with a quick captcha — no sign-up.
              {errorMsg && <ErrorBanner message={errorMsg} />}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: "100%", padding: "10px 0", fontSize: 13 }}
                onClick={redeem}
              >
                Get free key (opens redeem page)
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: "100%", padding: "9px 0", fontSize: 13 }}
                onClick={() => {
                  setPhase("manual");
                  setErrorMsg("");
                }}
              >
                I already have a key
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: "100%", padding: "8px 0", fontSize: 12, color: "var(--text3)" }}
                onClick={onSkip}
              >
                Skip — continue without Wyzie
              </button>
            </div>
          </>
        )}

        {phase === "manual" && (
          <>
            <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 14, lineHeight: 1.6 }}>
              Paste your Wyzie key (e.g.{" "}
              <code style={{ color: "var(--text)", fontSize: 11 }}>wyzie-xxxxxxxx</code>).
            </p>
            <input
              className="apikey-input"
              style={{ width: "100%", marginBottom: 10, boxSizing: "border-box" }}
              type="text"
              placeholder="wyzie-…"
              value={manualKey}
              autoFocus
              onChange={(e) => setManualKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitManual()}
            />
            {errorMsg && <ErrorBanner message={errorMsg} />}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: "7px 14px" }}
                onClick={() => {
                  setPhase("prompt");
                  setErrorMsg("");
                }}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, fontSize: 13, padding: "8px 0" }}
                onClick={submitManual}
                disabled={!manualKey.trim()}
              >
                Validate &amp; save
              </button>
            </div>
          </>
        )}

        {phase === "redeeming" && <StatusPanel icon="🌐" title="Complete the captcha in the popup" body="Encryptic Movies will save your key automatically…" />}
        {phase === "validating" && <StatusPanel icon="⏳" title="Validating key…" />}
        {phase === "success" && (
          <StatusPanel icon="✅" title="Key saved!" body="Loading subtitles…" success />
        )}

        {phase === "timeout" && (
          <>
            <StatusPanel
              icon="⏱️"
              title="No key received"
              body="The captcha may not have finished, or the redirect failed."
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
              <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={redeem}>
                Try again
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: "100%" }}
                onClick={() => {
                  setPhase("manual");
                  setErrorMsg("");
                }}
              >
                Enter key manually
              </button>
              <button type="button" className="btn btn-ghost" style={{ width: "100%", color: "var(--text3)" }} onClick={onSkip}>
                Skip
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div
      style={{
        marginTop: 10,
        padding: "8px 12px",
        borderRadius: 6,
        background: "rgba(255,80,80,0.1)",
        border: "1px solid rgba(255,80,80,0.25)",
        color: "#ff6060",
        fontSize: 12,
      }}
    >
      {message}
    </div>
  );
}

function StatusPanel({ icon, title, body, success }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "24px 0",
        color: success ? "#63cab7" : "var(--text3)",
        fontSize: success ? 14 : 13,
        fontWeight: success ? 600 : 400,
      }}
    >
      <div style={{ fontSize: 28, marginBottom: body ? 12 : 0 }}>{icon}</div>
      <div style={{ color: success ? undefined : "var(--text)", fontWeight: 600, marginBottom: body ? 6 : 0 }}>
        {title}
      </div>
      {body}
    </div>
  );
}
