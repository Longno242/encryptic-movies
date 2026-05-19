const { fetchOne } = require("./posterFetch");
const urls = process.argv.slice(2);
(async () => {
  for (const u of urls) {
    try {
      await fetchOne(u);
      console.log("OK", u.slice(0, 80));
    } catch (e) {
      console.log("FAIL", e.message, u.slice(0, 80));
    }
  }
})();
