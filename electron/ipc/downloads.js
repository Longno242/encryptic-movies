/**
 * Download queue, binary spawn, progress IPC, and filesystem helpers.
 */

const { app, ipcMain, shell, dialog, session } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");
const os = require("os");
const { validateExternalUrl } = require("../security/allowlist");
const {
  validateMediaFilePath,
  validateMediaPath,
  validateReadableDirectory,
} = require("../security/paths");
const {
  ensureDefaultMoviesDownloadPath,
  resolveDownloadPath,
} = require("../utils/defaultDownloadPath");
const { runEncrypticDownload } = require("../downloader/encrypticDownloader");

// ── Download store ────────────────────────────────────────────────────────────

let downloads = [];
let _downloadsFile = null;
const downloadsFile = () =>
  _downloadsFile ||
  (_downloadsFile = path.join(app.getPath("userData"), "downloads.json"));

// Track running child processes by download id
const activeProcs = new Map();

let _getMainWindow = () => null;

function sendProgress(update) {
  const mw = _getMainWindow();
  if (mw && !mw.isDestroyed()) {
    mw.webContents.send("download-progress", update);
  }
}

function loadDownloads() {
  try {
    const raw = fs.readFileSync(downloadsFile(), "utf8");
    const parsed = JSON.parse(raw);
    // Deduplicate: keep only the newest entry per (tmdbId, mediaType, season, episode)
    const seen = new Map();
    const sorted = [...parsed].sort(
      (a, b) =>
        (b.completedAt || b.startedAt || 0) -
        (a.completedAt || a.startedAt || 0),
    );
    for (const d of sorted) {
      const key =
        d.tmdbId && d.mediaType
          ? `${d.tmdbId}|${d.mediaType}|${d.season ?? ""}|${d.episode ?? ""}`
          : d.id;
      if (!seen.has(key)) seen.set(key, d);
    }
    downloads = [...seen.values()];
  } catch {
    downloads = [];
  }
}

function saveDownloads() {
  try {
    const toSave = downloads.filter(
      (d) =>
        d.status === "completed" ||
        d.status === "local" ||
        d.status === "error",
    );
    fs.writeFileSync(downloadsFile(), JSON.stringify(toSave, null, 2));
  } catch {}
}

function downloadLogsDir() {
  const dir = path.join(app.getPath("userData"), "download-logs");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanupTempFiles(downloadPath) {
  if (!downloadPath) return;
  const TEMP_PATTERNS = [
    /\.part$/,
    /\.part\.\d+$/,
    /\.part\.tmp$/,
    /\.tmp$/,
    /\.ytdl$/,
    /\.part-Frag\d+$/,
    /^seg_\d+\.ts$/i,
    /^_encryptic_concat_/i,
  ];
  try {
    const entries = fs.readdirSync(downloadPath);
    for (const entry of entries) {
      const full = path.join(downloadPath, entry);
      if (
        entry.startsWith(".encryptic-") ||
        entry.startsWith("_encryptic_")
      ) {
        try {
          fs.rmSync(full, { recursive: true, force: true });
        } catch {}
        continue;
      }
      if (TEMP_PATTERNS.some((p) => p.test(entry))) {
        try {
          const st = fs.statSync(full);
          if (st.isDirectory()) fs.rmSync(full, { recursive: true, force: true });
          else fs.unlinkSync(full);
        } catch {}
      }
    }
  } catch {}
}

function killAllDownloads() {
  for (const [id, proc] of activeProcs.entries()) {
    try {
      if (typeof proc.kill === "function") {
        proc.kill(proc.stdin ? "SIGKILL" : undefined);
      }
    } catch {}
    const idx = downloads.findIndex((d) => d.id === id);
    if (idx !== -1) {
      downloads[idx].status = "error";
      downloads[idx].lastMessage = "Cancelled on exit";
    }
    activeProcs.delete(id);
  }
  const folders = new Set(downloads.map((d) => d.downloadPath).filter(Boolean));
  for (const folder of folders) cleanupTempFiles(folder);
  saveDownloads();
}

// ── Subtitle file downloader (used during run-download completion) ─────────────

function downloadSubtitleFile(url, destPath) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol === "file:") {
        try {
          fs.copyFileSync(decodeURIComponent(parsedUrl.pathname), destPath);
          resolve(true);
        } catch {
          resolve(false);
        }
        return;
      }
      const lib = parsedUrl.protocol === "https:" ? https : http;
      const req = lib.get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
            Referer: parsedUrl.origin,
            Accept: "*/*",
          },
        },
        (res) => {
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            const loc = res.headers.location.startsWith("http")
              ? res.headers.location
              : parsedUrl.origin + res.headers.location;
            downloadSubtitleFile(loc, destPath).then(resolve);
            return;
          }
          if (res.statusCode !== 200) {
            res.resume();
            resolve(false);
            return;
          }
          const file = fs.createWriteStream(destPath);
          res.pipe(file);
          file.on("finish", () => {
            file.close();
            resolve(true);
          });
          file.on("error", () => {
            try {
              fs.unlinkSync(destPath);
            } catch {}
            resolve(false);
          });
          res.on("error", () => resolve(false));
        },
      );
      req.on("error", () => resolve(false));
      req.setTimeout(20000, () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

// ── IPC registration ──────────────────────────────────────────────────────────

function register(getMainWindow) {
  _getMainWindow = getMainWindow;

  // ── built-in Encryptic downloader (no external binary) ───────────────────
  ipcMain.handle("check-downloader", () => ({
    exists: true,
    builtIn: true,
    name: "Encryptic Downloader",
  }));

  // ── start download ────────────────────────────────────────────────────────
  ipcMain.handle(
    "run-download",
    (
      _,
      {
        binaryPath,
        m3u8Url,
        streamReferer,
        name,
        downloadPath,
        mediaId,
        mediaType,
        season,
        episode,
        posterPath,
        tmdbId,
        subtitles,
      },
    ) => {
      try {
        if (!m3u8Url) {
          return { ok: false, error: "no_stream_url" };
        }

        const resolvedDownloadPath = resolveDownloadPath(downloadPath);
        const dirCheck = validateReadableDirectory(resolvedDownloadPath);
        if (!dirCheck.ok) {
          return {
            ok: false,
            error: dirCheck.error || "invalid_download_folder",
          };
        }
        const saveDir = dirCheck.path;

        const id = crypto.randomUUID();
        const logPath = path.join(downloadLogsDir(), `${id}.log`);

        const entry = {
          id,
          name,
          m3u8Url,
          downloadPath: saveDir,
          filePath: null,
          status: "downloading",
          progress: 0,
          speed: "",
          size: "",
          totalFragments: 0,
          completedFragments: 0,
          lastMessage: "Starting…",
          startedAt: Date.now(),
          completedAt: null,
          mediaId: mediaId || null,
          mediaType: mediaType || null,
          season: season || null,
          episode: episode || null,
          posterPath: posterPath || null,
          tmdbId: tmdbId || mediaId || null,
          subtitles: Array.isArray(subtitles) ? subtitles : [],
          subtitlePaths: [],
          logPath,
        };

        // Create log file with header
        try {
          fs.writeFileSync(
            logPath,
            `Mov Download Log\nName: ${name}\nURL: ${m3u8Url}\nStarted: ${new Date().toISOString()}\n${"─".repeat(60)}\n`,
            "utf8",
          );
        } catch {}

        downloads.push(entry);

        // Remove stale entries for the same media
        const isSameMedia = (d) =>
          d.id !== id &&
          d.tmdbId &&
          d.tmdbId === entry.tmdbId &&
          d.mediaType === entry.mediaType &&
          String(d.season ?? "") === String(entry.season ?? "") &&
          String(d.episode ?? "") === String(entry.episode ?? "");
        downloads = downloads.filter((d) => !isSameMedia(d));

        let cancelled = false;
        activeProcs.set(id, {
          kill() {
            cancelled = true;
          },
        });

        const handleLine = (line) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          const idx = downloads.findIndex((d) => d.id === id);
          if (idx === -1) return;

          const update = {};

          // (frag N/total), source of truth for HLS progress
          const fragMatch = trimmed.match(/\(frag\s+(\d+)\/(\d+)\)/);
          if (fragMatch) {
            const currentFrag = parseInt(fragMatch[1]);
            const total = parseInt(fragMatch[2]);
            update.completedFragments = currentFrag;
            update.totalFragments = total;
            update.progress = Math.min(
              99,
              Math.round((currentFrag / total) * 100),
            );
            update.lastMessage = `Fragment ${currentFrag} / ${total}`;
          }

          // [download] X% of Y (direct mp4, no fragments)
          if (!fragMatch && !downloads[idx].totalFragments) {
            const dlPctMatch = trimmed.match(
              /^\[download\]\s+([\d.]+)%\s+of\s+~?\s*([\d.]+\s*(?:[KMGT]i?B|B))/i,
            );
            if (dlPctMatch) {
              const pct = parseFloat(dlPctMatch[1]);
              update.progress = Math.min(99, Math.round(pct));
              update.size = dlPctMatch[2].trim();
              const spMatch = trimmed.match(
                /\bat\s+([\d.]+\s*(?:[KMGT]i?B|B)\/s)/i,
              );
              if (spMatch) update.speed = spMatch[1].trim();
              update.lastMessage = `${Math.round(pct)}% of ${update.size}`;
            }
          }

          // ffmpeg Duration line
          const durationMatch = trimmed.match(
            /Duration:\s*(\d+):(\d+):([\d.]+)/,
          );
          if (durationMatch) {
            const totalSecs =
              parseInt(durationMatch[1]) * 3600 +
              parseInt(durationMatch[2]) * 60 +
              parseFloat(durationMatch[3]);
            if (totalSecs > 0) downloads[idx]._ffmpegTotalSecs = totalSecs;
            return;
          }

          // ffmpeg progress: size=… time=…
          const ffmpegMatch = trimmed.match(
            /size=\s*([\d.]+\s*\w+)\s+time=(\d+):(\d+):([\d.]+)/i,
          );
          if (ffmpegMatch) {
            const elapsedSecs =
              parseInt(ffmpegMatch[2]) * 3600 +
              parseInt(ffmpegMatch[3]) * 60 +
              parseFloat(ffmpegMatch[4]);
            const totalSecs = downloads[idx]._ffmpegTotalSecs || 0;
            if (totalSecs > 0) {
              update.progress = Math.min(
                99,
                Math.round((elapsedSecs / totalSecs) * 100),
              );
            }
            const rawSize = ffmpegMatch[1].trim();
            const kbMatch = rawSize.match(/([\d.]+)\s*kB/i);
            if (kbMatch) {
              const mb = parseFloat(kbMatch[1]) / 1024;
              update.size =
                mb >= 1024
                  ? `${(mb / 1024).toFixed(1)} GiB`
                  : `${mb.toFixed(1)} MiB`;
            } else {
              update.size = rawSize;
            }
            const speedXMatch = trimmed.match(/speed=\s*([\d.]+)x/i);
            if (speedXMatch) update.speed = `${speedXMatch[1]}x`;
            update.lastMessage = `Processing… ${update.size}${update.speed ? ` at ${update.speed}` : ""}`;
          }

          // Retry / timeout
          const retryMatch =
            trimmed.match(/Retrying\s+\(\d+\/\d+\)/i) ||
            trimmed.match(/Got error:.*timed?\s*out/i) ||
            trimmed.match(/Read timed? out/i);
          if (retryMatch) {
            update.speed = "0 MB/s";
            const retryNumMatch = trimmed.match(/Retrying\s+\((\d+)\/(\d+)\)/i);
            update.lastMessage = retryNumMatch
              ? `Retrying… (${retryNumMatch[1]}/${retryNumMatch[2]})`
              : "Retrying…";
            downloads[idx] = { ...downloads[idx], ...update };
            sendProgress({ id, ...update, status: downloads[idx].status });
            return;
          }

          const speedMatch = trimmed.match(
            /\bat\s+([\d.]+\s*(?:[KMGT]i?B|B)\/s)/i,
          );
          if (speedMatch) update.speed = speedMatch[1].trim();

          const sizeMatch = trimmed.match(
            /\bof\s+~?\s*([\d.]+\s*(?:[KMGT]i?B|B))\b/i,
          );
          if (sizeMatch) update.size = sizeMatch[1].trim();

          // [hlsnative] Total fragments: N
          const fragTotalMatch = trimmed.match(/Total fragments:\s+(\d+)/);
          if (fragTotalMatch) {
            const total = parseInt(fragTotalMatch[1]);
            const u = {
              totalFragments: total,
              completedFragments: 0,
              lastMessage: `HLS: ${total} fragments`,
            };
            downloads[idx] = { ...downloads[idx], ...u };
            sendProgress({ id, ...u, status: downloads[idx].status });
            return;
          }

          // [download] Destination: /path/file
          const destMatch = trimmed.match(/^\[download\] Destination:\s+(.+)/);
          if (destMatch) {
            const u = {
              filePath: destMatch[1].trim(),
              lastMessage: "Downloading…",
            };
            downloads[idx] = { ...downloads[idx], ...u };
            sendProgress({ id, ...u, status: downloads[idx].status });
            return;
          }

          // [Merger] output path
          const mergeMatch = trimmed.match(
            /\[Merger\] Merging formats into "(.+)"/,
          );
          if (mergeMatch) {
            const u = {
              filePath: mergeMatch[1].trim(),
              lastMessage: "Merging…",
              progress: 99,
            };
            downloads[idx] = { ...downloads[idx], ...u };
            sendProgress({ id, ...u, status: downloads[idx].status });
            return;
          }

          const SUPPRESS_PATTERNS = [
            /Sleeping\s+[\d.]+\s+seconds/i,
            /^\[yt-dlp\s+DEBUG\]/i,
            /^\[debug\]/i,
          ];
          if (Object.keys(update).length === 0) {
            const suppress =
              downloads[idx].lastMessage.startsWith("Fragment") ||
              downloads[idx].lastMessage.startsWith("Retrying") ||
              SUPPRESS_PATTERNS.some((p) => p.test(trimmed));
            if (!suppress) update.lastMessage = trimmed;
          }

          if (Object.keys(update).length > 0) {
            downloads[idx] = { ...downloads[idx], ...update };
            sendProgress({ id, ...update, status: downloads[idx].status });
          }
        };

        const appendLog = (line) => {
          try {
            fs.appendFileSync(logPath, line + "\n", "utf8");
          } catch {}
        };

        const attachSubtitles = (filePath) => {
          const idx = downloads.findIndex((d) => d.id === id);
          if (idx === -1 || !filePath || !downloads[idx].subtitles?.length)
            return;
          const videoBase = filePath.replace(/\.[^.]+$/, "");
          const langCounter = {};
          const KNOWN_SUB_EXTS = [
            ".vtt",
            ".srt",
            ".ass",
            ".ssa",
            ".sub",
            ".idx",
          ];
          const subPromises = downloads[idx].subtitles.map(
            ({ url, lang, name: subName, file_id }) => {
              const urlClean = url.split("?")[0].split("#")[0];
              const urlExt = path
                .extname(urlClean)
                .toLowerCase()
                .replace(/[^a-z0-9.]/g, "");
              const nameExt = subName
                ? path
                    .extname(subName)
                    .toLowerCase()
                    .replace(/[^a-z0-9.]/g, "")
                : "";
              const subExt = KNOWN_SUB_EXTS.includes(urlExt)
                ? urlExt
                : KNOWN_SUB_EXTS.includes(nameExt)
                  ? nameExt
                  : ".srt";
              const safeLang = (lang || "unknown").replace(/[^a-z0-9_-]/gi, "");
              const lIdx = langCounter[safeLang] ?? 0;
              langCounter[safeLang] = lIdx + 1;
              const suffix = lIdx > 0 ? `.${lIdx}` : "";
              const subDestPath = `${videoBase}.${safeLang}${suffix}${subExt}`;
              return downloadSubtitleFile(url, subDestPath).then((ok) =>
                ok
                  ? {
                      lang: lang || "unknown",
                      path: subDestPath,
                      file_id: file_id || null,
                    }
                  : null,
              );
            },
          );
          Promise.all(subPromises).then((results) => {
            const i2 = downloads.findIndex((d) => d.id === id);
            if (i2 !== -1) {
              downloads[i2].subtitlePaths = results.filter(Boolean);
              saveDownloads();
              sendProgress({
                id,
                subtitlePaths: downloads[i2].subtitlePaths,
              });
            }
          });
        };

        const finishDownload = (success, outputPath, errorMessage) => {
          activeProcs.delete(id);
          const idx = downloads.findIndex((d) => d.id === id);
          if (idx === -1) return;

          if (success) {
            downloads[idx].status = "completed";
            downloads[idx].progress = 100;
            downloads[idx].completedAt = Date.now();
            if (outputPath) downloads[idx].filePath = outputPath;
            downloads[idx].logPath = null;
            try {
              fs.unlinkSync(logPath);
            } catch {}

            if (saveDir) cleanupTempFiles(saveDir);

            if (downloads[idx].filePath) {
              try {
                const ext = path.extname(downloads[idx].filePath) || ".mp4";
                const safeName = name
                  .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
                  .replace(/\s+/g, " ")
                  .trim();
                if (safeName) {
                  const newPath = path.join(saveDir, safeName + ext);
                  if (newPath !== downloads[idx].filePath) {
                    fs.renameSync(downloads[idx].filePath, newPath);
                    downloads[idx].filePath = newPath;
                  }
                }
              } catch {}

              try {
                const bytes = fs.statSync(downloads[idx].filePath).size;
                downloads[idx].size =
                  bytes > 1e9
                    ? (bytes / 1e9).toFixed(2) + " GB"
                    : bytes > 1e6
                      ? (bytes / 1e6).toFixed(1) + " MB"
                      : bytes > 1e3
                        ? (bytes / 1e3).toFixed(1) + " KB"
                        : bytes + " B";
              } catch {}

              attachSubtitles(downloads[idx].filePath);
            }
          } else {
            downloads[idx].status = "error";
            downloads[idx].completedAt = Date.now();
            downloads[idx].lastMessage =
              errorMessage || downloads[idx].lastMessage || "Download failed";
            try {
              fs.appendFileSync(
                logPath,
                `${"─".repeat(60)}\nFailed: ${downloads[idx].lastMessage}\nFinished: ${new Date().toISOString()}\n`,
                "utf8",
              );
            } catch {}
          }

          sendProgress({
            id,
            name,
            status: downloads[idx].status,
            progress: downloads[idx].progress,
            completedAt: downloads[idx].completedAt,
            filePath: downloads[idx].filePath,
            size: downloads[idx].size,
            completedFragments: downloads[idx].completedFragments,
            totalFragments: downloads[idx].totalFragments,
            lastMessage: downloads[idx].lastMessage,
            logPath: downloads[idx].logPath,
          });
          saveDownloads();
        };

        appendLog("Encryptic Downloader — starting…");
        handleLine("Encryptic: built-in downloader ready");

        runEncrypticDownload({
          m3u8Url,
          outputDir: saveDir,
          title: name,
          jobId: id,
          referer: streamReferer || "",
          onLine: (line) => {
            appendLog(line);
            handleLine(line);
          },
          isCancelled: () => cancelled,
        })
          .then((outputPath) => finishDownload(true, outputPath))
          .catch((err) =>
            finishDownload(
              false,
              null,
              err.message === "Cancelled"
                ? "Cancelled"
                : err.message || "Download failed",
            ),
          );

        return { ok: true, id, downloadPath: saveDir };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
  );

  ipcMain.handle("get-downloads", () => downloads);

  ipcMain.handle("delete-download", (_, { id, filePath }) => {
    try {
      const dlEntry = downloads.find((d) => d.id === id);
      if (activeProcs.has(id)) {
        try {
          const active = activeProcs.get(id);
          if (typeof active?.kill === "function") active.kill();
        } catch {}
        activeProcs.delete(id);
      }
      if (filePath) {
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch {}
      }
      for (const sp of dlEntry?.subtitlePaths || []) {
        try {
          if (sp?.path && fs.existsSync(sp.path)) fs.unlinkSync(sp.path);
        } catch {}
      }
      const dlPath = dlEntry?.downloadPath;
      if (dlPath) cleanupTempFiles(dlPath);
      downloads = downloads.filter((d) => d.id !== id);
      saveDownloads();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle("delete-all-downloads", async () => {
    try {
      let deleted = 0,
        errors = 0;
      for (const dl of downloads) {
        if (dl.filePath) {
          try {
            if (fs.existsSync(dl.filePath)) {
              fs.unlinkSync(dl.filePath);
              deleted++;
            }
          } catch {
            errors++;
          }
        }
        for (const sp of dl.subtitlePaths || []) {
          try {
            if (sp?.path && fs.existsSync(sp.path)) fs.unlinkSync(sp.path);
          } catch {}
        }
      }
      downloads = [];
      saveDownloads();
      return { ok: true, deleted, errors };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle("get-downloads-size", async () => {
    let bytes = 0;
    await Promise.all(
      downloads.map(async (dl) => {
        if (!dl.filePath) return;
        try {
          const stat = await fs.promises.stat(dl.filePath);
          if (stat.isFile()) bytes += stat.size;
        } catch {}
      }),
    );
    return { bytes };
  });

  ipcMain.handle("show-in-folder", (_, filePath) => {
    const check = validateMediaPath(filePath, downloads);
    if (!check.ok) return { ok: false, error: check.error };
    if (check.isDirectory) shell.openPath(check.path);
    else shell.showItemInFolder(check.path);
    return { ok: true };
  });

  ipcMain.handle("file-exists", (_, filePath) => {
    const check = validateMediaFilePath(filePath, downloads);
    return check.ok;
  });

  ipcMain.handle("get-default-download-path", () => {
    try {
      return { ok: true, path: ensureDefaultMoviesDownloadPath() };
    } catch (e) {
      return { ok: false, error: e.message || "mkdir_failed" };
    }
  });

  ipcMain.handle("pick-folder", async () => {
    const mw = getMainWindow();
    if (!mw) return null;
    const result = await dialog.showOpenDialog(mw, {
      properties: ["openDirectory"],
      title: "Select Folder",
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("open-external", (_, url) => {
    const check = validateExternalUrl(url);
    if (!check.allowed) return { ok: false, error: check.reason || "blocked" };
    shell.openExternal(url);
    return { ok: true };
  });

  ipcMain.handle("open-path", (_, filePath) => {
    const check = validateMediaPath(filePath, downloads);
    if (!check.ok) return { ok: false, error: check.error };
    try {
      const lower = check.path.toLowerCase();
      if (lower.endsWith(".log") || lower.endsWith(".txt")) {
        const err = shell.openPath(check.path);
        if (err) return { ok: false, error: err };
      } else if (check.isDirectory) {
        shell.openPath(check.path);
      } else {
        shell.showItemInFolder(check.path);
      }
    } catch (e) {
      try {
        shell.openPath(check.path);
      } catch (e2) {
        return { ok: false, error: e2.message || e.message };
      }
    }
    return { ok: true };
  });

  ipcMain.handle("open-download-log", async (_, { id, logPath }) => {
    const entry = downloads.find((d) => d.id === id);
    const target = logPath || entry?.logPath;
    if (!target) return { ok: false, error: "no_log" };
    const check = validateMediaPath(target, downloads);
    const openResolved = async (p) => {
      const err = await shell.openPath(p);
      return err ? { ok: false, error: String(err) } : { ok: true };
    };
    if (!check.ok) {
      try {
        if (fs.existsSync(target)) {
          return openResolved(path.resolve(target));
        }
      } catch (e) {
        return { ok: false, error: e.message };
      }
      return { ok: false, error: check.error };
    }
    return openResolved(check.path);
  });
  ipcMain.handle("get-install-path", () => {
    if (process.env.APPIMAGE) {
      return path.dirname(process.env.APPIMAGE);
    }

    if (app.isPackaged) {
      return path.dirname(process.execPath);
    }

    return app.getAppPath();
  });

  ipcMain.handle("scan-directory", (_, folderPath) => {
    try {
      const check = validateReadableDirectory(folderPath);
      if (!check.ok) return [];
      const folderPathResolved = check.path;
      const VIDEO_EXTS = [
        ".mp4",
        ".mkv",
        ".webm",
        ".avi",
        ".mov",
        ".m4v",
        ".ts",
      ];
      const results = [];
      const scanDir = (dir, depth = 0) => {
        if (depth > 3) return;
        let entries;
        try {
          entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
          return;
        }
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath, depth + 1);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (VIDEO_EXTS.includes(ext)) {
              let size = "";
              try {
                const bytes = fs.statSync(fullPath).size;
                size =
                  bytes > 1e9
                    ? (bytes / 1e9).toFixed(2) + " GB"
                    : bytes > 1e6
                      ? (bytes / 1e6).toFixed(1) + " MB"
                      : bytes > 1e3
                        ? (bytes / 1e3).toFixed(1) + " KB"
                        : bytes + " B";
              } catch {}
              results.push({
                filePath: fullPath,
                name: path.basename(entry.name, ext),
                size,
                ext,
              });
            }
          }
        }
      };
      scanDir(folderPathResolved);
      return results;
    } catch {
      return [];
    }
  });

  ipcMain.handle("clear-app-cache", async () => {
    try {
      const sessions = [
        session.defaultSession,
        session.fromPartition("persist:player"),
        session.fromPartition("persist:trailer"),
      ];
      await Promise.all(sessions.map((s) => s.clearCache()));
      await Promise.all(
        sessions.map((s) =>
          s.clearStorageData({
            storages: ["shadercache", "serviceworkers", "cachestorage"],
          }),
        ),
      );
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle("clear-watch-data", async () => {
    try {
      const vs = session.fromPartition("persist:player");
      await vs.clearStorageData();
      await vs.clearCache();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle("get-cache-size", async () => {
    try {
      const sessions = [
        session.defaultSession,
        session.fromPartition("persist:player"),
        session.fromPartition("persist:trailer"),
      ];
      const sizes = await Promise.all(sessions.map((s) => s.getCacheSize()));
      return { bytes: sizes.reduce((a, b) => a + b, 0) };
    } catch {
      return { bytes: 0 };
    }
  });

  ipcMain.handle("reset-app", async () => {
    try {
      const sessions = [
        session.defaultSession,
        session.fromPartition("persist:player"),
        session.fromPartition("persist:trailer"),
      ];
      await Promise.all(sessions.map((s) => s.clearStorageData()));
      await Promise.all(sessions.map((s) => s.clearCache()));
      const dlFile = downloadsFile();
      if (fs.existsSync(dlFile)) fs.unlinkSync(dlFile);
      downloads = [];
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
}

module.exports = {
  register,
  loadDownloads,
  saveDownloads,
  killAllDownloads,
  getDownloads: () => downloads,
};
