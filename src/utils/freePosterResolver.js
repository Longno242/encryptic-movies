/**
 * Multi-source poster fallback for free catalog mode (no TMDB key).
 * Tries several public APIs until an image URL is found.
 */

import { tvmazeSearchShows } from "./tvmazeApi";

const ANILIST_GQL = "https://graphql.anilist.co";
const JIKAN = "https://api.jikan.moe/v4";
const WIKI_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary";

const CACHE_VERSION = "v2";
const cache = new Map();
const inflight = new Map();

function hasUrl(path) {
  return path && typeof path === "string" && /^https?:\/\//i.test(path.trim());
}

/** TMDB relative path (`/abc.jpg`) or full image URL. */
export function itemHasPoster(item) {
  const p = item?.poster_path;
  if (!p || typeof p !== "string") return false;
  const t = p.trim();
  if (!t) return false;
  if (/^https?:\/\//i.test(t)) return true;
  if (t.startsWith("/")) return true;
  return false;
}

function posterPathForDisplay(item) {
  if (!itemHasPoster(item)) return null;
  const p = item.poster_path.trim();
  return hasUrl(p) ? p : p;
}

function cacheKey(item) {
  return [
    CACHE_VERSION,
    item?.media_type,
    item?._source,
    item?.id,
    item?.tvmazeId,
    item?.anilistId,
    item?.title || item?.name,
  ].join("|");
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { Accept: "application/json", ...(options.headers || {}) },
    signal: options.signal || AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  return res.json();
}

async function anilistCoverById(anilistId) {
  const id = Number(anilistId);
  if (!Number.isFinite(id)) return null;
  const json = await fetchJson(ANILIST_GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query ($id: Int) {
        Media(id: $id) { coverImage { extraLarge large medium } bannerImage }
      }`,
      variables: { id },
    }),
  });
  const m = json?.data?.Media;
  if (!m) return { poster: null, backdrop: null };
  const poster =
    m.coverImage?.extraLarge ||
    m.coverImage?.large ||
    m.coverImage?.medium ||
    null;
  return { poster, backdrop: m.bannerImage || poster };
}

async function jikanAnimePoster(title) {
  const q = String(title || "").trim();
  if (!q) return null;
  const json = await fetchJson(
    `${JIKAN}/anime?q=${encodeURIComponent(q)}&limit=3&order_by=popularity&sort=desc`,
  );
  const rows = json?.data || [];
  const lower = q.toLowerCase();
  const hit =
    rows.find((r) => {
      const t = r.title?.toLowerCase() || "";
      const e = r.title_english?.toLowerCase() || "";
      return t === lower || e === lower;
    }) || rows[0];
  if (!hit?.images?.jpg) return null;
  return (
    hit.images.jpg.large_image_url ||
    hit.images.jpg.image_url ||
    hit.images.webp?.large_image_url ||
    null
  );
}

async function wikipediaImage(title) {
  const clean = String(title || "")
    .replace(/\s*\(\d{4}\)\s*$/, "")
    .replace(/:\s*.*$/, "")
    .trim();
  if (!clean) return null;
  const encoded = encodeURIComponent(clean.replace(/ /g, "_"));
  try {
    const data = await fetchJson(`${WIKI_SUMMARY}/${encoded}`);
    return (
      data?.originalimage?.source ||
      data?.thumbnail?.source?.replace(/\/\d+px-/, "/800px-") ||
      data?.thumbnail?.source ||
      null
    );
  } catch {
    return null;
  }
}

async function tvmazePosterById(tvmazeId) {
  const id = Number(tvmazeId);
  if (!Number.isFinite(id)) return null;
  const show = await fetchJson(`https://api.tvmaze.com/shows/${id}`);
  if (!show?.image) return null;
  return show.image.original || show.image.medium || null;
}

async function tvmazePosterByTitle(title) {
  const shows = await tvmazeSearchShows(title);
  if (!shows.length) return null;
  const lower = String(title).toLowerCase();
  const hit =
    shows.find(
      (s) =>
        (s.name || "").toLowerCase() === lower ||
        (s.title || "").toLowerCase() === lower,
    ) || shows[0];
  return hit?.poster_path || null;
}

function titleMatches(item, candidateTitle) {
  const want = String(item?.title || item?.name || "")
    .toLowerCase()
    .replace(/\s*\(\d{4}\)\s*$/, "")
    .trim();
  const got = String(candidateTitle || "")
    .toLowerCase()
    .replace(/\s*\(\d{4}\)\s*$/, "")
    .trim();
  if (!want || !got) return false;
  return want === got;
}

/** Ordered resolvers for a catalog item (only when no TMDB/TVMaze poster on item). */
function resolversFor(item) {
  const title = item?.title || item?.name || "";
  const isMovie = item?.media_type === "movie";
  const isAnime =
    item?.media_type === "anilist" ||
    item?._anilistOnly ||
    item?.media_type === "anime";
  const isTvmaze =
    item?._source === "tvmaze" ||
    (item?.media_type === "tv" && !isMovie);

  const list = [];

  if (item?.anilistId || (isAnime && item?.id)) {
    const aid = item.anilistId || item.id;
    list.push(async () => {
      const { poster } = await anilistCoverById(aid);
      return poster;
    });
  }

  if (isTvmaze && (item.tvmazeId || item.id)) {
    const tid = item.tvmazeId || item.id;
    list.push(async () => tvmazePosterById(tid));
  }

  if (isAnime && title) {
    list.push(async () => jikanAnimePoster(title));
  }

  if (isTvmaze && title) {
    list.push(async () => {
      const shows = await tvmazeSearchShows(title);
      if (!shows.length) return null;
      const hit =
        shows.find((s) => titleMatches(item, s.name || s.title)) ||
        (shows.length === 1 ? shows[0] : null);
      return hit?.poster_path || null;
    });
  }

  if (title && !isMovie) {
    list.push(async () => wikipediaImage(title));
  }

  return list;
}

/**
 * Resolve a poster URL from multiple free APIs.
 * @param {object} item
 * @returns {Promise<string|null>}
 */
export async function resolveFreePoster(item) {
  if (!item) return null;
  const existing = posterPathForDisplay(item);
  if (existing) return existing;

  const key = cacheKey(item);
  if (cache.has(key)) return cache.get(key);
  if (inflight.has(key)) return inflight.get(key);

  const promise = (async () => {
    for (const resolver of resolversFor(item)) {
      try {
        const url = await resolver();
        if (hasUrl(url)) {
          cache.set(key, url);
          return url;
        }
      } catch {
        /* try next source */
      }
    }
    cache.set(key, null);
    return null;
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

/**
 * @param {object} item
 * @returns {Promise<{ poster_path?: string, backdrop_path?: string }>}
 */
export async function enrichFreeMediaImages(item) {
  const poster =
    (await resolveFreePoster(item)) ||
    (itemHasPoster(item) ? item.poster_path : null);

  let backdrop = hasUrl(item?.backdrop_path) ? item.backdrop_path : null;
  if (!backdrop && (item?.anilistId || item?._anilistOnly)) {
    try {
      const { backdrop: b, poster: p } = await anilistCoverById(
        item.anilistId || item.id,
      );
      backdrop = b || p || poster;
    } catch {}
  }
  if (!backdrop) backdrop = poster;

  return {
    ...item,
    ...(poster ? { poster_path: poster } : {}),
    ...(backdrop ? { backdrop_path: backdrop } : {}),
  };
}

/**
 * Fill missing posters on a list (limited concurrency).
 * @param {object[]} items
 * @param {number} [concurrency]
 */
export async function enrichFreeCatalogPosters(items, concurrency = 4) {
  if (!Array.isArray(items) || !items.length) return items;

  const out = [...items];
  let index = 0;

  async function worker() {
    while (index < out.length) {
      const i = index++;
      const item = out[i];
      if (itemHasPoster(item)) continue;
      const poster = await resolveFreePoster(item);
      if (poster) out[i] = { ...item, poster_path: poster };
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, out.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return out;
}
