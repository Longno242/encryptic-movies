import { useState, useEffect, useMemo, useCallback } from "react";
import MediaCard from "../components/MediaCard";
import MediaBrowseRow from "../components/MediaBrowseRow";
import TrendingCarousel from "../components/TrendingCarousel";
import HomeCategoryHub from "../components/HomeCategoryHub";
import { buildDedupedRows } from "../utils/catalogDedupe";
import { PlayIcon, StarIcon } from "../components/Icons";
import { imgUrl, tmdbFetch } from "../utils/api";
import { useRatings, getRatingForItem } from "../utils/useRatings";
import { isRestricted } from "../utils/ageRating";
import { loadHomeLayout, loadHomeViewMode } from "../utils/homeLayout";
import {
  fetchHomeCatalog,
  fetchMoviesByYear,
  loadBrowseYear,
  getCategoryItems,
  getCategoryMeta,
  resolveCategoryId,
  itemsForHomeRatings,
  GENRE_CATEGORIES,
} from "../utils/homeCatalog";

function getRecentHistoryItem(history) {
  if (!history || history.length === 0) return null;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = history.filter(
    (h) => h.watchedAt && h.watchedAt > sevenDaysAgo,
  );
  if (recent.length === 0) return null;
  return recent[Math.floor(Math.random() * recent.length)];
}

const GENRE_LABELS = Object.fromEntries(
  GENRE_CATEGORIES.map((g) => [g.id, g.label]),
);

export default function HomePage({
  trending,
  trendingTV,
  loading,
  onSelect,
  progress,
  inProgress,
  offline,
  onRetry,
  watched,
  onMarkWatched,
  onMarkUnwatched,
  history,
  apiKey,
}) {
  const hero = trending[0];

  const [similarItems, setSimilarItems] = useState([]);
  const [similarSource, setSimilarSource] = useState(null);
  const [topRatedItems, setTopRatedItems] = useState([]);
  const [catalog, setCatalog] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [byYearItems, setByYearItems] = useState([]);
  const [browseYear, setBrowseYear] = useState(() => loadBrowseYear());
  const [activeCategory, setActiveCategory] = useState(null);
  const [showAllRows, setShowAllRows] = useState(true);
  const [launchingKey, setLaunchingKey] = useState(null);

  const [layout] = useState(() => loadHomeLayout());
  const { order: rowOrder, visible: rowVisible } = layout;
  const [viewMode] = useState(() => loadHomeViewMode());

  useEffect(() => {
    if (!apiKey || offline) return;
    let cancelled = false;
    setCatalogLoading(true);
    fetchHomeCatalog(apiKey, {
      onUpdate: (partial) => {
        if (!cancelled) setCatalog(partial);
      },
    })
      .then((full) => {
        if (!cancelled) setCatalog(full);
      })
      .catch(() => {
        if (!cancelled) setCatalog(null);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey, offline]);

  useEffect(() => {
    if (!apiKey || offline) return;
    let cancelled = false;
    fetchMoviesByYear(apiKey, browseYear).then((items) => {
      if (!cancelled) setByYearItems(items);
    });
    return () => {
      cancelled = true;
    };
  }, [apiKey, offline, browseYear]);

  const ratingsItems = useMemo(
    () =>
      itemsForHomeRatings({
        inProgress,
        trending,
        trendingTV,
        similarItems,
        topRatedItems,
        catalog,
        byYearItems,
        activeCategory,
        showAllRows,
      }),
    [
      inProgress,
      trending,
      trendingTV,
      similarItems,
      topRatedItems,
      catalog,
      byYearItems,
      activeCategory,
      showAllRows,
    ],
  );

  const { ratingsMap, ageLimitSetting } = useRatings(ratingsItems);

  const getRating = useCallback(
    (item) => getRatingForItem(item, ratingsMap),
    [ratingsMap],
  );
  const itemRestricted = useCallback(
    (item) =>
      isRestricted(getRatingForItem(item, ratingsMap).minAge, ageLimitSetting),
    [ratingsMap, ageLimitSetting],
  );

  const enrichedRatingsMap = useMemo(() => {
    const out = {};
    for (const [k, v] of Object.entries(ratingsMap)) {
      out[k] = { ...v, restricted: isRestricted(v.minAge, ageLimitSetting) };
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratingsMap, ageLimitSetting]);

  useEffect(() => {
    if (!apiKey || offline || !history || history.length === 0) return;
    const source = getRecentHistoryItem(history);
    if (!source) return;
    setSimilarSource(source);
    const type = source.media_type === "tv" ? "tv" : "movie";
    const tryFetch = (endpoint) =>
      tmdbFetch(`/${type}/${source.id}/${endpoint}`, apiKey).then((data) =>
        (data.results || [])
          .slice(0, 10)
          .map((item) => ({ ...item, media_type: type })),
      );
    tryFetch("similar")
      .then((results) => {
        if (results.length > 0) {
          setSimilarItems(results);
          return;
        }
        return tryFetch("recommendations").then(setSimilarItems);
      })
      .catch(() =>
        tryFetch("recommendations")
          .then(setSimilarItems)
          .catch(() => {}),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, offline, history?.length]);

  useEffect(() => {
    if (!apiKey || offline) return;
    Promise.all([
      tmdbFetch("/movie/top_rated?page=1", apiKey),
      tmdbFetch("/tv/top_rated?page=1", apiKey),
    ])
      .then(([moviesData, tvData]) => {
        const movies = (moviesData.results || [])
          .slice(0, 8)
          .map((i) => ({ ...i, media_type: "movie" }));
        const tv = (tvData.results || [])
          .slice(0, 8)
          .map((i) => ({ ...i, media_type: "tv" }));
        const merged = [];
        const max = Math.max(movies.length, tv.length);
        for (let i = 0; i < max; i++) {
          if (movies[i]) merged.push(movies[i]);
          if (tv[i]) merged.push(tv[i]);
        }
        setTopRatedItems(merged);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, offline]);

  const trendingMovieItems = useMemo(
    () => trending.slice(0, 10).map((i) => ({ ...i, media_type: "movie" })),
    [trending],
  );
  const trendingTVItems = useMemo(
    () => trendingTV.slice(0, 10).map((i) => ({ ...i, media_type: "tv" })),
    [trendingTV],
  );

  const byYearTitle =
    browseYear === "all"
      ? "Popular Across All Years"
      : `Movies from ${browseYear}`;

  const renderList = (key, title, titleHighlight, items) => {
    if (!items || items.length === 0) return null;
    return (
      <div key={key} id={`home-row-${key}`} className="section home-row">
        <div className="section-title">
          {titleHighlight ? (
            <>
              {title}&nbsp;
              <span className="section-title-accent">{titleHighlight}</span>
            </>
          ) : (
            title
          )}
        </div>
        <div className="cards-grid">
          {items.map((item) => {
            const type = item.media_type === "tv" ? "tv" : "movie";
            const rk = `${type}_${item.id}`;
            const rd = enrichedRatingsMap[rk] || {};
            return (
              <MediaCard
                key={`${item.media_type}_${item.id}`}
                item={item}
                onClick={() => onSelect(item)}
                progress={0}
                watched={watched}
                onMarkWatched={onMarkWatched}
                onMarkUnwatched={onMarkUnwatched}
                ageRating={rd.cert}
                restricted={rd.restricted}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const getRowMeta = (id) => {
    const itemsFromCatalog = getCategoryItems(catalog, byYearItems, id);
    switch (id) {
      case "byYear":
        return { title: byYearTitle, items: itemsFromCatalog };
      case "trendingMovies":
        return { title: "Trending Movies", items: trendingMovieItems };
      case "trendingTV":
        return { title: "Trending Series", items: trendingTVItems };
      case "topRated":
        return { title: "Top Rated", items: topRatedItems };
      default: {
        const meta = getCategoryMeta(id);
        if (meta && itemsFromCatalog?.length) {
          return { title: meta.label, items: itemsFromCatalog };
        }
        const resolved = resolveCategoryId(id);
        if (GENRE_LABELS[resolved] && itemsFromCatalog?.length) {
          return { title: GENRE_LABELS[resolved], items: itemsFromCatalog };
        }
        return null;
      }
    }
  };

  const focusedCategory = useMemo(() => {
    if (!activeCategory || showAllRows) return null;
    return getRowMeta(activeCategory);
  }, [activeCategory, showAllRows, catalog, byYearItems, browseYear, trendingMovieItems, trendingTVItems, topRatedItems]);

  const handleSelectWithFx = useCallback(
    (item, cardKey) => {
      setLaunchingKey(cardKey);
      window.setTimeout(() => {
        onSelect(item);
        setLaunchingKey(null);
      }, 300);
    },
    [onSelect],
  );

  const getRowMetaForDedupe = useCallback(
    (id) => {
      if (id === "similar") {
        if (!similarSource || similarItems.length === 0) return null;
        return {
          title: "Similar to",
          titleHighlight: similarSource.title || similarSource.name,
          items: similarItems,
        };
      }
      return getRowMeta(id);
    },
    [
      similarSource,
      similarItems,
      catalog,
      byYearItems,
      browseYear,
      trendingMovieItems,
      trendingTVItems,
      topRatedItems,
    ],
  );

  const dedupedBrowseRows = useMemo(() => {
    const ids = rowOrder.filter((id) => rowVisible[id] && id !== "continue");
    return buildDedupedRows(ids, getRowMetaForDedupe);
  }, [rowOrder, rowVisible, getRowMetaForDedupe]);

  const useModernRows = viewMode !== "carousel";

  const renderRow = (id, title, items, titleHighlight = null, rowIndex = 0) => {
    if (!items || items.length === 0) return null;
    if (viewMode === "list") return renderList(id, title, titleHighlight, items);
    if (useModernRows) {
      return (
        <MediaBrowseRow
          rowId={id}
          title={title}
          titleHighlight={titleHighlight}
          items={items}
          rowIndex={rowIndex}
          onSelectWithFx={handleSelectWithFx}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          ratingsMap={enrichedRatingsMap}
          launchingKey={launchingKey}
        />
      );
    }
    return (
      <div
        id={`home-row-${id}`}
        className="home-row"
        style={{ "--row-i": rowIndex }}
      >
        <TrendingCarousel
          key={id}
          items={items}
          title={title}
          titleHighlight={titleHighlight}
          onSelect={onSelect}
          ratingsMap={enrichedRatingsMap}
        />
      </div>
    );
  };

  return (
    <div className="fade-in home-page home-page--modern">
      {offline && (
        <div className="home-offline">
          <div className="home-offline-icon">📡</div>
          <div className="home-offline-title">No internet connection</div>
          <p className="home-offline-text">
            Browse and search need a connection. Downloads and your vault still
            work offline.
          </p>
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}

      {!offline && loading && (
        <div className="loader">
          <div className="spinner" />
        </div>
      )}

      {!offline && !loading && hero && (
        <div className="hero hero--premium">
          <div
            className="hero-bg"
            style={{
              backgroundImage: `url(${imgUrl(hero.backdrop_path, "original")})`,
            }}
          />
          <div className="hero-gradient" />
          <img
            src="./encryptic-logo.png"
            alt=""
            className="hero-watermark"
            aria-hidden
          />
          <div className="hero-content">
            <div className="hero-type">Featured · Now Streaming</div>
            <h1 className="hero-title">{hero.title || hero.name}</h1>
            <div className="hero-meta">
              <span className="hero-rating">
                <StarIcon /> {hero.vote_average?.toFixed(1)}
              </span>
              <span>{hero.release_date?.slice(0, 4)}</span>
            </div>
            <p className="hero-overview">{hero.overview}</p>
            <div className="hero-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onSelect(hero)}
              >
                <PlayIcon /> Watch Now
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onSelect(hero)}
              >
                More Info
              </button>
            </div>
          </div>
        </div>
      )}

      {!offline && !loading && (
        <HomeCategoryHub
          browseYear={browseYear}
          onYearChange={setBrowseYear}
          activeCategory={activeCategory}
          onCategoryChange={(id) => {
            setActiveCategory(id);
            setShowAllRows(false);
          }}
          onShowAll={() => {
            setShowAllRows(true);
            setActiveCategory(null);
          }}
          showAllRows={showAllRows}
        />
      )}

      {catalogLoading && !catalog?.inTheaters?.length && !offline && (
        <div className="home-catalog-loading">Loading categories…</div>
      )}

      {focusedCategory && focusedCategory.items?.length > 0 && (
        <div className="home-category-focus">
          {renderRow(
            `focus-${activeCategory}`,
            focusedCategory.title,
            focusedCategory.items,
          )}
        </div>
      )}

      {focusedCategory && !focusedCategory.items?.length && (
        <p className="home-category-empty">
          No titles found in this category. Try another genre or year.
        </p>
      )}

      {rowVisible.continue && inProgress.length > 0 && (
        <div key="continue" id="home-row-continue" className="section home-row">
          <div className="section-title">Continue Watching</div>
          <div className="cards-grid">
            {inProgress.map((item) => {
              const pk =
                item.media_type === "movie"
                  ? `movie_${item.id}`
                  : `tv_${item.id}_s${item.season}e${item.episode}`;
              const r = getRating(item);
              const restr = itemRestricted(item);
              return (
                <MediaCard
                  key={`${item.media_type}_${item.id}`}
                  item={item}
                  onClick={() => onSelect(item)}
                  progress={progress[pk] || 0}
                  watched={watched}
                  onMarkWatched={onMarkWatched}
                  onMarkUnwatched={onMarkUnwatched}
                  ageRating={r.cert}
                  restricted={restr}
                />
              );
            })}
          </div>
        </div>
      )}

      {showAllRows &&
        dedupedBrowseRows.map((row, index) =>
          renderRow(row.id, row.title, row.items, row.titleHighlight, index),
        )}
    </div>
  );
}
