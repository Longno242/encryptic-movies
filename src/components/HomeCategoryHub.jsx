import { useMemo } from "react";
import {
  SPOTLIGHT_CATEGORIES,
  GENRE_CATEGORIES,
  saveBrowseYear,
  getCategoryMeta,
} from "../utils/homeCatalog";
import { FREE_SPOTLIGHT_LABELS } from "../utils/freeCatalog";

export default function HomeCategoryHub({
  browseYear,
  onYearChange,
  activeCategory,
  onCategoryChange,
  onShowAll,
  showAllRows,
  freeCatalog = false,
}) {
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const list = [{ value: "all", label: "All years" }];
    for (let y = current; y >= 1970; y--) {
      list.push({ value: y, label: String(y) });
    }
    return list;
  }, []);

  const pick = (id) => {
    onCategoryChange(id);
  };

  const activeMeta = activeCategory ? getCategoryMeta(activeCategory) : null;

  return (
    <div className="category-hub">
      <div className="category-hub__header">
        <div>
          <h2 className="category-hub__title">Explore</h2>
          <p className="category-hub__subtitle">
            {freeCatalog
              ? "Series picks from TVMaze — tap a category to browse. Add a TMDB key for movies."
              : "Charts & collections from TMDB — the same film database used across the industry"}
          </p>
        </div>
        {!freeCatalog && (
          <div className="category-hub__year-wrap">
            <label className="category-hub__year-label" htmlFor="browse-year">
              Year
            </label>
            <select
              id="browse-year"
              className="category-hub__year-select"
              value={browseYear}
              onChange={(e) => {
                const val =
                  e.target.value === "all" ? "all" : Number(e.target.value);
                saveBrowseYear(val);
                onYearChange(val);
                onCategoryChange("byYear");
              }}
            >
              {years.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!showAllRows && activeMeta && (
        <div className="category-hub__focused">
          <span className="category-hub__focused-icon">{activeMeta.icon}</span>
          <div>
            <div className="category-hub__focused-label">Viewing</div>
            <strong>{activeMeta.label}</strong>
          </div>
          <button type="button" className="category-hub__show-all" onClick={onShowAll}>
            Show all rows
          </button>
        </div>
      )}

      <p className="category-hub__section-label">Spotlight</p>
      <div className="category-hub__grid">
        {SPOTLIGHT_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`category-card${!showAllRows && activeCategory === c.id ? " category-card--active" : ""}`}
            onClick={() => pick(c.id)}
          >
            <span className="category-card__icon">{c.icon}</span>
            <span className="category-card__name">{c.label}</span>
            <span className="category-card__blurb">{c.blurb}</span>
          </button>
        ))}
        {!freeCatalog && (
        <button
          type="button"
          className={`category-card category-card--year${!showAllRows && activeCategory === "byYear" ? " category-card--active" : ""}`}
          onClick={() => pick("byYear")}
        >
          <span className="category-card__icon">📆</span>
          <span className="category-card__name">By Year</span>
          <span className="category-card__blurb">
            {browseYear === "all" ? "All years" : browseYear}
          </span>
        </button>
        )}
      </div>

      <p className="category-hub__section-label">Genres</p>
      <div className="category-hub__grid category-hub__grid--genres">
        {GENRE_CATEGORIES.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`category-card category-card--compact${!showAllRows && activeCategory === g.id ? " category-card--active" : ""}`}
            onClick={() => pick(g.id)}
          >
            <span className="category-card__icon">{g.icon}</span>
            <span className="category-card__name">{g.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
