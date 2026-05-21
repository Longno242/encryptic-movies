/** Shared Discord RPC template helpers (main process). */

const DEFAULT_DISCORD_RPC_CONFIG = {
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

function applyDiscordTemplate(template, vars) {
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

function formatDiscordTimeLeft(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  if (s <= 0) return "Almost done";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m} min left`;
  return `${s}s left`;
}

function formatDiscordDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function pageLabel(page) {
  return PAGE_LABELS[page] || "Browsing";
}

function mediaLabel(mediaType) {
  if (mediaType === "tv") return "TV Show";
  if (mediaType === "anime") return "Anime";
  return "Movie";
}

module.exports = {
  DEFAULT_DISCORD_RPC_CONFIG,
  PAGE_LABELS,
  applyDiscordTemplate,
  formatDiscordTimeLeft,
  formatDiscordDuration,
  pageLabel,
  mediaLabel,
};
