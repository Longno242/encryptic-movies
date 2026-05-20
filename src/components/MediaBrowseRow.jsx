import { memo, useRef, useState, useCallback, useEffect } from "react";
import MediaCard from "./MediaCard";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";

const MediaBrowseRow = memo(function MediaBrowseRow({
  rowId,
  title,
  titleHighlight = null,
  items,
  onSelect,
  onSelectWithFx,
  watched,
  onMarkWatched,
  onMarkUnwatched,
  ratingsMap = {},
  launchingKey = null,
  rowIndex = 0,
  pickMode = false,
  onQuickAdd,
  onQuickSave,
  activePickListId = null,
  isItemPicked,
  progressMap = null,
  onSeeAll = null,
  seeAllLabel = "See all",
}) {
  const scrollerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollHints = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  const scrollBy = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(320, el.clientWidth * 0.85), behavior: "smooth" });
  };

  useEffect(() => {
    updateScrollHints();
    const t = window.setTimeout(updateScrollHints, 100);
    return () => window.clearTimeout(t);
  }, [items, updateScrollHints]);

  if (!items?.length) return null;

  return (
    <section
      id={`home-row-${rowId}`}
      className="browse-row"
      style={{
        "--row-stagger": `${Math.min(items.length, 12)}`,
        "--row-i": rowIndex,
      }}
    >
      <div className="browse-row__head">
        <h2 className="browse-row__title">
          {titleHighlight ? (
            <>
              {title}
              <span className="browse-row__title-accent">{titleHighlight}</span>
            </>
          ) : (
            title
          )}
        </h2>
        <div className="browse-row__nav">
          {onSeeAll && (
            <button
              type="button"
              className="browse-row__see-all"
              onClick={onSeeAll}
            >
              {seeAllLabel}
            </button>
          )}
          <button
            type="button"
            className="browse-row__arrow"
            disabled={!canScrollLeft}
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            className="browse-row__arrow"
            disabled={!canScrollRight}
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      <div
        className="browse-row__track-wrap"
        onMouseEnter={updateScrollHints}
      >
        <div
          ref={scrollerRef}
          className="browse-row__track"
          onScroll={updateScrollHints}
        >
          {items.map((item, index) => {
            const type = item.media_type === "tv" ? "tv" : "movie";
            const rk = `${type}_${item.id}`;
            const rd = ratingsMap[rk] || {};
            const cardKey = `${type}_${item.id}`;
            const progressKey =
              progressMap && type === "tv" && item.season != null
                ? `tv_${item.id}_s${item.season}e${item.episode}`
                : progressMap
                  ? `movie_${item.id}`
                  : null;
            const pct =
              progressKey && progressMap ? progressMap[progressKey] || 0 : 0;
            const handleClick = () => {
              if (onSelectWithFx) onSelectWithFx(item, cardKey);
              else onSelect?.(item);
            };
            return (
              <div
                key={cardKey}
                className="browse-row__slot"
                style={{ "--slot-i": index }}
              >
                <MediaCard
                  item={item}
                  onClick={handleClick}
                  progress={pct}
                  watched={watched}
                  onMarkWatched={onMarkWatched}
                  onMarkUnwatched={onMarkUnwatched}
                  ageRating={rd.cert}
                  restricted={rd.restricted}
                  modern
                  staggerIndex={index}
                  launching={launchingKey === cardKey}
                  pickMode={pickMode}
                  isPicked={
                    isItemPicked
                      ? isItemPicked(item)
                      : false
                  }
                  onQuickAdd={onQuickAdd}
                  onQuickSave={onQuickSave}
                  onQuickPlay={handleClick}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});

export default MediaBrowseRow;
