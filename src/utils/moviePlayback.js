import { storage } from "./storage";
import { getTitleSource, setTitleSource } from "./titleMeta";

export const FAILOVER_SOURCE = "neon";
export const MOVIE_SOURCE_CHAIN = ["vidsrc", "videasy", "2embed", "neon"];

export function getFailoverSource(currentId) {
  if (currentId !== FAILOVER_SOURCE) return FAILOVER_SOURCE;
  return MOVIE_SOURCE_CHAIN.find((id) => id !== currentId) || "vidsrc";
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

export function getNextMovieSource(currentId) {
  return getFailoverSource(currentId);
}
