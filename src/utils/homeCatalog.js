import { tmdbFetch } from "./api";
import { storage } from "./storage";
import { dedupeCatalogData } from "./catalogDedupe";

const CACHE_KEY = "homeCatalogCacheV3";
const CACHE_TTL_MS = 30 * 60 * 1000;
const GENRE_BATCH_SIZE = 3;
const ROW_LIMIT = 14;

const MOVIE = (item) => ({ ...item, media_type: "movie" });

async function fetchList(path, apiKey) {
  const data = await tmdbFetch(path, apiKey);
  return (data.results || []).slice(0, ROW_LIMIT).map(MOVIE);
}

async function fetchListSafe(path, apiKey, fallback = []) {
  try {
    return await fetchList(path, apiKey);
  } catch {
    return fallback;
  }
}

/** Spotlight rows — varied TMDB charts & discover filters (aggregated film data). */
export const SPOTLIGHT_CATEGORIES = [
  {
    id: "inTheaters",
    label: "In Theaters",
    icon: "🎬",
    blurb: "Playing now",
    path: "/movie/now_playing",
  },
  {
    id: "trendingToday",
    label: "Trending Today",
    icon: "🔥",
    blurb: "Hot right now",
    path: "/trending/movie/day",
  },
  {
    id: "trendingWeek",
    label: "Trending This Week",
    icon: "📈",
    blurb: "Weekly chart",
    path: "/trending/movie/week",
  },
  {
    id: "mostPopular",
    label: "Most Popular",
    icon: "⭐",
    blurb: "Global hits",
    path: "/movie/popular",
  },
  {
    id: "topRated",
    label: "Top Rated",
    icon: "🏆",
    blurb: "Highest scores",
    path: "/movie/top_rated?page=1",
  },
  {
    id: "comingSoon",
    label: "Coming Soon",
    icon: "📅",
    blurb: "Upcoming releases",
    path: "/movie/upcoming",
  },
  {
    id: "blockbusters",
    label: "Blockbusters",
    icon: "💥",
    blurb: "Big box office",
    path: "/discover/movie?sort_by=revenue.desc&vote_count.gte=800&include_adult=false",
  },
  {
    id: "criticsPicks",
    label: "Critics' Picks",
    icon: "🎯",
    blurb: "Acclaimed films",
    path: "/discover/movie?sort_by=vote_average.desc&vote_count.gte=1000&vote_average.gte=7.6&include_adult=false",
  },
  {
    id: "hiddenGems",
    label: "Hidden Gems",
    icon: "💎",
    blurb: "Underrated finds",
    path: "/discover/movie?sort_by=vote_average.desc&vote_count.gte=150&vote_count.lte=2500&vote_average.gte=7.8&include_adult=false",
  },
  {
    id: "classics",
    label: "Classics",
    icon: "🎞️",
    blurb: "Timeless picks",
    path: "/discover/movie?sort_by=vote_average.desc&primary_release_date.lte=1999-12-31&vote_count.gte=400&include_adult=false",
  },
  {
    id: "newReleases",
    label: "New Releases",
    icon: "✨",
    blurb: "Fresh this month",
    path: "/discover/movie?sort_by=primary_release_date.desc&primary_release_date.gte=2024-01-01&vote_count.gte=50&include_adult=false",
  },
];

export const GENRE_CATEGORIES = [
  { id: "genre_action", label: "Action", genreId: 28, icon: "⚔️" },
  { id: "genre_adventure", label: "Adventure", genreId: 12, icon: "🗺️" },
  { id: "genre_animation", label: "Animation", genreId: 16, icon: "✨" },
  { id: "genre_comedy", label: "Comedy", genreId: 35, icon: "😂" },
  { id: "genre_crime", label: "Crime", genreId: 80, icon: "🔍" },
  { id: "genre_documentary", label: "Documentary", genreId: 99, icon: "📽️" },
  { id: "genre_drama", label: "Drama", genreId: 18, icon: "🎭" },
  { id: "genre_fantasy", label: "Fantasy", genreId: 14, icon: "🐉" },
  { id: "genre_horror", label: "Horror", genreId: 27, icon: "👻" },
  { id: "genre_romance", label: "Romance", genreId: 10749, icon: "💕" },
  { id: "genre_scifi", label: "Sci-Fi", genreId: 878, icon: "🚀" },
  { id: "genre_thriller", label: "Thriller", genreId: 53, icon: "😱" },
];

export const CATALOG_ROWS = [
  ...SPOTLIGHT_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
  { id: "byYear", label: "By Release Year" },
  ...GENRE_CATEGORIES.map((g) => ({ id: g.id, label: g.label })),
];

/** Legacy id mapping for saved layout / browse year */
const LEGACY_MAP = {
  recentlyAdded: "inTheaters",
  topViewed: "trendingWeek",
  upcoming: "comingSoon",
};

export function resolveCategoryId(id) {
  return LEGACY_MAP[id] || id;
}

export function loadBrowseYear() {
  const saved = storage.get("homeBrowseYear");
  if (saved === "all" || saved === null || saved === undefined) return "all";
  const n = Number(saved);
  return Number.isFinite(n) ? n : new Date().getFullYear();
}

export function saveBrowseYear(year) {
  storage.set("homeBrowseYear", year);
}

export function loadCachedHomeCatalog() {
  const cached = storage.get(CACHE_KEY);
  if (!cached?.ts || !cached?.data) return null;
  if (Date.now() - cached.ts > CACHE_TTL_MS) return null;
  return dedupeCatalogData(cached.data);
}

/** TMDB movie catalog from cache even past TTL (free mode fallback). */
export function loadStaleMovieHomeCatalog() {
  const cached = storage.get(CACHE_KEY);
  if (!cached?.data) return null;
  const data = dedupeCatalogData(cached.data);
  const sample = data?.inTheaters?.[0] || data?.newReleases?.[0];
  if (sample?.media_type === "movie") return data;
  return null;
}

function readCatalogCache() {
  return loadCachedHomeCatalog();
}

function writeCatalogCache(data) {
  storage.set(CACHE_KEY, { data: dedupeCatalogData(data), ts: Date.now() });
}

const GENRE_SORTS = [
  "popularity.desc",
  "vote_average.desc",
  "revenue.desc",
  "primary_release_date.desc",
];

async function fetchGenreBatch(batch, apiKey, batchIndex = 0) {
  const entries = await Promise.all(
    batch.map(async (g, i) => {
      const sort = GENRE_SORTS[(g.genreId + batchIndex + i) % GENRE_SORTS.length];
      const page = 1 + ((g.genreId + batchIndex) % 3);
      const items = await fetchListSafe(
        `/discover/movie?with_genres=${g.genreId}&sort_by=${sort}&vote_count.gte=100&page=${page}&include_adult=false`,
        apiKey,
        [],
      );
      return [g.id, items];
    }),
  );
  return Object.fromEntries(entries);
}

export async function fetchHomeCatalog(apiKey, opts = {}) {
  const hit = readCatalogCache();
  if (hit) {
    opts.onUpdate?.(hit);
    return hit;
  }

  const spotlightEntries = await Promise.all(
    SPOTLIGHT_CATEGORIES.map(async (c) => {
      const items = await fetchListSafe(c.path, apiKey, []);
      return [c.id, items];
    }),
  );

  let catalog = {
    ...Object.fromEntries(spotlightEntries),
    genres: {},
  };
  opts.onUpdate?.(dedupeCatalogData(catalog));

  for (let i = 0; i < GENRE_CATEGORIES.length; i += GENRE_BATCH_SIZE) {
    const batch = GENRE_CATEGORIES.slice(i, i + GENRE_BATCH_SIZE);
    const genres = await fetchGenreBatch(batch, apiKey, i / GENRE_BATCH_SIZE);
    catalog = { ...catalog, genres: { ...catalog.genres, ...genres } };
    opts.onUpdate?.(dedupeCatalogData(catalog));
  }

  catalog = dedupeCatalogData(catalog);
  writeCatalogCache(catalog);
  return catalog;
}

export async function fetchMoviesByYear(apiKey, year) {
  if (!year || year === "all") {
    return fetchListSafe(
      "/discover/movie?sort_by=popularity.desc&vote_count.gte=100&include_adult=false",
      apiKey,
    );
  }
  return fetchListSafe(
    `/discover/movie?primary_release_year=${year}&sort_by=popularity.desc&vote_count.gte=50&include_adult=false`,
    apiKey,
  );
}

export function getCategoryItems(catalog, byYearItems, id) {
  if (!catalog && !byYearItems?.length) return [];
  const resolved = resolveCategoryId(id);
  if (resolved === "byYear") return byYearItems || [];
  if (resolved?.startsWith("genre_")) return catalog?.genres?.[resolved] || [];
  return catalog?.[resolved] || [];
}

export function getCategoryMeta(id) {
  const resolved = resolveCategoryId(id);
  const spot = SPOTLIGHT_CATEGORIES.find((c) => c.id === resolved);
  if (spot) return spot;
  const genre = GENRE_CATEGORIES.find((g) => g.id === resolved);
  if (genre) return { ...genre, blurb: "Genre" };
  if (resolved === "byYear") return { id: "byYear", label: "By Year", icon: "📆", blurb: "Release year" };
  return null;
}

export function itemsForHomeRatings({
  inProgress = [],
  trending = [],
  trendingTV = [],
  similarItems = [],
  topRatedItems = [],
  catalog = null,
  byYearItems = [],
  activeCategory = null,
  showAllRows = true,
  animeTrending = [],
}) {
  const seen = new Set();
  const out = [];

  const add = (item) => {
    if (!item?.id) return;
    const type = item.media_type === "tv" ? "tv" : "movie";
    const key = `${type}_${item.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ ...item, media_type: type });
  };

  inProgress.forEach(add);
  trending.slice(0, 12).forEach((i) => add({ ...i, media_type: "movie" }));
  trendingTV.slice(0, 8).forEach((i) => add({ ...i, media_type: "tv" }));
  similarItems.forEach(add);
  topRatedItems.forEach(add);
  animeTrending.forEach((i) => add({ ...i, media_type: i.media_type || "tv" }));

  if (!catalog) return out;

  if (!showAllRows && activeCategory) {
    getCategoryItems(catalog, byYearItems, activeCategory)
      .slice(0, ROW_LIMIT)
      .forEach(add);
    return out;
  }

  for (const c of SPOTLIGHT_CATEGORIES.slice(0, 6)) {
    getCategoryItems(catalog, byYearItems, c.id)
      .slice(0, 6)
      .forEach(add);
  }

  return out;
}
