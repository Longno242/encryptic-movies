const https = require("https");
const { GITHUB_REPO } = require("./updateConfig");

const pkg = require("./package.json");

function normaliseVersion(v) {
  const parts = String(v)
    .replace(/^v/i, "")
    .split(".");
  while (parts.length < 3) parts.push("0");
  return parts.slice(0, 3).map((n) => Number(n) || 0);
}

function semverGt(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "Encryptic-Movies-Installer",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`GitHub API error ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(12000, () => {
      req.destroy(new Error("Update check timed out"));
    });
  });
}

function pickWindowsAsset(release) {
  for (const asset of release.assets || []) {
    const name = (asset.name || "").toLowerCase();
    if (name.endsWith(".exe") && !name.includes("setup")) {
      return {
        name: asset.name,
        url: asset.browser_download_url,
        size: asset.size,
      };
    }
  }
  return null;
}

function updatesDisabled() {
  return !GITHUB_REPO || GITHUB_REPO.includes("YOUR_GITHUB");
}

/** Template demo when no repo is configured — shows the update UI flow. */
function demoUpdateResult(current) {
  const parts = normaliseVersion(current);
  parts[2] += 1;
  const latest = parts.join(".");
  return {
    hasUpdate: true,
    current,
    latest,
    changelog:
      "**Preview only** — connect `installer/updateConfig.js` to your GitHub repo for real releases.\n\n- Improved browse experience\n- Bug fixes and performance",
    releaseUrl: "",
    downloadUrl: "",
    assetName: "Encryptic Movies.exe",
    assetSize: 98 * 1024 * 1024,
    isDemo: true,
  };
}

async function checkForUpdates(installedVersion) {
  const current = installedVersion || pkg.version;

  if (updatesDisabled()) {
    return demoUpdateResult(current);
  }

  const releases = await fetchJson(
    `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=10`,
  );

  const stable = Array.isArray(releases)
    ? releases.find((r) => !r.prerelease && !r.draft)
    : null;

  if (!stable) throw new Error("No stable release found");

  const latestRaw = (stable.tag_name || "").replace(/^v/i, "");
  const asset = pickWindowsAsset(stable);

  return {
    hasUpdate:
      latestRaw !== "" &&
      semverGt(normaliseVersion(latestRaw), normaliseVersion(current)),
    current,
    latest: latestRaw || current,
    changelog: stable.body || "",
    releaseUrl:
      stable.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
    downloadUrl: asset?.url || "",
    assetName: asset?.name || "",
    assetSize: asset?.size || 0,
    isDemo: false,
  };
}

module.exports = { checkForUpdates, normaliseVersion };
