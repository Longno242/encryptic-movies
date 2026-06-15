/**
 * Resolve a TVMaze show to TMDB / AniList ids for embed playback.
 * Cross-matches are verified by title/year so episodes are not mixed across series.
 */

import { tmdbFetch, fetchAnilistData } from "./api";

function parseTmdbExternal(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function showYear(show) {
  const y = String(show?.first_air_date || show?.premiered || "").slice(0, 4);
  const n = Number(y);
  return Number.isFinite(n) ? n : null;
}

function normalizeTitle(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when titles are the same show (exact or clear substring). */
export function titlesMatchTv(a, b) {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 5 && nb.length >= 5 && (na.includes(nb) || nb.includes(na))) {
    return true;
  }
  return false;
}

function isAnimationShow(show) {
  return (show?.genres || []).some((g) => {
    const name = (typeof g === "string" ? g : g?.name || "").toLowerCase();
    return name === "animation" || name === "anime";
  });
}

function normalizeImdbId(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  if (s.startsWith("tt")) return s;
  if (/^\d+$/.test(s)) return `tt${s}`;
  return s;
}

function tmdbResultYear(result) {
  const y = String(result?.first_air_date || "").slice(0, 4);
  const n = Number(y);
  return Number.isFinite(n) ? n : null;
}

/** Pick best TMDB search hit — never guess from unrelated first result. */
function pickTmdbSearchResult(results, title, year) {
  const exact = results.filter(
    (r) =>
      titlesMatchTv(r.name, title) || titlesMatchTv(r.original_name, title),
  );
  if (!exact.length) return null;

  if (year != null) {
    const sameYear = exact.find((r) => tmdbResultYear(r) === year);
    if (sameYear) return sameYear;
    const closeYear = exact.find((r) => {
      const ry = tmdbResultYear(r);
      return ry != null && Math.abs(ry - year) <= 1;
    });
    if (closeYear) return closeYear;
  }

  if (exact.length === 1) return exact[0];
  return null;
}

async function verifyTmdbTvShow(apiKey, tmdbId, expectedName, expectedYear) {
  try {
    const tv = await tmdbFetch(`/tv/${tmdbId}`, apiKey);
    const names = [tv.name, tv.original_name].filter(Boolean);
    if (!names.some((n) => titlesMatchTv(n, expectedName))) return null;
    if (expectedYear != null) {
      const ty = tmdbResultYear(tv);
      if (ty != null && Math.abs(ty - expectedYear) > 2) return null;
    }
    return tv;
  } catch {
    return null;
  }
}

async function tmdbFindTvId(apiKey, source, externalId) {
  const raw = String(externalId ?? "").trim();
  if (!raw || !apiKey) return null;
  const queryId = source === "imdb_id" ? normalizeImdbId(raw) : raw;
  if (!queryId) return null;
  try {
    const data = await tmdbFetch(
      `/find/${encodeURIComponent(queryId)}?external_source=${source}`,
      apiKey,
    );
    return data?.tv_results?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function tmdbSearchTvMatch(apiKey, title, year) {
  const q = String(title || "").trim();
  if (!q || !apiKey) return null;
  try {
    const data = await tmdbFetch(
      `/search/tv?query=${encodeURIComponent(q)}&page=1`,
      apiKey,
    );
    const pick = pickTmdbSearchResult(data?.results || [], q, year);
    return pick?.id ?? null;
  } catch {
    return null;
  }
}

async function acceptTmdbMatch(apiKey, tmdbId, show, via) {
  const verified = await verifyTmdbTvShow(
    apiKey,
    tmdbId,
    show?.name || show?.title,
    showYear(show),
  );
  if (!verified) return null;
  return {
    tmdbId,
    anilistId: null,
    via,
    crossMatched: via !== "tvmaze-tmdb",
    tmdbSeasons: verified.seasons || null,
    matchedTitle: verified.name || verified.original_name,
  };
}

function anilistMatchesShow(media, expectedName) {
  if (!media?.title) return false;
  const titles = [
    media.title.english,
    media.title.romaji,
    media.title.native,
  ].filter(Boolean);
  return titles.some((t) => titlesMatchTv(t, expectedName));
}

/**
 * @param {object} show — normalized TVMaze show
 * @param {string|null} apiKey
 */
export async function resolveTvmazePlaybackIds(show, apiKey) {
  const ext = show?.externals || {};
  const name = show?.name || show?.title || "";
  const year = showYear(show);

  const nativeTmdb =
    parseTmdbExternal(show?._tmdbId) ?? parseTmdbExternal(ext.themoviedb);
  if (nativeTmdb && apiKey) {
    const ok = await acceptTmdbMatch(apiKey, nativeTmdb, show, "tvmaze-tmdb");
    if (ok) {
      return {
        ...ok,
        crossMatched: false,
        tmdbSeasons: null,
      };
    }
    /* TVMaze themoviedb id can be wrong — fall through to IMDb/TVDB/search */
  } else if (nativeTmdb && !apiKey) {
    /* Cannot verify without TMDB key — do not use unverified id for embeds */
  }

  if (apiKey) {
    const imdb = ext.imdb;
    if (imdb) {
      const found = await tmdbFindTvId(apiKey, "imdb_id", imdb);
      if (found) {
        const ok = await acceptTmdbMatch(apiKey, found, show, "imdb");
        if (ok) return ok;
      }
    }

    const tvdb = ext.thetvdb ?? ext.tvdb;
    if (tvdb) {
      const found = await tmdbFindTvId(apiKey, "tvdb_id", tvdb);
      if (found) {
        const ok = await acceptTmdbMatch(apiKey, found, show, "tvdb");
        if (ok) return ok;
      }
    }

    const searchTitles = [name];
    if (isAnimationShow(show)) {
      const anilist = await fetchAnilistData(name, "ANIME", null);
      if (anilist?.title) {
        if (!anilistMatchesShow(anilist, name)) {
          /* ignore unrelated AniList hit */
        } else {
          if (anilist.title.english) searchTitles.push(anilist.title.english);
          if (anilist.title.romaji) searchTitles.push(anilist.title.romaji);

          for (const t of [...new Set(searchTitles)]) {
            const found = await tmdbSearchTvMatch(apiKey, t, year);
            if (found) {
              const ok = await acceptTmdbMatch(
                apiKey,
                found,
                show,
                "anilist+tmdb",
              );
              if (ok) {
                return { ...ok, anilistId: anilist.id };
              }
            }
          }
          return {
            tmdbId: null,
            anilistId: anilist.id,
            via: "anilist",
            crossMatched: true,
            tmdbSeasons: null,
            matchedTitle: null,
          };
        }
      }
    }

    for (const t of [...new Set(searchTitles.filter(Boolean))]) {
      const found = await tmdbSearchTvMatch(apiKey, t, year);
      if (found) {
        const ok = await acceptTmdbMatch(apiKey, found, show, "tmdb-search");
        if (ok) return ok;
      }
    }
  } else if (isAnimationShow(show)) {
    const anilist = await fetchAnilistData(name, "ANIME", null);
    if (anilist?.id && anilistMatchesShow(anilist, name)) {
      return {
        tmdbId: null,
        anilistId: anilist.id,
        via: "anilist",
        crossMatched: true,
        tmdbSeasons: null,
        matchedTitle: null,
      };
    }
  }

  return {
    tmdbId: null,
    anilistId: null,
    via: null,
    crossMatched: false,
    tmdbSeasons: null,
    matchedTitle: null,
  };
}

/** Merge playback ids onto a TVMaze show payload from tvmazeFetchShow. */
export async function applyPlaybackMatchToTvmazeShow(show, apiKey) {
  const match = await resolveTvmazePlaybackIds(show, apiKey);
  const useTmdbEpisodes = !!match.crossMatched && !!match.tmdbId;

  return {
    ...show,
    _tmdbId: match.tmdbId ?? show._tmdbId ?? null,
    _anilistId: match.anilistId ?? show._anilistId ?? null,
    _playbackMatchVia: match.via,
    _playbackMatchAttempted: true,
    _crossMatchedTmdb: useTmdbEpisodes,
    _episodesSource: useTmdbEpisodes ? "tmdb" : "tvmaze",
    _matchedTitle: match.matchedTitle,
    ...(useTmdbEpisodes
      ? {
          _seasonEpisodes: undefined,
          seasons:
            match.tmdbSeasons?.filter((s) => s.season_number >= 0) ||
            show.seasons,
        }
      : {}),
  };
}

export async function enrichTvmazeShowForPlayback(showId, apiKey) {
  const { tvmazeFetchShow } = await import("./tvmazeApi");
  const show = await tvmazeFetchShow(showId);
  return applyPlaybackMatchToTvmazeShow(show, apiKey);
}
