/**
 * Path validation for media files, download binaries, and folder access.
 */

const path = require("path");
const fs = require("fs");
const { app } = require("electron");

function containsTraversal(input) {
  const parts = path.normalize(String(input)).split(path.sep);
  return parts.some((p) => p === "..");
}

function resolveAbsolute(inputPath) {
  return path.resolve(path.normalize(String(inputPath)));
}

function isPathInside(root, target) {
  const resolvedRoot = resolveAbsolute(root);
  const resolvedTarget = resolveAbsolute(target);
  if (resolvedTarget === resolvedRoot) return true;
  const prefix = resolvedRoot.endsWith(path.sep)
    ? resolvedRoot
    : resolvedRoot + path.sep;
  return resolvedTarget.startsWith(prefix);
}

function collectDownloadRoots(downloads) {
  const roots = new Set();
  const files = new Set();
  for (const d of downloads || []) {
    if (d.downloadPath) roots.add(resolveAbsolute(d.downloadPath));
    if (d.filePath) files.add(resolveAbsolute(d.filePath));
    for (const sp of d.subtitlePaths || []) {
      const p = typeof sp === "string" ? sp : sp?.path;
      if (p) files.add(resolveAbsolute(p));
    }
  }
  return { roots: [...roots], files: [...files] };
}

/**
 * Media file may live under userData or a registered download location.
 */
function validateMediaFilePath(filePath, downloads = []) {
  if (!filePath || typeof filePath !== "string") {
    return { ok: false, error: "invalid_path" };
  }
  if (containsTraversal(filePath)) {
    return { ok: false, error: "path_traversal" };
  }
  const resolved = resolveAbsolute(filePath);
  let stat;
  try {
    stat = fs.statSync(resolved);
  } catch {
    return { ok: false, error: "not_found" };
  }
  if (!stat.isFile()) {
    return { ok: false, error: "not_a_file" };
  }

  const userData = app.getPath("userData");
  if (isPathInside(userData, resolved)) {
    return { ok: true, path: resolved };
  }

  const { roots, files } = collectDownloadRoots(downloads);
  if (files.includes(resolved)) {
    return { ok: true, path: resolved };
  }
  for (const root of roots) {
    if (isPathInside(root, resolved)) {
      return { ok: true, path: resolved };
    }
  }

  return { ok: false, error: "outside_allowed_roots" };
}

/**
 * Folder scan / show-in-folder: directory or file under allowed roots.
 */
function validateMediaPath(filePath, downloads = [], { requireFile = false } = {}) {
  if (!filePath || typeof filePath !== "string") {
    return { ok: false, error: "invalid_path" };
  }
  if (containsTraversal(filePath)) {
    return { ok: false, error: "path_traversal" };
  }
  const resolved = resolveAbsolute(filePath);
  let stat;
  try {
    stat = fs.statSync(resolved);
  } catch {
    return { ok: false, error: "not_found" };
  }
  if (requireFile && !stat.isFile()) {
    return { ok: false, error: "not_a_file" };
  }

  const userData = app.getPath("userData");
  if (isPathInside(userData, resolved)) {
    return { ok: true, path: resolved, isDirectory: stat.isDirectory() };
  }

  const { roots, files } = collectDownloadRoots(downloads);
  if (files.includes(resolved)) {
    return { ok: true, path: resolved, isDirectory: false };
  }
  for (const root of roots) {
    if (isPathInside(root, resolved)) {
      return { ok: true, path: resolved, isDirectory: stat.isDirectory() };
    }
  }

  return { ok: false, error: "outside_allowed_roots" };
}

/**
 * Downloader binary: must exist, be a file, platform executable,
 * and sit next to an _internal folder (PyInstaller layout).
 */
function validateDownloaderBinary(binaryPath) {
  if (!binaryPath || typeof binaryPath !== "string") {
    return { ok: false, error: "invalid_path" };
  }
  if (containsTraversal(binaryPath)) {
    return { ok: false, error: "path_traversal" };
  }
  const resolved = resolveAbsolute(binaryPath);
  let stat;
  try {
    stat = fs.statSync(resolved);
  } catch {
    return { ok: false, error: "not_found" };
  }
  if (!stat.isFile()) {
    return { ok: false, error: "not_a_file" };
  }

  const base = path.basename(resolved);
  if (process.platform === "win32") {
    if (!base.toLowerCase().endsWith(".exe")) {
      return { ok: false, error: "not_executable" };
    }
  } else if (!(stat.mode & 0o111)) {
    return { ok: false, error: "not_executable" };
  }

  const parent = path.dirname(resolved);
  const internalDir = path.join(parent, "_internal");
  try {
    if (!fs.statSync(internalDir).isDirectory()) {
      return { ok: false, error: "missing_internal" };
    }
  } catch {
    return { ok: false, error: "missing_internal" };
  }

  return { ok: true, path: resolved };
}

/**
 * Proxy target for AllManga local player (http/https only).
 */
function validateProxyTargetUrl(urlString) {
  if (!urlString || typeof urlString !== "string") {
    return { ok: false, error: "invalid_url" };
  }
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return { ok: false, error: "invalid_url" };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, error: "protocol" };
  }
  return { ok: true, url: parsed.href };
}

/**
 * Any existing directory (used for library folder scans); blocks `..` only.
 */
function validateReadableDirectory(dirPath) {
  if (!dirPath || typeof dirPath !== "string") {
    return { ok: false, error: "invalid_path" };
  }
  if (containsTraversal(dirPath)) {
    return { ok: false, error: "path_traversal" };
  }
  const resolved = resolveAbsolute(dirPath);
  try {
    if (!fs.statSync(resolved).isDirectory()) {
      return { ok: false, error: "not_a_directory" };
    }
    return { ok: true, path: resolved };
  } catch {
    return { ok: false, error: "not_found" };
  }
}

module.exports = {
  validateMediaFilePath,
  validateMediaPath,
  validateReadableDirectory,
  validateDownloaderBinary,
  validateProxyTargetUrl,
  containsTraversal,
  resolveAbsolute,
  isPathInside,
};
