/**
 * SSRF guards for stream download requests.
 * Return values are registered as CodeQL request-forgery barriers.
 */

const { URL } = require("url");

function hrefFromSafeUrl(parsed) {
  return parsed.href;
}

/** Block SSRF to localhost / private / link-local / metadata endpoints. */
function assertSafeRemoteUrl(url) {
  let parsed;
  try {
    parsed = new URL(String(url));
  } catch {
    throw new Error("Invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host === "metadata.google.internal" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  ) {
    throw new Error("Blocked host");
  }
  // IPv4 literal
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const parts = host.split(".").map(Number);
    const [a, b] = parts;
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    ) {
      throw new Error("Blocked private address");
    }
  }
  // IPv6 / IPv4-mapped
  if (host.includes(":")) {
    if (
      host === "::1" ||
      host === "::" ||
      host.startsWith("fc") ||
      host.startsWith("fd") ||
      host.startsWith("fe80") ||
      host.startsWith("::ffff:127.") ||
      host.startsWith("::ffff:10.") ||
      host.startsWith("::ffff:192.168.") ||
      /^::ffff:172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      throw new Error("Blocked private address");
    }
  }
  return parsed;
}

/** Resolve a redirect/relative URL and re-apply SSRF checks before following it. */
function resolveSafeRemoteUrl(base, relative) {
  if (!relative || typeof relative !== "string") {
    throw new Error("Invalid redirect URL");
  }
  const baseHref =
    base instanceof URL ? base.href : assertSafeRemoteUrl(base).href;
  let resolved;
  try {
    resolved = new URL(relative, baseHref);
  } catch {
    throw new Error("Invalid redirect URL");
  }
  return assertSafeRemoteUrl(resolved.href);
}

module.exports = {
  assertSafeRemoteUrl,
  hrefFromSafeUrl,
  resolveSafeRemoteUrl,
};
