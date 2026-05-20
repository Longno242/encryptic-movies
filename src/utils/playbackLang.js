import { storage, STORAGE_KEYS } from "./storage";
import { SUBTITLE_LANGUAGES } from "./subtitles";

export const PLAYBACK_LANGUAGES = SUBTITLE_LANGUAGES;

const EMBED_LANG_NAMES = Object.fromEntries(
  SUBTITLE_LANGUAGES.map(({ code, label }) => [code, label]),
);

export function getPlaybackLang() {
  const raw = storage.get(STORAGE_KEYS.PLAYBACK_LANG);
  if (typeof raw === "string" && raw.length >= 2) return raw;
  return "en";
}

export function setPlaybackLang(code) {
  storage.set(STORAGE_KEYS.PLAYBACK_LANG, code);
}

export function embedLangLabel(code) {
  const key = (code || "en").slice(0, 2);
  return EMBED_LANG_NAMES[key] || EMBED_LANG_NAMES.en || "English";
}

/** Subtitle track language for embed query params (ds_lang, lang, etc.). */
export function resolveSubtitleLang({
  dubMode,
  preferredLang,
  originalLang,
  isAnime,
}) {
  const pref = (preferredLang || "en").slice(0, 2).toLowerCase();
  const orig = (originalLang || "ja").slice(0, 2).toLowerCase();
  if (dubMode === "dub") return pref;
  if (isAnime) return pref;
  return orig !== "en" ? orig : pref;
}

/** Audio language hint when a host exposes a separate audio param. */
export function resolveAudioLang({
  dubMode,
  preferredLang,
  originalLang,
  isAnime,
}) {
  const pref = (preferredLang || "en").slice(0, 2).toLowerCase();
  const orig = (originalLang || "ja").slice(0, 2).toLowerCase();
  if (dubMode === "dub") return pref;
  if (isAnime) return orig;
  return orig !== "en" ? orig : pref;
}

/** @deprecated Use resolveSubtitleLang — kept for existing imports. */
export function resolveDsLang(opts) {
  return resolveSubtitleLang(opts);
}
