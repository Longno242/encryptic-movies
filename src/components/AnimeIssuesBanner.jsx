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
          Ongoing issues with anime movies &amp; series
        </div>
        <p className="anime-issues-banner__text">
          Some anime titles may play normally; others may fail to load or buffer.
          Project Encryptic is actively working on a fix.
        </p>
        {variant === "player" ? (
          <p className="anime-issues-banner__hint">
            If playback fails, click the{" "}
            <strong className="anime-issues-banner__cta">Source</strong> button
            on the player (bottom-left) and try a different server.
          </p>
        ) : (
          <p className="anime-issues-banner__hint">
            When watching, use the{" "}
            <strong className="anime-issues-banner__cta">Source</strong> button
            on the player to switch servers if a title does not load.
          </p>
        )}
      </div>
    </div>
  );
}
