/** GitHub release check — repo from github.config.json at project root. */

import { storage, STORAGE_KEYS } from "./storage";
import {
  GITHUB_REPO,
  GITHUB_LATEST_RELEASE_URL,
  GITHUB_RELEASES_URL,
} from "../config/github.js";

export { GITHUB_REPO, GITHUB_LATEST_RELEASE_URL, GITHUB_RELEASES_URL };

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

export function isUpdateTestMode() {
  if (import.meta.env.VITE_UPDATE_TEST_MODE === "true") return true;
  const flag = storage.get(STORAGE_KEYS.UPDATE_TEST_MODE);
  return flag === true || flag === 1 || flag === "1";
}

export function setUpdateTestMode(enabled) {
  storage.set(STORAGE_KEYS.UPDATE_TEST_MODE, enabled ? 1 : 0);
}

export function isAutoCheckUpdatesEnabled() {
  const stored = storage.get(STORAGE_KEYS.AUTO_CHECK_UPDATES);
  if (stored === null || stored === undefined) return true;
  return stored !== false && stored !== 0;
}

export function getDismissedUpdateVersion() {
  return storage.get(STORAGE_KEYS.DISMISSED_UPDATE_VERSION) || "";
}

export function dismissUpdateVersion(version) {
  if (version) storage.set(STORAGE_KEYS.DISMISSED_UPDATE_VERSION, version);
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
  const bySlot = {};
  for (const asset of release.assets ?? []) {
    const slot = classifyAsset(asset.name);
    if (!slot) continue;
    if (!bySlot[slot]) bySlot[slot] = [];
    bySlot[slot].push({
      name: asset.name,
      url: asset.browser_download_url,
    });
  }
  for (const [slot, list] of Object.entries(bySlot)) {
    if (slot === "exe") {
      list.sort((a, b) => {
        const aSetup = /setup|installer/i.test(a.name) ? 1 : 0;
        const bSetup = /setup|installer/i.test(b.name) ? 1 : 0;
        return aSetup - bSetup;
      });
    }
    map[slot] = list[0]?.url;
  }
  return map;
}

function bumpVersionString(current) {
  const parts = normaliseVersion(current);
  parts[2] += 1;
  return parts.join(".");
}

async function fetchLatestRelease() {
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

  return {
    latest: latestRaw,
    url: stable.html_url || GITHUB_LATEST_RELEASE_URL,
    changelog: stable.body || "",
    assets: buildAssetMap(stable),
  };
}

function buildTestUpdatePayload(current, release) {
  const fakeLatest = bumpVersionString(current);
  return {
    latest: fakeLatest,
    current,
    url: release?.url || GITHUB_LATEST_RELEASE_URL,
    changelog:
      (release?.changelog
        ? `${release.changelog}\n\n---\n\n`
        : "") +
      "**Update test mode** — simulates a newer version. Use `npm run start:test-updates` or enable *Test update prompt* in Settings.",
    assets: release?.assets || {},
    hasUpdate: true,
    isTest: true,
  };
}

export async function checkForUpdates() {
  const current = await readInstalledVersion();

  if (updatesDisabled()) {
    if (isUpdateTestMode()) {
      return buildTestUpdatePayload(current, null);
    }
    return {
      latest: current,
      current,
      url: "",
      changelog: "",
      assets: {},
      hasUpdate: false,
    };
  }

  let release = null;
  try {
    release = await fetchLatestRelease();
  } catch (e) {
    if (isUpdateTestMode()) {
      return buildTestUpdatePayload(current, null);
    }
    throw e;
  }

  if (isUpdateTestMode()) {
    return buildTestUpdatePayload(current, release);
  }

  const latestParts = normaliseVersion(release.latest);
  const currentParts = normaliseVersion(current);

  return {
    ...release,
    current,
    hasUpdate:
      release.latest !== "" && semverGt(latestParts, currentParts),
    isTest: false,
  };
}

export function shouldPromptUpdateOnStartup(updateInfo) {
  if (!updateInfo?.hasUpdate) return false;
  if (isUpdateTestMode()) return true;
  return getDismissedUpdateVersion() !== updateInfo.latest;
}
