import {
  getDiscordRpcConfig,
  saveDiscordRpcConfig,
  isDiscordRpcEnabledFromConfig,
} from "./discordRpcConfig";

let lastSentAt = 0;
let lastKey = "";

export function isDiscordRpcEnabled() {
  return isDiscordRpcEnabledFromConfig();
}

export function getDiscordPresenceConfig() {
  return getDiscordRpcConfig();
}

export function syncDiscordRpcConfig() {
  const cfg = getDiscordRpcConfig();
  window.electron?.setDiscordRpcConfig?.(cfg);
  window.electron?.setDiscordRpcEnabled?.(!!cfg.enabled);
  return cfg;
}

export function syncDiscordRpcEnabled(enabled) {
  saveDiscordRpcConfig({ enabled: !!enabled });
  window.electron?.setDiscordRpcEnabled?.(!!enabled);
  window.electron?.setDiscordRpcConfig?.(getDiscordRpcConfig());
}

export function clearDiscordPresence() {
  lastKey = "";
  window.electron?.clearDiscordPresence?.();
}

/**
 * @param {{ page?: string, title?: string, viewTitle?: string, mediaType?: string }} context
 */
export function setDiscordBrowsing(context = {}) {
  if (!isDiscordRpcEnabled()) return;
  window.electron?.setDiscordBrowsing?.(context);
}

/**
 * @param {{
 *   title: string,
 *   subtitle?: string,
 *   posterUrl?: string,
 *   currentTime: number,
 *   duration: number,
 *   mediaType?: 'movie'|'tv'|'anime',
 *   year?: string,
 *   season?: number,
 *   episode?: number,
 * }} opts
 */
export function updateDiscordPresence(opts) {
  if (!isDiscordRpcEnabled() || !window.electron?.updateDiscordPresence) return;
  if (!opts?.title || opts.paused) return;

  const key = `${opts.title}|${opts.subtitle || ""}|${opts.posterUrl || ""}|${Math.floor(opts.currentTime || 0)}|${opts.season ?? ""}|${opts.episode ?? ""}`;
  const now = Date.now();
  const minGap = key === lastKey ? 8000 : 4000;
  if (now - lastSentAt < minGap) return;

  lastKey = key;
  lastSentAt = now;
  window.electron.updateDiscordPresence({
    title: opts.title,
    subtitle: opts.subtitle || "",
    posterUrl: opts.posterUrl || "",
    currentTime: opts.currentTime || 0,
    duration: opts.duration || 0,
    mediaType: opts.mediaType || "movie",
    year: opts.year || "",
    season: opts.season ?? null,
    episode: opts.episode ?? null,
  });
}
