import { storage, STORAGE_KEYS } from "./storage";

function titleKey(mediaType, id) {
  return `${mediaType === "tv" ? "tv" : "movie"}_${id}`;
}

function readStore() {
  return storage.get(STORAGE_KEYS.TITLE_META) || {};
}

function writeStore(store) {
  storage.set(STORAGE_KEYS.TITLE_META, store);
}

export function getTitleSource(mediaType, id) {
  const row = readStore()[titleKey(mediaType, id)];
  return row?.lastSource || null;
}

export function setTitleSource(mediaType, id, sourceId) {
  if (!sourceId) return;
  const key = titleKey(mediaType, id);
  const store = readStore();
  store[key] = { ...(store[key] || {}), lastSource: sourceId, updatedAt: Date.now() };
  writeStore(store);
}

export function getTitleNote(mediaType, id) {
  return readStore()[titleKey(mediaType, id)]?.note || "";
}

export function setTitleNote(mediaType, id, note) {
  const key = titleKey(mediaType, id);
  const store = readStore();
  if (!note?.trim()) {
    if (store[key]) {
      delete store[key].note;
      if (!store[key].lastSource) delete store[key];
    }
  } else {
    store[key] = { ...(store[key] || {}), note: note.trim(), updatedAt: Date.now() };
  }
  writeStore(store);
}

export function getTitleMeta(mediaType, id) {
  return readStore()[titleKey(mediaType, id)] || null;
}
