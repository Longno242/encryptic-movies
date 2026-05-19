/**
 * Player / trailer session hooks: ad blocking, header stripping,
 * HLS (.m3u8) and subtitle (.vtt) discovery for the renderer.
 */

const BLOCKED_HOSTS = [
  "*://www.google-analytics.com/*",
  "*://analytics.google.com/*",
  "*://googletagmanager.com/*",
  "*://www.googletagmanager.com/*",
  "*://googletagservices.com/*",
  "*://doubleclick.net/*",
  "*://*.doubleclick.net/*",
  "*://adservice.google.com/*",
  "*://adservice.google.de/*",
  "*://pagead2.googlesyndication.com/*",
  "*://stats.g.doubleclick.net/*",
  "*://yt3.ggpht.com/ytc/*",
  "*://fonts.googleapis.com/*",
  "*://fonts.gstatic.com/*",
  "*://googleapis.com/*",
  "*://gstatic.com/*",
  "*://cdn.adx1.com/*",
  "*://intelligenceadx.com/*",
  "*://adsco.re/*",
  "*://mc.yandex.com/*",
  "*://mc.yandex.ru/*",
  "*://bvtpk.com/*",
  "*://my.rtmark.net/*",
  "*://b7510.com/*",
  "*://gt.unbrownunflat.com/*",
  "*://im.malocacomals.com/*",
  "*://users.videasy.net/*",
  "*://nf.sixmossin.com/*",
  "*://realizationnewestfangs.com/*",
  "*://acscdn.com/*",
  "*://lt.taloseempest.com/*",
  "*://pl26708123.profitableratecpm.com/*",
  "*://preferencenail.com/*",
  "*://protrafficinspector.com/*",
  "*://s10.histats.com/*",
  "*://weirdopt.com/*",
  "*://static.cloudflareinsights.com/*",
  "*://kettledroopingcontinuation.com/*",
  "*://wayfarerorthodox.com/*",
  "*://woxaglasuy.net/*",
  "*://adeptspiritual.com/*",
  "*://www.calculating-laugh.com/*",
  "*://amavhxdlofklxjg.xyz/*",
  "*://7jtjubf8p5kq7x3z2.u3qleufcm6vure326ktfpbj.cfd/*",
  "*://5mq.get64t9vqg8pnbex1y463o.rest/*",
  "*://usrpubtrk.com/*",
  "*://adexchangeclear.com/*",
  "*://rzjzjnavztycv.online/*",
  "*://tmstr4.cloudnestra.com/*",
  "*://tmstr4.neonhorizonworkshops.com/*",
];

const MEDIA_URL_PATTERNS = [
  "*://*/*.m3u8*",
  "*://*/*.m3u8",
  "*://*/*.vtt*",
  "*://*/*.vtt",
];

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function hostMatchesBlockedPattern(hostname, pattern) {
  const hostPat = pattern.replace(/^\*:\/\//, "").split("/")[0];
  if (hostPat.startsWith("*.")) {
    return hostname.endsWith(hostPat.slice(1));
  }
  return hostname === hostPat || hostname === hostPat.replace(/^\*\./, "");
}

function isBlockedMediaHost(hostname) {
  return BLOCKED_HOSTS.some((pat) => hostMatchesBlockedPattern(hostname, pat));
}

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

/**
 * @param {import('electron').Session} playerSession
 * @param {import('electron').Session} trailerSession
 * @param {{ getMainWindow: () => import('electron').BrowserWindow | null, recordBlockedRequest: (url: string) => void, extractSubtitleLang: (url: string) => string }} hooks
 */
function setupSession(playerSession, trailerSession, hooks) {
  const { getMainWindow, recordBlockedRequest, extractSubtitleLang } = hooks;

  playerSession.setUserAgent(CHROME_UA);
  trailerSession.setUserAgent(CHROME_UA);

  const headerFilter = { urls: ["*://*/*"] };
  playerSession.webRequest.onHeadersReceived(headerFilter, stripFramingHeaders);
  trailerSession.webRequest.onHeadersReceived(headerFilter, stripFramingHeaders);

  trailerSession.webRequest.onBeforeRequest({ urls: BLOCKED_HOSTS }, (_, cb) =>
    cb({ cancel: true }),
  );

  playerSession.webRequest.onBeforeRequest(
    { urls: [...BLOCKED_HOSTS, ...MEDIA_URL_PATTERNS] },
    (details, callback) => {
      const { url } = details;
      const isMedia = url.includes(".m3u8") || url.includes(".vtt");

      if (!isMedia) {
        recordBlockedRequest(url);
        callback({ cancel: true });
        return;
      }

      try {
        const host = new URL(url).hostname;
        if (isBlockedMediaHost(host)) {
          recordBlockedRequest(url);
          callback({ cancel: true });
          return;
        }
      } catch {
        /* keep going */
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
        } else if (url.includes(".vtt")) {
          win.webContents.send("subtitle-found", {
            url,
            lang: extractSubtitleLang(url),
          });
        }
      }
      callback({});
    },
  );

  installYoutubeConsentCookies(playerSession, trailerSession);
}

module.exports = { setupSession, BLOCKED_HOSTS };
