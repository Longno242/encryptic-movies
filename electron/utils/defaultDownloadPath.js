/**
 * Default movie download folder: Desktop/MOVIES (created if missing).
 */

const { app } = require("electron");
const path = require("path");
const fs = require("fs");

const FOLDER_NAME = "MOVIES";

function getDefaultMoviesDownloadPath() {
  return path.join(app.getPath("desktop"), FOLDER_NAME);
}

function ensureDefaultMoviesDownloadPath() {
  const dir = getDefaultMoviesDownloadPath();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Use saved path when set; otherwise Desktop/MOVIES (created if needed). */
function resolveDownloadPath(downloadPath) {
  const trimmed =
    typeof downloadPath === "string" ? downloadPath.trim() : "";
  if (trimmed) {
    fs.mkdirSync(trimmed, { recursive: true });
    return trimmed;
  }
  return ensureDefaultMoviesDownloadPath();
}

module.exports = {
  FOLDER_NAME,
  getDefaultMoviesDownloadPath,
  ensureDefaultMoviesDownloadPath,
  resolveDownloadPath,
};
