/** Export / import of user data keys (manual + scheduled backup). */

const LS_PREFIX = "mov_";

export const BACKUP_KEYS = [
  "saved",
  "savedOrder",
  "history",
  "progress",
  "watched",
  "homeRowOrder",
  "homeRowVisible",
  "startPage",
  "playerSource",
  "allmangaDubMode",
  "playbackLang",
  "introSkipMode",
  "ageLimit",
  "ratingCountry",
  "watchedThreshold",
  "subtitleDownload",
  "subtitleLang",
  "downloadPath",
  "downloaderFolder",
  "invidiousBase",
  "autoCheckUpdates",
  "searchHistory",
  "accentColor",
  "fontSize",
  "compactMode",
  "reduceAnimations",
  "librarySort",
  "historyEnabled",
  "notifyDownloadComplete",
  "notifyNewEpisode",
  "episodeReleaseCache",
];

function readKey(key) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function collectBackupData() {
  const payload = {};
  for (const key of BACKUP_KEYS) {
    const value = readKey(key);
    if (value !== undefined && value !== null) payload[key] = value;
  }
  return payload;
}

export function restoreBackupData(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid backup data");
  }
  for (const key of BACKUP_KEYS) {
    if (data[key] !== undefined && data[key] !== null) {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(data[key]));
    }
  }
}
