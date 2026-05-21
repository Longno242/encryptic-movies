import { useState } from "react";
import { EncrypticLogo, PlayIcon } from "./Icons";
import SetupScreen from "./SetupScreen";
import { setMetadataMode } from "../utils/metadataMode";

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

/**
 * First-run gate: TMDB API key path or free catalog (TVMaze + AniList).
 */
export default function CatalogSetup({
  savedApiKey,
  apiKeyStatus = "ok",
  onUseSavedApiKey,
  onSaveApiKey,
  onContinueFree,
  onOpenDocs,
}) {
  const [step, setStep] = useState("choice");
  const canUseSaved =
    !!savedApiKey &&
    apiKeyStatus === "ok" &&
    typeof onUseSavedApiKey === "function";

  if (step === "tmdb") {
    return (
      <SetupScreen
        onSave={(key) => {
          setMetadataMode("tmdb");
          onSaveApiKey(key);
        }}
        onBack={() => setStep("choice")}
        onOpenDocs={onOpenDocs}
      />
    );
  }

  return (
    <div className="apikey-modal">
      <div className="apikey-box" style={{ maxWidth: 520 }}>
        <div className="apikey-logo-wrap">
          <EncrypticLogo className="apikey-logo-img" />
        </div>

        <p className="apikey-lead">How do you want to browse?</p>
        <p className="apikey-sub" style={{ marginBottom: 24 }}>
          Pick how you want to browse. You won&apos;t see this again until you
          change catalog mode in Settings.
        </p>

        {canUseSaved && (
          <>
            <button
              type="button"
              className="btn btn-primary apikey-submit"
              style={{ width: "100%", marginBottom: 12 }}
              onClick={onUseSavedApiKey}
            >
              <PlayIcon /> Continue with saved TMDB key
            </button>
            <p
              style={{
                fontSize: 12,
                color: "var(--text3)",
                margin: "0 0 20px",
                lineHeight: 1.5,
              }}
            >
              Your API key is already stored — tap above to sign in without
              pasting it again.
            </p>
          </>
        )}

        <button
          type="button"
          className={canUseSaved ? "btn btn-ghost" : "btn btn-primary apikey-submit"}
          style={{
            width: "100%",
            marginBottom: 12,
            ...(canUseSaved
              ? { padding: "14px 16px", border: "1px solid var(--border)", borderRadius: 10 }
              : {}),
          }}
          onClick={() => setStep("tmdb")}
        >
          <PlayIcon /> {canUseSaved ? "Enter a different TMDB key" : "Continue with TMDB API key"}
        </button>
        <p style={{ fontSize: 12, color: "var(--text3)", margin: "0 0 20px", lineHeight: 1.5 }}>
          Full library: movies, TV, anime, posters, and cast. Free token from{" "}
          <ExternalLink
            className="apikey-link"
            href="https://www.themoviedb.org/settings/api"
          >
            themoviedb.org
          </ExternalLink>
          .
        </p>

        <button
          type="button"
          className="btn btn-ghost"
          style={{
            width: "100%",
            padding: "14px 16px",
            border: "1px solid var(--border)",
            borderRadius: 10,
          }}
          onClick={() => {
            setMetadataMode("free");
            onContinueFree();
          }}
        >
          Continue without API key
        </button>
        <p style={{ fontSize: 12, color: "var(--text3)", margin: "12px 0 0", lineHeight: 1.5 }}>
          TV via <strong style={{ color: "var(--text2)" }}>TVMaze</strong> and anime via{" "}
          <strong style={{ color: "var(--text2)" }}>AniList</strong> — no key needed for those.
          Home rows like <strong style={{ color: "var(--text2)" }}>New Releases</strong> and{" "}
          <strong style={{ color: "var(--text2)" }}>Trending Movies</strong> still need a free
          TMDB token (use the option above).
        </p>
      </div>
    </div>
  );
}
