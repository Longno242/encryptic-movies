/** GitHub release check — disabled when `GITHUB_REPO` is empty. */

export const GITHUB_REPO = "";

export function normaliseVersion(v) {
  const parts = String(v)
    .replace(/^v/i, "")
    .split(".");
  while (parts.length < 3) parts.push("0");
  return parts.slice(0, 3).map(Number);
}

export function semverGt(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

async function readInstalledVersion() {
  if (typeof window !== "undefined" && window.electron?.getAppVersion) {
    return window.electron.getAppVersion();
  }
  return "0.0.0";
}

function updatesDisabled() {
  return !GITHUB_REPO || GITHUB_REPO.includes("YOUR_GITHUB");
}

function classifyAsset(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".appimage")) return "appimage";
  if (lower.endsWith(".deb")) return "deb";
  if (lower.endsWith(".exe")) return "exe";
  if (lower.endsWith(".pacman")) return "pacman";
  if (lower.endsWith("arm64.dmg")) return "dmg_arm64";
  if (lower.endsWith(".dmg")) return "dmg";
  return null;
}

function buildAssetMap(release) {
  const map = {};
  for (const asset of release.assets ?? []) {
    const slot = classifyAsset(asset.name);
    if (slot) map[slot] = asset.browser_download_url;
  }
  return map;
}

export async function checkForUpdates() {
  const current = await readInstalledVersion();

  if (updatesDisabled()) {
    return {
      latest: current,
      current,
      url: "",
      changelog: "",
      assets: {},
      hasUpdate: false,
    };
  }

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=10`,
    {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(8000),
    },
  );

  if (!res.ok) throw new Error(`GitHub API error ${res.status}`);

  const releases = await res.json();
  const stable = Array.isArray(releases)
    ? releases.find((r) => !r.prerelease && !r.draft)
    : null;

  if (!stable) throw new Error("No stable release found");

  const latestRaw = (stable.tag_name || "").replace(/^v/i, "");
  const latestParts = normaliseVersion(latestRaw);
  const currentParts = normaliseVersion(current);

  return {
    latest: latestRaw || current,
    current,
    url:
      stable.html_url ||
      `https://github.com/${GITHUB_REPO}/releases/latest`,
    changelog: stable.body || "",
    assets: buildAssetMap(stable),
    hasUpdate: latestRaw !== "" && semverGt(latestParts, currentParts),
  };
}
