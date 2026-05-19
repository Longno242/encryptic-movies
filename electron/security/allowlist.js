/**
 * Host allowlist for shell.openExternal (open-external IPC).
 * Only http/https URLs whose host matches an entry below are permitted.
 */

const INVIDIOUS_HOSTS = [
  "inv.nadeko.net",
  "invidious.privacyredirect.com",
  "inv.tux.pizza",
  "yt.cdaut.de",
  "invidious.lunar.icu",
  "invidious.protokolla.fi",
  "invidious.nerdvpn.de",
  "iv.melmac.space",
  "invidious.perennialte.ch",
];

/** Exact hostnames (lowercase). */
const EXACT_HOSTS = new Set([
  "www.themoviedb.org",
  "themoviedb.org",
  "api.themoviedb.org",
  "image.tmdb.org",
  "www.tmdb.org",
  "github.com",
  "api.github.com",
  "raw.githubusercontent.com",
  "www.subdl.com",
  "subdl.com",
  "api.subdl.com",
  "dl.subdl.com",
  "sub.wyzie.io",
  "subs.wyzie.ru",
  "www.youtube.com",
  "youtube.com",
  "youtu.be",
  "www.youtube-nocookie.com",
  ...INVIDIOUS_HOSTS,
]);

/** Suffixes: host === suffix or host.endsWith("." + suffix). */
const HOST_SUFFIXES = [
  "tmdb.org",
  "github.com",
  "githubusercontent.com",
  "subdl.com",
  "wyzie.io",
  "wyzie.ru",
];

function normalizeHost(hostname) {
  return String(hostname || "")
    .toLowerCase()
    .replace(/\.$/, "");
}

function hostMatchesAllowlist(host) {
  const h = normalizeHost(host);
  if (!h) return false;
  if (EXACT_HOSTS.has(h)) return true;
  for (const suffix of HOST_SUFFIXES) {
    if (h === suffix || h.endsWith(`.${suffix}`)) return true;
  }
  if (h.includes("invidious") || /^inv[\w.-]+\./.test(h)) return true;
  return false;
}

/**
 * @param {string} urlString
 * @returns {{ allowed: boolean, reason?: string }}
 */
function validateExternalUrl(urlString) {
  if (!urlString || typeof urlString !== "string") {
    return { allowed: false, reason: "empty" };
  }
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return { allowed: false, reason: "invalid_url" };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { allowed: false, reason: "protocol" };
  }
  if (!hostMatchesAllowlist(parsed.hostname)) {
    return { allowed: false, reason: "host" };
  }
  return { allowed: true };
}

module.exports = {
  validateExternalUrl,
  hostMatchesAllowlist,
  INVIDIOUS_HOSTS,
};
