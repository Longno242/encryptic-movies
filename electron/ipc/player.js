/**
 * External player launch, window chrome, auto-updater, and video probes.
 */

const { ipcMain, shell, app } = require("electron");
const { spawn, spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");
const os = require("os");
const { validateMediaFilePath } = require("../security/paths");
const {
  applyWindowsPortableUpdate,
} = require("../update/windowsPortable");

let _updateAbortController = null;

function register(getMainWindow, { writeSecretMigration, getDownloads }) {
  ipcMain.handle(
    "open-path-at-time",
    (_, { filePath, seconds, subtitlePaths }) => {
      const pathCheck = validateMediaFilePath(
        filePath,
        getDownloads ? getDownloads() : [],
      );
      if (!pathCheck.ok) return { ok: false, error: pathCheck.error };
      const safeFilePath = pathCheck.path;

      const sec = Math.floor(seconds || 0);
      const platform = process.platform;

      const resolveBin = (bin) => {
        if (path.isAbsolute(bin)) return fs.existsSync(bin) ? bin : null;
        const whichCmd = platform === "win32" ? "where" : "which";
        try {
          const result = spawnSync(whichCmd, [bin], { encoding: "utf8" });
          if (result.status === 0 && result.stdout.trim()) {
            return result.stdout.trim().split("\n")[0].trim();
          }
        } catch {}
        return null;
      };

      const tryLaunch = (bin, args) => {
        const resolved = resolveBin(bin);
        if (!resolved) return false;
        try {
          spawn(resolved, args, { detached: true, stdio: "ignore" }).unref();
          return true;
        } catch {
          return false;
        }
      };

      const vlcPaths =
        platform === "win32"
          ? [
              "C:\\Program Files\\VideoLAN\\VLC\\vlc.exe",
              "C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe",
              "vlc",
            ]
          : platform === "darwin"
            ? ["/Applications/VLC.app/Contents/MacOS/VLC", "vlc"]
            : ["/usr/bin/vlc", "/usr/local/bin/vlc", "/snap/bin/vlc", "vlc"];

      const mpvPaths =
        platform === "win32"
          ? ["mpv", "C:\\Program Files\\mpv\\mpv.exe"]
          : platform === "darwin"
            ? ["/opt/homebrew/bin/mpv", "/usr/local/bin/mpv", "mpv"]
            : ["/usr/bin/mpv", "/usr/local/bin/mpv", "/snap/bin/mpv", "mpv"];

      const downloads = getDownloads ? getDownloads() : [];
      const subFilePaths = Array.isArray(subtitlePaths)
        ? subtitlePaths
            .map((sp) => (typeof sp === "string" ? sp : sp?.path))
            .map((p) => (p ? validateMediaFilePath(p, downloads) : null))
            .filter((r) => r?.ok)
            .map((r) => r.path)
        : [];
      const mpvSubArgs = subFilePaths.map((p) => `--sub-file=${p}`);
      const vlcSubArgs =
        subFilePaths.length > 0 ? [`--sub-file=${subFilePaths[0]}`] : [];

      if (sec > 0) {
        for (const mpv of mpvPaths) {
          if (
            tryLaunch(mpv, [`--start=${sec}`, ...mpvSubArgs, safeFilePath])
          )
            return;
        }
        for (const vlc of vlcPaths) {
          if (
            tryLaunch(vlc, [
              `--start-time=${sec}`,
              ...vlcSubArgs,
              safeFilePath,
            ])
          )
            return;
        }
      } else if (mpvSubArgs.length > 0) {
        for (const mpv of mpvPaths) {
          if (tryLaunch(mpv, [...mpvSubArgs, safeFilePath])) return;
        }
        for (const vlc of vlcPaths) {
          if (tryLaunch(vlc, [...vlcSubArgs, safeFilePath])) return;
        }
      }

      shell.openPath(safeFilePath);
    },
  );

  // ── Window controls (custom Windows titlebar) ─────────────────────────────
  ipcMain.handle("window-minimize", () => {
    const mw = getMainWindow();
    if (mw && !mw.isDestroyed()) mw.minimize();
  });

  ipcMain.handle("window-toggle-maximize", () => {
    const mw = getMainWindow();
    if (!mw || mw.isDestroyed()) return;
    if (mw.isMaximized()) mw.unmaximize();
    else mw.maximize();
  });

  ipcMain.handle("window-close", () => {
    const mw = getMainWindow();
    if (mw && !mw.isDestroyed()) mw.close();
  });

  ipcMain.handle("window-is-maximized", () => {
    const mw = getMainWindow();
    return mw ? mw.isMaximized() : false;
  });

  ipcMain.handle("quit-app", () => {
    const mw = getMainWindow();
    if (mw && !mw.isDestroyed()) mw.close();
  });

  ipcMain.handle("get-platform", () => process.platform);

  // ── Get video duration via ffprobe ────────────────────────────────────────
  ipcMain.handle("get-video-duration", async (_, filePath) => {
    if (!filePath) return { ok: false };
    const pathCheck = validateMediaFilePath(
      filePath,
      getDownloads ? getDownloads() : [],
    );
    if (!pathCheck.ok) return { ok: false, error: pathCheck.error };
    const safeFilePath = pathCheck.path;
    const platform = process.platform;

    // Probe paths for ffprobe
    const probePaths =
      platform === "win32"
        ? ["ffprobe", "C:\\ffmpeg\\bin\\ffprobe.exe"]
        : platform === "darwin"
          ? ["/opt/homebrew/bin/ffprobe", "/usr/local/bin/ffprobe", "ffprobe"]
          : ["/usr/bin/ffprobe", "/usr/local/bin/ffprobe", "ffprobe"];

    for (const probe of probePaths) {
      try {
        const result = spawnSync(
          probe,
          [
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            safeFilePath,
          ],
          { encoding: "utf8", timeout: 8000 },
        );
        if (result.status === 0) {
          const secs = parseFloat(result.stdout.trim());
          if (!isNaN(secs) && secs > 0) return { ok: true, duration: secs };
        }
      } catch {}
    }

    // Fallback: ffmpeg -i Duration line
    const ffmpegPaths =
      platform === "win32"
        ? ["ffmpeg", "C:\\ffmpeg\\bin\\ffmpeg.exe"]
        : platform === "darwin"
          ? ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "ffmpeg"]
          : ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "ffmpeg"];

    for (const ff of ffmpegPaths) {
      try {
        const r = spawnSync(ff, ["-i", safeFilePath], {
          encoding: "utf8",
          timeout: 8000,
        });
        const combined = (r.stdout || "") + (r.stderr || "");
        const m = combined.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
        if (m) {
          const secs =
            parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
          if (secs > 0) return { ok: true, duration: secs };
        }
      } catch {}
    }

    return { ok: false };
  });

  // ── Auto-updater ──────────────────────────────────────────────────────────
  ipcMain.handle("detect-update-format", () => {
    if (process.platform === "win32") return "exe";
    if (process.platform === "darwin")
      return process.arch === "arm64" ? "dmg_arm64" : "dmg";
    if (process.platform === "linux") {
      if (process.env.APPIMAGE) return "appimage";
      const isArch =
        spawnSync("which", ["pacman"], { encoding: "utf8" }).status === 0;
      return isArch ? "pacman" : "deb";
    }
    return null;
  });

  ipcMain.handle(
    "download-and-install-update",
    async (_, { url, format, targetVersion }) => {
    try {
      if (
        format === "exe" &&
        process.platform === "win32" &&
        !app.isPackaged
      ) {
        return {
          ok: false,
          error:
            "In-app updates only work in the installed portable app (Encryptic Movies.exe from Releases), not in npm start dev mode. Download the latest .exe from GitHub.",
        };
      }

      _updateAbortController = new AbortController();
      const { signal } = _updateAbortController;

      const ext =
        format === "exe" ? ".exe"
        : format === "deb" ? ".deb"
        : format === "pacman" ? ".pacman"
        : format === "dmg" || format === "dmg_arm64" ? ".dmg"
        : ".AppImage";
      const destPath = path.join(os.tmpdir(), `mov-update${ext}`);

      await new Promise((resolve, reject) => {
        if (signal.aborted) return reject(new Error("Cancelled"));

        const doRequest = (reqUrl) => {
          const lib = reqUrl.startsWith("https") ? https : http;
          const req = lib.get(
            reqUrl,
            {
              headers: {
                "User-Agent": "Mov-AutoUpdater",
                Accept: "application/octet-stream",
              },
            },
            (res) => {
              if (
                res.statusCode >= 300 &&
                res.statusCode < 400 &&
                res.headers.location
              ) {
                res.resume();
                doRequest(
                  res.headers.location.startsWith("http")
                    ? res.headers.location
                    : new URL(res.headers.location, reqUrl).toString(),
                );
                return;
              }
              if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error(`HTTP ${res.statusCode}`));
              }

              const total = parseInt(res.headers["content-length"] || "0", 10);
              let downloaded = 0;
              const file = fs.createWriteStream(destPath);

              file.on("error", reject);
              file.on("finish", resolve);

              res.on("data", (chunk) => {
                if (signal.aborted) {
                  req.destroy();
                  file.destroy();
                  reject(new Error("Cancelled"));
                  return;
                }
                downloaded += chunk.length;
                if (!file.write(chunk)) {
                  res.pause();
                  file.once("drain", () => res.resume());
                }
                const percent =
                  total > 0 ? Math.round((downloaded / total) * 100) : 0;
                const mb = (downloaded / 1e6).toFixed(1);
                const totalMb =
                  total > 0 ? `/ ${(total / 1e6).toFixed(1)} MB` : "";
                const mw = getMainWindow();
                if (mw && !mw.isDestroyed()) {
                  mw.webContents.send("update-progress", {
                    percent,
                    label: `Downloading… ${mb} MB ${totalMb}`,
                  });
                }
              });
              res.on("end", () => file.end());
              res.on("error", reject);
              req.on("error", reject);
            },
          );
          req.on("error", reject);
        };

        doRequest(url);
      });

      if (signal.aborted) return { ok: false, error: "Cancelled" };

      if (format === "appimage") {
        fs.chmodSync(destPath, 0o755);
        const currentAppImage = process.env.APPIMAGE;
        if (currentAppImage) {
          const scriptPath = path.join(os.tmpdir(), "mov-update.sh");
          const pid = process.pid;
          const target = currentAppImage;
          const scriptContent =
            [
              "#!/bin/sh",
              `while kill -0 ${pid} 2>/dev/null; do sleep 0.2; done`,
              `mv -f "${destPath}" "${target}"`,
              `chmod +x "${target}"`,
              `"${target}" &`,
            ].join("\n") + "\n";
          fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });
          spawn("sh", [scriptPath], {
            detached: true,
            stdio: "ignore",
          }).unref();
        } else {
          spawn(destPath, [], { detached: true, stdio: "ignore" }).unref();
        }
        writeSecretMigration({ targetVersion });
        app.exit(0);
      } else if (format === "pacman") {
        fs.chmodSync(destPath, 0o644);
        // notify renderer
        const mwPac = getMainWindow();
        if (mwPac && !mwPac.isDestroyed()) {
          mwPac.webContents.send("update-progress", {
            percent: 100,
            label: "Installing…",
          });
        }
        const pacmanLaunchers = [
          { bin: "pkexec", args: ["pacman", "-U", "--noconfirm", destPath] },
          { bin: "pamac-installer", args: [destPath] },
        ];
        let launched = false;
        for (const { bin, args } of pacmanLaunchers) {
          try {
            const which = spawnSync("which", [bin], { encoding: "utf8" });
            if (which.status !== 0) continue;
            // spawnSync, to wait for pacman to finish before relaunching
            const result = spawnSync(bin, args, { stdio: "inherit" });
            if (result.status === 0) {
              launched = true;
              break;
            }
          } catch {
            continue;
          }
        }
        if (launched) {
          writeSecretMigration({ targetVersion });
          app.relaunch();
          app.exit(0);
        } else {
          shell.openPath(destPath);
        }
      } else if (format === "deb") {
        fs.chmodSync(destPath, 0o644);
        const debLaunchers = [
          { bin: "pkexec", args: ["dpkg", "-i", destPath] },
          { bin: "pkexec", args: ["apt", "install", "-y", destPath] },
          { bin: "gdebi-gtk", args: [destPath] },
          { bin: "pkexec", args: ["gdebi", "-n", destPath] },
        ];
        let launched = false;
        for (const { bin, args } of debLaunchers) {
          try {
            const which = spawnSync(
              process.platform === "win32" ? "where" : "which",
              [bin],
              { encoding: "utf8" },
            );
            if (which.status !== 0) continue;
            spawn(bin, args, { detached: true, stdio: "ignore" }).unref();
            launched = true;
            break;
          } catch {
            continue;
          }
        }
        if (!launched) shell.openPath(destPath);
      } else if (format === "exe") {
        if (app.isPackaged && process.platform === "win32") {
          const sendProgress = (data) => {
            const mw = getMainWindow();
            if (mw && !mw.isDestroyed()) {
              mw.webContents.send("update-progress", data);
            }
          };
          await applyWindowsPortableUpdate({
            downloadedExe: destPath,
            targetVersion,
            writeSecretMigration: () =>
              writeSecretMigration({ targetVersion }),
            onProgress: (p) =>
              sendProgress({
                percent: p.percent ?? 100,
                label: p.label ?? "Installing…",
              }),
          });
          return { ok: true };
        }
        writeSecretMigration({ targetVersion });
        spawn(destPath, [], { detached: true, stdio: "ignore" }).unref();
        app.exit(0);
      } else if (format === "dmg" || format === "dmg_arm64") {
        // Mount the DMG and open it
        spawn("hdiutil", ["attach", destPath], {
          detached: true,
          stdio: "ignore",
        }).unref();
      }

      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    } finally {
      _updateAbortController = null;
    }
  },
  );

  ipcMain.handle("cancel-update", () => {
    _updateAbortController?.abort();
  });

  // ── Query video progress across all webview frames ────────────────────────
  // executeJavaScript on a webview only reaches the top frame.
  // VidSrc / 2embed nest the player inside cross-origin iframes, so we iterate
  // all frames from the main process where same-origin restrictions don't apply.
  const walkAllFrames = (wc) => {
    const allFrames = [];
    const collect = (frame) => {
      allFrames.push(frame);
      for (const child of frame.frames || []) collect(child);
    };
    collect(wc.mainFrame);
    return allFrames;
  };

  ipcMain.handle("query-embed-health", async (_, webContentsId) => {
    try {
      const { webContents } = require("electron");
      const wc = webContents.fromId(webContentsId);
      if (!wc || wc.isDestroyed()) return null;

      const JS = `
        (() => {
          const text = (document.body && document.body.innerText || '')
            .toLowerCase()
            .slice(0, 6000);
          const unavailable = /not available|unavailable|no sources|not found|dead link|could not find|embed.*disabled|video unavailable/.test(
            text,
          );
          const v = document.querySelector('video');
          if (!v) return { hasVideo: false, stuck: true, unavailable };
          const dur = v.duration;
          const t = v.currentTime || 0;
          const badDur = !dur || !Number.isFinite(dur) || dur <= 0;
          return {
            hasVideo: true,
            unavailable,
            currentTime: t,
            duration: badDur ? 0 : dur,
            paused: !!v.paused,
            readyState: v.readyState || 0,
            stuck: badDur && t < 0.25 && (v.readyState || 0) < 3,
          };
        })()
      `;

      let sawVideo = false;
      let best = null;
      for (const frame of walkAllFrames(wc)) {
        try {
          const result = await frame.executeJavaScript(JS);
          if (!result) continue;
          if (result.hasVideo) {
            sawVideo = true;
            if (
              !result.unavailable &&
              !result.stuck &&
              result.duration > 0 &&
              result.currentTime > 0.25
            ) {
              return result;
            }
            if (!best || (result.readyState || 0) > (best.readyState || 0)) {
              best = result;
            }
          } else if (!best) {
            best = result;
          }
        } catch {
          /* ignore */
        }
      }
      if (best) return best;
      return sawVideo ? null : { hasVideo: false, stuck: true };
    } catch {
      return null;
    }
  });

  ipcMain.handle("query-video-progress", async (_, webContentsId) => {
    try {
      const { webContents } = require("electron");
      const wc = webContents.fromId(webContentsId);
      if (!wc || wc.isDestroyed()) return null;

      const allFrames = walkAllFrames(wc);

      const JS = `
        (() => {
          const v = document.querySelector('video');
          if (!v || !v.duration || v.duration === Infinity) return null;
          if (!v._seekTracked) {
            v._seekTracked = true;
            v.addEventListener('seeked', () => {
              v._lastUserSeek = Date.now();
              v._lastUserSeekTo = v.currentTime;
            });
          }
          return {
            currentTime: v.currentTime,
            duration: v.duration,
            paused: !!v.paused,
            recentUserSeek: v._lastUserSeek ? (Date.now() - v._lastUserSeek < 6000) : false,
            lastUserSeekTo: v._lastUserSeekTo ?? null,
          };
        })()
      `;

      for (const frame of allFrames) {
        try {
          const result = await frame.executeJavaScript(JS);
          if (result && result.duration > 0) return result;
        } catch {}
      }
      return null;
    } catch {
      return null;
    }
  });
}

module.exports = { register };
