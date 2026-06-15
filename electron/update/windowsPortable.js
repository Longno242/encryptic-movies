/**
 * In-app Windows update: replace install folder with new portable EXE.
 * Watch history, settings (localStorage), and API keys live in userData — never deleted.
 */

const { app } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const EXE_NAME = "Encryptic Movies.exe";
const MANIFEST_NAME = ".encryptic-manifest.json";

function pendingUpdatePath() {
  return path.join(app.getPath("userData"), "pending-app-update.json");
}

function writePendingUpdateMarker(targetVersion) {
  try {
    fs.writeFileSync(
      pendingUpdatePath(),
      JSON.stringify({
        version: String(targetVersion || ""),
        at: new Date().toISOString(),
      }),
      "utf8",
    );
  } catch {
    /* non-fatal */
  }
}

/** Clear Chromium disk caches only — not Local Storage / IndexedDB (user library). */
function clearRuntimeCachesOnly() {
  const userData = app.getPath("userData");
  const dirs = [
    "Cache",
    "Code Cache",
    "GPUCache",
    "DawnCache",
    "DawnGraphiteCache",
    "DawnWebGPUCache",
    "blob_storage",
    "Session Storage",
  ];
  for (const name of dirs) {
    const p = path.join(userData, name);
    try {
      if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

function readPendingUpdateInfo() {
  const marker = pendingUpdatePath();
  if (!fs.existsSync(marker)) return null;
  try {
    return JSON.parse(fs.readFileSync(marker, "utf8"));
  } catch {
    return null;
  }
}

/** @returns {object | null} pending update info if a marker was present */
function applyPendingUpdateCleanup() {
  const info = readPendingUpdateInfo();
  if (!info) return null;
  try {
    fs.unlinkSync(pendingUpdatePath());
  } catch {
    /* ignore */
  }
  clearRuntimeCachesOnly();
  return info;
}

/**
 * @param {object} opts
 * @param {string} opts.downloadedExe - path to new portable exe in temp
 * @param {string} [opts.targetVersion] - release version string
 * @param {() => void} [opts.writeSecretMigration]
 * @param {(payload: object) => void} [opts.onProgress]
 */
async function applyWindowsPortableUpdate(opts) {
  const { downloadedExe, targetVersion, writeSecretMigration, onProgress } = opts;

  if (!fs.existsSync(downloadedExe)) {
    throw new Error("Downloaded update file is missing.");
  }

  const st = fs.statSync(downloadedExe);
  if (!st.size || st.size < 5 * 1024 * 1024) {
    throw new Error(
      "Downloaded file looks too small — use the portable Encryptic Movies.exe from GitHub, not the Setup installer.",
    );
  }

  const destExe = process.execPath;
  const installDir = path.dirname(destExe);
  const exeBase = path.basename(destExe);
  const pid = process.pid;

  if (/setup|installer/i.test(path.basename(downloadedExe))) {
    throw new Error(
      "This release asset is the Setup installer. In-app updates need the portable Encryptic Movies.exe.",
    );
  }

  onProgress?.({ percent: 100, label: "Installing update…" });

  writeSecretMigration?.({ targetVersion: targetVersion || app.getVersion() });
  writePendingUpdateMarker(targetVersion || app.getVersion());

  const scriptPath = path.join(
    os.tmpdir(),
    `encryptic-update-${Date.now()}.ps1`,
  );

  const versionEsc = String(targetVersion || "")
    .replace(/'/g, "''")
    .replace(/[\r\n]/g, "");
  const manifestEsc = JSON.stringify({
    version: String(targetVersion || ""),
    updatedAt: new Date().toISOString(),
    exeName: exeBase,
  }).replace(/'/g, "''");

  const ps = [
    "$ErrorActionPreference = 'Stop'",
    `Wait-Process -Id ${pid} -ErrorAction SilentlyContinue`,
    "Start-Sleep -Seconds 2",
    "Get-Process -Name 'Encryptic Movies','Encryptic.Movies' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue",
    "Start-Sleep -Seconds 1",
    `$installDir = '${installDir.replace(/'/g, "''")}'`,
    `$newExe = '${downloadedExe.replace(/'/g, "''")}'`,
    `$dest = '${destExe.replace(/'/g, "''")}'`,
    "if (-not (Test-Path -LiteralPath $newExe)) { throw 'Update file missing' }",
    "Get-ChildItem -LiteralPath $installDir -Force | Where-Object {",
    "  $_.Name -notin @('.', '..')",
    "} | ForEach-Object {",
    "  Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue",
    "}",
    "Copy-Item -LiteralPath $newExe -Destination $dest -Force",
    versionEsc
      ? `Set-Content -LiteralPath (Join-Path $installDir 'version.txt') -Value '${versionEsc}' -Encoding UTF8`
      : null,
    `Set-Content -LiteralPath (Join-Path $installDir '${MANIFEST_NAME}') -Value '${manifestEsc}' -Encoding UTF8`,
    "Start-Process -FilePath $dest -WorkingDirectory $installDir",
  ]
    .filter(Boolean)
    .join("\n");

  fs.writeFileSync(scriptPath, ps, "utf8");

  spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-WindowStyle",
      "Hidden",
      "-File",
      scriptPath,
    ],
    { detached: true, stdio: "ignore", windowsHide: true },
  ).unref();

  app.exit(0);
}

module.exports = {
  EXE_NAME,
  applyWindowsPortableUpdate,
  readPendingUpdateInfo,
  applyPendingUpdateCleanup,
  clearRuntimeCachesOnly,
  writePendingUpdateMarker,
};
