/**
 * Secrets: Windows Credential Manager (keytar) when available,
 * else Electron safeStorage in a local file (DPAPI-encrypted on Windows).
 */

const { app, ipcMain, safeStorage } = require("electron");
const path = require("path");
const fs = require("fs");

const CREDENTIAL_SERVICE = "Encryptic Movies";

let keytar = null;
try {
  keytar = require("keytar");
} catch {
  console.warn("[secure] keytar unavailable — using file fallback only");
}

let storeFilePath = null;
let storeCache = null;

const storePath = () =>
  storeFilePath ||
  (storeFilePath = path.join(app.getPath("userData"), "secure-store.json"));

const migrationPath = () =>
  path.join(app.getPath("userData"), ".secret-migration.json");

const backupSettingsPath = () =>
  path.join(app.getPath("userData"), "scheduled-backup-settings.json");

function readStore() {
  if (storeCache) return storeCache;
  try {
    storeCache = JSON.parse(fs.readFileSync(storePath(), "utf8"));
  } catch {
    storeCache = {};
  }
  return storeCache;
}

function writeStore(data) {
  storeCache = data;
  fs.writeFileSync(storePath(), JSON.stringify(data), { mode: 0o600 });
}

function isDpapiEncryptedBase64(raw) {
  if (!raw || typeof raw !== "string") return false;
  try {
    const head = Buffer.from(raw, "base64").slice(0, 3).toString("utf8");
    return head === "v10";
  } catch {
    return false;
  }
}

function isWeakBase64Plaintext(raw) {
  if (!raw || typeof raw !== "string") return false;
  try {
    const plain = Buffer.from(raw, "base64").toString("utf8");
    return /^eyJ[\w-]*\.[\w-]*\.[\w-]*$/.test(plain);
  } catch {
    return false;
  }
}

function decryptLegacyValue(encoded) {
  if (safeStorage.isEncryptionAvailable() && isDpapiEncryptedBase64(encoded)) {
    return safeStorage.decryptString(Buffer.from(encoded, "base64"));
  }
  if (isWeakBase64Plaintext(encoded)) {
    return Buffer.from(encoded, "base64").toString("utf8");
  }
  if (safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(encoded, "base64"));
    } catch {
      return null;
    }
  }
  return null;
}

function encryptLegacyValue(plain) {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(plain).toString("base64");
  }
  return Buffer.from(plain, "utf8").toString("base64");
}

function legacyFileGet(key) {
  const raw = readStore()[key];
  if (!raw) return null;
  try {
    return decryptLegacyValue(raw);
  } catch {
    return null;
  }
}

function legacyFileSet(key, value) {
  const store = readStore();
  store[key] = encryptLegacyValue(value);
  writeStore(store);
}

function legacyFileDelete(key) {
  const store = readStore();
  if (!store[key]) return;
  delete store[key];
  writeStore(store);
}

const CREDENTIAL_TIMEOUT_MS = 6000;

function withTimeout(promise, ms, fallback = null) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

async function credentialGet(key) {
  if (!keytar) return null;
  try {
    return await withTimeout(
      keytar.getPassword(CREDENTIAL_SERVICE, key),
      CREDENTIAL_TIMEOUT_MS,
      null,
    );
  } catch (e) {
    console.warn("[secure] credential get failed:", e.message);
    return null;
  }
}

async function credentialSet(key, value) {
  if (!keytar) return false;
  try {
    await keytar.setPassword(CREDENTIAL_SERVICE, key, value);
    return true;
  } catch (e) {
    console.warn("[secure] credential set failed:", e.message);
    return false;
  }
}

async function credentialDelete(key) {
  if (!keytar) return;
  try {
    await keytar.deletePassword(CREDENTIAL_SERVICE, key);
  } catch {
    /* ignore */
  }
}

async function migrateKeyFromLegacyFile(key) {
  const raw = readStore()[key];
  if (!raw) return;

  const existing = await credentialGet(key);
  if (!existing) {
    const plain = legacyFileGet(key);
    if (!plain) {
      legacyFileDelete(key);
      return;
    }
    const ok = await credentialSet(key, plain);
    if (!ok) return;
  }

  legacyFileDelete(key);
}

async function migrateAllLegacySecrets() {
  const store = readStore();
  const keys = Object.keys(store);
  for (const key of keys) {
    await migrateKeyFromLegacyFile(key);
  }
  if (keys.length > 0 && Object.keys(readStore()).length === 0) {
    try {
      fs.unlinkSync(storePath());
      storeCache = {};
    } catch {
      /* keep empty file */
    }
  }
}

async function secureStoreGet(key) {
  const fromCred = await credentialGet(key);
  if (fromCred) return fromCred;

  const fromFile = legacyFileGet(key);
  if (fromFile && keytar) {
    await credentialSet(key, fromFile);
    legacyFileDelete(key);
  }
  return fromFile;
}

async function secureStoreSet(key, value) {
  if (value === null || value === undefined || value === "") {
    await credentialDelete(key);
    legacyFileDelete(key);
    return;
  }

  if (await credentialSet(key, value)) {
    legacyFileDelete(key);
    return;
  }

  legacyFileSet(key, value);
}

function getSecureStoreInfo() {
  const legacyExists = fs.existsSync(storePath());
  if (keytar) {
    return {
      ok: true,
      storageType: "credential-manager",
      path: `Windows Credential Manager → ${CREDENTIAL_SERVICE}`,
      encrypted: true,
      legacyFile: legacyExists ? storePath() : null,
    };
  }
  return {
    ok: true,
    storageType: "file",
    path: storePath(),
    encrypted: safeStorage.isEncryptionAvailable(),
    legacyFile: legacyExists ? storePath() : null,
  };
}

const V1011_APIKEY_RESET = [1, 0, 11];

function normaliseVersion(v) {
  const parts = String(v || "")
    .replace(/^v/i, "")
    .split(".");
  while (parts.length < 3) parts.push("0");
  return parts.slice(0, 3).map((n) => Number(n) || 0);
}

function semverGte(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return true;
}

function semverLt(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] < b[i]) return true;
    if (a[i] > b[i]) return false;
  }
  return false;
}

const migrationsStatePath = () =>
  path.join(app.getPath("userData"), "migrations-state.json");

const requireCatalogSetupPath = () =>
  path.join(app.getPath("userData"), "require-catalog-setup.json");

function isCatalogSetupRequired() {
  try {
    const data = JSON.parse(
      fs.readFileSync(requireCatalogSetupPath(), "utf8"),
    );
    return !!data.required;
  } catch {
    return false;
  }
}

function setCatalogSetupRequired(required) {
  if (!required) {
    try {
      fs.unlinkSync(requireCatalogSetupPath());
    } catch {
      /* ignore */
    }
    return;
  }
  fs.writeFileSync(
    requireCatalogSetupPath(),
    JSON.stringify({ required: true, at: new Date().toISOString() }),
    { mode: 0o600 },
  );
}

/** Clear TMDB key + metadata mode; show chooser on every launch until user picks. */
async function prepareCatalogSetupGate() {
  await clearStoredApiKey();
  await resetCatalogChooser();
  setCatalogSetupRequired(true);
}

function loadMigrationsState() {
  try {
    return JSON.parse(fs.readFileSync(migrationsStatePath(), "utf8"));
  } catch {
    return {};
  }
}

function saveMigrationsState(state) {
  fs.writeFileSync(
    migrationsStatePath(),
    JSON.stringify(state, null, 2),
    { mode: 0o600 },
  );
}

function stripApiKeyFromSecretMigrationFile() {
  const mf = migrationPath();
  if (!fs.existsSync(mf)) return;
  try {
    const plain = JSON.parse(fs.readFileSync(mf, "utf8"));
    if (!plain || typeof plain !== "object") return;
    delete plain.apikey;
    if (Object.keys(plain).length === 0) {
      fs.unlinkSync(mf);
    } else {
      fs.writeFileSync(mf, JSON.stringify(plain), { mode: 0o600 });
    }
  } catch {
    /* ignore */
  }
}

async function clearStoredApiKey() {
  await secureStoreSet("apikey", "");
  stripApiKeyFromSecretMigrationFile();
}

function writeSecretMigration(opts = {}) {
  try {
    const store = readStore();
    const plain = {};
    for (const [k, raw] of Object.entries(store)) {
      if (!raw) continue;
      try {
        const val = decryptLegacyValue(raw);
        if (val) plain[k] = val;
      } catch {
        /* skip */
      }
    }
    if (Object.keys(plain).length > 0) {
      fs.writeFileSync(migrationPath(), JSON.stringify(plain), { mode: 0o600 });
    }
  } catch {
    /* best effort */
  }
}

async function applySecretMigrationIfNeeded() {
  const mf = migrationPath();
  if (fs.existsSync(mf)) {
    let plain = null;
    try {
      plain = JSON.parse(fs.readFileSync(mf, "utf8"));
      try {
        fs.unlinkSync(mf);
      } catch {
        try {
          fs.writeFileSync(mf, "{}", { mode: 0o600 });
        } catch {}
      }
    } catch {
      plain = null;
    }
    if (plain) {
      const state = loadMigrationsState();
      if (state.v1011ApiKeyCleared) delete plain.apikey;
      for (const [k, v] of Object.entries(plain)) {
        if (v) await secureStoreSet(k, v);
      }
    }
  }

  await migrateAllLegacySecrets();
}

app.on("quit", () => {
  try {
    fs.unlinkSync(migrationPath());
  } catch {}
});

function loadScheduledBackupSettings() {
  try {
    return JSON.parse(fs.readFileSync(backupSettingsPath(), "utf8"));
  } catch {
    return {
      enabled: false,
      path: "",
      keepCount: 5,
      frequency: "startup",
      lastRun: null,
    };
  }
}

function saveScheduledBackupSettings(settings) {
  fs.writeFileSync(
    backupSettingsPath(),
    JSON.stringify(settings, null, 2),
    "utf8",
  );
}

function shouldRunScheduledBackup(settings) {
  if (!settings.enabled || !settings.path) return false;
  if (settings.frequency === "startup") return true;
  if (!settings.lastRun) return true;
  const elapsed = Date.now() - new Date(settings.lastRun).getTime();
  if (settings.frequency === "daily") return elapsed >= 86_400_000;
  if (settings.frequency === "weekly") return elapsed >= 604_800_000;
  if (settings.frequency === "monthly") return elapsed >= 2_592_000_000;
  return false;
}

function register() {
  ipcMain.handle("get-app-version", () => app.getVersion());

  ipcMain.handle("is-catalog-setup-required", () => ({
    required: isCatalogSetupRequired(),
  }));

  ipcMain.handle("clear-catalog-setup-required", () => {
    setCatalogSetupRequired(false);
    return { ok: true };
  });

  ipcMain.handle("secure-store-get", async (_, key) => {
    try {
      return { ok: true, value: await secureStoreGet(key) };
    } catch {
      return { ok: false, value: null };
    }
  });

  ipcMain.handle("secure-store-set", async (_, { key, value }) => {
    try {
      await secureStoreSet(key, value);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle("get-secure-store-info", () => {
    try {
      return { ok: true, ...getSecureStoreInfo() };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle("get-scheduled-backup-settings", () =>
    loadScheduledBackupSettings(),
  );

  ipcMain.handle("set-scheduled-backup-settings", (_, settings) => {
    try {
      saveScheduledBackupSettings(settings);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle("perform-scheduled-backup", (_, { data, settings }) => {
    try {
      const backupDir = settings.path;
      if (!backupDir) return { ok: false, error: "No backup path set" };

      fs.mkdirSync(backupDir, { recursive: true });

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      const filename = `mov-backup-${timestamp}.json`;
      const fullPath = path.join(backupDir, filename);
      fs.writeFileSync(
        fullPath,
        JSON.stringify(
          {
            version: 1,
            exportedAt: new Date().toISOString(),
            scheduledBackup: true,
            data,
          },
          null,
          2,
        ),
        "utf8",
      );

      const keepCount = Math.max(1, Number(settings.keepCount) || 5);
      fs.readdirSync(backupDir)
        .filter((f) => f.startsWith("mov-backup-") && f.endsWith(".json"))
        .map((f) => ({
          name: f,
          mtime: fs.statSync(path.join(backupDir, f)).mtimeMs,
        }))
        .sort((a, b) => b.mtime - a.mtime)
        .slice(keepCount)
        .forEach(({ name }) => {
          try {
            fs.unlinkSync(path.join(backupDir, name));
          } catch {}
        });

      saveScheduledBackupSettings({
        ...settings,
        lastRun: new Date().toISOString(),
      });
      return { ok: true, path: fullPath };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
}

/**
 * One-time on upgrade from before v1.0.11: remove TMDB key and show catalog chooser.
 * Routine in-app updates (1.0.12 → 1.0.13, etc.) must not wipe the saved token.
 */
async function applyV1011ApiKeyResetIfNeeded({
  hadPendingUpdate = false,
  pendingVersion = "",
} = {}) {
  const state = loadMigrationsState();
  if (state.v1011ApiKeyCleared) return false;

  const current = normaliseVersion(app.getVersion());
  if (!semverGte(current, V1011_APIKEY_RESET)) return false;

  const lastRecorded = state.lastRecordedVersion
    ? normaliseVersion(state.lastRecordedVersion)
    : null;

  // Already ran on 1.0.11+ — skip (fixes first in-app update wiping the key)
  if (lastRecorded && semverGte(lastRecorded, V1011_APIKEY_RESET)) {
    state.v1011ApiKeyCleared = true;
    saveMigrationsState(state);
    return false;
  }

  const fromUpgrade =
    lastRecorded && semverLt(lastRecorded, V1011_APIKEY_RESET);

  if (!fromUpgrade) return false;

  await prepareCatalogSetupGate();
  state.v1011ApiKeyCleared = true;
  saveMigrationsState(state);
  console.log(
    "[migration] v1.0.11 — choose free catalog or enter a new TMDB key",
  );
  return true;
}

/** If chooser gate is stuck but Credential Manager still has a TMDB token, dismiss gate. */
async function recoverCatalogSetupIfKeyPresent() {
  if (!isCatalogSetupRequired()) return false;
  const key = await secureStoreGet("apikey");
  if (!key) return false;

  setCatalogSetupRequired(false);

  const { BrowserWindow } = require("electron");
  const indexPath = path.join(__dirname, "../../dist/index.html");
  const win = new BrowserWindow({
    show: false,
    width: 640,
    height: 480,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  try {
    await new Promise((resolve, reject) => {
      win.webContents.once("did-finish-load", resolve);
      win.webContents.once("did-fail-load", (_, code, desc) =>
        reject(new Error(desc || String(code))),
      );
      win.loadFile(indexPath).catch(reject);
    });
    await win.webContents.executeJavaScript(`
      (() => {
        if (!localStorage.getItem('mov_metadataMode')) {
          localStorage.setItem('mov_metadataMode', 'tmdb');
        }
        return true;
      })()
    `);
  } catch (err) {
    console.warn("[migration] catalog recovery:", err?.message || err);
  } finally {
    if (!win.isDestroyed()) win.close();
  }

  console.log("[migration] TMDB key found — skipped catalog chooser after update");
  return true;
}

function recordAppVersionSeen() {
  const state = loadMigrationsState();
  state.lastRecordedVersion = app.getVersion();
  saveMigrationsState(state);
}

async function resetCatalogChooser() {
  const { BrowserWindow } = require("electron");

  const indexPath = path.join(__dirname, "../../dist/index.html");
  const win = new BrowserWindow({
    show: false,
    width: 640,
    height: 480,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  await new Promise((resolve, reject) => {
    win.webContents.once("did-finish-load", resolve);
    win.webContents.once("did-fail-load", (_, code, desc) =>
      reject(new Error(desc || String(code))),
    );
    win.loadFile(indexPath).catch(reject);
  });

  await win.webContents.executeJavaScript(`
    (() => {
      localStorage.removeItem('mov_metadataMode');
      return true;
    })()
  `);

  if (!win.isDestroyed()) win.close();
  console.log("[reset] Catalog chooser reset — metadata mode cleared");
}

module.exports = {
  register,
  applySecretMigrationIfNeeded,
  applyV1011ApiKeyResetIfNeeded,
  recoverCatalogSetupIfKeyPresent,
  prepareCatalogSetupGate,
  isCatalogSetupRequired,
  setCatalogSetupRequired,
  recordAppVersionSeen,
  writeSecretMigration,
  loadScheduledBackupSettings,
  shouldRunScheduledBackup,
  resetCatalogChooser,
};
