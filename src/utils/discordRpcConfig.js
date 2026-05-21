import { storage, STORAGE_KEYS } from "./storage";

/** @typedef {'full' | 'private' | 'minimal'} DiscordRpcPrivacy */
/** @typedef {'watching' | 'playing'} DiscordRpcActivityType */

export const DEFAULT_DISCORD_RPC_CONFIG = {
  enabled: true,
  privacy: "full",
  showPoster: true,
  showCountdown: true,
  showElapsed: false,
  showProgress: true,
  showEpisode: true,
  showYear: true,
  activityType: "watching",
  detailsTemplate: "Watching {title}",
  stateTemplate: "{subtitle}",
  stateFallbackTemplate: "{timeLeft}",
  browsingDetails: "Encryptic Movies",
  browsingState: "{page}",
  browsingShowPage: true,
};

export const DISCORD_DETAILS_PRESETS = [
  { value: "Watching {title}", label: "Watching {title}" },
  { value: "{title}", label: "{title}" },
  { value: "{title} ({year})", label: "{title} ({year})" },
  { value: "{mediaLabel}: {title}", label: "{mediaLabel}: {title}" },
  { value: "▶ {title}", label: "▶ {title}" },
  { value: "custom", label: "Custom…" },
];

export const DISCORD_STATE_PRESETS = [
  { value: "{timeLeft}", label: "Time remaining" },
  { value: "{progress}% · {timeLeft}", label: "Progress & time left" },
  { value: "{subtitle}", label: "Episode info only" },
  { value: "{subtitle} · {timeLeft}", label: "Episode & time left" },
  { value: "{seasonEp} · {progress}%", label: "S/E & progress" },
  { value: "{elapsed} / {duration}", label: "Elapsed / total" },
  { value: "custom", label: "Custom…" },
];

const PAGE_LABELS = {
  home: "Home",
  movie: "Title page",
  tv: "Title page",
  library: "Library",
  history: "Watch history",
  downloads: "Downloads",
  settings: "Settings",
  person: "Cast & crew",
  issues: "Issues",
};

export function getDiscordRpcConfig() {
  const stored = storage.get(STORAGE_KEYS.DISCORD_RPC_CONFIG);
  const cfg = { ...DEFAULT_DISCORD_RPC_CONFIG, ...(stored && typeof stored === "object" ? stored : {}) };

  const legacy = storage.get(STORAGE_KEYS.DISCORD_RPC_ENABLED);
  if (legacy !== null && legacy !== undefined && stored?.enabled === undefined) {
    cfg.enabled =
      legacy === true || legacy === 1 || legacy === "1";
  }
  return cfg;
}

export function saveDiscordRpcConfig(partial) {
  const next = { ...getDiscordRpcConfig(), ...partial };
  storage.set(STORAGE_KEYS.DISCORD_RPC_CONFIG, next);
  storage.set(STORAGE_KEYS.DISCORD_RPC_ENABLED, next.enabled ? 1 : 0);
  return next;
}

export function isDiscordRpcEnabledFromConfig() {
  return !!getDiscordRpcConfig().enabled;
}

/** @param {string} template */
export function applyDiscordTemplate(template, vars) {
  if (!template) return "";
  let out = String(template).replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    if (v === null || v === undefined || v === "") return "";
    return String(v);
  });
  out = out
    .replace(/\s*·\s*·+/g, " · ")
    .replace(/^\s*·\s*|\s*·\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return out.slice(0, 128);
}

export function formatDiscordTimeLeft(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  if (s <= 0) return "Almost done";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m} min left`;
  return `${s}s left`;
}

export function formatDiscordDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function pageLabel(page) {
  return PAGE_LABELS[page] || "Browsing";
}

export function mediaLabel(mediaType) {
  if (mediaType === "tv") return "TV Show";
  if (mediaType === "anime") return "Anime";
  return "Movie";
}

/** Build preview strings for settings UI */
export function previewDiscordPresence(cfg, sample = {}) {
  const {
    title = "Inception",
    subtitle = "Season 1 · Episode 3",
    year = "2010",
    currentTime = 2400,
    duration = 5280,
    mediaType = "movie",
    page = "home",
  } = sample;

  const remaining = Math.max(0, duration - currentTime);
  const progress =
    duration > 0 ? Math.min(100, Math.floor((currentTime / duration) * 100)) : 0;

  const vars = {
    title,
    year,
    subtitle,
    season: "1",
    episode: "3",
    seasonEp: "S1 · E3",
    timeLeft: formatDiscordTimeLeft(remaining),
    progress: String(progress),
    elapsed: formatDiscordDuration(currentTime),
    duration: formatDiscordDuration(duration),
    mediaType,
    mediaLabel: mediaLabel(mediaType),
    page: pageLabel(page),
    appName: "Encryptic Movies",
  };

  if (cfg.privacy === "private") {
    return {
      details: "Watching something",
      state: cfg.showCountdown ? vars.timeLeft : "In Encryptic Movies",
    };
  }
  if (cfg.privacy === "minimal") {
    return {
      details: cfg.browsingDetails || "Encryptic Movies",
      state: cfg.browsingShowPage ? vars.page : "Browsing",
    };
  }

  const stateTpl =
    (subtitle && cfg.showEpisode !== false ? cfg.stateTemplate : cfg.stateFallbackTemplate) ||
    cfg.stateFallbackTemplate;

  return {
    details: applyDiscordTemplate(cfg.detailsTemplate, vars) || title,
    state:
      applyDiscordTemplate(stateTpl, vars) ||
      applyDiscordTemplate(cfg.stateFallbackTemplate, vars) ||
      vars.timeLeft,
  };
}

export function resolveTemplatePreset(value, presets, customValue) {
  if (value === "custom") return customValue || "";
  return value;
}

export function matchTemplatePreset(template, presets) {
  const hit = presets.find((p) => p.value !== "custom" && p.value === template);
  return hit ? hit.value : "custom";
}
