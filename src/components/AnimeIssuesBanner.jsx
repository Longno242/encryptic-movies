/**
 * Warns users that anime playback is unstable while Project Encryptic works on a fix.
 */
export default function AnimeIssuesBanner({ variant = "default", className = "" }) {
  return (
    <div
      className={`anime-issues-banner anime-issues-banner--${variant}${className ? ` ${className}` : ""}`}
      role="alert"
      aria-live="polite"
    >
      <span className="anime-issues-banner__icon" aria-hidden>
        ⚠
      </span>
      <div className="anime-issues-banner__body">
        <div className="anime-issues-banner__title">
          Anime playback — try different servers
        </div>
        <p className="anime-issues-banner__text">
          Anime uses the same TMDB servers as movies (Neon, VidSrc, 2Embed). Some
          episodes may still fail depending on the host. Project Encryptic is
          improving reliability.
        </p>
        {variant === "player" ? (
          <p className="anime-issues-banner__hint">
            No subtitles? Set <strong className="anime-issues-banner__cta">Player language</strong>{" "}
            in Settings (English), keep <strong className="anime-issues-banner__cta">SUB</strong> on,
            and try <strong className="anime-issues-banner__cta">VidSrc</strong> or{" "}
            <strong className="anime-issues-banner__cta">2Embed</strong> — hosts vary by show.
          </p>
        ) : (
          <p className="anime-issues-banner__hint">
            If an episode won&apos;t play, open the player and use{" "}
            <strong className="anime-issues-banner__cta">Source</strong> to try
            Neon, VidSrc, or 2Embed.
          </p>
        )}
      </div>
    </div>
  );
}
