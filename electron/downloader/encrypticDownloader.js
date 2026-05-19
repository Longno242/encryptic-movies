/**
 * Encryptic Movies — built-in stream downloader (HLS m3u8 + direct MP4).
 * No external vid-dl binary required.
 */

const { spawn } = require("child_process");
const { net, session } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const http = require("http");
const https = require("https");
const crypto = require("crypto");
const { URL } = require("url");

const CONCURRENCY = 6;
const MAX_RETRIES = 3;
const PLAYER_PARTITION = "persist:player";
const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function emit(onLine, line) {
  if (onLine && line) onLine(String(line));
}

function resolveUrl(base, relative) {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

function getOrigin(url) {
  try {
    return new URL(url).origin + "/";
  } catch {
    return "";
  }
}

function buildStreamHeaders(m3u8Url, referer) {
  const ref = (referer || "").trim() || getOrigin(m3u8Url);
  const hdrs = {
    "User-Agent": CHROME_UA,
    Accept: "*/*",
    Referer: ref,
  };
  try {
    if (ref.startsWith("http")) hdrs.Origin = new URL(ref).origin;
  } catch {
    /* ignore */
  }
  return hdrs;
}

function playerSession() {
  return session.fromPartition(PLAYER_PARTITION);
}

function requestBufferElectron(url, { headers = {}, timeoutMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn, val) => {
      if (settled) return;
      settled = true;
      fn(val);
    };
    const timer = setTimeout(() => {
      try {
        request.abort();
      } catch {
        /* ignore */
      }
      done(reject, new Error("Request timed out"));
    }, timeoutMs);

    const request = net.request({
      method: "GET",
      url,
      session: playerSession(),
      redirect: "follow",
    });
    for (const [k, v] of Object.entries(headers)) {
      if (v) request.setHeader(k, String(v));
    }

    request.on("response", (response) => {
      const code = response.statusCode || 0;
      if (code >= 300 && code < 400) {
        const loc = response.headers.location?.[0] || response.headers.Location?.[0];
        if (loc) {
          clearTimeout(timer);
          requestBufferElectron(resolveUrl(url, loc), { headers, timeoutMs })
            .then((b) => done(resolve, b))
            .catch((e) => done(reject, e));
          return;
        }
      }
      if (code !== 200) {
        clearTimeout(timer);
        done(
          reject,
          new Error(`HTTP ${code} — stream host blocked the download (try playing a bit longer first)`),
        );
        return;
      }
      const chunks = [];
      response.on("data", (c) => chunks.push(c));
      response.on("end", () => {
        clearTimeout(timer);
        done(resolve, Buffer.concat(chunks));
      });
      response.on("error", (e) => {
        clearTimeout(timer);
        done(reject, e);
      });
    });
    request.on("error", (e) => {
      clearTimeout(timer);
      done(reject, e);
    });
    request.end();
  });
}

function requestBufferNode(url, { headers = {}, timeoutMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;
    const req = lib.get(
      url,
      { headers: { "User-Agent": CHROME_UA, Accept: "*/*", ...headers }, timeout: timeoutMs },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          requestBufferNode(resolveUrl(url, res.headers.location), { headers, timeoutMs })
            .then(resolve)
            .catch(reject);
          res.resume();
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
  });
}

async function requestBuffer(url, opts = {}) {
  const { headers = {}, timeoutMs = 120000, usePlayerSession = true } = opts;
  try {
    if (usePlayerSession) {
      return await requestBufferElectron(url, { headers, timeoutMs });
    }
  } catch {
    /* fall through */
  }
  return requestBufferNode(url, { headers, timeoutMs });
}

async function fetchText(url, opts) {
  const buf = await requestBuffer(url, opts);
  return buf.toString("utf8");
}

function resolveUnpackedPath(p) {
  if (!p || !p.includes("app.asar")) return p;
  const unpacked = p.replace(/app\.asar([/\\])/, "app.asar.unpacked$1");
  return fs.existsSync(unpacked) ? unpacked : p;
}

function findFfmpeg() {
  try {
    const bundled = resolveUnpackedPath(require("ffmpeg-static"));
    if (bundled && fs.existsSync(bundled)) return bundled;
  } catch {
    /* optional */
  }
  const candidates =
    process.platform === "win32"
      ? ["ffmpeg", "C:\\ffmpeg\\bin\\ffmpeg.exe"]
      : process.platform === "darwin"
        ? ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "ffmpeg"]
        : ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "ffmpeg"];
  for (const c of candidates) {
    try {
      if (c.includes(path.sep) && fs.existsSync(c)) return c;
    } catch {
      /* ignore */
    }
  }
  return "ffmpeg";
}

function parseAttributes(line) {
  const attrs = {};
  const m = line.match(/([A-Z0-9-]+)=("[^"]*"|[^,]*)/gi);
  if (!m) return attrs;
  for (const part of m) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq);
    let val = part.slice(eq + 1);
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    attrs[key] = val;
  }
  return attrs;
}

function isMasterPlaylist(text) {
  return /#EXT-X-STREAM-INF:/i.test(text);
}

function pickBestVariantUrl(masterText, baseUrl) {
  const lines = masterText.split(/\r?\n/);
  let bestBw = -1;
  let bestUrl = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("#EXT-X-STREAM-INF:")) continue;
    const attrs = parseAttributes(line);
    const bw = parseInt(attrs.BANDWIDTH || "0", 10);
    let j = i + 1;
    while (j < lines.length && (!lines[j].trim() || lines[j].startsWith("#")))
      j++;
    if (j < lines.length && bw >= bestBw) {
      bestBw = bw;
      bestUrl = resolveUrl(baseUrl, lines[j].trim());
    }
  }
  if (bestUrl) return bestUrl;
  for (const line of lines) {
    const t = line.trim();
    if (t && !t.startsWith("#")) return resolveUrl(baseUrl, t);
  }
  return null;
}

function parseMediaPlaylist(text, baseUrl) {
  const lines = text.split(/\r?\n/);
  const segments = [];
  let keyMethod = null;
  let keyUri = null;
  let keyIv = null;
  let duration = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("#EXT-X-KEY:")) {
      const attrs = parseAttributes(line);
      keyMethod = attrs.METHOD || null;
      keyUri = attrs.URI ? resolveUrl(baseUrl, attrs.URI) : null;
      if (attrs.IV) {
        const ivHex = attrs.IV.replace(/^0x/i, "");
        keyIv = Buffer.from(ivHex, "hex");
      } else {
        keyIv = null;
      }
    }
    if (line.startsWith("#EXTINF:")) {
      const d = parseFloat(line.split(":")[1]);
      if (!Number.isNaN(d)) duration += d;
      let j = i + 1;
      while (j < lines.length && (!lines[j].trim() || lines[j].startsWith("#")))
        j++;
      if (j < lines.length) {
        segments.push({
          url: resolveUrl(baseUrl, lines[j].trim()),
          index: segments.length,
        });
        i = j;
      }
    }
  }

  return {
    segments,
    keyMethod,
    keyUri,
    keyIv,
    duration,
  };
}

function decryptAes128(buffer, key, iv) {
  const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
  return Buffer.concat([decipher.update(buffer), decipher.final()]);
}

function segmentIv(keyIv, sequenceIndex) {
  if (keyIv && keyIv.length === 16) return keyIv;
  const iv = Buffer.alloc(16, 0);
  iv.writeUInt32BE(sequenceIndex, 12);
  return iv;
}

async function loadAesKey(keyUri, headers) {
  return requestBuffer(keyUri, { headers });
}

async function downloadSegment(segUrl, headers, keyBuf, keyIv, seqIndex) {
  let data = await requestBuffer(segUrl, { headers });
  if (keyBuf) {
    data = decryptAes128(data, keyBuf, segmentIv(keyIv, seqIndex));
  }
  return data;
}

function safeFileName(name) {
  return (
    String(name || "video")
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
      .replace(/\s+/g, " ")
      .trim() || "video"
  );
}

function formatBytes(n) {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GiB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MiB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${n} B`;
}

/** Windows-safe path for ffmpeg concat demuxer list files */
function concatListPath(filePath) {
  return path.resolve(filePath).replace(/\\/g, "/").replace(/'/g, "'\\''");
}

function runFfmpeg(ffmpegPath, args, onLine) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stderr = "";
    const pipe = (chunk) => {
      const text = chunk.toString();
      stderr += text;
      text.split(/\r?\n/).forEach((l) => emit(onLine, l));
    };
    proc.stdout.on("data", pipe);
    proc.stderr.on("data", pipe);
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else {
        const hint = stderr
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean)
          .pop();
        reject(new Error(hint || `ffmpeg failed (code ${code})`));
      }
    });
  });
}

function concatTsFallback(segmentPaths, outputPath) {
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(outputPath);
    out.on("error", reject);
    out.on("finish", () => resolve(outputPath));
    try {
      for (const seg of segmentPaths) {
        out.write(fs.readFileSync(seg));
      }
      out.end();
    } catch (e) {
      out.destroy();
      reject(e);
    }
  });
}

/** Merge .ts segments into a single .mp4 (always one output file). */
async function mergeSegmentsToMp4(ffmpegPath, segmentPaths, outputPath, onLine) {
  const valid = segmentPaths.filter(Boolean).map((p) => path.resolve(p));
  if (!valid.length) throw new Error("No video segments to merge");

  const listPath = path.join(
    path.dirname(outputPath),
    `_encryptic_concat_${Date.now()}.txt`,
  );
  const listBody = valid.map((p) => `file '${concatListPath(p)}'`).join("\n");
  fs.writeFileSync(listPath, listBody, "utf8");

  const copyArgs = [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c",
    "copy",
    "-bsf:a",
    "aac_adtstoasc",
    "-movflags",
    "+faststart",
    outputPath,
  ];
  const transcodeArgs = [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "22",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    outputPath,
  ];

  const attempts = [
    { label: "Encryptic: merging into MP4…", args: copyArgs },
    { label: "Encryptic: encoding MP4…", args: transcodeArgs },
  ];

  let lastErr = null;
  for (const { label, args } of attempts) {
    emit(onLine, label);
    try {
      try {
        fs.unlinkSync(outputPath);
      } catch {
        /* ignore */
      }
      await runFfmpeg(ffmpegPath, args, onLine);
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1024) {
        try {
          fs.unlinkSync(listPath);
        } catch {
          /* ignore */
        }
        emit(onLine, `[Merger] Merging formats into "${outputPath}"`);
        return outputPath;
      }
    } catch (e) {
      lastErr = e;
    }
  }

  emit(onLine, "Encryptic: remuxing segments to MP4…");
  const mergedTs = `${listPath}.merged.ts`;
  try {
    await concatTsFallback(valid, mergedTs);
    try {
      fs.unlinkSync(outputPath);
    } catch {
      /* ignore */
    }
    await runFfmpeg(
      ffmpegPath,
      [
        "-y",
        "-i",
        mergedTs,
        "-c",
        "copy",
        "-bsf:a",
        "aac_adtstoasc",
        "-movflags",
        "+faststart",
        outputPath,
      ],
      onLine,
    );
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1024) {
      try {
        fs.unlinkSync(listPath);
        fs.unlinkSync(mergedTs);
      } catch {
        /* ignore */
      }
      emit(onLine, `[Merger] Merging formats into "${outputPath}"`);
      return outputPath;
    }
  } catch (e) {
    lastErr = e;
  }

  try {
    fs.unlinkSync(listPath);
  } catch {
    /* ignore */
  }
  throw lastErr || new Error("Failed to create MP4 from segments");
}

function cleanupDownloadArtifacts(outputDir, tempDir) {
  if (tempDir) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
  if (!outputDir) return;
  try {
    for (const entry of fs.readdirSync(outputDir)) {
      const full = path.join(outputDir, entry);
      if (entry.startsWith(".encryptic-") || entry.startsWith("_encryptic_")) {
        try {
          fs.rmSync(full, { recursive: true, force: true });
        } catch {
          /* ignore */
        }
        continue;
      }
      if (/^seg_\d+\.ts$/i.test(entry)) {
        try {
          fs.unlinkSync(full);
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
}

async function downloadDirectMp4({
  url,
  outputPath,
  onLine,
  isCancelled,
  headers = {},
}) {
  emit(onLine, `[download] Destination: ${outputPath}`);
  emit(onLine, "Encryptic: downloading video file…");
  const data = await requestBuffer(url, { headers });
  if (isCancelled()) throw new Error("Cancelled");
  fs.writeFileSync(outputPath, data);
  emit(onLine, `[download] 100% of ~${formatBytes(data.length)}`);
  return outputPath;
}

/**
 * Download HLS stream to MP4.
 * @returns {Promise<string>} output file path
 */
async function downloadHls({
  m3u8Url,
  outputDir,
  title,
  onLine,
  isCancelled,
  tempDir,
  referer = "",
}) {
  const headers = buildStreamHeaders(m3u8Url, referer);
  let playlistUrl = m3u8Url;
  let playlistText = await fetchText(playlistUrl, { headers });

  if (isCancelled()) throw new Error("Cancelled");

  if (isMasterPlaylist(playlistText)) {
    emit(onLine, "Encryptic: selecting best quality stream…");
    const variant = pickBestVariantUrl(playlistText, playlistUrl);
    if (!variant) throw new Error("No streams found in master playlist");
    playlistUrl = variant;
    playlistText = await fetchText(playlistUrl, { headers });
  }

  const media = parseMediaPlaylist(playlistText, playlistUrl);
  const { segments, keyMethod, keyUri, keyIv } = media;
  if (!segments.length) throw new Error("No segments in playlist");

  emit(onLine, `[hlsnative] Total fragments: ${segments.length}`);

  let keyBuf = null;
  if (keyMethod === "AES-128" && keyUri) {
    emit(onLine, "Encryptic: fetching decryption key…");
    keyBuf = await loadAesKey(keyUri, headers);
  } else if (keyMethod && keyMethod !== "NONE") {
    throw new Error(`Unsupported encryption: ${keyMethod}`);
  }

  fs.mkdirSync(tempDir, { recursive: true });
  const segmentPaths = new Array(segments.length);
  let completed = 0;
  let nextIndex = 0;

  const downloadOne = async (seq) => {
    const seg = segments[seq];
    const dest = path.join(
      tempDir,
      `seg_${String(seq).padStart(5, "0")}.ts`,
    );
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      if (isCancelled()) throw new Error("Cancelled");
      try {
        const data = await downloadSegment(
          seg.url,
          headers,
          keyBuf,
          keyIv,
          seg.index,
        );
        fs.writeFileSync(dest, data);
        segmentPaths[seq] = dest;
        completed++;
        emit(onLine, `(frag ${completed}/${segments.length})`);
        return;
      } catch (e) {
        if (attempt < MAX_RETRIES) {
          emit(onLine, `Retrying (${attempt}/${MAX_RETRIES})`);
          await new Promise((r) => setTimeout(r, 800 * attempt));
        } else {
          throw e;
        }
      }
    }
  };

  const workers = Array.from(
    { length: Math.min(CONCURRENCY, segments.length) },
    async () => {
      while (nextIndex < segments.length) {
        if (isCancelled()) throw new Error("Cancelled");
        const idx = nextIndex++;
        await downloadOne(idx);
      }
    },
  );
  await Promise.all(workers);

  const base = safeFileName(title);
  const outputPath = path.join(outputDir, `${base}.mp4`);
  emit(onLine, `[download] Destination: ${outputPath}`);
  emit(onLine, "Encryptic: merging video…");

  const ffmpeg = findFfmpeg();
  emit(onLine, "Encryptic: combining segments into one MP4 file…");
  await mergeSegmentsToMp4(
    ffmpeg,
    segmentPaths.filter(Boolean),
    outputPath,
    onLine,
  );

  cleanupDownloadArtifacts(outputDir, tempDir);

  if (!fs.existsSync(outputPath)) {
    throw new Error("MP4 file was not created");
  }

  return outputPath;
}

/**
 * Main entry — m3u8 or direct video URL.
 */
async function runEncrypticDownload({
  m3u8Url,
  outputDir,
  title,
  onLine,
  isCancelled,
  jobId,
  referer = "",
}) {
  fs.mkdirSync(outputDir, { recursive: true });
  const base = safeFileName(title);
  const tempDir = path.join(
    os.tmpdir(),
    `encryptic-dl-${jobId || "work"}`,
  );

  const isHls =
    /\.m3u8(\?|$)/i.test(m3u8Url) ||
    m3u8Url.includes("m3u8");

  if (!isHls) {
    const ext = /\.mp4(\?|$)/i.test(m3u8Url)
      ? ".mp4"
      : path.extname(new URL(m3u8Url).pathname) || ".mp4";
    const out = path.join(outputDir, `${base}${ext}`);
    const hdrs = buildStreamHeaders(m3u8Url, referer);
    return downloadDirectMp4({
      url: m3u8Url,
      outputPath: out,
      onLine,
      isCancelled,
      headers: hdrs,
    });
  }

  return downloadHls({
    m3u8Url,
    outputDir,
    title: base,
    onLine,
    isCancelled,
    tempDir,
    referer,
  });
}

module.exports = {
  runEncrypticDownload,
  findFfmpeg,
  safeFileName,
};
