import { storage } from "./storage";
import { getTitleSource, setTitleSource } from "./titleMeta";

export const FAILOVER_SOURCE = "neon";
export const MOVIE_SOURCE_CHAIN = [
  "vidsrc",
  "neon",
  "videasy",
  "vidfast",
  "moviesapi",
  "vidlink",
  "multiembed",
  "2embed",
];

/** Walk the movie source chain; returns null when exhausted. */
export function getNextMovieSource(currentId) {
  const idx = MOVIE_SOURCE_CHAIN.indexOf(currentId);
  if (idx === -1) return MOVIE_SOURCE_CHAIN[0];
  if (idx >= MOVIE_SOURCE_CHAIN.length - 1) return null;
  return MOVIE_SOURCE_CHAIN[idx + 1];
}

/** @deprecated Prefer getNextMovieSource — kept for callers that jump to Neon first. */
export function getFailoverSource(currentId) {
  if (currentId !== FAILOVER_SOURCE) return FAILOVER_SOURCE;
  return getNextMovieSource(FAILOVER_SOURCE);
}

const MEMORY_PREFIX = "movieSourceOk_";

export function rememberMovieSource(tmdbId, sourceId) {
  if (!tmdbId || !sourceId) return;
  storage.set(`${MEMORY_PREFIX}${tmdbId}`, sourceId);
  setTitleSource("movie", tmdbId, sourceId);
}

export function getRememberedMovieSource(tmdbId) {
  const fromTitle = getTitleSource("movie", tmdbId);
  if (fromTitle && MOVIE_SOURCE_CHAIN.includes(fromTitle)) return fromTitle;
  const saved = storage.get(`${MEMORY_PREFIX}${tmdbId}`);
  if (saved && MOVIE_SOURCE_CHAIN.includes(saved)) return saved;
  return null;
}
