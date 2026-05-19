import { storage } from "./storage";
import { STORAGE_KEYS } from "./storage";

let lastSentAt = 0;
let lastKey = "";

export function isDiscordRpcEnabled() {
  const v = storage.get(STORAGE_KEYS.DISCORD_RPC_ENABLED);
  return v === null || v === undefined || v === true || v === 1 || v === "1";
}

export function syncDiscordRpcEnabled(enabled) {
  window.electron?.setDiscordRpcEnabled?.(!!enabled);
}

export function clearDiscordPresence() {
  lastKey = "";
  window.electron?.clearDiscordPresence?.();
}

/**
 * @param {{ title: string, subtitle?: string, posterUrl?: string, currentTime: number, duration: number, mediaType?: 'movie'|'tv' }} opts
 */
export function updateDiscordPresence(opts) {
  if (!isDiscordRpcEnabled() || !window.electron?.updateDiscordPresence) return;
  if (!opts?.title) return;

  const key = `${opts.title}|${opts.subtitle || ""}|${opts.posterUrl || ""}|${Math.floor(opts.currentTime || 0)}`;
  const now = Date.now();
  const minGap = key === lastKey ? 12000 : 5000;
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
  });
}
