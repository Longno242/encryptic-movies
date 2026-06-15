/**
 * TVMaze — free read API, no key required.
 * https://www.tvmaze.com/api
 */

const TVMAZE = "https://api.tvmaze.com";

function stripHtml(html) {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function normalizeTvmazeShow(show) {
  if (!show) return null;
  return {
    id: show.id,
    tvmazeId: show.id,
    _source: "tvmaze",
    media_type: "tv",
    name: show.name,
    title: show.name,
    poster_path: show.image?.medium || show.image?.original || null,
    overview: stripHtml(show.summary),
    first_air_date: show.premiered || "",
    vote_average: show.rating?.average ? show.rating.average / 2 : 0,
    genres: (show.genres || []).map((g) => ({ name: g })),
  };
}

async function tvmazeGet(path) {
  const res = await fetch(`${TVMAZE}${path}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`TVMaze ${res.status}`);
  return res.json();
}

export async function tvmazeSearchShows(query) {
  const q = String(query || "").trim();
  if (!q) return [];
  const data = await tvmazeGet(`/search/shows?q=${encodeURIComponent(q)}`);
  return (Array.isArray(data) ? data : [])
    .map((row) => normalizeTvmazeShow(row.show))
    .filter(Boolean)
    .slice(0, 20);
}

/**
 * Load seasons + episodes from TVMaze for free mode (no TMDB key).
 * Keeps TMDB id on the item for embed players when known.
 */
export async function resolveFreeTvShowDetails(item, apiKey = null) {
  const title = String(item?.name || item?.title || "").trim();
  const tmdbId =
    item?._tmdbId ??
    (item?._source !== "tvmaze" && item?.id != null ? Number(item.id) : null);

  if (item?._source === "tvmaze") {
    const { applyPlaybackMatchToTvmazeShow } = await import(
      "./tvmazePlaybackMatch"
    );
    const show = await tvmazeFetchShow(item.tvmazeId || item.id);
    return applyPlaybackMatchToTvmazeShow(show, apiKey ?? null);
  }

  if (!title) {
    return { ...item, media_type: "tv", _tmdbId: tmdbId || null };
  }

  const matches = await tvmazeSearchShows(title);
  if (!matches.length) {
    return {
      ...item,
      media_type: "tv",
      _tmdbId: tmdbId || null,
      seasons: item.seasons || [],
    };
  }

  const want = title.toLowerCase();
  const pick =
    matches.find((m) => (m.name || "").toLowerCase() === want) || matches[0];
  const { applyPlaybackMatchToTvmazeShow } = await import("./tvmazePlaybackMatch");
  const show = await tvmazeFetchShow(pick.tvmazeId || pick.id);
  const matched = await applyPlaybackMatchToTvmazeShow(show, apiKey ?? null);
  return {
    ...matched,
    poster_path: item.poster_path || matched.poster_path,
    backdrop_path: item.backdrop_path || matched.backdrop_path,
  };
}

export async function tvmazeFetchShow(showId) {
  const id = Number(showId);
  if (!Number.isFinite(id)) throw new Error("Invalid show id");

  const [show, episodes] = await Promise.all([
    tvmazeGet(`/shows/${id}`),
    tvmazeGet(`/shows/${id}/episodes`),
  ]);

  const eps = Array.isArray(episodes) ? episodes : [];
  const seasonNums = [
    ...new Set(eps.map((e) => e.season).filter((s) => s != null && s >= 0)),
  ].sort((a, b) => a - b);

  const seasons = seasonNums.map((n) => ({
    season_number: n,
    name: n === 0 ? "Specials" : `Season ${n}`,
    episode_count: eps.filter((e) => e.season === n).length,
  }));

  const seasonEpisodes = {};
  for (const n of seasonNums) {
    seasonEpisodes[n] = eps
      .filter((e) => e.season === n && e.number != null)
      .sort((a, b) => a.number - b.number)
      .map((ep) => ({
        id: ep.id,
        episode_number: ep.number,
        name: ep.name || `Episode ${ep.number}`,
        overview: stripHtml(ep.summary),
        still_path: ep.image?.medium || null,
        air_date: ep.airdate || "",
        runtime: ep.runtime || null,
      }));
  }

  const tmdbRaw = show.externals?.themoviedb;
  const tmdbFromExternal =
    tmdbRaw != null && tmdbRaw !== "" ? Number(tmdbRaw) : null;
  const _tmdbId =
    Number.isFinite(tmdbFromExternal) && tmdbFromExternal > 0
      ? tmdbFromExternal
      : null;

  return {
    ...normalizeTvmazeShow(show),
    _tmdbId,
    externals: show.externals || {},
    seasons: seasons.length ? seasons : [{ season_number: 1, name: "Season 1", episode_count: 0 }],
    _seasonEpisodes: seasonEpisodes,
  };
}

/** Paginated show index (250 per page) — free catalog rows. */
export async function tvmazeFetchShowsPage(page = 0) {
  const data = await tvmazeGet(`/shows?page=${page}`);
  return (Array.isArray(data) ? data : [])
    .map((show) => normalizeTvmazeShow(show))
    .filter(Boolean);
}

/** Shows airing today (US) — used as a free “trending TV” row. */
export async function tvmazeFetchScheduleUS() {
  const today = new Date().toISOString().slice(0, 10);
  let data;
  try {
    data = await tvmazeGet(`/schedule?country=US&date=${today}`);
  } catch {
    data = await tvmazeGet("/schedule?country=US");
  }

  const seen = new Set();
  const out = [];
  for (const row of Array.isArray(data) ? data : []) {
    const show = row.show;
    if (!show?.id || seen.has(show.id)) continue;
    seen.add(show.id);
    out.push(normalizeTvmazeShow(show));
    if (out.length >= 20) break;
  }
  return out;
}
