import { useState, useEffect, useMemo } from "react";
import { imgUrl } from "../utils/api";
import { fetchPerson, fetchPersonMovieCredits } from "../utils/person";
import MediaBrowseRow from "../components/MediaBrowseRow";
import { BackIcon } from "../components/Icons";

export default function PersonPage({
  item,
  apiKey,
  onBack,
  onSelectMovie,
  watched,
  onMarkWatched,
  onMarkUnwatched,
  ratingsMap,
}) {
  const [person, setPerson] = useState(null);
  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!item?.id || !apiKey) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchPerson(item.id, apiKey),
      fetchPersonMovieCredits(item.id, apiKey),
    ])
      .then(([details, credits]) => {
        if (cancelled) return;
        setPerson(details);
        setFilms(credits);
      })
      .catch(() => {
        if (!cancelled) setPerson(item);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item.id, apiKey, item]);

  const name = person?.name || item.name || "Actor";
  const bio = person?.biography?.trim();
  const knownFor = useMemo(
    () => films.slice(0, 6).map((m) => m.title).filter(Boolean),
    [films],
  );

  if (loading) {
    return (
      <div className="person-page fade-in">
        <div className="loader">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="person-page fade-in page-enter">
      <div className="person-hero">
        {person?.profile_path && (
          <div
            className="person-hero__bg"
            style={{
              backgroundImage: `url(${imgUrl(person.profile_path, "w780")})`,
            }}
          />
        )}
        <div className="person-hero__gradient" />
        <div className="person-hero__content">
          <button type="button" className="btn btn-ghost person-back" onClick={onBack}>
            <BackIcon /> Back
          </button>
          <div className="person-hero__layout">
            <div className="person-hero__profile">
              {person?.profile_path ? (
                <img src={imgUrl(person.profile_path, "h632")} alt={name} />
              ) : (
                <div className="person-hero__placeholder">{name.slice(0, 1)}</div>
              )}
            </div>
            <div className="person-hero__info">
              <p className="person-hero__label">Actor</p>
              <h1 className="person-hero__name">{name}</h1>
              {person?.place_of_birth && (
                <p className="person-hero__meta">{person.place_of_birth}</p>
              )}
              {knownFor.length > 0 && (
                <p className="person-hero__known">
                  Known for: {knownFor.join(" · ")}
                </p>
              )}
              {bio && (
                <p className="person-hero__bio">
                  {bio.slice(0, 480)}
                  {bio.length > 480 ? "…" : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {films.length > 0 && (
        <MediaBrowseRow
          rowId="person-films"
          title="Filmography"
          items={films}
          onSelect={onSelectMovie}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          ratingsMap={ratingsMap}
        />
      )}
    </div>
  );
}
