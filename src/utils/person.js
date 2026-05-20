import { tmdbFetch } from "./api";

export async function fetchMovieCredits(movieId, apiKey) {
  try {
    return await tmdbFetch(`/movie/${movieId}/credits`, apiKey);
  } catch {
    return { cast: [], crew: [] };
  }
}

export async function fetchTVCredits(tvId, apiKey) {
  try {
    return await tmdbFetch(`/tv/${tvId}/credits`, apiKey);
  } catch {
    return { cast: [], crew: [] };
  }
}

export async function fetchPerson(personId, apiKey) {
  return tmdbFetch(`/person/${personId}`, apiKey);
}

export async function fetchPersonMovieCredits(personId, apiKey) {
  try {
    const data = await tmdbFetch(`/person/${personId}/movie_credits`, apiKey);
    const cast = (data.cast || [])
      .filter((m) => m.poster_path && m.id)
      .sort(
        (a, b) =>
          (b.popularity || 0) - (a.popularity || 0) ||
          (b.release_date || "").localeCompare(a.release_date || ""),
      );
    return cast.map((m) => ({ ...m, media_type: "movie" }));
  } catch {
    return [];
  }
}
