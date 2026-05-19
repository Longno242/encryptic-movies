/** Remove duplicate titles across home rows (first row wins). */

export function itemDedupeKey(item) {
  const type = item.media_type === "tv" ? "tv" : "movie";
  return `${type}_${item.id}`;
}

export function dedupeItems(items, seen) {
  if (!items?.length) return [];
  const out = [];
  for (const item of items) {
    const key = itemDedupeKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * @param {string[]} rowOrder
 * @param {(rowId: string) => { title: string, items?: object[], titleHighlight?: string } | null} getMeta
 */
export function buildDedupedRows(rowOrder, getMeta) {
  const seen = new Set();
  const rows = [];

  for (const id of rowOrder) {
    const meta = getMeta(id);
    if (!meta?.items?.length) continue;
    const items = dedupeItems(meta.items, seen);
    if (!items.length) continue;
    rows.push({
      id,
      title: meta.title,
      titleHighlight: meta.titleHighlight ?? null,
      items,
    });
  }

  return rows;
}

/** Dedupe all catalog buckets before display/cache. */
export function dedupeCatalogData(catalog) {
  if (!catalog) return catalog;
  const seen = new Set();
  const take = (items) => dedupeItems(items || [], seen);

  const genres = {};
  if (catalog.genres) {
    for (const [k, v] of Object.entries(catalog.genres)) {
      genres[k] = take(v);
    }
  }

  const out = { ...catalog, genres };
  for (const key of Object.keys(catalog)) {
    if (key === "genres") continue;
    if (Array.isArray(catalog[key])) out[key] = take(catalog[key]);
  }
  return out;
}
