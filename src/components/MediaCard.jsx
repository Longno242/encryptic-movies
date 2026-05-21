import { useState, useEffect, useRef, useCallback, memo } from "react";
import { imgUrl, isAnimeContent } from "../utils/api";
import { isFreeMetadataMode } from "../utils/metadataMode";
import { itemHasPoster, resolveFreePoster } from "../utils/freePosterResolver";
import {
  PlayIcon,
  FilmIcon,
  TVIcon,
  WatchedIcon,
  RatingShieldIcon,
  RatingLockIcon,
} from "./Icons";

const MediaCard = memo(function MediaCard({
  item,
  onClick,
  progress,
  watched,
  onMarkWatched,
  onMarkUnwatched,
  ageRating,
  restricted,
  modern = true,
  launching = false,
  staggerIndex = 0,
  pickMode = false,
  isPicked = false,
  onQuickPlay,
  onQuickAdd,
  onQuickSave,
  showQuickActions = true,
}) {
  const [fallbackPoster, setFallbackPoster] = useState(null);
  const posterFallbackTried = useRef(false);

  useEffect(() => {
    setFallbackPoster(null);
    posterFallbackTried.current = false;
  }, [item?.id, item?.poster_path, item?.media_type, item?._source]);

  const primaryPosterSrc = itemHasPoster(item)
    ? imgUrl(item.poster_path, "w500")
    : null;

  useEffect(() => {
    if (!isFreeMetadataMode() || primaryPosterSrc || fallbackPoster) return;
    let cancelled = false;
    resolveFreePoster(item).then((url) => {
      if (!cancelled && url) setFallbackPoster(url);
    });
    return () => {
      cancelled = true;
    };
  }, [item, primaryPosterSrc, fallbackPoster]);

  const posterSrc = primaryPosterSrc || fallbackPoster;
  const [pressing, setPressing] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [ripple, setRipple] = useState(null);
  const cardRef = useRef(null);

  const title = item.title || item.name;
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const isTV = item.media_type === "tv";
  const isAnime = isAnimeContent(item);
  const score = item.vote_average > 0 ? item.vote_average.toFixed(1) : null;
  const scorePct = item.vote_average
    ? Math.min(100, Math.round((item.vote_average / 10) * 100))
    : 0;

  const rawDate = item.release_date || item.first_air_date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isUnreleased = rawDate ? new Date(rawDate) > today : false;

  const watchedKey = isTV
    ? item.season != null && item.episode != null
      ? `tv_${item.id}_s${item.season}e${item.episode}`
      : `tv_${item.id}`
    : `movie_${item.id}`;

  const isWatched = !!watched?.[watchedKey];
  const canMarkWatched = !isTV || (item.season != null && item.episode != null);

  const [menu, setMenu] = useState(null);
  const menuRef = useRef(null);

  const openMenu = useCallback(
    (e) => {
      if (!canMarkWatched) return;
      e.preventDefault();
      e.stopPropagation();
      setMenu({ x: e.clientX, y: e.clientY });
    },
    [canMarkWatched],
  );

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
    };
  }, [menu]);

  const handleTilt = useCallback((e) => {
    if (pickMode) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 10, y: -y * 10 });
  }, [pickMode]);

  const resetTilt = useCallback(() => setTilt({ x: 0, y: 0 }), []);

  const handleClick = (e) => {
    if (pickMode && onQuickAdd) {
      e.stopPropagation();
      onQuickAdd(item);
      return;
    }
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setRipple({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setTimeout(() => setRipple(null), 500);
    }
    onClick?.(e);
  };

  const badgeClass = isUnreleased
    ? "card-badge--unreleased"
    : isAnime
      ? "card-badge--anime"
      : isTV
        ? "card-badge--tv"
        : "card-badge--hd";

  const badgeLabel = isUnreleased
    ? "SOON"
    : isAnime
      ? "ANIME"
      : isTV
        ? "SERIES"
        : "FILM";

  return (
    <>
      <article
        ref={cardRef}
        className={[
          "card",
          modern && "card--cinema",
          modern && "card--modern",
          launching && "card--launching",
          pressing && "card--pressing",
          staggerIndex >= 0 && "card--stagger",
          isWatched && "ep-watched",
          isUnreleased && "card--unreleased",
          pickMode && "card--pick-mode",
          isPicked && "card--picked",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          "--card-i": staggerIndex,
          "--tilt-x": `${tilt.x}deg`,
          "--tilt-y": `${tilt.y}deg`,
        }}
        onClick={handleClick}
        onContextMenu={isUnreleased ? undefined : openMenu}
        onPointerDown={() => setPressing(true)}
        onPointerUp={() => setPressing(false)}
        onPointerLeave={() => {
          setPressing(false);
          resetTilt();
        }}
        onPointerCancel={() => setPressing(false)}
        onMouseMove={modern && !pickMode ? handleTilt : undefined}
        onMouseLeave={modern ? resetTilt : undefined}
      >
        {ripple && (
          <span
            className="card-ripple"
            style={{ left: ripple.x, top: ripple.y }}
            aria-hidden
          />
        )}

        {pickMode && (
          <div className="card-pick-ring" aria-hidden>
            <span className="card-pick-icon">{isPicked ? "✓" : "+"}</span>
          </div>
        )}

        <div className="card-ambient" aria-hidden />
        <div className="card-inner">
          <div className="card-poster">
            {posterSrc ? (
              <img
                src={posterSrc}
                alt=""
                loading="lazy"
                decoding="async"
                onError={async () => {
                  if (posterFallbackTried.current) return;
                  posterFallbackTried.current = true;
                  if (!isFreeMetadataMode()) return;
                  const url = await resolveFreePoster(item);
                  if (url) setFallbackPoster(url);
                }}
              />
            ) : (
              <div className="no-poster">
                {isTV ? <TVIcon /> : <FilmIcon />}
                <span>No poster</span>
              </div>
            )}

            <div className="card-grain" aria-hidden />
            <div className="card-vignette" aria-hidden />
            <div className="card-shine" aria-hidden />

            <div className="card-meta-top">
              {score && !isUnreleased && (
                <div
                  className="card-score-ring"
                  style={{ "--score": scorePct }}
                  title={`${score}/10`}
                >
                  <svg viewBox="0 0 36 36" className="card-score-svg">
                    <circle className="card-score-bg" cx="18" cy="18" r="15" />
                    <circle className="card-score-fill" cx="18" cy="18" r="15" />
                  </svg>
                  <span className="card-score-num">{score}</span>
                </div>
              )}
              <span className={`card-badge ${badgeClass}`}>{badgeLabel}</span>
            </div>

            {ageRating && (
              <div
                className={`card-age-badge${restricted ? " card-age-badge--restricted" : ""}`}
              >
                {restricted ? (
                  <RatingLockIcon size={9} />
                ) : (
                  <RatingShieldIcon size={9} />
                )}
                {ageRating}
              </div>
            )}

            <div className="card-bottom-stack">
              <div className="card-info-overlay">
                <h3 className="card-title" title={title}>
                  {title}
                </h3>
                <div className="card-year">
                  {year && <span>{year}</span>}
                  {year && <span className="card-year-dot" />}
                  <span>{isTV ? "TV Series" : "Movie"}</span>
                </div>
              </div>

              {!isUnreleased && showQuickActions && !pickMode && (
                <div className="card-quick-actions">
                  <button
                    type="button"
                    className="card-quick-btn card-quick-btn--play"
                    title="Play"
                    onClick={(e) => {
                      e.stopPropagation();
                      (onQuickPlay || onClick)?.(e);
                    }}
                  >
                    <PlayIcon />
                  </button>
                  {onQuickSave && (
                    <button
                      type="button"
                      className="card-quick-btn"
                      title="Watchlist"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickSave(item);
                      }}
                    >
                      ★
                    </button>
                  )}
                  {onQuickAdd && (
                    <button
                      type="button"
                      className="card-quick-btn"
                      title="Add to list"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickAdd(item);
                      }}
                    >
                      +
                    </button>
                  )}
                </div>
              )}

              {!isUnreleased && !pickMode && !showQuickActions && (
                <div className="card-hover-cta">
                  <span className="card-play-pill">
                    <PlayIcon />
                    <span>Watch</span>
                  </span>
                </div>
              )}

              {pickMode && !isUnreleased && (
                <div className="card-hover-cta card-hover-cta--pick">
                  <span className="card-play-pill">
                    {isPicked ? "Added" : "Tap to add"}
                  </span>
                </div>
              )}
            </div>

            {isUnreleased && (
              <div className="card-overlay card-overlay--soon">
                <span className="card-unreleased-label">Coming soon</span>
              </div>
            )}

            {!isUnreleased && progress > 0 && !isWatched && (
              <div className="card-progress">
                <div
                  className="card-progress-fill"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            )}

            {!isUnreleased && isWatched && (
              <div className="card-watched-badge">
                <WatchedIcon size={28} />
              </div>
            )}
          </div>
        </div>
      </article>

      {menu && (
        <div
          ref={menuRef}
          className="context-menu context-menu--glass"
          style={{ top: menu.y, left: menu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {isWatched ? (
            <button
              type="button"
              className="context-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                onMarkUnwatched?.(watchedKey);
                setMenu(null);
              }}
            >
              Mark as unwatched
            </button>
          ) : (
            <button
              type="button"
              className="context-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                onMarkWatched?.(watchedKey);
                setMenu(null);
              }}
            >
              Mark as watched
            </button>
          )}
        </div>
      )}
    </>
  );
});

export default MediaCard;
