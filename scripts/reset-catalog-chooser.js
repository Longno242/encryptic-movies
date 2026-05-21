/**
 * Reset catalog chooser + TMDB token so startup shows the dual-choice screen.
 * Run: npx electron scripts/reset-catalog-chooser.js
 */
const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

const userData = path.join(
  process.env.APPDATA || "",
  "encryptic-movies",
);
app.setPath("userData", userData);

let keytar;
try {
  keytar = require("keytar");
} catch {
  keytar = null;
}

const CREDENTIAL_SERVICE = "Encryptic Movies";
const API_KEY = "apikey";

function clearLegacyFile() {
  const storePath = path.join(userData, "secure-store.json");
  if (!fs.existsSync(storePath)) return;
  try {
    const raw = fs.readFileSync(storePath, "utf8");
    const data = JSON.parse(raw);
    if (data.v10 && data.v10[API_KEY]) {
      delete data.v10[API_KEY];
      fs.writeFileSync(storePath, JSON.stringify(data));
    }
  } catch {
    try {
      fs.unlinkSync(storePath);
    } catch {}
  }
}

app.whenReady().then(async () => {
  console.log("[reset] userData:", app.getPath("userData"));

  if (keytar) {
    try {
      await keytar.deletePassword(CREDENTIAL_SERVICE, API_KEY);
      console.log("[reset] Removed TMDB token from Credential Manager");
    } catch (e) {
      console.warn("[reset] Credential Manager:", e.message);
    }
  }

  clearLegacyFile();

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  await win.loadURL("about:blank");
  await win.webContents.executeJavaScript(`
    localStorage.removeItem('mov_metadataMode');
    localStorage.removeItem('mov_apikey');
    true;
  `);
  console.log("[reset] Cleared mov_metadataMode from localStorage");

  win.destroy();
  app.exit(0);
});

app.on("window-all-closed", () => app.quit());
