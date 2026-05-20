/**
 * Encryptic Shield — network rules for player / trailer sessions.
 */

const BLOCKED_HOST_PATTERNS = [
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
  "*://amavhxdlofklxjg.xyz/*",
  "*://usrpubtrk.com/*",
  "*://adexchangeclear.com/*",
  "*://rzjzjnavztycv.online/*",
  "*://tmstr4.cloudnestra.com/*",
  "*://tmstr4.neonhorizonworkshops.com/*",
  "*://*.popads.net/*",
  "*://*.clickadu.com/*",
  "*://*.exoclick.com/*",
  "*://*.exosrv.com/*",
  "*://*.adsterra.com/*",
  "*://*.propellerads.com/*",
  "*://*.propellerclick.com/*",
  "*://*.trafficjunky.net/*",
  "*://*.juicyads.com/*",
  "*://*.hilltopads.net/*",
  "*://*.adnxs.com/*",
  "*://*.taboola.com/*",
  "*://*.outbrain.com/*",
  "*://*.revcontent.com/*",
  "*://*.mgid.com/*",
  "*://*.onclickmax.com/*",
  "*://*.onclickmega.com/*",
  "*://*.clksite.com/*",
  "*://*.clckysudks.com/*",
  "*://*.sophang8.com/*",
  "*://*.sundulabet.com/*",
  "*://*.download-ready.net/*",
  "*://*.install-check.com/*",
  "*://*.euoebjblock.com/*",
  "*://*.challenges.cloudflare.com/cdn-cgi/challenge-platform/*",
];

/** Substrings in hostname or full URL that indicate ads / scams (not media). */
const BLOCKED_URL_PARTS = [
  "doubleclick",
  "googlesyndication",
  "googleadservices",
  "popads",
  "popunder",
  "clickadu",
  "exoclick",
  "adsterra",
  "propeller",
  "trafficjunky",
  "juicyads",
  "hilltopads",
  "adnxs",
  "taboola",
  "outbrain",
  "revcontent",
  "mgid.com",
  "onclick",
  "clickaine",
  "adserver",
  "adservice",
  "adskeeper",
  "adtrack",
  "adform",
  "advertising",
  "/ads?",
  "/ads/",
  "/ad/",
  "/banner",
  "/pop.",
  "popcash",
  "popcash",
  "sponsoredlink",
  "affiliate",
  "tracking.gif",
  "pixel.gif",
  "beacon.",
  "download-prompt",
  "fake-update",
  "install-vlc",
  "install_flash",
  "best-deals",
  "prize",
  "winner",
  "congratulations",
  "virus-scan",
  "malware",
];

/** Hostname fragments that are almost never the real video CDN. */
const BLOCKED_HOST_FRAGMENTS = [
  "popads",
  "clickadu",
  "exoclick",
  "adsterra",
  "propeller",
  "juicyads",
  "hilltopads",
  "adnxs",
  "taboola",
  "outbrain",
  "revcontent",
  "onclick",
  "adserver",
  "adsrv",
  "adservice",
  "adtrack",
  "advert",
  "banner",
  "popunder",
  "popcash",
  "affiliate",
  "promo.",
  "sponsor",
];

const MEDIA_EXTENSIONS = [
  ".m3u8",
  ".vtt",
  ".mp4",
  ".webm",
  ".ts",
  ".m4s",
  ".mpd",
  ".key",
];

const MEDIA_HOST_ALLOW = [
  "vidsrc",
  "2embed",
  "videasy",
  "vidplus",
  "vidnest",
  "multiembed",
  "cloudfront",
  "akamaized",
  "fastly",
  "bunny",
  "jwplayer",
  "cloudflare",
  "allmanga",
  "tmstr",
  "nestra",
  "megacloud",
  "rabbitstream",
  "turbovid",
  "workers.dev",
  "github",
  "tmdb",
  "image.tmdb",
];

function isMediaUrl(url) {
  const lower = url.toLowerCase();
  if (MEDIA_EXTENSIONS.some((ext) => lower.includes(ext))) return true;
  if (lower.includes("mime=video") || lower.includes("type=video")) return true;
  return false;
}

function isAllowedMediaHost(hostname) {
  const h = hostname.toLowerCase();
  return MEDIA_HOST_ALLOW.some((frag) => h.includes(frag));
}

function hostMatchesPattern(hostname, pattern) {
  const hostPat = pattern.replace(/^\*:\/\//, "").split("/")[0];
  if (hostPat.startsWith("*.")) {
    return hostname.endsWith(hostPat.slice(1));
  }
  return hostname === hostPat || hostname === hostPat.replace(/^\*\./, "");
}

function matchesBlockedHostPattern(hostname) {
  return BLOCKED_HOST_PATTERNS.some((pat) =>
    hostMatchesPattern(hostname, pat),
  );
}

const SUSPICIOUS_TLDS = [
  ".click",
  ".xyz",
  ".top",
  ".cfd",
  ".sbs",
  ".bond",
  ".cam",
  ".icu",
  ".buzz",
  ".rest",
  ".monster",
  ".quest",
];

/**
 * @param {string} url
 * @param {string} [resourceType]
 * @returns {'allow'|'block'}
 */
function classifyRequestUrl(url, resourceType = "") {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) {
    return "allow";
  }
  if (isMediaUrl(url)) return "allow";

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return "allow";
  }

  const host = parsed.hostname.toLowerCase();
  const full = `${host}${parsed.pathname}${parsed.search}`.toLowerCase();
  const rt = resourceType || "";

  if (matchesBlockedHostPattern(host)) return "block";

  if (BLOCKED_URL_PARTS.some((part) => full.includes(part))) {
    if (!isAllowedMediaHost(host)) return "block";
  }

  if (
    BLOCKED_HOST_FRAGMENTS.some((frag) => host.includes(frag)) &&
    !isAllowedMediaHost(host)
  ) {
    return "block";
  }

  if (
    !isAllowedMediaHost(host) &&
    SUSPICIOUS_TLDS.some((tld) => host.endsWith(tld)) &&
    (rt === "subFrame" || rt === "script" || rt === "image" || rt === "xhr")
  ) {
    return "block";
  }

  return "allow";
}

module.exports = {
  BLOCKED_HOST_PATTERNS,
  classifyRequestUrl,
  isMediaUrl,
};
