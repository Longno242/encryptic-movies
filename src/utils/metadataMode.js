import { storage, STORAGE_KEYS } from "./storage";

/** @typedef {'tmdb' | 'free'} MetadataMode */

export function getMetadataMode() {
  const mode = storage.get(STORAGE_KEYS.METADATA_MODE);
  if (mode === "free" || mode === "tmdb") return mode;
  return null;
}

/** @param {MetadataMode} mode */
export function setMetadataMode(mode) {
  storage.set(STORAGE_KEYS.METADATA_MODE, mode);
}

export function isFreeMetadataMode() {
  return getMetadataMode() === "free";
}

export function isTmdbMetadataMode() {
  return getMetadataMode() === "tmdb";
}

/** User must pick free or TMDB on the catalog screen before the app loads. */
export function needsCatalogSetup(apiKey) {
  const mode = getMetadataMode();
  if (mode === "free") return false;
  if (mode === "tmdb") return !apiKey;
  return true;
}

export function hasActiveCatalog(apiKey) {
  return !needsCatalogSetup(apiKey);
}

/** Post-update gate: must pick free or TMDB before the app loads. */
export function mustShowCatalogSetup(apiKey, catalogSetupRequired) {
  if (catalogSetupRequired) return true;
  return needsCatalogSetup(apiKey);
}

/** TMDB numeric id — enough for embed players without an API token. */
export function hasTmdbMovieId(item) {
  const id = Number(item?.id);
  return Number.isFinite(id) && id > 0;
}

/**
 * Block movie browse/play when free mode has no API key and no usable TMDB id.
 * @param {object} item
 * @param {string | null} apiKey
 * @param {boolean} [isAnime]
 */
export function movieRequiresTmdbApiKey(item, apiKey, isAnime = false) {
  if (apiKey) return false;
  if (!isFreeMetadataMode()) return false;
  if (isAnime) return false;
  return !hasTmdbMovieId(item);
}
