/**
 * Player / trailer session hooks: Encryptic Shield ad blocking, HLS/subtitle capture.
 */

const path = require("path");
const {
  BLOCKED_HOST_PATTERNS,
  classifyRequestUrl,
  isMediaUrl,
} = require("./adblockLists");
const { isShieldEnabled } = require("../shield/enabled");

const PLAYER_SHIELD_PRELOAD = path.join(
  __dirname,
  "..",
  "playerShieldPreload.js",
);

const MEDIA_URL_PATTERNS = [
  "*://*/*.m3u8*",
  "*://*/*.m3u8",
  "*://*/*.vtt*",
  "*://*/*.vtt",
  "*://*/*.srt*",
  "*://*/*.srt",
];

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function stripFramingHeaders(details, callback) {
  const headers = { ...details.responseHeaders };
  for (const key of Object.keys(headers)) {
    const lower = key.toLowerCase();
    if (lower === "x-frame-options" || lower === "content-security-policy") {
      delete headers[key];
    }
  }
  callback({ responseHeaders: headers });
}

function installYoutubeConsentCookies(playerSession, trailerSession) {
  const base = {
    url: "https://www.youtube.com",
    name: "SOCS",
    value: "CAI",
    path: "/",
    secure: true,
    httpOnly: false,
    sameSite: "no_restriction",
    expirationDate: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 2,
  };
  for (const domain of [".youtube.com", ".youtube-nocookie.com"]) {
    const cookie = { ...base, domain };
    trailerSession.cookies.set(cookie).catch(() => {});
    playerSession.cookies.set(cookie).catch(() => {});
  }
}

function handlePlayerRequest(details, hooks, callback) {
  const { url, resourceType } = details;
  const { getMainWindow, recordBlockedRequest, extractSubtitleLang } = hooks;
  const rt = resourceType || "";

  if (!isShieldEnabled()) {
    callback({});
    return;
  }

  if (classifyRequestUrl(url, rt) === "block") {
    recordBlockedRequest(url);
    callback({ cancel: true });
    return;
  }

  if (isMediaUrl(url)) {
    if (classifyRequestUrl(url, rt) === "block") {
      recordBlockedRequest(url);
      callback({ cancel: true });
      return;
    }

    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      if (url.includes(".m3u8")) {
        const referer =
          details.referrer ||
          details.referer ||
          (() => {
            try {
              return details.webContents?.getURL?.() || "";
            } catch {
              return "";
            }
          })();
        win.webContents.send("m3u8-found", { url, referer });
      } else if (url.includes(".vtt") || url.includes(".srt")) {
        win.webContents.send("subtitle-found", {
          url,
          lang: extractSubtitleLang(url),
        });
      }
    }
    callback({});
    return;
  }

  callback({});
}

/**
 * @param {import('electron').Session} playerSession
 * @param {import('electron').Session} trailerSession
 * @param {{ getMainWindow: () => import('electron').BrowserWindow | null, recordBlockedRequest: (url: string) => void, extractSubtitleLang: (url: string) => string }} hooks
 */
function registerShieldPreload(sess) {
  if (typeof sess.registerPreloadScript === "function") {
    try {
      sess.registerPreloadScript({
        id: "encryptic-shield",
        type: "frame",
        filePath: PLAYER_SHIELD_PRELOAD,
      });
    } catch {
      /* already registered */
    }
  }
}

/**
 * Player partition loads many third-party stream CDNs; some networks or routers
 * present mismatched certs. Match browser playback by allowing verify override
 * on this session only (main app session stays strict).
 */
function installPlayerTlsPolicy(playerSession) {
  playerSession.setCertificateVerifyProc((request, callback) => {
    if (request.verificationResult === "net::OK") {
      callback(0);
      return;
    }
    const host = (request.hostname || "").toLowerCase();
    const url = request.url || "";
    const streamLike =
      /\.(m3u8|ts|mp4|webm|m4s)(\?|$)/i.test(url) ||
      url.includes("m3u8") ||
      /speedsterwave|midwesteagle|ezvidapi|vidfast|cloudfront|akamai|googlevideo|workers\.dev/i.test(
        host,
      );
    callback(streamLike ? 0 : -3);
  });
}

function setupSession(playerSession, trailerSession, hooks) {
  playerSession.setUserAgent(CHROME_UA);
  trailerSession.setUserAgent(CHROME_UA);

  installPlayerTlsPolicy(playerSession);
  registerShieldPreload(playerSession);

  const headerFilter = { urls: ["*://*/*"] };
  playerSession.webRequest.onHeadersReceived(headerFilter, stripFramingHeaders);
  trailerSession.webRequest.onHeadersReceived(headerFilter, stripFramingHeaders);

  trailerSession.webRequest.onBeforeRequest(
    { urls: BLOCKED_HOST_PATTERNS },
    (_, cb) => cb({ cancel: true }),
  );

  trailerSession.webRequest.onBeforeRequest(
    { urls: ["*://*/*"] },
    (details, cb) => {
      if (!isShieldEnabled()) {
        cb({});
        return;
      }
      if (classifyRequestUrl(details.url, details.resourceType) === "block") {
        hooks.recordBlockedRequest(details.url);
        cb({ cancel: true });
        return;
      }
      cb({});
    },
  );

  playerSession.webRequest.onBeforeRequest({ urls: ["*://*/*"] }, (details, cb) =>
    handlePlayerRequest(details, hooks, cb),
  );

  installYoutubeConsentCookies(playerSession, trailerSession);
}

module.exports = { setupSession, BLOCKED_HOST_PATTERNS };
