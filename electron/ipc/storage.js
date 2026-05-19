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

async function credentialGet(key) {
  if (!keytar) return null;
  try {
    return await keytar.getPassword(CREDENTIAL_SERVICE, key);
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

function writeSecretMigration() {
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

module.exports = {
  register,
  applySecretMigrationIfNeeded,
  writeSecretMigration,
  loadScheduledBackupSettings,
  shouldRunScheduledBackup,
};
