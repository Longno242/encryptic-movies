import { useMemo } from "react";
import { GENRE_CATEGORIES, saveBrowseYear } from "../utils/homeCatalog";

const QUICK_LINKS = [
  { id: "byYear", label: "By Year" },
  { id: "recentlyAdded", label: "Recently Added" },
  { id: "mostPopular", label: "Most Popular" },
  { id: "topViewed", label: "Top Viewed" },
  { id: "upcoming", label: "Coming Soon" },
  { id: "trendingMovies", label: "Trending" },
  { id: "topRated", label: "Top Rated" },
];

export default function HomeBrowseBar({
  browseYear,
  onYearChange,
  activeCategory,
  onCategoryChange,
  onShowAll,
  showAllRows,
}) {
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const list = [{ value: "all", label: "All years" }];
    for (let y = current; y >= 1970; y--) {
      list.push({ value: y, label: String(y) });
    }
    return list;
  }, []);

  const pickCategory = (rowId) => {
    onCategoryChange(rowId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="home-browse">
      <div className="home-browse-top">
        <div className="home-browse-year">
          <span className="home-browse-label">Release year</span>
          <select
            className="home-browse-select"
            value={browseYear}
            onChange={(e) => {
              const val =
                e.target.value === "all" ? "all" : Number(e.target.value);
              saveBrowseYear(val);
              onYearChange(val);
              onCategoryChange("byYear");
            }}
            aria-label="Filter movies by release year"
          >
            {years.map((y) => (
              <option key={y.value} value={y.value}>
                {y.label}
              </option>
            ))}
          </select>
        </div>
        <p className="home-browse-hint">
          {showAllRows
            ? "Browse all rows below, or pick a category to show only those titles."
            : "Showing one category — use Show all to return to the full home view."}
        </p>
        {!showAllRows && (
          <button type="button" className="home-browse-show-all" onClick={onShowAll}>
            Show all categories
          </button>
        )}
      </div>

      <div className="home-browse-chips" role="tablist" aria-label="Browse categories">
        {QUICK_LINKS.map((link) => (
          <button
            key={link.id}
            type="button"
            role="tab"
            aria-selected={!showAllRows && activeCategory === link.id}
            className={`home-browse-chip${!showAllRows && activeCategory === link.id ? " active" : ""}`}
            onClick={() => pickCategory(link.id)}
          >
            {link.label}
          </button>
        ))}
      </div>

      <div className="home-browse-chips home-browse-chips--genres">
        {GENRE_CATEGORIES.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`home-browse-chip home-browse-chip--genre${!showAllRows && activeCategory === g.id ? " active" : ""}`}
            onClick={() => pickCategory(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>
    </div>
  );
}
