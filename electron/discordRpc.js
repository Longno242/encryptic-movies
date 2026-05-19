/**
 * Discord Rich Presence — shows what you're watching and time remaining.
 * Application ID: 1390807459328823297
 */

const crypto = require("crypto");
const RPC = require("discord-rpc");

const CLIENT_ID = "1390807459328823297";
const FALLBACK_IMAGE = "encryptic";

let client = null;
let loginPromise = null;
let enabled = true;
let lastSignature = "";

RPC.register(CLIENT_ID);

function connectClient() {
  if (client) return client;
  const rpc = new RPC.Client({ transport: "ipc" });
  rpc.on("error", (err) => {
    console.warn("[discord-rpc]", err?.message || err);
  });
  client = rpc;
  return rpc;
}

async function ensureLogin() {
  const rpc = connectClient();
  if (!loginPromise) {
    loginPromise = rpc.login({ clientId: CLIENT_ID }).catch((err) => {
      loginPromise = null;
      client = null;
      throw err;
    });
  }
  await loginPromise;
}

function setEnabled(value) {
  enabled = !!value;
  if (!enabled) clearActivity();
}

function isEnabled() {
  return enabled;
}

/** Discord external asset URL (TMDB posters, etc.) */
function toDiscordExternalImage(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  const hash = crypto.createHash("sha256").update(trimmed).digest("hex");
  return `mp:external/${hash}/${trimmed}`;
}

function formatTimeLeft(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  if (s <= 0) return "Almost done";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m} min left`;
  return `${s}s left`;
}

async function setActivity(payload) {
  if (!enabled || !payload) return;

  const {
    title,
    subtitle = "",
    currentTime = 0,
    duration = 0,
    posterUrl = "",
  } = payload;

  const safeTitle = String(title || "Unknown").slice(0, 128);
  const remaining = Math.max(0, duration - currentTime);
  const stateLine =
    subtitle.trim() ||
    (duration > 0 ? formatTimeLeft(remaining) : "Playing");

  const posterAsset = toDiscordExternalImage(posterUrl) || FALLBACK_IMAGE;

  const signature = `${safeTitle}|${stateLine}|${posterAsset}|${Math.floor(currentTime)}|${Math.floor(duration)}`;
  if (signature === lastSignature) return;
  lastSignature = signature;

  try {
    await ensureLogin();
  } catch (err) {
    console.warn("[discord-rpc] login failed:", err?.message || err);
    return;
  }
  const rpc = client;
  if (!rpc) return;

  const activity = {
    details: `Watching ${safeTitle}`,
    state: stateLine.slice(0, 128),
    largeImageKey: posterAsset,
    largeImageText: safeTitle,
    instance: false,
  };

  if (duration > 0 && remaining > 0) {
    activity.endTimestamp = Date.now() + remaining * 1000;
  }

  try {
    await rpc.setActivity(activity);
  } catch (err) {
    console.warn("[discord-rpc] setActivity failed:", err?.message || err);
  }
}

async function setBrowsing() {
  if (!enabled) return;
  lastSignature = "__browsing__";
  try {
    await ensureLogin();
    await client.setActivity({
      details: "Encryptic Movies",
      state: "Browsing",
      largeImageKey: "encryptic",
      largeImageText: "Encryptic Movies",
      instance: false,
    });
  } catch (err) {
    console.warn("[discord-rpc] browsing failed:", err?.message || err);
  }
}

async function clearActivity() {
  lastSignature = "";
  if (!client) return;
  try {
    await client.clearActivity();
  } catch {
    /* Discord may be closed */
  }
}

function destroy() {
  clearActivity().finally(() => {
    try {
      client?.destroy();
    } catch {}
    client = null;
    loginPromise = null;
  });
}

module.exports = {
  setEnabled,
  isEnabled,
  setActivity,
  setBrowsing,
  clearActivity,
  destroy,
};
