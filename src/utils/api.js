import { resolveDsLang, embedLangLabel } from "./playbackLang";
import {
  buildAnimeEmbedUrl,
  buildAnimeTmdbFallbackUrl,
  shouldUseAnilistPlayback,
} from "./animePlayback";

const TMDB_ROOT = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p";

export const imgUrl = (path, size = "w500") =>
  path
    ? path.startsWith("http")
      ? path
      : `${TMDB_IMG}/${size}${path}`
    : null;

// ── Global error hooks (registered once from App) ─────────────────────────────
let onAuthFailure = null;
let onNetworkFailure = null;

export const setApiErrorHandlers = (onAuth, onUnreachable) => {
  onAuthFailure = onAuth;
  onNetworkFailure = onUnreachable;
};

// ── TMDB in-memory cache + concurrency gate ───────────────────────────────────
const memoryCache = new Map();
const CACHE_LIFETIME_MS = 5 * 60 * 1000;
const MAX_PARALLEL = 12;

let activeRequests = 0;
const queue = [];
const inFlight = new Map();

function enterQueue() {
  if (activeRequests < MAX_PARALLEL) {
    activeRequests++;
    return Promise.resolve();
  }
  return new Promise((resolve) => queue.push(resolve));
}

function leaveQueue() {
  activeRequests--;
  if (queue.length) {
    activeRequests++;
    queue.shift()();
  }
}

function readMemoryCache(key) {
  const row = memoryCache.get(key);
  if (!row || Date.now() >= row.expiresAt) return null;
  return row.data;
}

function writeMemoryCache(key, data) {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_LIFETIME_MS,
  });

  if (memoryCache.size > 80) {
    const now = Date.now();
    for (const [k, v] of memoryCache) {
      if (now >= v.expiresAt) memoryCache.delete(k);
    }
  }
}

export const tmdbFetch = async (path, apiKey) => {
  const cacheKey = `${apiKey}|${path}`;
  const hit = readMemoryCache(cacheKey);
  if (hit) return hit;

  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

  const promise = (async () => {
    await enterQueue();
    try {
      const cached = readMemoryCache(cacheKey);
      if (cached) return cached;

      let response;
      try {
        response = await fetch(`${TMDB_ROOT}${path}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
      } catch {
        onNetworkFailure?.();
        throw new Error("TMDB unreachable");
      }

      if (response.status === 401 || response.status === 403) {
        onAuthFailure?.();
        throw new Error(`TMDB ${response.status}`);
      }
      if (!response.ok) throw new Error(`TMDB ${response.status}`);

      const payload = await response.json();
      writeMemoryCache(cacheKey, payload);
      return payload;
    } finally {
      leaveQueue();
    }
  })();

  inFlight.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(cacheKey);
  }
};

// ── Streaming embed providers ─────────────────────────────────────────────────
export const PLAYER_SOURCES = [
  {
    id: "videasy",
    label: "Videasy",
    tag: null,
    note: null,
    supportsProgress: true,
    movieUrl: (id) => `https://player.videasy.net/movie/${id}`,
    tvUrl: (id, season, ep) =>
      `https://player.videasy.net/tv/${id}/${season}/${ep}`,
  },
  {
    id: "vidsrc",
    label: "VidSrc",
    tag: null,
    note: "AniList for anime",
    supportsProgress: true,
    progressViaFrames: true,
    movieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`,
    tvUrl: (id, season, ep) =>
      `https://vidsrc.to/embed/tv/${id}/${season}/${ep}`,
  },
  {
    id: "2embed",
    label: "2Embed",
    tag: null,
    note: "unstable",
    supportsProgress: true,
    progressViaFrames: true,
    movieUrl: (id) => `https://www.2embed.online/embed/movie/${id}`,
    tvUrl: (id, season, ep) =>
      `https://www.2embed.online/embed/tv/${id}/${season}/${ep}`,
  },
  {
    id: "neon",
    label: "Neon",
    tag: null,
    note: "auto fallback",
    supportsProgress: true,
    progressViaFrames: true,
    movieUrl: (id) => `https://ezvidapi.com/embed/movie/${id}`,
    tvUrl: (id, season, ep) =>
      `https://ezvidapi.com/embed/tv/${id}/${season}/${ep}`,
  },
  {
    id: "vidsrc-anime",
    label: "VidSrc (Anime)",
    tag: "ANIME",
    note: "recommended",
    supportsProgress: true,
    progressViaFrames: true,
    animeOnly: true,
    movieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`,
    tvUrl: (id, season, ep) =>
      `https://vidsrc.to/embed/tv/${id}/${season}/${ep}`,
  },
  {
    id: "2embed-anime",
    label: "2Embed (Anime)",
    tag: "ANIME",
    note: null,
    supportsProgress: true,
    progressViaFrames: true,
    animeOnly: true,
    movieUrl: (id) => `https://www.2embed.online/embed/movie/${id}`,
    tvUrl: (id, season, ep) =>
      `https://www.2embed.online/embed/tv/${id}/${season}/${ep}`,
  },
  {
    id: "videasy-anime",
    label: "Videasy (Anime)",
    tag: "ANIME",
    note: null,
    supportsProgress: true,
    animeOnly: true,
    movieUrl: (id) => `https://player.videasy.net/movie/${id}`,
    tvUrl: (id, season, ep) =>
      `https://player.videasy.net/tv/${id}/${season}/${ep}`,
  },
  {
    id: "vidplus",
    label: "VidPlus",
    tag: "ANIME",
    note: null,
    supportsProgress: true,
    progressViaFrames: true,
    animeOnly: true,
    movieUrl: (id) => `https://player.vidplus.to/embed/movie/${id}`,
    tvUrl: (id, season, ep) =>
      `https://player.vidplus.to/embed/tv/${id}/${season}/${ep}`,
  },
  {
    id: "vidnest",
    label: "VidNest",
    tag: "ANIME",
    note: null,
    supportsProgress: true,
    progressViaFrames: true,
    animeOnly: true,
    movieUrl: (id) => `https://vidnest.fun/movie/${id}`,
    tvUrl: (id, season, ep) =>
      `https://vidnest.fun/tv/${id}/${season}/${ep}`,
  },
  {
    id: "allmanga",
    label: "AllManga",
    tag: "ANIME",
    note: "fallback",
    supportsProgress: true,
    async: true,
    animeOnly: true,
    movieUrl: () => "https://allmanga.to",
    tvUrl: () => "https://allmanga.to",
  },
];

function findSource(id) {
  return PLAYER_SOURCES.find((s) => s.id === id) ?? PLAYER_SOURCES[0];
}

const ANIME_SOURCE_ORDER = [
  "vidsrc",
  "vidsrc-anime",
  "2embed",
  "2embed-anime",
  "videasy",
  "videasy-anime",
  "vidplus",
  "vidnest",
  "allmanga",
];

/** Sources shown in the player menu for movies vs anime. */
export function getSourcesForMedia(isAnime) {
  const list = PLAYER_SOURCES.filter((s) => {
    if (s.animeOnly || s.tag === "ANIME") return isAnime;
    return true;
  });
  if (!isAnime) return list;
  return [...list].sort((a, b) => {
    const ia = ANIME_SOURCE_ORDER.indexOf(a.id);
    const ib = ANIME_SOURCE_ORDER.indexOf(b.id);
    return (ia === -1 ? 50 : ia) - (ib === -1 ? 50 : ib);
  });
}

export const isAnimePlayerSource = (sourceId) => {
  const s = findSource(sourceId);
  return !!(s.animeOnly || s.tag === "ANIME");
};

const SUB_DUB_SOURCES = [
  "vidsrc",
  "vidsrc-anime",
  "2embed",
  "2embed-anime",
  "videasy",
  "videasy-anime",
  "vidplus",
  "vidnest",
  "allmanga",
];

/** Embed sources that honor SUB/DUB via URL params (reload player to apply). */
export const sourceSupportsSubDub = (sourceId) =>
  SUB_DUB_SOURCES.includes(sourceId);

function withQuery(url, params) {
  try {
    const u = new URL(url);
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== "") u.searchParams.set(key, value);
    }
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * @param {{
 *   dubMode?: 'sub'|'dub',
 *   originalLang?: string,
 *   preferredLang?: string,
 *   preferredLangName?: string,
 *   isAnime?: boolean,
 *   anilistId?: number,
 *   malId?: number,
 *   anilistEpisode?: number,
 *   useAnilistPlayback?: boolean,
 *   reloadToken?: number|string,
 * }} [opts]
 */
export const getSourceUrl = (sourceId, type, id, season, ep, opts = {}) => {
  const src = findSource(sourceId);
  const dubMode = opts.dubMode === "dub" ? "dub" : "sub";
  const originalLang = (opts.originalLang || "en").slice(0, 2).toLowerCase();
  const preferredLang = (opts.preferredLang || "en").slice(0, 2).toLowerCase();
  const preferredLangName =
    opts.preferredLangName || embedLangLabel(preferredLang);
  const isAnime = !!opts.isAnime;
  const dsLang = resolveDsLang({
    dubMode,
    preferredLang,
    originalLang,
    isAnime,
  });

  if (
    isAnime &&
    type === "tv" &&
    shouldUseAnilistPlayback({
      isAnime,
      anilistId: opts.anilistId,
      anilistEpisode: opts.anilistEpisode ?? ep,
    }) &&
    sourceId !== "allmanga"
  ) {
    return buildAnimeEmbedUrl(sourceId, {
      anilistId: opts.anilistId,
      malId: opts.malId,
      tmdbId: id,
      season,
      episode: ep,
      anilistEpisode: opts.anilistEpisode ?? ep,
      dubMode,
      preferredLang,
      originalLang,
      reloadToken: opts.reloadToken,
    });
  }

  if (isAnime && type === "tv" && sourceId !== "allmanga") {
    return buildAnimeTmdbFallbackUrl(sourceId, id, season, ep, {
      dubMode,
      preferredLang,
      originalLang,
      reloadToken: opts.reloadToken,
    });
  }

  let url = type === "movie" ? src.movieUrl(id) : src.tvUrl(id, season, ep);

  if (
    isAnime &&
    type === "movie" &&
    opts.anilistId &&
    (sourceId === "vidsrc" || sourceId === "vidsrc-anime")
  ) {
    const dubFlag = dubMode === "dub" ? "1" : "0";
    url = withQuery(`https://vidsrc.icu/embed/anime/${opts.anilistId}/1/${dubFlag}`, {
      ds_lang: dsLang,
      autoplay: "1",
    });
    if (opts.reloadToken != null) {
      url = withQuery(url, { _rd: String(opts.reloadToken) });
    }
    return url;
  }

  if (
    sourceId === "vidsrc" ||
    sourceId === "vidsrc-anime"
  ) {
    url = withQuery(url, {
      ...(isAnime ? { dub: dubMode === "dub" ? "1" : "0" } : {}),
      ds_lang: dsLang,
      autoplay: "1",
    });
  } else if (sourceId === "2embed" || sourceId === "2embed-anime") {
    url = withQuery(url, {
      lang: dsLang,
      audio: dubMode === "dub" ? "dub" : "sub",
    });
  } else if (sourceId === "videasy" || sourceId === "videasy-anime") {
    url = withQuery(url, {
      lang: dsLang,
      audioLang: dsLang,
      autoplay: "1",
    });
  } else if (sourceId === "vidplus") {
    url = withQuery(url, {
      autoplay: "true",
      autonext: "true",
      lang: dsLang,
      default_lang: dsLang,
    });
  } else if (sourceId === "vidnest") {
    url = withQuery(url, {
      lang: dsLang,
      ds_lang: dsLang,
    });
  } else if (sourceId === "neon") {
    url = withQuery(url, {
      autoplay: "1",
      autoPlay: "true",
    });
  }

  if (opts.reloadToken != null) {
    url = withQuery(url, { _rd: String(opts.reloadToken) });
  }

  return url;
};

export const sourceSupportsProgress = (sourceId) =>
  findSource(sourceId).supportsProgress ?? false;

export const sourceProgressViaFrames = (sourceId) =>
  findSource(sourceId).progressViaFrames ?? false;

export const sourceIsAsync = (sourceId) => findSource(sourceId).async ?? false;

export const NEEDS_INTERCEPT = [
  "vidsrc",
  "vidsrc-anime",
  "2embed",
  "2embed-anime",
  "vidplus",
  "vidnest",
  "neon",
];

export const ANIME_DEFAULT_SOURCE = "vidsrc";
export const NON_ANIME_DEFAULT_SOURCE = "vidsrc";

// ── AniList GraphQL ───────────────────────────────────────────────────────────
const ANILIST_ENDPOINT = "https://graphql.anilist.co";
const ANILIST_LS_KEY = "mov_anilistCache";
const ANILIST_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const ANILIST_MEDIA_QUERY = `
query ($search: String, $type: MediaType) {
  Media(search: $search, type: $type, sort: SEARCH_MATCH) {
    id
    idMal
    title { romaji english native }
    description(asHtml: false)
    coverImage { extraLarge large }
    bannerImage
    genres
    averageScore
    episodes
    status
    season
    seasonYear
    studios(isMain: true) { nodes { name } }
    startDate { year month }
    relations {
      edges {
        relationType
        node {
          id
          type
          format
          title { romaji english }
          episodes
          startDate { year month }
          seasonYear
        }
      }
    }
  }
}`;

let anilistStore = null;
let anilistFlushHandle = null;

function openAnilistStore() {
  if (anilistStore) return anilistStore;
  try {
    const raw = localStorage.getItem(ANILIST_LS_KEY);
    anilistStore = raw ? JSON.parse(raw) : {};
  } catch {
    anilistStore = {};
  }

  const now = Date.now();
  for (const k of Object.keys(anilistStore)) {
    if (now - anilistStore[k].ts > ANILIST_TTL_MS) delete anilistStore[k];
  }
  return anilistStore;
}

function scheduleAnilistPersist() {
  if (anilistFlushHandle) clearTimeout(anilistFlushHandle);
  anilistFlushHandle = setTimeout(() => {
    anilistFlushHandle = null;
    try {
      localStorage.setItem(ANILIST_LS_KEY, JSON.stringify(anilistStore));
    } catch {
      /* quota */
    }
  }, 500);
}

export const cleanAnilistDescription = (desc) => {
  if (!desc) return desc;

  let text = desc
    .split("<")
    .map((chunk, i) =>
      i === 0 ? chunk : chunk.slice(chunk.indexOf(">") + 1),
    )
    .join("")
    .replace(/>/g, "");

  text = text.replace(/\(Source:[^)]*\)/gi, "");
  text = text.replace(/\bNote:[^\n]*/gi, "");
  return text.replace(/[\s\n]+$/, "").trim();
};

function anilistCacheKey(title, type, tmdbId) {
  if (tmdbId) return `${type}__tmdb_${tmdbId}`;
  return `${type}__${title.toLowerCase().trim()}`;
}

function titlesMatchSearch(cachedMedia, searchTitle) {
  const labels = [
    cachedMedia?.title?.romaji,
    cachedMedia?.title?.english,
    cachedMedia?.title?.native,
  ]
    .filter(Boolean)
    .map((t) => t.toLowerCase());

  const needle = searchTitle.toLowerCase();
  return labels.some((t) => t.includes(needle) || needle.includes(t));
}

export const fetchAnilistData = async (
  title,
  type = "ANIME",
  tmdbId = null,
) => {
  const key = anilistCacheKey(title, type, tmdbId);
  const store = openAnilistStore();
  const row = store[key];

  if (row && Date.now() - row.ts <= ANILIST_TTL_MS) {
    const staleTitle =
      row.data !== null &&
      !titlesMatchSearch(row.data, title);
    if (!staleTitle) return row.data;
    delete store[key];
    scheduleAnilistPersist();
  }

  try {
    const res = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: ANILIST_MEDIA_QUERY,
        variables: { search: title, type },
      }),
    });
    const json = await res.json();
    const media = json?.data?.Media ?? null;

    store[key] = { data: media, ts: Date.now() };
    scheduleAnilistPersist();
    return media;
  } catch {
    return row?.data ?? null;
  }
};

export const buildAnilistSeasons = (anilistData) => {
  if (!anilistData) return null;

  const root = {
    id: anilistData.id,
    title:
      anilistData.title?.english ||
      anilistData.title?.romaji ||
      anilistData.title?.native,
    episodes: anilistData.episodes || null,
    year: anilistData.startDate?.year || anilistData.seasonYear || 9999,
    month: anilistData.startDate?.month || 0,
  };

  const followUps = (anilistData.relations?.edges || [])
    .filter(
      (e) =>
        e.relationType === "SEQUEL" &&
        e.node.type === "ANIME" &&
        (e.node.format === "TV" || e.node.format === "TV_SHORT"),
    )
    .map((e) => ({
      id: e.node.id,
      title: e.node.title?.english || e.node.title?.romaji,
      episodes: e.node.episodes || null,
      year: e.node.startDate?.year || e.node.seasonYear || 9999,
      month: e.node.startDate?.month || 0,
    }));

  const timeline = [root, ...followUps].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month,
  );

  return timeline.map((s, i) => ({ seasonNum: i + 1, ...s }));
};

export const isAnimeContent = (item, details) => {
  const meta = details || item;
  const lang = meta.original_language;
  const countries = meta.origin_country || [];
  const genreIds = meta.genre_ids || (meta.genres || []).map((g) => g.id);
  const genreNames = (meta.genres || []).map((g) =>
    (g.name || "").toLowerCase(),
  );
  const animated =
    genreIds.includes(16) ||
    genreNames.some((n) => n.includes("animation") || n === "anime");
  const japanese =
    lang === "ja" ||
    countries.includes("JP") ||
    countries.includes("JA");
  const origin = (meta.origin_country || meta.production_countries || [])
    .map((c) => (typeof c === "string" ? c : c.iso_3166_1))
    .filter(Boolean);
  const fromJapan = origin.includes("JP");
  if (animated && (japanese || fromJapan)) return true;
  if (meta.media_type === "tv" && animated && genreNames.includes("anime")) {
    return true;
  }
  return false;
};

// ── TMDB episode groups (persisted cache) ─────────────────────────────────────
const EP_GROUP_LS_KEY = "mov_episodeGroupCache";
const EP_GROUP_TTL_MS = 7 * 24 * 60 * 60 * 1000;

let epGroupStore = null;
let epGroupFlushHandle = null;

function openEpGroupStore() {
  if (epGroupStore) return epGroupStore;
  try {
    const raw = localStorage.getItem(EP_GROUP_LS_KEY);
    epGroupStore = raw ? JSON.parse(raw) : {};
  } catch {
    epGroupStore = {};
  }

  const now = Date.now();
  for (const k of Object.keys(epGroupStore)) {
    if (now - epGroupStore[k].ts > EP_GROUP_TTL_MS) delete epGroupStore[k];
  }
  return epGroupStore;
}

function scheduleEpGroupPersist() {
  if (epGroupFlushHandle) clearTimeout(epGroupFlushHandle);
  epGroupFlushHandle = setTimeout(() => {
    epGroupFlushHandle = null;
    try {
      localStorage.setItem(EP_GROUP_LS_KEY, JSON.stringify(epGroupStore));
    } catch {
      /* quota */
    }
  }, 500);
}

export const fetchEpisodeGroup = async (groupId, apiKey) => {
  const store = openEpGroupStore();
  const row = store[groupId];
  if (row && Date.now() - row.ts <= EP_GROUP_TTL_MS) return row.data;

  const data = await tmdbFetch(`/tv/episode_group/${groupId}`, apiKey);
  store[groupId] = { data, ts: Date.now() };
  scheduleEpGroupPersist();
  return data;
};
