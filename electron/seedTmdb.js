/**
 * Seed the built-in TMDB read token into secure storage and skip catalog setup.
 * @param {{ secureStoreSet: Function, setCatalogSetupRequired: Function }} storageIpc
 */
async function seedBuiltinTmdbKey(storageIpc) {
  const { BUILTIN_TMDB_READ_TOKEN } = require("./builtinTmdb");
  const token = String(BUILTIN_TMDB_READ_TOKEN || "").trim();
  if (!token) return { ok: false, reason: "empty" };
  await storageIpc.secureStoreSet("apikey", token);
  if (typeof storageIpc.setCatalogSetupRequired === "function") {
    storageIpc.setCatalogSetupRequired(false);
  }
  return { ok: true };
}

module.exports = { seedBuiltinTmdbKey };
