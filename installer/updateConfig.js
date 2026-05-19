/**
 * GitHub repo for installer update checks (reads github.config.json at project root).
 */
const fs = require("fs");
const path = require("path");

const DEFAULT_REPO = "Longno242/encryptic-movies";

function loadRepo() {
  const candidates = [
    path.join(__dirname, "github.config.json"),
    path.join(__dirname, "..", "github.config.json"),
  ];
  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) {
        const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
        if (parsed?.repo) return parsed.repo;
      }
    } catch {
      /* try next path */
    }
  }
  return DEFAULT_REPO;
}

const GITHUB_REPO = process.env.INSTALLER_GITHUB_REPO || loadRepo();

module.exports = {
  GITHUB_REPO,
  GITHUB_REPO_URL: `https://github.com/${GITHUB_REPO}`,
  GITHUB_RELEASES_URL: `https://github.com/${GITHUB_REPO}/releases`,
  GITHUB_LATEST_RELEASE_URL: `https://github.com/${GITHUB_REPO}/releases/latest`,
};
