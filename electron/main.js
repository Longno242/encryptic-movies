/**
 * Encryptic Movies — Electron main process entry.
 */

const {
  app,
  BrowserWindow,
  ipcMain,
  session,
  screen,
  webContents,
  Notification,
} = require("electron");
const path = require("path");

const blockStats = require("./ipc/blockStats");
const storageIpc = require("./ipc/storage");
const downloadsIpc = require("./ipc/downloads");
const subtitlesIpc = require("./ipc/subtitles");
const allmangaIpc = require("./ipc/allmanga");
const playerIpc = require("./ipc/player");
const {
  applyPendingUpdateCleanup,
} = require("./update/windowsPortable");
const discordIpc = require("./ipc/discord");
const { setupSession } = require("./session/setup");
const { classifyRequestUrl } = require("./session/adblockLists");
const { attachShieldToWebContents } = require("./shield/injectAllFrames");
const {
  isShieldEnabled,
  setShieldEnabled,
} = require("./shield/enabled");
const {
  EXIT_NATIVE_FULLSCREEN_SCRIPT,
} = require("./playerExitNativeFullscreen");

app.commandLine.appendSwitch(
  "js-flags",
  "--max-old-space-size=256 --expose-gc",
);
app.commandLine.appendSwitch(
  "disable-features",
  "HardwareMediaKeyHandling,MediaSessionService,UseSandboxedXdgPortal",
);
app.commandLine.appendSwitch("enable-features", "NetworkServiceInProcess2");
app.commandLine.appendSwitch("disk-cache-size", String(80 * 1024 * 1024));
app.commandLine.appendSwitch("renderer-process-limit", "3");

const bootStart = Date.now();
const logBoot = (label) =>
  console.log(`[boot] ${label}: +${Date.now() - bootStart}ms`);

let mainWindow = null;
const getMainWindow = () => mainWindow;

const playerWebContentsIds = new Set();
let sessionsReady = false;

function ensurePlayerSessions() {
  if (sessionsReady) return;
  sessionsReady = true;
  const playerSession = session.fromPartition("persist:player");
  const trailerSession = session.fromPartition("persist:trailer");
  setupSession(playerSession, trailerSession, {
    getMainWindow,
    recordBlockedRequest: blockStats.recordBlockedRequest,
    extractSubtitleLang: subtitlesIpc.extractSubtitleLang,
  });
}

function revealMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
}

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    revealMainWindow();
    return;
  }

  downloadsIpc.loadDownloads();
  blockStats.loadBlockStats();

  const notifyPlayerWindowFullscreen = (on) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("player-window-fullscreen-changed", !!on);
    }
  };

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: true,
    backgroundColor: "#000000",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    frame: process.platform !== "win32",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      backgroundThrottling: true,
      spellcheck: false,
      additionalArguments: ["--js-flags=--max-old-space-size=256 --expose-gc"],
    },
  });

  mainWindow.on("enter-full-screen", () => notifyPlayerWindowFullscreen(true));
  mainWindow.on("leave-full-screen", () => {
    appPlayerFullscreen = false;
    notifyPlayerWindowFullscreen(false);
  });

  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ["*://image.tmdb.org/*"] },
    (details, callback) => {
      const headers = { ...details.responseHeaders };
      headers["cache-control"] = ["public, max-age=604800, immutable"];
      delete headers["pragma"];
      delete headers["expires"];
      callback({ responseHeaders: headers });
    },
  );

  mainWindow.webContents.on("did-attach-webview", (_, wc) => {
    ensurePlayerSessions();

    const isPlayer =
      wc.session === session.fromPartition("persist:player");

    try {
      if (isPlayer) {
        playerWebContentsIds.add(wc.id);
        wc.once("destroyed", () => playerWebContentsIds.delete(wc.id));
      }
    } catch {}

    wc.setWindowOpenHandler(() => ({ action: "deny" }));

    if (isPlayer) {
      wc.on("will-navigate", (event, url) => {
        if (classifyRequestUrl(url) === "block") {
          event.preventDefault();
          blockStats.recordBlockedRequest(url);
        }
      });
      wc.on("will-redirect", (event, url) => {
        if (classifyRequestUrl(url) === "block") {
          event.preventDefault();
          blockStats.recordBlockedRequest(url);
        }
      });
      attachShieldToWebContents(wc, true);
    }

    wc.on("enter-html-full-screen", () => {
      if (!isPlayer || !mainWindow || mainWindow.isDestroyed()) return;
      wc.executeJavaScript(EXIT_NATIVE_FULLSCREEN_SCRIPT, true).catch(() => {});
      mainWindow.webContents.send("webview-request-app-fullscreen");
    });
    wc.on("leave-html-full-screen", () => {
      if (!appPlayerFullscreen && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("webview-leave-fullscreen");
      }
    });
  });

  mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));

  mainWindow.once("ready-to-show", revealMainWindow);

  mainWindow.webContents.once("did-finish-load", () => {
    logBoot("renderer loaded");
    revealMainWindow();
    const backupSettings = storageIpc.loadScheduledBackupSettings();
    if (storageIpc.shouldRunScheduledBackup(backupSettings)) {
      mainWindow.webContents.send("scheduled-backup-requested");
    }
  });

  // Fallback if ready-to-show never fires (stuck hidden window)
  setTimeout(revealMainWindow, 2500);

  let awaitingCloseConfirm = false;
  mainWindow.on("close", (event) => {
    const active = downloadsIpc
      .getDownloads()
      .filter((d) => d.status === "downloading");
    if (active.length === 0) return;
    event.preventDefault();
    if (awaitingCloseConfirm) return;
    awaitingCloseConfirm = true;
    mainWindow.webContents.send("confirm-close", { count: active.length });
  });

  ipcMain.on("close-response", (_, confirmed) => {
    awaitingCloseConfirm = false;
    if (confirmed) {
      downloadsIpc.killAllDownloads();
      mainWindow.destroy();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    app.quit();
  });

  const mw = mainWindow;
  mw.on("maximize", () => {
    if (!mw.isDestroyed()) mw.webContents.send("window-maximized", true);
  });
  mw.on("unmaximize", () => {
    if (!mw.isDestroyed()) mw.webContents.send("window-maximized", false);
  });
  mw.on("enter-full-screen", () => {
    if (!mw.isDestroyed()) mw.webContents.send("window-maximized", true);
  });
  mw.on("leave-full-screen", () => {
    if (!mw.isDestroyed()) mw.webContents.send("window-maximized", false);
  });
}

storageIpc.register();
downloadsIpc.register(getMainWindow);
subtitlesIpc.register({
  getDownloads: downloadsIpc.getDownloads,
  saveDownloads: downloadsIpc.saveDownloads,
});
allmangaIpc.register();
playerIpc.register(getMainWindow, {
  writeSecretMigration: storageIpc.writeSecretMigration,
  getDownloads: downloadsIpc.getDownloads,
});
discordIpc.register();
blockStats.init(getMainWindow);

ipcMain.handle("get-block-stats", () => blockStats.getBlockStats());
ipcMain.handle("get-encryptic-shield", () => isShieldEnabled());
ipcMain.handle("set-encryptic-shield", (_, enabled) =>
  setShieldEnabled(enabled),
);

ipcMain.on("player-stopped", () => {
  discordIpc.discordRpc.setBrowsing().catch(() => {});

  for (const id of playerWebContentsIds) {
    try {
      const wc = webContents.fromId(id);
      if (wc && !wc.isDestroyed()) {
        try {
          wc.setAudioMuted(true);
        } catch {}
        wc.destroy();
      }
    } catch {}
  }
  playerWebContentsIds.clear();

  if (typeof global.gc === "function") global.gc();
  const win = mainWindow;
  if (win && !win.isDestroyed()) {
    win.webContents
      .executeJavaScript("if(typeof gc==='function') gc();")
      .catch(() => {});
  }
});

ipcMain.handle("wyzie-open-redeem", async () => {
  const { BrowserWindow: BW, session: electronSession } = require("electron");
  const redeemSession = electronSession.fromPartition("partition:wyzie-redeem");

  redeemSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    delete headers["content-security-policy"];
    delete headers["Content-Security-Policy"];
    callback({ responseHeaders: headers });
  });

  return new Promise((resolve) => {
    const win = new BW({
      width: 960,
      height: 720,
      title: "Claim your Wyzie API Key",
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        session: redeemSession,
      },
      backgroundColor: "#ffffff",
      autoHideMenuBar: true,
    });

    let settled = false;
    let timeout = null;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (!win.isDestroyed()) win.close();
      resolve(result);
    };

    win.on("closed", () => {
      if (!settled) resolve({ ok: false, key: null, cancelled: true });
      clearTimeout(timeout);
    });

    win.webContents.once("did-finish-load", () => {
      timeout = setTimeout(
        () => finish({ ok: false, key: null, timeout: true }),
        20000,
      );
    });

    const tryExtractKey = (url) => {
      try {
        const u = new URL(url);
        if (u.hostname === "sub.wyzie.io" && u.pathname === "/notice") {
          const key = u.searchParams.get("key");
          if (key && key.startsWith("wyzie-") && key.length > 10) {
            finish({ ok: true, key });
            return true;
          }
        }
      } catch {}
      return false;
    };

    win.webContents.on("will-navigate", (_, url) => tryExtractKey(url));
    win.webContents.on("did-navigate", (_, url) => tryExtractKey(url));
    win.webContents.on("did-navigate-in-page", (_, url) => tryExtractKey(url));

    win.loadURL("https://sub.wyzie.io/redeem");
  });
});

ipcMain.handle("wyzie-validate-key", async (_, key) => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(
      `https://sub.wyzie.io/search?id=550&format=srt&key=${encodeURIComponent(key)}`,
      { signal: controller.signal },
    ).finally(() => clearTimeout(timer));
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Invalid or expired key" };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle(
  "show-notification",
  (_event, { title, body, silent = false }) => {
    try {
      if (!Notification.isSupported()) return;
      const n = new Notification({
        title: String(title),
        body: String(body),
        silent,
      });
      n.show();
    } catch {}
  },
);

let pipWindow = null;
let playerWindowBoundsBeforeFs = null;
let appPlayerFullscreen = false;

ipcMain.handle("set-player-window-fullscreen", (_, enabled) => {
  const win = getMainWindow();
  if (!win || win.isDestroyed()) return { ok: false };
  try {
    appPlayerFullscreen = !!enabled;
    if (enabled) {
      if (!playerWindowBoundsBeforeFs) {
        playerWindowBoundsBeforeFs = win.getBounds();
      }
      if (win.isMaximized()) win.unmaximize();
      const display = screen.getDisplayMatching(win.getBounds());
      win.setFullScreen(true);
      if (process.platform === "win32") {
        // Frameless Windows: ensure the window covers the full display.
        win.setBounds(display.bounds);
      }
    } else {
      win.setFullScreen(false);
      if (playerWindowBoundsBeforeFs) {
        win.setBounds(playerWindowBoundsBeforeFs);
        playerWindowBoundsBeforeFs = null;
      }
    }
    return { ok: true, fullscreen: win.isFullScreen() };
  } catch (err) {
    appPlayerFullscreen = false;
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle("open-pip-window", (_, { url, title }) => {
  if (!url || url === "about:blank") return { ok: false, reason: "no-url" };

  ensurePlayerSessions();

  if (pipWindow && !pipWindow.isDestroyed()) {
    pipWindow.loadURL(url);
    pipWindow.focus();
    return { ok: true };
  }

  pipWindow = new BrowserWindow({
    width: 640,
    height: 360,
    minWidth: 320,
    minHeight: 180,
    alwaysOnTop: true,
    title: title ? `${title} - Pop-out` : "Pop-out Player",
    backgroundColor: "#000000",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    frame: process.platform !== "win32",
    webPreferences: {
      partition: "persist:player",
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "popout-preload.js"),
    },
  });

  pipWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  attachShieldToWebContents(pipWindow.webContents, true);
  pipWindow.webContents.on("did-attach-webview", (_, wc) => {
    wc.setWindowOpenHandler(() => ({ action: "deny" }));
    attachShieldToWebContents(wc, true);
  });

  pipWindow.loadURL(url);

  pipWindow.on("maximize", () => {
    if (!pipWindow.isDestroyed())
      pipWindow.webContents.send("popout-window-maximized", true);
  });
  pipWindow.on("unmaximize", () => {
    if (!pipWindow.isDestroyed())
      pipWindow.webContents.send("popout-window-maximized", false);
  });

  const notifyMain = (channel) => {
    const mw = getMainWindow();
    if (mw && !mw.isDestroyed()) mw.webContents.send(channel);
  };

  pipWindow.on("closed", () => {
    pipWindow = null;
    notifyMain("pip-window-closed");
  });

  notifyMain("pip-window-opened");
  return { ok: true };
});

ipcMain.handle("close-pip-window", () => {
  if (pipWindow && !pipWindow.isDestroyed()) pipWindow.close();
});

ipcMain.handle("get-pip-webcontents-id", () => {
  if (pipWindow && !pipWindow.isDestroyed()) return pipWindow.webContents.id;
  return null;
});

ipcMain.handle("popout-window-minimize", () => {
  if (pipWindow && !pipWindow.isDestroyed()) pipWindow.minimize();
});
ipcMain.handle("popout-window-toggle-maximize", () => {
  if (!pipWindow || pipWindow.isDestroyed()) return;
  if (pipWindow.isFullScreen()) {
    pipWindow.setFullScreen(false);
    pipWindow.setBounds({ width: 960, height: 540 });
    return;
  }
  if (pipWindow.isMaximized()) {
    pipWindow.unmaximize();
    return;
  }
  const display = screen.getDisplayMatching(pipWindow.getBounds());
  if (process.platform === "win32") pipWindow.setBounds(display.bounds);
  pipWindow.setFullScreen(true);
});
ipcMain.handle("popout-window-close", () => {
  if (pipWindow && !pipWindow.isDestroyed()) pipWindow.close();
});
ipcMain.handle("popout-window-is-maximized", () => {
  return pipWindow && !pipWindow.isDestroyed()
    ? pipWindow.isMaximized()
    : false;
});

const hasLock = app.requestSingleInstanceLock();

if (!hasLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      revealMainWindow();
    } else {
      createMainWindow();
    }
  });

  app.whenReady().then(async () => {
    if (process.argv.includes("--reset-catalog")) {
      try {
        await storageIpc.resetCatalogChooser();
      } catch (err) {
        console.error("[reset] failed:", err?.message || err);
        process.exitCode = 1;
      }
      app.quit();
      return;
    }

    if (process.argv.includes("--require-catalog-setup")) {
      try {
        await storageIpc.prepareCatalogSetupGate();
        console.log("[boot] Catalog setup gate enabled (preview post-update)");
      } catch (err) {
        console.error("[boot] catalog setup gate failed:", err?.message || err);
      }
    }

    logBoot("app ready");
    const pendingUpdate = applyPendingUpdateCleanup();
    if (pendingUpdate) {
      try {
        await session.defaultSession.clearCache();
      } catch {
        /* ignore */
      }
    }
    try {
      await storageIpc.applySecretMigrationIfNeeded();
    } catch (err) {
      console.error("[migration] secret restore failed:", err?.message || err);
    }
    try {
      await storageIpc.applyV1011ApiKeyResetIfNeeded({
        hadPendingUpdate: !!pendingUpdate,
        pendingVersion: pendingUpdate?.version || "",
      });
    } catch (err) {
      console.error("[migration] v1.0.11 reset failed:", err?.message || err);
    }
    try {
      await storageIpc.recoverCatalogSetupIfKeyPresent();
    } catch (err) {
      console.error("[migration] catalog recovery failed:", err?.message || err);
    }
    storageIpc.recordAppVersionSeen();
    createMainWindow();
    setTimeout(() => {
      discordIpc.discordRpc.setBrowsing().catch(() => {});
    }, 3000);
  });
  app.on("before-quit", () => {
    discordIpc.discordRpc.destroy();
  });
  app.on("window-all-closed", () => app.quit());
  app.on("activate", () => {
    if (mainWindow === null) createMainWindow();
  });
}
