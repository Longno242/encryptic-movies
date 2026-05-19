import { useState, useEffect, useRef, useCallback, memo } from "react";
import { imgUrl, isAnimeContent } from "../utils/api";
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
  modern = false,
  launching = false,
}) {
  const [pressing, setPressing] = useState(false);
  const title = item.title || item.name;
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const isTV = item.media_type === "tv";
  const isAnime = isAnimeContent(item);

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

  return (
    <>
      <article
        className={[
          "card",
          modern && "card--modern",
          launching && "card--launching",
          pressing && "card--pressing",
          isWatched && "ep-watched",
          isUnreleased && "card--unreleased",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={onClick}
        onContextMenu={isUnreleased ? undefined : openMenu}
        onPointerDown={() => setPressing(true)}
        onPointerUp={() => setPressing(false)}
        onPointerLeave={() => setPressing(false)}
        onPointerCancel={() => setPressing(false)}
      >
        <div className="card-poster">
          {item.poster_path ? (
            <img src={imgUrl(item.poster_path, "w342")} alt={title} loading="lazy" />
          ) : (
            <div className="no-poster">
              {isTV ? <TVIcon /> : <FilmIcon />}
              <span style={{ fontSize: 10, color: "var(--text3)" }}>No image</span>
            </div>
          )}

          {ageRating && (
            <div
              className={`card-age-badge${restricted ? " card-age-badge--restricted" : ""}`}
            >
              {restricted ? <RatingLockIcon size={9} /> : <RatingShieldIcon size={9} />}
              {ageRating}
            </div>
          )}

          <div className="card-overlay">
            {isUnreleased ? (
              <div className="card-unreleased-overlay">
                <span className="card-unreleased-label">Unreleased</span>
              </div>
            ) : (
              <div className="card-play">
                <PlayIcon />
              </div>
            )}
          </div>

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
              <WatchedIcon size={26} />
            </div>
          )}
        </div>

        <div className="card-info">
          <div className="card-title" title={title}>
            {title}
          </div>
          <div className="card-year">
            {year} · {isTV ? "Series" : "Movie"}
          </div>
        </div>

        <span
          className={`card-badge${isUnreleased ? " card-badge--unreleased" : ""}${isAnime && !isUnreleased ? " card-badge--anime" : ""}`}
        >
          {isUnreleased ? "SOON" : isAnime ? "ANIME" : isTV ? "TV" : "HD"}
        </span>
      </article>

      {menu && (
        <div
          ref={menuRef}
          className="context-menu"
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
