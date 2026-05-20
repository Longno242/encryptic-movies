import { storage, STORAGE_KEYS } from "./storage";

function readLists() {
  return storage.get(STORAGE_KEYS.CUSTOM_LISTS) || [];
}

function writeLists(lists) {
  storage.set(STORAGE_KEYS.CUSTOM_LISTS, lists);
}

export function getCustomLists() {
  return readLists();
}

export function createCustomList(name) {
  const lists = readLists();
  const id = `list_${Date.now()}`;
  lists.push({ id, name: name.trim() || "My list", items: [], createdAt: Date.now() });
  writeLists(lists);
  return id;
}

export function renameCustomList(listId, name) {
  const lists = readLists().map((l) =>
    l.id === listId ? { ...l, name: name.trim() || l.name } : l,
  );
  writeLists(lists);
}

export function deleteCustomList(listId) {
  writeLists(readLists().filter((l) => l.id !== listId));
}

export function addToCustomList(listId, item) {
  if (!item?.id) return;
  const type = item.media_type === "tv" ? "tv" : "movie";
  const key = `${type}_${item.id}`;
  const lists = readLists().map((l) => {
    if (l.id !== listId) return l;
    const exists = l.items.some((i) => `${i.media_type}_${i.id}` === key);
    if (exists) return l;
    return {
      ...l,
      items: [
        ...l.items,
        {
          media_type: type,
          id: item.id,
          title: item.title || item.name,
          name: item.name || item.title,
          poster_path: item.poster_path,
          release_date: item.release_date,
          first_air_date: item.first_air_date,
        },
      ],
    };
  });
  writeLists(lists);
}

export function removeFromCustomList(listId, mediaType, itemId) {
  const key = `${mediaType === "tv" ? "tv" : "movie"}_${itemId}`;
  const lists = readLists().map((l) => {
    if (l.id !== listId) return l;
    return {
      ...l,
      items: l.items.filter((i) => `${i.media_type}_${i.id}` !== key),
    };
  });
  writeLists(lists);
}

export function isInAnyCustomList(mediaType, itemId) {
  const key = `${mediaType === "tv" ? "tv" : "movie"}_${itemId}`;
  return readLists().some((l) =>
    l.items.some((i) => `${i.media_type}_${i.id}` === key),
  );
}

export function isInCustomList(listId, item) {
  if (!listId || !item?.id) return false;
  const type = item.media_type === "tv" ? "tv" : "movie";
  const key = `${type}_${item.id}`;
  const list = readLists().find((l) => l.id === listId);
  return list?.items.some((i) => `${i.media_type}_${i.id}` === key) ?? false;
}
