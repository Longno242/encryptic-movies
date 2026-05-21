/**
 * Discord Rich Presence — customizable templates, posters, and timestamps.
 * Application ID: 1390807459328823297
 */

const crypto = require("crypto");
const RPC = require("discord-rpc");
const {
  DEFAULT_DISCORD_RPC_CONFIG,
  applyDiscordTemplate,
  formatDiscordTimeLeft,
  formatDiscordDuration,
  pageLabel,
  mediaLabel,
} = require("./utils/discordRpcConfig");

const CLIENT_ID = "1390807459328823297";
const FALLBACK_IMAGE = "encryptic";
const APP_NAME = "Encryptic Movies";

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

let client = null;
let loginPromise = null;
let enabled = true;
let config = { ...DEFAULT_DISCORD_RPC_CONFIG };
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

function setConfig(partial) {
  config = { ...config, ...(partial && typeof partial === "object" ? partial : {}) };
  lastSignature = "";
}

function getConfig() {
  return { ...config };
}

function setEnabled(value) {
  enabled = !!value;
  config.enabled = enabled;
  if (!enabled) clearActivity();
  else lastSignature = "";
}

function isEnabled() {
  return enabled;
}

function toDiscordExternalImage(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  const hash = crypto.createHash("sha256").update(trimmed).digest("hex");
  return `mp:external/${hash}/${trimmed}`;
}

function buildTemplateVars(payload) {
  const {
    title = "",
    subtitle = "",
    year = "",
    season = null,
    episode = null,
    currentTime = 0,
    duration = 0,
    mediaType = "movie",
    page = "home",
    viewTitle = "",
  } = payload;

  const remaining = Math.max(0, duration - currentTime);
  const progress =
    duration > 0
      ? Math.min(100, Math.floor((currentTime / duration) * 100))
      : 0;

  const seasonEp =
    season != null && episode != null
      ? `S${season} · E${episode}`
      : season != null
        ? `Season ${season}`
        : "";

  return {
    title: String(title || "Unknown").slice(0, 128),
    year: year ? String(year) : "",
    subtitle: String(subtitle || "").trim(),
    season: season != null ? String(season) : "",
    episode: episode != null ? String(episode) : "",
    seasonEp,
    timeLeft: formatDiscordTimeLeft(remaining),
    progress: String(progress),
    elapsed: formatDiscordDuration(currentTime),
    duration: formatDiscordDuration(duration),
    mediaType,
    mediaLabel: mediaLabel(mediaType),
    page: PAGE_LABELS[page] || pageLabel(page),
    appName: APP_NAME,
    viewTitle: String(viewTitle || title || "").slice(0, 128),
  };
}

function activityTypeId(type) {
  if (type === "playing") return 0;
  return 3;
}

function buildWatchingActivity(payload) {
  const vars = buildTemplateVars(payload);
  const { privacy } = config;

  if (privacy === "minimal") {
    return {
      details: (config.browsingDetails || APP_NAME).slice(0, 128),
      state: "In the app",
      largeImageKey: FALLBACK_IMAGE,
      largeImageText: APP_NAME,
      smallImageKey: null,
      smallImageText: null,
      startTimestamp: null,
      endTimestamp: null,
      type: activityTypeId(config.activityType),
    };
  }

  if (privacy === "private") {
    const state = config.showCountdown && payload.duration > 0
      ? vars.timeLeft
      : "In Encryptic Movies";
    const remaining = Math.max(0, payload.duration - (payload.currentTime || 0));
    return {
      details: "Watching something",
      state: state.slice(0, 128),
      largeImageKey: FALLBACK_IMAGE,
      largeImageText: APP_NAME,
      smallImageKey: null,
      smallImageText: null,
      startTimestamp:
        config.showElapsed && payload.duration > 0
          ? Date.now() - (payload.currentTime || 0) * 1000
          : null,
      endTimestamp:
        config.showCountdown && payload.duration > 0 && remaining > 0
          ? Date.now() + remaining * 1000
          : null,
      type: activityTypeId(config.activityType),
    };
  }

  let detailsTemplate = config.detailsTemplate || "Watching {title}";
  if (config.showYear === false) {
    detailsTemplate = detailsTemplate.replace(/\s*\(\{year\}\)/g, "").replace(/\{year\}/g, "");
  }

  const hasSubtitle = !!vars.subtitle && config.showEpisode !== false;
  const stateTemplate = hasSubtitle
    ? config.stateTemplate
    : config.stateFallbackTemplate || config.stateTemplate;

  let stateLine =
    applyDiscordTemplate(stateTemplate, vars) ||
    applyDiscordTemplate(config.stateFallbackTemplate, vars);

  if (!stateLine && config.showProgress && payload.duration > 0) {
    stateLine = `${vars.progress}% · ${vars.timeLeft}`;
  }
  if (!stateLine) {
    stateLine = payload.duration > 0 ? vars.timeLeft : "Playing";
  }

  const details =
    applyDiscordTemplate(detailsTemplate, vars) || `Watching ${vars.title}`;

  const posterAsset =
    config.showPoster !== false
      ? toDiscordExternalImage(payload.posterUrl) || FALLBACK_IMAGE
      : FALLBACK_IMAGE;

  const remaining = Math.max(0, payload.duration - (payload.currentTime || 0));

  return {
    details: details.slice(0, 128),
    state: stateLine.slice(0, 128),
    largeImageKey: posterAsset,
    largeImageText: vars.title,
    smallImageKey:
      config.showPoster !== false && posterAsset !== FALLBACK_IMAGE
        ? FALLBACK_IMAGE
        : null,
    smallImageText: config.showPoster !== false ? APP_NAME : null,
    startTimestamp:
      config.showElapsed && payload.duration > 0
        ? Date.now() - (payload.currentTime || 0) * 1000
        : null,
    endTimestamp:
      config.showCountdown && payload.duration > 0 && remaining > 0
        ? Date.now() + remaining * 1000
        : null,
    type: activityTypeId(config.activityType),
  };
}

function buildBrowsingActivity(context = {}) {
  const page = context.page || "home";
  const viewTitle = context.viewTitle || context.title || "";
  const vars = {
    ...buildTemplateVars({ page, title: viewTitle, mediaType: context.mediaType }),
    page: PAGE_LABELS[page] || pageLabel(page),
    viewTitle: String(viewTitle).slice(0, 128),
  };

  if (config.privacy === "private" || config.privacy === "minimal") {
    return {
      details: (config.browsingDetails || APP_NAME).slice(0, 128),
      state: config.browsingShowPage !== false ? vars.page : "Browsing",
      largeImageKey: FALLBACK_IMAGE,
      largeImageText: APP_NAME,
      type: 0,
    };
  }

  let details = config.browsingDetails || APP_NAME;
  let state = config.browsingState || "{page}";

  if ((page === "movie" || page === "tv") && viewTitle) {
    details = applyDiscordTemplate("Viewing {viewTitle}", vars) || details;
    state =
      context.mediaType === "tv"
        ? applyDiscordTemplate("{mediaLabel}", vars)
        : applyDiscordTemplate("{year}", vars) || vars.page;
  } else if (config.browsingShowPage !== false) {
    state = applyDiscordTemplate(state, vars) || vars.page;
  } else {
    state = "Browsing";
  }

  return {
    details: details.slice(0, 128),
    state: state.slice(0, 128),
    largeImageKey: FALLBACK_IMAGE,
    largeImageText: APP_NAME,
    type: 0,
  };
}

async function pushActivity(activity, signature) {
  if (!enabled) return;
  if (signature === lastSignature) return;
  lastSignature = signature;

  try {
    await ensureLogin();
  } catch (err) {
    console.warn("[discord-rpc] login failed:", err?.message || err);
    return;
  }
  if (!client) return;

  const payload = {
    details: activity.details,
    state: activity.state,
    largeImageKey: activity.largeImageKey,
    largeImageText: activity.largeImageText,
    instance: false,
  };

  if (activity.smallImageKey) {
    payload.smallImageKey = activity.smallImageKey;
    payload.smallImageText = activity.smallImageText || APP_NAME;
  }
  if (activity.startTimestamp) payload.startTimestamp = activity.startTimestamp;
  if (activity.endTimestamp) payload.endTimestamp = activity.endTimestamp;
  if (activity.type != null) payload.type = activity.type;

  try {
    await client.setActivity(payload);
  } catch (err) {
    console.warn("[discord-rpc] setActivity failed:", err?.message || err);
  }
}

async function setActivity(payload) {
  if (!enabled || !payload) return;
  const built = buildWatchingActivity(payload);
  const signature = `watch|${built.details}|${built.state}|${built.largeImageKey}|${payload.currentTime}|${payload.duration}|${config.privacy}`;
  await pushActivity(built, signature);
}

async function setBrowsing(context = {}) {
  if (!enabled) return;
  const built = buildBrowsingActivity(context);
  const signature = `browse|${built.details}|${built.state}|${context.page || ""}|${context.viewTitle || ""}`;
  await pushActivity(built, signature);
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
  setConfig,
  getConfig,
  setEnabled,
  isEnabled,
  setActivity,
  setBrowsing,
  clearActivity,
  destroy,
};
