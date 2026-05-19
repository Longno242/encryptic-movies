/**
 * Encryptic Movies — hybrid installer (wizard + electron-builder payload)
 * Preview: npm run installer:preview
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");

const pkg = require("./package.json");
const { checkForUpdates } = require("./updateCheck");
const engine = require("./installerEngine");
const spotlight = require("./spotlightMovies");
const { fetchPosterDataUrl } = require("./posterFetch");

const APP_NAME = "Encryptic Movies";

let mainWindow = null;

function getDefaultInstallDir() {
  return path.join(app.getPath("downloads"), APP_NAME);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 920,
    minHeight: 640,
    frame: false,
    resizable: true,
    maximizable: true,
    fullscreenable: false,
    backgroundColor: "#000000",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      /* file:// page must load https poster images */
      webSecurity: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  app.quit();
});

function sendProgress(sender, data) {
  sender.send("installer:progress", data);
}

ipcMain.handle("installer:getDefaults", () => {
  const installDir = getDefaultInstallDir();
  const status = engine.getInstallStatus(installDir);
  const payloadPath = engine.getPayloadPath();

  return {
    installDir,
    exePath: path.join(installDir, engine.EXE_NAME),
    appName: APP_NAME,
    exeName: engine.EXE_NAME,
    appVersion: pkg.version,
    installedVersion: status.version || pkg.version,
    installed: status.installed,
    payloadAvailable: !!payloadPath,
    payloadPath: payloadPath || null,
    isDev: !app.isPackaged,
    previewInstallAllowed: !payloadPath && !app.isPackaged,
    userDataPath: engine.getAppUserDataDir(),
    spotlight: {
      tagline: spotlight.tagline,
      subtitle: spotlight.subtitle,
      movies: spotlight.movies,
    },
  };
});

ipcMain.handle("installer:getStatus", (_evt, installDir) => {
  return engine.getInstallStatus(installDir || getDefaultInstallDir());
});

ipcMain.handle("installer:validatePath", (_evt, installDir) => {
  return engine.validateInstallDir(installDir);
});

ipcMain.handle("installer:pickDirectory", async (_evt, currentPath) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Choose install folder",
    defaultPath: currentPath || getDefaultInstallDir(),
    properties: ["openDirectory", "createDirectory"],
  });
  if (canceled || !filePaths?.[0]) return null;
  return filePaths[0];
});

ipcMain.handle("installer:runInstall", async (evt, opts) => {
  const sender = evt.sender;
  const report = (data) => sendProgress(sender, data);
  return engine.install(
    {
      installDir: opts.installDir,
      version: pkg.version,
      desktopShortcut: !!opts.desktopShortcut,
      startMenuShortcut: !!opts.startMenuShortcut,
    },
    report,
  );
});

ipcMain.handle("installer:runRepair", async (evt, opts) => {
  const sender = evt.sender;
  const report = (data) => sendProgress(sender, data);
  return engine.repair(
    {
      installDir: opts.installDir,
      version: pkg.version,
      desktopShortcut: !!opts.desktopShortcut,
      startMenuShortcut: !!opts.startMenuShortcut,
    },
    report,
  );
});

ipcMain.handle("installer:runUninstall", async (evt, opts) => {
  const sender = evt.sender;
  const report = (data) => sendProgress(sender, data);
  return engine.uninstall(
    {
      installDir: opts.installDir,
      removeUserData: !!opts.removeUserData,
    },
    report,
  );
});

ipcMain.handle("installer:launchApp", (_evt, exePath) => {
  engine.launchApp(exePath);
});

ipcMain.handle("installer:fetchPoster", async (_evt, movieOrUrl) => {
  return fetchPosterDataUrl(movieOrUrl);
});

ipcMain.handle("installer:checkUpdates", async (_evt, installDir) => {
  const status = engine.getInstallStatus(installDir || getDefaultInstallDir());
  const version = status.version || pkg.version;
  return checkForUpdates(version);
});

ipcMain.handle("installer:minimize", () => {
  mainWindow?.minimize();
});

ipcMain.handle("installer:close", () => {
  app.quit();
});

ipcMain.handle("installer:openExternal", (_evt, url) => {
  if (url && typeof url === "string") {
    return shell.openExternal(url);
  }
});
