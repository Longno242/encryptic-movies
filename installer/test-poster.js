const { fetchPosterForMovie } = require("./posterFetch");
const { movies } = require("./spotlightMovies");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  for (const m of movies) {
    try {
      const d = await fetchPosterForMovie(m);
      console.log("OK", m.title, d.length);
    } catch (e) {
      console.log("FAIL", m.title, e.message);
    }
    await sleep(600);
  }
})();
