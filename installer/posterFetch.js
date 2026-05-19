const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const cache = new Map();

function fileToDataUrl(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function loadLocalPoster(movie) {
  if (!movie.localFile) return null;
  const dir = path.join(__dirname, "assets", "posters");
  const filePath = path.join(dir, movie.localFile);
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 500) {
    const key = `local:${filePath}`;
    if (cache.has(key)) return cache.get(key);
    const data = fileToDataUrl(filePath);
    cache.set(key, data);
    return data;
  }
  return null;
}

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function headersFor(url) {
  const h = { ...DEFAULT_HEADERS };
  if (url.includes("media-amazon.com")) {
    h.Referer = "https://www.imdb.com/";
  }
  if (url.includes("wikimedia.org") || url.includes("wikipedia.org")) {
    h.Referer = "https://en.wikipedia.org/";
  }
  return h;
}

function fetchUrl(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib
      .get(url, { headers: headersFor(url) }, (res) => {
        if (
          [301, 302, 307, 308].includes(res.statusCode) &&
          res.headers.location &&
          redirects < 5
        ) {
          const next = new URL(res.headers.location, url).href;
          res.resume();
          fetchUrl(next, redirects + 1).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode === 429) {
          res.resume();
          reject(new Error("Poster HTTP 429"));
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Poster HTTP ${res.statusCode}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          const ct = (res.headers["content-type"] || "image/jpeg").split(";")[0];
          resolve(`data:${ct};base64,${buf.toString("base64")}`);
        });
      })
      .on("error", reject);
  });
}

async function fetchOne(url) {
  if (cache.has(url)) return cache.get(url);
  const data = await fetchUrl(url);
  cache.set(url, data);
  return data;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Local cache first, then Wikimedia / IMDb CDN. */
async function fetchPosterForMovie(movie) {
  const local = loadLocalPoster(movie);
  if (local) return local;

  const tries = [movie.posterUrl, movie.imdbUrl, movie.fallbackUrl].filter(Boolean);
  let lastErr;
  for (let i = 0; i < tries.length; i++) {
    try {
      if (i > 0) await sleep(400);
      return await fetchOne(tries[i]);
    } catch (e) {
      lastErr = e;
      if (String(e.message).includes("429")) await sleep(1200);
    }
  }
  throw lastErr || new Error("No poster available");
}

async function fetchPosterDataUrl(urlOrMovie) {
  if (typeof urlOrMovie === "object" && urlOrMovie !== null) {
    return fetchPosterForMovie(urlOrMovie);
  }
  if (!urlOrMovie) throw new Error("No poster URL");
  return fetchOne(urlOrMovie);
}

module.exports = { fetchPosterDataUrl, fetchPosterForMovie, fetchOne };
