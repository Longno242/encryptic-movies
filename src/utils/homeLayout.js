import { storage } from "./storage";
import { CATALOG_ROWS } from "./homeCatalog";

const LEGACY_ROWS = [
  { id: "recentlyAdded", label: "In Theaters" },
  { id: "topViewed", label: "Trending This Week" },
  { id: "upcoming", label: "Coming Soon" },
];

export const HOME_ROWS = [
  { id: "continue", label: "Continue Watching" },
  { id: "similar", label: "Similar to…" },
  ...CATALOG_ROWS.map((r) => ({ id: r.id, label: r.label })),
  { id: "trendingMovies", label: "Trending Movies" },
  { id: "trendingTV", label: "Trending Series" },
  { id: "topRated", label: "Top Rated (Movies & TV)" },
  ...LEGACY_ROWS,
];

const ALL_ROW_IDS = HOME_ROWS.map((r) => r.id);
const DEFAULT_ORDER = [...ALL_ROW_IDS];
const DEFAULT_VISIBILITY = Object.fromEntries(
  ALL_ROW_IDS.map((id) => [id, true]),
);

function mergeRowOrder(saved) {
  if (!saved?.length) return DEFAULT_ORDER;
  const known = new Set(ALL_ROW_IDS);
  const kept = saved.filter((id) => known.has(id));
  const appended = DEFAULT_ORDER.filter((id) => !kept.includes(id));
  return [...kept, ...appended];
}

export function loadHomeLayout() {
  return {
    order: mergeRowOrder(storage.get("homeRowOrder")),
    visible: { ...DEFAULT_VISIBILITY, ...storage.get("homeRowVisible") },
  };
}

export function saveHomeLayout(order, visible) {
  storage.set("homeRowOrder", order);
  storage.set("homeRowVisible", visible);
}

export function loadHomeViewMode() {
  return storage.get("homeViewMode") || "list";
}

export function saveHomeViewMode(mode) {
  storage.set("homeViewMode", mode);
}

export function loadStartPage() {
  return storage.get("startPage") || "home";
}
