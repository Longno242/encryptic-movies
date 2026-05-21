import { fetchAnilistTrendingAnime } from "./anilistHome";
import { GENRE_CATEGORIES } from "./homeCatalog";
import { enrichFreeCatalogPosters } from "./freePosterResolver";
import {
  tvmazeFetchScheduleUS,
  tvmazeFetchShowsPage,
  tvmazeSearchShows,
} from "./tvmazeApi";

const ROW_LIMIT = 14;

const TV_GENRE_NAMES = {
  genre_action: "Action",
  genre_adventure: "Adventure",
  genre_animation: "Animation",
  genre_comedy: "Comedy",
  genre_crime: "Crime",
  genre_documentary: "Documentary",
  genre_drama: "Drama",
  genre_fantasy: "Fantasy",
  genre_horror: "Horror",
  genre_romance: "Romance",
  genre_scifi: "Science-Fiction",
  genre_thriller: "Thriller",
};

function dedupeShows(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `tvmaze:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function genreNameFromTag(g) {
  if (typeof g === "string") return g;
  return g?.name || "";
}

function pickByGenre(pool, genreName, limit = ROW_LIMIT) {
  const want = genreName.toLowerCase();
  return dedupeShows(
    pool.filter((s) =>
      (s.genres || []).some(
        (g) => genreNameFromTag(g).toLowerCase() === want,
      ),
    ),
  ).slice(0, limit);
}

const ANILIST_SEARCH = `
query ($search: String) {
  Page(page: 1, perPage: 16) {
    media(search: $search, type: ANIME, isAdult: false) {
      id
      title { romaji english }
      coverImage { extraLarge large medium }
      averageScore
      startDate { year }
    }
  }
}`;

export async function searchAnilistAnime(query) {
  const q = String(query || "").trim();
  if (!q) return [];
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        query: ANILIST_SEARCH,
        variables: { search: q },
      }),
      signal: AbortSignal.timeout(12000),
    });
    const json = await res.json();
    const media = json?.data?.Page?.media || [];
    return media.map((m) => ({
      id: m.id,
      anilistId: m.id,
      media_type: "anilist",
      _anilistOnly: true,
      title: m.title?.english || m.title?.romaji,
      name: m.title?.romaji,
      poster_path:
        m.coverImage?.extraLarge ||
        m.coverImage?.large ||
        m.coverImage?.medium ||
        null,
      vote_average: m.averageScore ? m.averageScore / 10 : 0,
      first_air_date: m.startDate?.year ? `${m.startDate.year}-01-01` : "",
    }));
  } catch {
    return [];
  }
}

/** Combined TV (TVMaze) + anime (AniList) search — no API key. */
export async function freeDiscoverSearch({ query = "", type = "" }) {
  const q = query.trim();
  if (!q) return [];

  const wantTv = !type || type === "tv";
  const wantAnime = !type || type === "anime";

  const [tv, anime] = await Promise.all([
    wantTv ? tvmazeSearchShows(q) : Promise.resolve([]),
    wantAnime ? searchAnilistAnime(q) : Promise.resolve([]),
  ]);

  const merged = [...tv, ...anime];
  const seen = new Set();
  const deduped = merged.filter((item) => {
    const key = `${item.media_type}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return enrichFreeCatalogPosters(deduped);
}

export async function fetchFreeHomeTrending() {
  const [tv, anime] = await Promise.all([
    tvmazeFetchScheduleUS(),
    fetchAnilistTrendingAnime(),
  ]);
  const [tvEnriched, animeEnriched] = await Promise.all([
    enrichFreeCatalogPosters(tv),
    enrichFreeCatalogPosters(anime),
  ]);
  return { movies: [], tv: tvEnriched, anime: animeEnriched };
}

/**
 * Home browse rows for free mode (TVMaze) — fills the same row ids as TMDB catalog.
 */
export async function fetchFreeHomeCatalog() {
  const [schedule, shows0, shows1] = await Promise.all([
    tvmazeFetchScheduleUS(),
    tvmazeFetchShowsPage(0),
    tvmazeFetchShowsPage(1),
  ]);

  const pool = dedupeShows([...shows0, ...shows1]);
  const byRating = [...pool].sort(
    (a, b) => (b.vote_average || 0) - (a.vote_average || 0),
  );

  const onTvTonight = await enrichFreeCatalogPosters(
    dedupeShows(schedule).slice(0, ROW_LIMIT),
  );
  const popular = await enrichFreeCatalogPosters(
    dedupeShows(byRating).slice(0, ROW_LIMIT),
  );
  const catalog = {
    inTheaters: onTvTonight,
    trendingToday: onTvTonight.length ? onTvTonight : popular.slice(0, ROW_LIMIT),
    trendingWeek: popular,
    mostPopular: await enrichFreeCatalogPosters(
      dedupeShows(shows0).slice(0, ROW_LIMIT),
    ),
    topRated: await enrichFreeCatalogPosters(
      dedupeShows(byRating).slice(0, ROW_LIMIT),
    ),
    comingSoon: popular.slice(0, ROW_LIMIT),
    blockbusters: popular.slice(0, ROW_LIMIT),
    criticsPicks: await enrichFreeCatalogPosters(
      dedupeShows(byRating).slice(0, ROW_LIMIT),
    ),
    hiddenGems: await enrichFreeCatalogPosters(
      dedupeShows(byRating).slice(ROW_LIMIT, ROW_LIMIT * 2),
    ),
    classics: await enrichFreeCatalogPosters(
      dedupeShows(pool).slice(0, ROW_LIMIT),
    ),
    newReleases: onTvTonight.length ? onTvTonight : popular.slice(0, ROW_LIMIT),
    genres: {},
  };

  const genreEntries = await Promise.all(
    GENRE_CATEGORIES.map(async (g) => {
      const name = TV_GENRE_NAMES[g.id];
      if (!name) return [g.id, []];
      const items = await enrichFreeCatalogPosters(
        pickByGenre(pool, name, ROW_LIMIT),
      );
      return [g.id, items];
    }),
  );
  catalog.genres = Object.fromEntries(genreEntries);

  return catalog;
}

/** Spotlight chips for HomeCategoryHub in free mode (same ids as TMDB rows). */
export const FREE_SPOTLIGHT_LABELS = {
  inTheaters: { label: "On TV Tonight", blurb: "US schedule" },
  trendingToday: { label: "Airing Today", blurb: "Today's episodes" },
  trendingWeek: { label: "Popular Series", blurb: "Highly rated" },
  mostPopular: { label: "Popular", blurb: "TVMaze picks" },
  topRated: { label: "Top Rated", blurb: "Fan favorites" },
  comingSoon: { label: "Discover More", blurb: "Browse TV" },
  blockbusters: { label: "Must-See", blurb: "Trending shows" },
  criticsPicks: { label: "Critics' Picks", blurb: "Top rated" },
  hiddenGems: { label: "Hidden Gems", blurb: "Underrated" },
  classics: { label: "Classics", blurb: "Beloved series" },
  newReleases: { label: "On Air", blurb: "Current shows" },
};

/** Row ids that can show content in free catalog mode. */
export const FREE_HOME_ROW_IDS = new Set([
  "continue",
  "animeTrending",
  "inTheaters",
  "trendingToday",
  "trendingWeek",
  "mostPopular",
  "topRated",
  "comingSoon",
  "trendingTV",
  "trendingMovies",
  ...GENRE_CATEGORIES.map((g) => g.id),
]);
