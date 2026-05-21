import { tmdbFetch } from "./api";

/**
 * AniList trending anime for Home browse row.
 */
const ANILIST_TRENDING = `
query {
  Page(page: 1, perPage: 18) {
    media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
      id
      title { romaji english }
      coverImage { extraLarge large medium }
      averageScore
      startDate { year }
      format
    }
  }
}`;

export async function fetchAnilistTrendingAnime() {
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: ANILIST_TRENDING }),
    });
    const json = await res.json();
    const media = json?.data?.Page?.media || [];
    return media.map((m) => ({
      id: m.id,
      media_type: "anilist",
      anilistId: m.id,
      title: m.title?.english || m.title?.romaji,
      name: m.title?.romaji,
      poster_path:
        m.coverImage?.extraLarge ||
        m.coverImage?.large ||
        m.coverImage?.medium ||
        null,
      vote_average: m.averageScore ? m.averageScore / 10 : 0,
      first_air_date: m.startDate?.year ? `${m.startDate.year}-01-01` : "",
      _anilistOnly: true,
    }));
  } catch {
    return [];
  }
}

/** Match AniList row item to a TMDB TV entry for navigation. */
export async function resolveAnilistToTmdb(item, apiKey) {
  const title = (item.title || item.name || "").trim();
  if (!title || !apiKey) return null;
  try {
    const data = await tmdbFetch(
      `/search/tv?query=${encodeURIComponent(title)}&page=1`,
      apiKey,
    );
    const results = data.results || [];
    if (!results.length) return null;
    const lower = title.toLowerCase();
    const exact = results.find(
      (r) =>
        (r.name || "").toLowerCase() === lower ||
        (r.original_name || "").toLowerCase() === lower,
    );
    const pick = exact || results[0];
    return { ...pick, media_type: "tv", anilistId: item.anilistId || item.id };
  } catch {
    return null;
  }
}
