import { useState, useEffect, useMemo } from "react";
import {
  fetchMovieRating,
  fetchTVRating,
  getAgeLimitSetting,
  getRatingCountry,
} from "./ageRating";
import { storage, getApiKey } from "./storage";

const RATINGS_STORE_KEY = "ratingsCache";
const ENTRY_TTL = 7 * 24 * 60 * 60 * 1000;
const FETCH_GAP_MS = 80;

function loadRatingsStore() {
  try {
    return storage.get(RATINGS_STORE_KEY) || {};
  } catch {
    return {};
  }
}

function persistRatingsStore(store) {
  try {
    storage.set(RATINGS_STORE_KEY, store);
  } catch {
    /* ignore */
  }
}

function pruneExpired(store) {
  const now = Date.now();
  for (const id of Object.keys(store)) {
    if (now - store[id].ts > ENTRY_TTL) delete store[id];
  }
  return store;
}

function itemCacheKey(item, country) {
  const kind = item.media_type === "tv" ? "tv" : "movie";
  return `${kind}_${item.id}_${country}`;
}

function itemMapKey(item) {
  const kind = item.media_type === "tv" ? "tv" : "movie";
  return `${kind}_${item.id}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useRatings(items) {
  const [ratingsMap, setRatingsMap] = useState({});
  const [ageLimitSetting] = useState(() => getAgeLimitSetting(storage));
  const [ratingCountry] = useState(() => getRatingCountry(storage));
  const [apiKey] = useState(() => getApiKey());

  const fingerprint = useMemo(() => {
    if (!items?.length) return "";
    return items
      .map((i) => `${i.media_type === "tv" ? "tv" : "movie"}_${i.id}`)
      .sort()
      .join(",");
  }, [items]);

  useEffect(() => {
    if (!fingerprint || !apiKey) return;

    const store = pruneExpired(loadRatingsStore());
    let dirty = false;

    const seeded = {};
    const pending = [];

    for (const item of items) {
      const ck = itemCacheKey(item, ratingCountry);
      const hit = store[ck];
      const fresh = hit && Date.now() - hit.ts <= ENTRY_TTL;

      if (fresh) {
        seeded[itemMapKey(item)] = { cert: hit.cert, minAge: hit.minAge };
      } else {
        pending.push(item);
      }
    }

    if (Object.keys(seeded).length) {
      setRatingsMap((prev) => ({ ...prev, ...seeded }));
    }
    if (!pending.length) return;

    let aborted = false;

    (async () => {
      for (let i = 0; i < pending.length; i++) {
        if (aborted) break;

        const item = pending[i];
        const isTv = item.media_type === "tv";
        const ck = itemCacheKey(item, ratingCountry);
        const mk = itemMapKey(item);

        try {
          const rating = isTv
            ? await fetchTVRating(item.id, apiKey, ratingCountry)
            : await fetchMovieRating(item.id, apiKey, ratingCountry);

          if (aborted) break;

          store[ck] = {
            cert: rating.cert,
            minAge: rating.minAge,
            ts: Date.now(),
          };
          dirty = true;
          setRatingsMap((prev) => ({ ...prev, [mk]: rating }));
        } catch {
          /* skip failed item */
        }

        if (i < pending.length - 1) await sleep(FETCH_GAP_MS);
      }

      if (dirty && !aborted) persistRatingsStore(store);
    })();

    return () => {
      aborted = true;
    };
  }, [fingerprint, apiKey, ratingCountry]);

  return { ratingsMap, ageLimitSetting, ratingCountry };
}

export function getRatingForItem(item, ratingsMap) {
  const mk = itemMapKey(item);
  return ratingsMap[mk] || { cert: null, minAge: null };
}
