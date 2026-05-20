import { tmdbFetch } from "./api";

/**
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} [opts.query]
 * @param {'movie'|'tv'|''} [opts.type]
 * @param {number} [opts.year]
 * @param {number} [opts.genreId]
 * @param {number} [opts.minRating]
 * @param {string} [opts.lang]
 */
export async function discoverSearch(opts) {
  const {
    apiKey,
    query = "",
    type = "",
    year,
    genreId,
    minRating,
    lang,
  } = opts;

  if (query.trim()) {
    const data = await tmdbFetch(
      `/search/multi?query=${encodeURIComponent(query.trim())}&page=1`,
      apiKey,
    );
    let results = (data.results || []).filter((r) => r.media_type !== "person");
    if (type) results = results.filter((r) => r.media_type === type);
    if (minRating) {
      results = results.filter((r) => (r.vote_average || 0) >= minRating);
    }
    return results.slice(0, 24);
  }

  const media = type === "tv" ? "tv" : "movie";
  const params = new URLSearchParams({
    sort_by: "popularity.desc",
    include_adult: "false",
    page: "1",
  });
  if (year) {
    if (media === "movie") params.set("primary_release_year", String(year));
    else params.set("first_air_date_year", String(year));
  }
  if (genreId) params.set("with_genres", String(genreId));
  if (minRating) params.set("vote_average.gte", String(minRating));
  if (lang) params.set("with_original_language", lang);

  const data = await tmdbFetch(`/discover/${media}?${params}`, apiKey);
  return (data.results || []).slice(0, 24).map((r) => ({
    ...r,
    media_type: media,
  }));
}
