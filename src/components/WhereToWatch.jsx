import { useState, useEffect } from "react";
import { fetchWatchProviders } from "../utils/whereToWatch";
import { ExternalLinkIcon } from "./Icons";

export default function WhereToWatch({ mediaType, id, apiKey, country = "US" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !apiKey) return;
    let alive = true;
    setLoading(true);
    fetchWatchProviders(mediaType, id, apiKey, country).then((d) => {
      if (alive) {
        setData(d);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [mediaType, id, apiKey, country]);

  if (loading) {
    return (
      <div className="where-to-watch where-to-watch--loading">
        <span className="spinner" style={{ width: 18, height: 18 }} />
        Checking providers…
      </div>
    );
  }

  if (!data) return null;

  const hasAny =
    data.flatrate?.length || data.rent?.length || data.buy?.length;
  if (!hasAny) return null;

  const Chip = ({ label }) => (
    <span className="where-to-watch__chip">{label}</span>
  );

  return (
    <div className="where-to-watch">
      <div className="where-to-watch__head">
        <span className="where-to-watch__title">Where to watch</span>
        {data.link && (
          <button
            type="button"
            className="where-to-watch__link"
            onClick={() => window.electron?.openExternal?.(data.link)}
          >
            <ExternalLinkIcon size={12} />
            TMDB
          </button>
        )}
      </div>
      {data.flatrate?.length > 0 && (
        <div className="where-to-watch__row">
          <span className="where-to-watch__label">Stream</span>
          <div className="where-to-watch__chips">
            {data.flatrate.map((n) => (
              <Chip key={n} label={n} />
            ))}
          </div>
        </div>
      )}
      {data.rent?.length > 0 && (
        <div className="where-to-watch__row">
          <span className="where-to-watch__label">Rent</span>
          <div className="where-to-watch__chips">
            {data.rent.slice(0, 6).map((n) => (
              <Chip key={n} label={n} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
