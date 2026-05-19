/**
 * Hybrid installer engine — copies electron-builder payload; never touches watch history.
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { app } = require("electron");

const EXE_NAME = "Encryptic Movies.exe";
const MANIFEST_NAME = ".encryptic-manifest.json";

function getAppUserDataDir() {
  return path.join(app.getPath("appData"), "Encryptic Movies");
}

function getPayloadPath() {
  if (process.env.INSTALLER_PAYLOAD) {
    const p = process.env.INSTALLER_PAYLOAD;
    if (fs.existsSync(p)) return p;
  }

  if (app.isPackaged && process.resourcesPath) {
    const bundled = path.join(process.resourcesPath, "payload", EXE_NAME);
    if (fs.existsSync(bundled)) return bundled;
  }

  const candidates = [
    path.join(__dirname, "payload", EXE_NAME),
    path.join(__dirname, "..", "dist", EXE_NAME),
    path.join(__dirname, "..", "dist", "win-unpacked", EXE_NAME),
    path.join(process.resourcesPath || "", "payload", EXE_NAME),
    path.join(path.dirname(process.execPath), "payload", EXE_NAME),
    path.join(path.dirname(process.execPath), EXE_NAME),
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return null;
}

function readManifest(installDir) {
  const file = path.join(installDir, MANIFEST_NAME);
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeManifest(installDir, version) {
  const manifest = {
    version,
    installedAt: new Date().toISOString(),
    exeName: EXE_NAME,
  };
  fs.writeFileSync(
    path.join(installDir, MANIFEST_NAME),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(installDir, "version.txt"),
    String(version),
    "utf8",
  );
}

function getInstallStatus(installDir) {
  const exePath = path.join(installDir, EXE_NAME);
  const installed = fs.existsSync(exePath);
  const manifest = installed ? readManifest(installDir) : null;
  return {
    installed,
    installDir,
    exePath,
    version: manifest?.version || (installed ? readVersionFile(installDir) : null),
    manifest,
  };
}

function readVersionFile(installDir) {
  try {
    const v = fs.readFileSync(path.join(installDir, "version.txt"), "utf8").trim();
    return v || null;
  } catch {
    return null;
  }
}

function validateInstallDir(installDir) {
  if (!installDir || typeof installDir !== "string") {
    return { ok: false, error: "Choose an install folder first." };
  }
  try {
    fs.mkdirSync(installDir, { recursive: true });
    const testFile = path.join(installDir, ".encryptic-write-test");
    fs.writeFileSync(testFile, "ok", "utf8");
    fs.unlinkSync(testFile);
    return { ok: true };
  } catch (err) {
    if (err.code === "EACCES") {
      return {
        ok: false,
        error:
          "Cannot write to this folder. Pick Downloads or another folder you own (avoid Program Files).",
      };
    }
    return { ok: false, error: err.message || "Folder is not writable." };
  }
}

async function copyPayload(destExe, onProgress) {
  const src = getPayloadPath();
  if (!src) {
    throw new Error(
      "App package not found. Rebuild with: npm run dist:win-setup",
    );
  }
  const total = fs.statSync(src).size;
  if (!total) throw new Error("Install package is empty. Re-download the setup.");

  onProgress?.({ pct: 10, label: "Copying application files…" });
  fs.mkdirSync(path.dirname(destExe), { recursive: true });

  await new Promise((resolve, reject) => {
    let copied = 0;
    const read = fs.createReadStream(src);
    const write = fs.createWriteStream(destExe);
    read.on("data", (chunk) => {
      copied += chunk.length;
      const pct = 10 + Math.min(60, Math.round((copied / total) * 60));
      onProgress?.({
        pct,
        label: `Copying… ${Math.round((copied / total) * 100)}%`,
      });
    });
    read.on("error", reject);
    write.on("error", reject);
    write.on("finish", resolve);
    read.pipe(write);
  });

  onProgress?.({ pct: 75, label: "Verifying installation…" });
  const st = fs.statSync(destExe);
  if (st.size !== total) {
    throw new Error("Copy failed — file size mismatch. Try again or pick another folder.");
  }
  return src;
}

function runPowerShell(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
      { windowsHide: true },
    );
    let err = "";
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err || `PowerShell exited ${code}`));
    });
    child.on("error", reject);
  });
}

async function createShortcuts(exePath, desktop, startMenu) {
  const escaped = exePath.replace(/'/g, "''");
  const lines = [];
  if (desktop) {
    lines.push(`
      $s = (New-Object -ComObject WScript.Shell).CreateShortcut("$env:USERPROFILE\\Desktop\\Encryptic Movies.lnk")
      $s.TargetPath = '${escaped}'
      $s.WorkingDirectory = Split-Path '${escaped}'
      $s.Save()
    `);
  }
  if (startMenu) {
    lines.push(`
      $dir = "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs"
      New-Item -ItemType Directory -Force -Path $dir | Out-Null
      $s = (New-Object -ComObject WScript.Shell).CreateShortcut("$dir\\Encryptic Movies.lnk")
      $s.TargetPath = '${escaped}'
      $s.WorkingDirectory = Split-Path '${escaped}'
      $s.Save()
    `);
  }
  if (lines.length) await runPowerShell(lines.join("\n"));
}

async function removeShortcuts() {
  const script = `
    Remove-Item -Force -ErrorAction SilentlyContinue "$env:USERPROFILE\\Desktop\\Encryptic Movies.lnk"
    Remove-Item -Force -ErrorAction SilentlyContinue "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs\\Encryptic Movies.lnk"
  `;
  await runPowerShell(script);
}

async function install(options, onProgress) {
  const { installDir, version, desktopShortcut, startMenuShortcut } = options;
  const destExe = path.join(installDir, EXE_NAME);

  onProgress?.({ pct: 5, label: "Preparing folder…" });
  fs.mkdirSync(installDir, { recursive: true });

  await copyPayload(destExe, onProgress);

  onProgress?.({ pct: 80, label: "Writing install info…" });
  writeManifest(installDir, version);

  if (desktopShortcut || startMenuShortcut) {
    onProgress?.({ pct: 90, label: "Creating shortcuts…" });
    await createShortcuts(destExe, desktopShortcut, startMenuShortcut);
  }

  onProgress?.({ pct: 100, label: "Done" });
  return { exePath: destExe, installDir };
}

/** Reinstall app files only — watch history lives in AppData and is preserved. */
async function repair(options, onProgress) {
  onProgress?.({ pct: 5, label: "Repairing installation…" });
  return install(options, onProgress);
}

async function uninstall(options, onProgress) {
  const { installDir, removeUserData } = options;
  const exePath = path.join(installDir, EXE_NAME);

  onProgress?.({ pct: 15, label: "Removing shortcuts…" });
  try {
    await removeShortcuts();
  } catch {
    /* non-fatal */
  }

  onProgress?.({ pct: 40, label: "Removing application files…" });
  for (const name of [EXE_NAME, MANIFEST_NAME, "version.txt"]) {
    const p = path.join(installDir, name);
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
      /* ignore */
    }
  }

  if (removeUserData) {
    onProgress?.({ pct: 70, label: "Removing app data (including watch history)…" });
    const userData = getAppUserDataDir();
    fs.rmSync(userData, { recursive: true, force: true });
  } else {
    onProgress?.({
      pct: 70,
      label: "Keeping your library & watch history in AppData…",
    });
  }

  onProgress?.({ pct: 100, label: "Uninstalled" });
  return { removedUserData: !!removeUserData };
}

function launchApp(exePath) {
  if (!fs.existsSync(exePath)) throw new Error("App not found at " + exePath);
  spawn(exePath, [], { detached: true, stdio: "ignore" }).unref();
}

module.exports = {
  EXE_NAME,
  getPayloadPath,
  getAppUserDataDir,
  getInstallStatus,
  validateInstallDir,
  install,
  repair,
  uninstall,
  launchApp,
};
