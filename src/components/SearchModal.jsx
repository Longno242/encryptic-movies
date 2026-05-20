import { useState, useEffect, useRef, useCallback } from "react";
import { discoverSearch } from "../utils/discoverSearch";
import MediaCard from "./MediaCard";
import { SearchIcon, CloseIcon } from "./Icons";
import { storage } from "../utils/storage";

const HISTORY_KEY = "searchHistory";
const MAX_HISTORY = 12;
function loadHistory() {
  return storage.get(HISTORY_KEY) || [];
}

function persistHistory(entries) {
  storage.set(HISTORY_KEY, entries);
}

export default function SearchModal({ apiKey, onSelect, onClose, offline }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(loadHistory);
  const [type, setType] = useState("");
  const [year, setYear] = useState("");
  const [minRating, setMinRating] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (offline || !apiKey) {
      setResults([]);
      return;
    }

    let alive = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const items = await discoverSearch({
          apiKey,
          query,
          type: type || "",
          year: year ? Number(year) : undefined,
          genreId: undefined,
          minRating: minRating ? Number(minRating) : undefined,
        });
        if (alive) setResults(items);
      } catch {
        if (alive) setResults([]);
      }
      if (alive) setLoading(false);
    }, 380);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query, apiKey, offline, type, year, minRating]);

  const pushHistory = useCallback((term) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setHistory((prev) => {
      const next = [trimmed, ...prev.filter((h) => h !== trimmed)].slice(
        0,
        MAX_HISTORY,
      );
      persistHistory(next);
      return next;
    });
  }, []);

  const removeHistoryItem = useCallback((e, term) => {
    e.stopPropagation();
    setHistory((prev) => {
      const next = prev.filter((h) => h !== term);
      persistHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    persistHistory([]);
  }, []);

  const pickResult = (item) => {
    const trimmed = query.trim();
    if (trimmed) pushHistory(trimmed);
    onSelect(item);
    onClose();
  };

  const showHistory = !query && history.length > 0;
  const showDiscover = !query.trim();

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Search Encryptic Movies"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="search-box search-box--advanced">
        <div className="search-input-wrap">
          <SearchIcon />
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Search movies and series…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && query.trim()) pushHistory(query);
            }}
          />
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={query ? () => setQuery("") : onClose}
            aria-label={query ? "Clear search" : "Close search"}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="search-filters">
          <select
            className="search-filters__select"
            value={type}
            onChange={(e) => setType(e.target.value)}
            aria-label="Media type"
          >
            <option value="">Movies & TV</option>
            <option value="movie">Movies only</option>
            <option value="tv">TV only</option>
          </select>
          <input
            type="number"
            className="search-filters__input"
            placeholder="Year"
            min="1900"
            max="2030"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
          <select
            className="search-filters__select"
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            aria-label="Minimum rating"
          >
            <option value="">Any rating</option>
            <option value="6">6+</option>
            <option value="7">7+</option>
            <option value="8">8+</option>
          </select>
        </div>

        <div className="search-results">
          {offline && (
            <div className="search-offline-banner">
              No internet — search is unavailable offline.
            </div>
          )}

          {!offline && loading && (
            <div className="loader">
              <div className="spinner" />
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="search-empty">No results for “{query}”</div>
          )}

          {!loading && results.length > 0 && (
            <div className="cards-grid cards-grid--search search-results--cards">
              {results.map((r, i) => (
                <MediaCard
                  key={`${r.media_type}-${r.id}`}
                  item={r}
                  onClick={() => pickResult(r)}
                  progress={0}
                  staggerIndex={i}
                  modern
                />
              ))}
            </div>
          )}

          {showHistory && (
            <div className="search-history">
              <div className="search-history-header">
                <span className="search-history-label">Recent searches</span>
                <button
                  type="button"
                  className="search-history-clear"
                  onClick={clearHistory}
                >
                  Clear all
                </button>
              </div>
              {history.map((term) => (
                <div
                  key={term}
                  className="search-history-item"
                  onClick={() => {
                    setQuery(term);
                    inputRef.current?.focus();
                  }}
                >
                  <span className="search-history-icon">
                    <SearchIcon />
                  </span>
                  <span className="search-history-term">{term}</span>
                  <button
                    type="button"
                    className="search-history-remove"
                    onClick={(e) => removeHistoryItem(e, term)}
                    title="Remove"
                    aria-label={`Remove ${term}`}
                  >
                    <CloseIcon />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!query && history.length === 0 && showDiscover && (
            <div className="search-hint">
              Search or use filters for popular picks · <kbd>ESC</kbd> to close
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
