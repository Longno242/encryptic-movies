import { storage, STORAGE_KEYS } from "./storage";

/** Saved folder, or Desktop/MOVIES (created on disk via main process). */
export async function resolveStoredDownloadPath() {
  const saved = storage.get(STORAGE_KEYS.DOWNLOAD_PATH);
  if (typeof saved === "string" && saved.trim()) {
    return saved.trim();
  }
  if (!window.electron?.getDefaultDownloadPath) return "";
  try {
    const res = await window.electron.getDefaultDownloadPath();
    if (res?.ok && res.path) {
      storage.set(STORAGE_KEYS.DOWNLOAD_PATH, res.path);
      return res.path;
    }
  } catch {}
  return "";
}
