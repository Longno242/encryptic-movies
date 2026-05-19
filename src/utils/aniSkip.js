// AniSkip v2 — intro/outro timestamps keyed by MAL id + episode number.
// https://api.aniskip.com/api-docs

const API_ROOT = "https://api.aniskip.com/v2";
const STORE_KEY = "mov_aniskipCache";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStore(store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

export function clearAniSkipCache() {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}

function mapResultsToTimings(results) {
  const out = {};
  for (const row of results) {
    const { skipType, interval } = row;
    const slot =
      skipType === "op" || skipType === "mixed-op"
        ? "intro"
        : skipType === "ed" || skipType === "mixed-ed"
          ? "outro"
          : null;
    if (slot) {
      out[slot] = {
        startTime: interval.startTime,
        endTime: interval.endTime,
      };
    }
  }
  return Object.keys(out).length ? out : null;
}

function cacheEntry(store, key, data) {
  store[key] = { data, expiresAt: Date.now() + TTL_MS };
  saveStore(store);
}

/**
 * @param {number} malId — MyAnimeList id (`anilistData.idMal`)
 * @param {number} episodeNumber
 */
export async function fetchAniSkipTimings(malId, episodeNumber) {
  if (!malId || !episodeNumber) return null;

  const key = `${malId}_${episodeNumber}`;
  const store = loadStore();
  const cached = store[key];
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const query =
    `?types[]=op&types[]=ed&types[]=mixed-op&types[]=mixed-ed&episodeLength=0`;

  try {
    const res = await fetch(
      `${API_ROOT}/skip-times/${malId}/${episodeNumber}${query}`,
    );

    if (res.status === 404) {
      cacheEntry(store, key, null);
      return null;
    }
    if (!res.ok) return null;

    const body = await res.json();
    if (!body.found || !body.results?.length) {
      cacheEntry(store, key, null);
      return null;
    }

    const timings = mapResultsToTimings(body.results);
    cacheEntry(store, key, timings);
    return timings;
  } catch {
    return null;
  }
}
