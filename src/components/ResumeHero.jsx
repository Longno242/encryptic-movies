import { PlayIcon } from "./Icons";
import { imgUrl } from "../utils/api";

export default function ResumeHero({ item, progressPct = 0, onResume, onInfo }) {
  if (!item) return null;

  const title = item.title || item.name;
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const backdrop = imgUrl(item.backdrop_path, "original") || imgUrl(item.poster_path, "w780");
  const pct = Math.min(100, Math.max(0, Number(progressPct) || 0));
  const epLabel =
    item.media_type === "tv" && item.season != null
      ? `Season ${item.season} · Episode ${item.episode}`
      : null;

  return (
    <section className="hero hero--premium hero--resume" aria-label="Continue watching">
      <div
        className="hero-bg"
        style={backdrop ? { backgroundImage: `url(${backdrop})` } : undefined}
      />
      <div className="hero-gradient" />
      <div className="hero-resume__progress" aria-hidden>
        <div className="hero-resume__progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="hero-content">
        <div className="hero-type">Continue watching</div>
        <h1 className="hero-title">{title}</h1>
        <div className="hero-meta">
          {epLabel && <span>{epLabel}</span>}
          {year && <span>{year}</span>}
          <span className="hero-resume__pct">{pct.toFixed(0)}% watched</span>
        </div>
        <div className="hero-actions">
          <button type="button" className="btn btn-primary" onClick={onResume}>
            <PlayIcon /> Resume
          </button>
          {onInfo && (
            <button type="button" className="btn btn-secondary" onClick={onInfo}>
              Details
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
