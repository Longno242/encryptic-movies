import { useState, useEffect, useMemo } from "react";
import CastCard from "./CastCard";
import MediaBrowseRow from "./MediaBrowseRow";
import { fetchMovieCredits, fetchPersonMovieCredits } from "../utils/person";

export default function MovieCastSection({
  movieId,
  apiKey,
  movieTitle,
  onSelectPerson,
  onSelectMovie,
  ratingsMap,
  watched,
  onMarkWatched,
  onMarkUnwatched,
}) {
  const [cast, setCast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPerson, setExpandedPerson] = useState(null);
  const [personFilms, setPersonFilms] = useState([]);
  const [filmsLoading, setFilmsLoading] = useState(false);

  useEffect(() => {
    if (!movieId || !apiKey) return;
    let cancelled = false;
    setLoading(true);
    fetchMovieCredits(movieId, apiKey).then((data) => {
      if (cancelled) return;
      const top = (data.cast || [])
        .filter((c) => c.name)
        .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
        .slice(0, 18);
      setCast(top);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [movieId, apiKey]);

  useEffect(() => {
    if (!expandedPerson?.id || !apiKey) {
      setPersonFilms([]);
      return;
    }
    let cancelled = false;
    setFilmsLoading(true);
    fetchPersonMovieCredits(expandedPerson.id, apiKey).then((films) => {
      if (cancelled) return;
      const filtered = films.filter((m) => m.id !== movieId).slice(0, 16);
      setPersonFilms(filtered);
      setFilmsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [expandedPerson?.id, apiKey, movieId]);

  const handlePersonClick = (person) => {
    if (onSelectPerson) {
      onSelectPerson(person);
      return;
    }
    setExpandedPerson((prev) =>
      prev?.id === person.id ? null : person,
    );
  };

  const expandedLabel = useMemo(() => {
    if (!expandedPerson) return null;
    return `More with ${expandedPerson.name}`;
  }, [expandedPerson]);

  if (loading) {
    return (
      <section className="movie-cast section">
        <h2 className="browse-row__title">Cast & crew</h2>
        <div className="movie-cast__loading">
          <div className="spinner" />
          <span>Loading cast…</span>
        </div>
      </section>
    );
  }

  if (!cast.length) return null;

  return (
    <section className="movie-cast section">
      <h2 className="browse-row__title">Cast & crew</h2>
      <p className="movie-cast__hint">
        Tap an actor to see their other films
        {movieTitle ? ` · ${movieTitle}` : ""}
      </p>
      <div className="movie-cast__grid">
        {cast.map((person) => (
          <CastCard
            key={person.id}
            person={person}
            role={person.character}
            onClick={() => handlePersonClick(person)}
          />
        ))}
      </div>

      {expandedPerson && !onSelectPerson && (
        <div className="movie-cast__filmography">
          {filmsLoading ? (
            <div className="movie-cast__loading">
              <div className="spinner" />
            </div>
          ) : personFilms.length > 0 ? (
            <MediaBrowseRow
              rowId={`person-${expandedPerson.id}`}
              title={expandedLabel}
              items={personFilms}
              onSelect={onSelectMovie}
              watched={watched}
              onMarkWatched={onMarkWatched}
              onMarkUnwatched={onMarkUnwatched}
              ratingsMap={ratingsMap}
            />
          ) : (
            <p className="movie-cast__empty">No other films found for this actor.</p>
          )}
        </div>
      )}
    </section>
  );
}
