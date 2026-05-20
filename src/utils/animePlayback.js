import { storage } from "./storage";
import { setTitleSource } from "./titleMeta";
import { resolveDsLang, embedLangLabel } from "./playbackLang";

const ANIME_SOURCE_CHAIN = [
  "vidsrc",
  "vidplus",
  "vidnest",
  "2embed",
  "neon",
  "allmanga",
];

const MEMORY_PREFIX = "animeSourceOk_";

export function getAnimeSourceChain() {
  return [...ANIME_SOURCE_CHAIN];
}

export function rememberAnimeSource(tmdbId, sourceId, mediaType = "tv") {
  if (!tmdbId || !sourceId) return;
  storage.set(`${MEMORY_PREFIX}${tmdbId}`, sourceId);
  setTitleSource(mediaType, tmdbId, sourceId);
}

export function getRememberedAnimeSource(tmdbId) {
  const saved = storage.get(`${MEMORY_PREFIX}${tmdbId}`);
  if (saved && ANIME_SOURCE_CHAIN.includes(saved)) return saved;
  return null;
}

export function getNextAnimeSource(currentId) {
  if (currentId !== "neon") return "neon";
  const i = ANIME_SOURCE_CHAIN.indexOf(currentId);
  if (i === -1 || i >= ANIME_SOURCE_CHAIN.length - 1) return null;
  return ANIME_SOURCE_CHAIN[i + 1];
}

/**
 * Resolve AniList media id for the selected UI season (handles sequels).
 */
export function resolveAnilistSeasonId(anilistData, anilistSeasons, selectedSeason) {
  if (anilistSeasons?.length) {
    const hit =
      anilistSeasons.find((s) => s.seasonNum === selectedSeason) ||
      anilistSeasons[selectedSeason - 1];
    if (hit?.id) return hit.id;
  }
  return anilistData?.id ?? null;
}

/**
 * @param {object} opts
 * @returns {boolean}
 */
export function shouldUseAnilistPlayback(opts) {
  return !!(opts?.isAnime && opts?.anilistId && opts?.anilistEpisode > 0);
}

function withQuery(url, params) {
  try {
    const u = new URL(url);
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== "") u.searchParams.set(key, value);
    }
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Advanced anime embed URLs — AniList id + absolute episode (not TMDB season splits).
 */
export function buildAnimeEmbedUrl(sourceId, opts) {
  const {
    anilistId,
    malId,
    tmdbId,
    season,
    episode,
    anilistEpisode,
    dubMode = "sub",
    preferredLang = "en",
    originalLang = "ja",
    reloadToken,
  } = opts;

  const ep = Math.max(1, Number(anilistEpisode ?? episode) || 1);
  const dubFlag = dubMode === "dub" ? "1" : "0";
  const dubBool = dubMode === "dub";
  const dsLang = resolveDsLang({
    dubMode,
    preferredLang,
    originalLang,
    isAnime: true,
  });

  let url;

  switch (sourceId) {
    case "vidsrc":
    case "vidsrc-anime":
      url = `https://vidsrc.icu/embed/anime/${anilistId}/${ep}/${dubFlag}`;
      url = withQuery(url, { ds_lang: dsLang, autoplay: "1" });
      break;
    case "vidplus":
      url = `https://player.vidplus.to/embed/anime/${anilistId}/${ep}`;
      url = withQuery(url, {
        autoplay: "true",
        autonext: "true",
        dub: dubBool ? "1" : "0",
        lang: dsLang,
        default_lang: dsLang,
      });
      break;
    case "vidnest":
      if (malId) {
        url = `https://vidnest.fun/anime/mal/${malId}/${ep}`;
      } else {
        url = `https://vidnest.fun/anime/${anilistId}/${ep}`;
      }
      url = withQuery(url, { dub: dubBool ? "1" : "0", lang: dsLang, ds_lang: dsLang });
      break;
    case "2embed":
    case "2embed-anime":
      if (malId) {
        url = `https://www.2embed.online/embed/anime/mal/${malId}/${ep}`;
      } else {
        url = `https://www.2embed.online/embed/anime/anilist/${anilistId}/${ep}`;
      }
      url = withQuery(url, {
        lang: dsLang,
        audio: dubMode === "dub" ? "dub" : "sub",
      });
      break;
    case "videasy":
    case "videasy-anime":
      url = `https://player.videasy.net/anime/${anilistId}/${ep}`;
      url = withQuery(url, { lang: dsLang, audioLang: dsLang });
      break;
    default:
      url = `https://vidsrc.icu/embed/anime/${anilistId}/${ep}/${dubFlag}`;
      url = withQuery(url, { ds_lang: dsLang, autoplay: "1" });
  }

  if (reloadToken != null) {
    url = withQuery(url, { _rd: String(reloadToken) });
  }

  return url;
}

/**
 * TMDB fallback when AniList playback unavailable.
 */
export function buildAnimeTmdbFallbackUrl(sourceId, tmdbId, season, episode, opts) {
  const dubMode = opts.dubMode === "dub" ? "dub" : "sub";
  const dsLang = resolveDsLang({ ...opts, isAnime: true });
  const s = season ?? 1;
  const e = episode ?? 1;

  let url;
  if (sourceId === "vidsrc" || sourceId === "vidsrc-anime") {
    url = withQuery(`https://vidsrc.to/embed/tv/${tmdbId}/${s}/${e}`, {
      dub: dubMode === "dub" ? "1" : "0",
      ds_lang: dsLang,
      autoplay: "1",
    });
  } else if (sourceId === "2embed" || sourceId === "2embed-anime") {
    url = withQuery(`https://www.2embed.online/embed/tv/${tmdbId}/${s}/${e}`, {
      lang: dsLang,
      audio: dubMode === "dub" ? "dub" : "sub",
    });
  } else if (sourceId === "videasy" || sourceId === "videasy-anime") {
    url = withQuery(`https://player.videasy.net/tv/${tmdbId}/${s}/${e}`, {
      lang: dsLang,
      audioLang: dsLang,
    });
  } else if (sourceId === "vidplus") {
    url = withQuery(`https://player.vidplus.to/embed/tv/${tmdbId}/${s}/${e}`, {
      autoplay: "true",
      lang: dsLang,
      default_lang: dsLang,
    });
  } else if (sourceId === "vidnest") {
    url = withQuery(`https://vidnest.fun/tv/${tmdbId}/${s}/${e}`, {
      lang: dsLang,
      ds_lang: dsLang,
    });
  } else {
    url = `https://vidsrc.to/embed/tv/${tmdbId}/${s}/${e}`;
  }

  if (opts.reloadToken != null) {
    url = withQuery(url, { _rd: String(opts.reloadToken) });
  }
  return url;
}

export function buildAnimePlaybackOpts({
  isAnime,
  anilistData,
  anilistSeasons,
  selectedSeason,
  selectedEp,
  dubMode,
  preferredLang,
  originalLang,
  reloadToken,
}) {
  if (!isAnime) return { useAnilistPlayback: false };

  const anilistId = resolveAnilistSeasonId(
    anilistData,
    anilistSeasons,
    selectedSeason,
  );
  const anilistEpisode =
    selectedEp?.episode_number ??
    selectedEp?._uiEpisode ??
    selectedEp?._tmdbAbsolute ??
    1;

  return {
    isAnime: true,
    anilistId,
    malId: anilistData?.idMal ?? null,
    anilistEpisode,
    useAnilistPlayback: !!anilistId,
    dubMode,
    preferredLang,
    originalLang,
    preferredLangName: embedLangLabel(preferredLang),
    reloadToken,
  };
}
