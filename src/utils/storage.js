/** JSON persistence in localStorage (Vite dev + production builds). */

const LS_PREFIX = "mov_";

export const storage = {
  get(key) {
    try {
      const raw = localStorage.getItem(LS_PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
    } catch {
      /* quota or private mode */
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(LS_PREFIX + key);
    } catch {
      /* ignore */
    }
  },

  /** Wipe every key owned by this app (settings reset). */
  clearAll() {
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith(LS_PREFIX)) localStorage.removeItem(k);
      }
    } catch {
      /* ignore */
    }
  },
};

/** Canonical suffixes passed to `storage.get` / `storage.set`. */
export const STORAGE_KEYS = {
  API_KEY: "apikey",
  PLAYER_SOURCE: "playerSource",
  ALLMANGA_DUB_MODE: "allmangaDubMode",
  PLAYBACK_LANG: "playbackLang",
  WATCH_PROGRESS: "progress",
  WATCHED: "watched",
  HISTORY: "history",
  SAVED: "saved",
  SAVED_ORDER: "savedOrder",
  LOCAL_FILES: "localFiles",
  DOWNLOAD_PATH: "downloadPath",
  DOWNLOADER_FOLDER: "downloaderFolder",
  START_PAGE: "startPage",
  AGE_LIMIT: "ageLimit",
  RATING_COUNTRY: "ratingCountry",
  WATCHED_THRESHOLD: "watchedThreshold",
  HOME_ROW_ORDER: "homeRowOrder",
  HOME_ROW_VISIBLE: "homeRowVisible",
  HOME_VIEW_MODE: "homeViewMode",
  AUTO_CHECK_UPDATES: "autoCheckUpdates",
  UPDATE_TEST_MODE: "updateTestMode",
  DISMISSED_UPDATE_VERSION: "dismissedUpdateVersion",
  SIDEBAR_COLLAPSED: "sidebarCollapsed",
  INVIDIOUS_BASE: "invidiousBase",
  SUBTITLE_ENABLED: "subtitleDownload",
  SUBTITLE_LANG: "subtitleLang",
  SUBDL_API_KEY: "subdlApiKey",
  WYZIE_API_KEY: "wyzieApiKey",
  ACCENT_COLOR: "accentColor",
  FONT_SIZE: "fontSize",
  COMPACT_MODE: "compactMode",
  REDUCE_ANIMATIONS: "reduceAnimations",
  LIBRARY_SORT: "librarySort",
  HISTORY_ENABLED: "historyEnabled",
  NOTIFY_DOWNLOAD_COMPLETE: "notifyDownloadComplete",
  NOTIFY_NEW_EPISODE: "notifyNewEpisode",
  INTRO_SKIP_MODE: "introSkipMode",
  DISCORD_RPC_ENABLED: "discordRpcEnabled",
  DISCORD_RPC_CONFIG: "discordRpcConfig",
  DL_SORT_BY: "dlSortBy",
  DL_SORT_DIR: "dlSortDir",
  DL_SHOW_UNTRACKED: "dlShowUntracked",
  EPISODE_RELEASE_CACHE: "episodeReleaseCache",
  TITLE_META: "titleMeta",
  CUSTOM_LISTS: "customLists",
  ENCRYPTIC_SHIELD: "encrypticShieldEnabled",
  PICK_MODE_HINT: "pickModeHintSeen",
};

export const getApiKey = () => storage.get(STORAGE_KEYS.API_KEY);

const hasElectronBridge =
  typeof window !== "undefined" && Boolean(window.electron);

export const isElectron = hasElectronBridge;

export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return "…";
  if (bytes === -1) return null;
  if (bytes === 0) return "0 B";

  const units = [
    { limit: 1024, suffix: " B" },
    { limit: 1024 ** 2, suffix: " KB", div: 1024 },
    { limit: 1024 ** 3, suffix: " MB", div: 1024 ** 2 },
    { limit: Infinity, suffix: " GB", div: 1024 ** 3, fixed: 2 },
  ];

  for (const u of units) {
    if (bytes < u.limit) {
      const n = u.div ? bytes / u.div : bytes;
      return n.toFixed(u.fixed ?? 1) + u.suffix;
    }
  }
  return String(bytes);
}

const secureBridgeAvailable =
  typeof window !== "undefined" && Boolean(window.electron?.secureGet);

/** OS keychain-backed secrets (Electron only). */
export const secureStorage = {
  async get(key) {
    if (!secureBridgeAvailable) return null;
    return window.electron.secureGet(key);
  },

  async set(key, value) {
    if (!secureBridgeAvailable) return;
    return window.electron.secureSet(key, value ?? "");
  },
};

const STANDALONE_CACHE_KEYS = [
  "mov_anilistCache",
  "mov_episodeGroupCache",
  "mov_aniskipCache",
];

/** Full cache wipe — used after updates and from Settings. */
export async function clearAppCaches() {
  if (isElectron) {
    try {
      await window.electron.clearAppCache();
    } catch {
      /* main process optional */
    }
  }

  for (const k of STANDALONE_CACHE_KEYS) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }

  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("dlDur_")) localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}
