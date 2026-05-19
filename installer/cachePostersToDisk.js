/**
 * One-time: node installer/cachePostersToDisk.js
 * Saves posters to installer/assets/posters/ for offline installer showcase.
 */
const fs = require("fs");
const path = require("path");
const { fetchOne } = require("./posterFetch");
const { movies } = require("./spotlightMovies");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const dir = path.join(__dirname, "assets", "posters");
  fs.mkdirSync(dir, { recursive: true });

  for (const m of movies) {
    const slug = m.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const out = path.join(dir, `${slug}.jpg`);
    if (fs.existsSync(out) && fs.statSync(out).size > 1000) {
      console.log("skip (exists)", m.title);
      continue;
    }

    const tries = [m.posterUrl, m.imdbUrl, m.fallbackUrl].filter(Boolean);
    let saved = false;
    for (const url of tries) {
      try {
        const dataUrl = await fetchOne(url);
        const b64 = dataUrl.split(",")[1];
        fs.writeFileSync(out, Buffer.from(b64, "base64"));
        console.log("saved", m.title);
        saved = true;
        break;
      } catch (e) {
        console.log("  fail", m.title, e.message);
      }
      await sleep(2500);
    }
    if (!saved) console.log("MISSING", m.title);
    await sleep(2500);
  }
}

main();
