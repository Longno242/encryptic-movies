import { useState, useEffect, useMemo, useCallback } from "react";
import MediaCard from "../components/MediaCard";
import MediaBrowseRow from "../components/MediaBrowseRow";
import TrendingCarousel from "../components/TrendingCarousel";
import HomeCategoryHub from "../components/HomeCategoryHub";
import { buildDedupedRows } from "../utils/catalogDedupe";
import { PlayIcon, StarIcon, SearchIcon } from "../components/Icons";
import { imgUrl, tmdbFetch } from "../utils/api";
import { useRatings, getRatingForItem } from "../utils/useRatings";
import { isRestricted } from "../utils/ageRating";
import { loadHomeLayout, loadHomeViewMode } from "../utils/homeLayout";
import { fetchAnilistTrendingAnime } from "../utils/anilistHome";
import AnimeIssuesBanner from "../components/AnimeIssuesBanner";
import ResumeHero from "../components/ResumeHero";
import BrowseRowSkeleton from "../components/BrowseRowSkeleton";
import {
  fetchHomeCatalog,
  fetchMoviesByYear,
  loadCachedHomeCatalog,
  loadStaleMovieHomeCatalog,
  loadBrowseYear,
  getCategoryItems,
  getCategoryMeta,
  resolveCategoryId,
  itemsForHomeRatings,
  GENRE_CATEGORIES,
} from "../utils/homeCatalog";
import { isFreeMetadataMode } from "../utils/metadataMode";
import {
  fetchFreeHomeCatalog,
  FREE_SPOTLIGHT_LABELS,
} from "../utils/freeCatalog";

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

const ROW_SEE_ALL_MAP = {
  trendingMovies: "trendingToday",
  trendingTV: "trendingWeek",
  topRated: "topRated",
};

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
  onSave,
  onOpenCatalogSetup,
  hasSavedApiKey = false,
  onUseSavedApiKey,
  onSearch,
}) {
  const freeCatalog = isFreeMetadataMode();
  const freeTvBrowse = freeCatalog && !apiKey;
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
  const [animeTrending, setAnimeTrending] = useState([]);

  const [layout] = useState(() => loadHomeLayout());
  const { order: rowOrder, visible: rowVisible } = layout;
  const [viewMode] = useState(() => loadHomeViewMode());

  useEffect(() => {
    if (offline) return;
    if (!apiKey) {
      const cached =
        loadCachedHomeCatalog() || loadStaleMovieHomeCatalog();
      if (cached) {
        setCatalog(cached);
        return;
      }
      if (!freeTvBrowse) return;
      let cancelled = false;
      setCatalogLoading(true);
      fetchFreeHomeCatalog()
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
    }
    let cancelled = false;
    setCatalogLoading(true);
    const run = () => {
      if (cancelled) return;
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
    };
    const idle =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback(run, { timeout: 400 })
        : window.setTimeout(run, 80);
    return () => {
      cancelled = true;
      if (typeof cancelIdleCallback === "function") cancelIdleCallback(idle);
      else clearTimeout(idle);
    };
  }, [apiKey, offline, freeTvBrowse]);

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

  useEffect(() => {
    if (offline) return;
    let cancelled = false;
    fetchAnilistTrendingAnime().then((items) => {
      if (!cancelled) setAnimeTrending(items);
    });
    return () => {
      cancelled = true;
    };
  }, [offline]);

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
        animeTrending,
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
      animeTrending,
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
    let cancelled = false;
    const run = () => {
      Promise.all([
        tmdbFetch("/movie/top_rated?page=1", apiKey),
        tmdbFetch("/tv/top_rated?page=1", apiKey),
      ])
        .then(([moviesData, tvData]) => {
          if (cancelled) return;
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
    };
    const idle =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback(run, { timeout: 1200 })
        : window.setTimeout(run, 200);
    return () => {
      cancelled = true;
      if (typeof cancelIdleCallback === "function") cancelIdleCallback(idle);
      else clearTimeout(idle);
    };
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
                modern
                staggerIndex={items.indexOf(item)}
                onQuickSave={onSave}
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
      case "topRated": {
        const catalogTop = getCategoryItems(catalog, byYearItems, "topRated");
        const items = topRatedItems.length ? topRatedItems : catalogTop;
        return {
          title: freeTvBrowse ? "Top Rated Series" : "Top Rated",
          items,
        };
      }
      default: {
        const freeLabel = freeTvBrowse ? FREE_SPOTLIGHT_LABELS[id] : null;
        if (freeLabel && itemsFromCatalog?.length) {
          return { title: freeLabel.label, items: itemsFromCatalog };
        }
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
  }, [
    activeCategory,
    showAllRows,
    catalog,
    byYearItems,
    browseYear,
    trendingMovieItems,
    trendingTVItems,
    topRatedItems,
    freeTvBrowse,
  ]);

  const handleSelectWithFx = useCallback(
    (item, cardKey) => {
      setLaunchingKey(cardKey);
      onSelect(item);
      window.setTimeout(() => setLaunchingKey(null), 280);
    },
    [onSelect],
  );

  const getRowMetaForDedupe = useCallback(
    (id) => {
      if (id === "similar" || id === "becauseYouWatched") {
        if (!similarSource || similarItems.length === 0) return null;
        return {
          title: id === "becauseYouWatched" ? "Because you watched" : "Similar to",
          titleHighlight: similarSource.title || similarSource.name,
          items: similarItems,
        };
      }
      if (id === "animeTrending") {
        if (!animeTrending.length) return null;
        return { title: "Trending Anime", items: animeTrending };
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
      animeTrending,
    ],
  );

  const dedupedBrowseRows = useMemo(() => {
    const ids = rowOrder.filter((id) => rowVisible[id] && id !== "continue");
    return buildDedupedRows(ids, getRowMetaForDedupe);
  }, [rowOrder, rowVisible, getRowMetaForDedupe]);

  const useModernRows = viewMode !== "carousel";

  const resumeItem = useMemo(() => {
    if (!inProgress?.length) return null;
    return [...inProgress].sort(
      (a, b) => (b.watchedAt || 0) - (a.watchedAt || 0),
    )[0];
  }, [inProgress]);

  const resumeProgress = useMemo(() => {
    if (!resumeItem) return 0;
    const pk =
      resumeItem.media_type === "movie"
        ? `movie_${resumeItem.id}`
        : `tv_${resumeItem.id}_s${resumeItem.season}e${resumeItem.episode}`;
    return progress[pk] || 0;
  }, [resumeItem, progress]);

  const continueKey = (item) =>
    `${item.media_type}_${item.id}_${item.season ?? ""}_${item.episode ?? ""}`;

  const continueItems = useMemo(() => {
    if (!inProgress?.length) return [];
    if (!resumeItem) return inProgress;
    const resumeKey = continueKey(resumeItem);
    return inProgress.filter((item) => continueKey(item) !== resumeKey);
  }, [inProgress, resumeItem]);

  const featuredHero = trending[0] || trendingTV[0] || animeTrending[0];

  const scrollToCategoryRow = useCallback((id) => {
    if (!id) return;
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        const resolved = resolveCategoryId(id);
        const target =
          document.getElementById(`home-row-${resolved}`) ||
          document.getElementById(`home-row-focus-${id}`) ||
          document.getElementById("home-category-focus");
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    });
  }, []);

  const focusCategory = useCallback(
    (id) => {
      setActiveCategory(id);
      const items = getCategoryItems(catalog, byYearItems, id);
      if (!items?.length) {
        setShowAllRows(false);
      }
      scrollToCategoryRow(id);
    },
    [catalog, byYearItems, scrollToCategoryRow],
  );

  const handleRowSeeAll = useCallback(
    (rowId) => {
      const mapped = ROW_SEE_ALL_MAP[rowId] || (getCategoryMeta(rowId) ? rowId : null);
      if (mapped) focusCategory(mapped);
      else if (rowId === "animeTrending") {
        document
          .getElementById("home-row-animeTrending")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        setShowAllRows(true);
        setActiveCategory(null);
      }
    },
    [focusCategory],
  );

  const canSeeAllForRow = useCallback((rowId) => {
    if (rowId === "continue" || rowId === "becauseYouWatched" || rowId === "similar") {
      return false;
    }
    return !!(ROW_SEE_ALL_MAP[rowId] || getCategoryMeta(rowId) || rowId === "animeTrending");
  }, []);

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
          onQuickSave={onSave}
          onSeeAll={
            canSeeAllForRow(id) ? () => handleRowSeeAll(id) : undefined
          }
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
      {freeTvBrowse && !offline && (
        <div
          style={{
            margin: "0 0 16px",
            padding: "14px 16px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            fontSize: 13,
            lineHeight: 1.55,
            color: "var(--text2)",
          }}
        >
          {hasSavedApiKey && onUseSavedApiKey ? (
            <>
              <strong style={{ color: "var(--text)" }}>
                Want the full home back?
              </strong>{" "}
              New Releases, Trending Movies, and genre rows need your saved TMDB
              key.
              <button
                type="button"
                className="btn btn-primary"
                style={{ display: "block", width: "100%", marginTop: 12 }}
                onClick={onUseSavedApiKey}
              >
                Restore full movie library
              </button>
            </>
          ) : (
            <>
              <strong style={{ color: "var(--text)" }}>Free catalog mode</strong> —
              browsing TV and anime. Rows below are series picks unless you add a
              free{" "}
              {onOpenCatalogSetup ? (
                <button
                  type="button"
                  className="apikey-link apikey-link-btn"
                  onClick={onOpenCatalogSetup}
                >
                  TMDB API key
                </button>
              ) : (
                "TMDB API key"
              )}{" "}
              for movies.
            </>
          )}
        </div>
      )}
      {!offline && onSearch && (
        <button
          type="button"
          className="home-search-prompt"
          onClick={onSearch}
          aria-label="Search movies, TV, and anime (Ctrl+F)"
        >
          <SearchIcon />
          <span className="home-search-prompt__text">
            Search movies, TV, and anime…
          </span>
          <kbd className="home-search-prompt__key">Ctrl+F</kbd>
        </button>
      )}
      {!offline && <AnimeIssuesBanner variant="home" />}
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

      {!offline && resumeItem && (
        <ResumeHero
          item={resumeItem}
          progressPct={resumeProgress}
          onResume={() => onSelect(resumeItem)}
          onInfo={() => onSelect(resumeItem)}
        />
      )}

      {!offline && !resumeItem && !loading && featuredHero && (
        <div className="hero hero--premium">
          <div
            className="hero-bg"
            style={{
              backgroundImage: `url(${imgUrl(featuredHero.backdrop_path, "original")})`,
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
            <h1 className="hero-title">{featuredHero.title || featuredHero.name}</h1>
            <div className="hero-meta">
              <span className="hero-rating">
                <StarIcon /> {featuredHero.vote_average?.toFixed(1)}
              </span>
              <span>{featuredHero.release_date?.slice(0, 4)}</span>
            </div>
            <p className="hero-overview">{featuredHero.overview}</p>
            <div className="hero-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onSelect(featuredHero)}
              >
                <PlayIcon /> Watch Now
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onSelect(featuredHero)}
              >
                More Info
              </button>
            </div>
          </div>
        </div>
      )}

      {!offline && loading && !featuredHero && !resumeItem && (
        <div className="hero hero--premium hero--skeleton" aria-hidden>
          <div className="skeleton-hero-bg" />
          <div className="hero-gradient" />
        </div>
      )}

      {rowVisible.continue && continueItems.length > 0 && !offline && (
        <div className="home-continue-section">
          {useModernRows ? (
            <MediaBrowseRow
              rowId="continue"
              title={resumeItem ? "More in progress" : "Continue Watching"}
              titleHighlight={null}
              items={continueItems.map((item) => ({
                ...item,
                media_type: item.media_type || "movie",
              }))}
              rowIndex={0}
              onSelectWithFx={handleSelectWithFx}
              watched={watched}
              onMarkWatched={onMarkWatched}
              onMarkUnwatched={onMarkUnwatched}
              ratingsMap={enrichedRatingsMap}
              launchingKey={launchingKey}
              onQuickSave={onSave}
              progressMap={progress}
            />
          ) : (
            <div key="continue" id="home-row-continue" className="section home-row">
              <div className="section-title">Continue Watching</div>
              <div className="cards-grid">
                {continueItems.map((item) => {
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
                      modern
                      showQuickActions={false}
                      staggerIndex={continueItems.indexOf(item)}
                      onQuickSave={onSave}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {!offline && !loading && animeTrending.length > 0 && (
        <div className="home-anime-spotlight">
          {renderRow("animeTrending", "Trending Anime", animeTrending, null, 0)}
        </div>
      )}

      {!offline && !loading && (
        <HomeCategoryHub
          browseYear={browseYear}
          onYearChange={setBrowseYear}
          activeCategory={activeCategory}
          onCategoryChange={(id) => focusCategory(id)}
          onShowAll={() => {
            setShowAllRows(true);
            setActiveCategory(null);
          }}
          showAllRows={showAllRows}
          freeCatalog={freeTvBrowse}
        />
      )}

      {catalogLoading && !catalog?.inTheaters?.length && !offline && useModernRows && (
        <>
          <BrowseRowSkeleton count={8} rowIndex={1} />
          <BrowseRowSkeleton count={8} rowIndex={2} />
          <BrowseRowSkeleton count={8} rowIndex={3} />
        </>
      )}

      {activeCategory && !showAllRows && catalogLoading && (
        <div id="home-category-focus" className="home-category-focus">
          <BrowseRowSkeleton count={8} rowIndex={0} />
        </div>
      )}

      {focusedCategory && focusedCategory.items?.length > 0 && (
        <div id="home-category-focus" className="home-category-focus">
          {renderRow(
            `focus-${activeCategory}`,
            focusedCategory.title,
            focusedCategory.items,
          )}
        </div>
      )}

      {focusedCategory && !focusedCategory.items?.length && !catalogLoading && (
        <p id="home-category-focus" className="home-category-empty">
          No titles in this category yet. Try another spotlight or genre, or add a
          TMDB key for movie rows.
        </p>
      )}

      {showAllRows &&
        dedupedBrowseRows
          .filter((row) => row.id !== "continue" && row.id !== "animeTrending")
          .map((row, index) =>
            renderRow(row.id, row.title, row.items, row.titleHighlight, index),
          )}
    </div>
  );
}
