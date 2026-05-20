import { storage, STORAGE_KEYS } from "./storage";

export function isSidebarCollapsed() {
  const v = storage.get(STORAGE_KEYS.SIDEBAR_COLLAPSED);
  return v === true || v === 1 || v === "1";
}

export function setSidebarCollapsed(collapsed) {
  storage.set(STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed ? 1 : 0);
  document.documentElement.classList.toggle(
    "sidebar-collapsed",
    !!collapsed,
  );
}

export function applySidebarCollapsedFromStorage() {
  document.documentElement.classList.toggle(
    "sidebar-collapsed",
    isSidebarCollapsed(),
  );
}
