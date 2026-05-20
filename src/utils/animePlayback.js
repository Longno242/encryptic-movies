import { storage } from "./storage";
import { setTitleSource } from "./titleMeta";
import {
  resolveSubtitleLang,
  resolveAudioLang,
  embedLangLabel,
} from "./playbackLang";

/**
 * Auto-failover uses TMDB-backed embed ids (Neon, VidSrc, 2Embed…).
 * AllManga is manual-only.
 */
export const ANIME_PLAYER_CHAIN = [
  "vidsrc",
  "neon",
  "2embed",
  "videasy",
  "vidplus",
  "vidnest",
];

const MEMORY_PREFIX = "animeSourceOk_";

const SOURCE_ALIASES = {
  "vidsrc-anime": "vidsrc",
  "2embed-anime": "2embed",
  "videasy-anime": "videasy",
  vidplus: "vidplus",
  vidnest: "vidnest",
  neon: "neon",
};

export function normalizeAnimePlayerSource(sourceId) {
  if (!sourceId) return null;
  if (ANIME_PLAYER_CHAIN.includes(sourceId)) return sourceId;
  return SOURCE_ALIASES[sourceId] || sourceId;
}

export function getAnimeSourceChain() {
  return [...ANIME_PLAYER_CHAIN, "allmanga"];
}

export function rememberAnimeSource(tmdbId, sourceId, mediaType = "tv") {
  if (!tmdbId || !sourceId) return;
  const id = normalizeAnimePlayerSource(sourceId) || sourceId;
  storage.set(`${MEMORY_PREFIX}${tmdbId}`, id);
  setTitleSource(mediaType, tmdbId, id);
}

export function getRememberedAnimeSource(tmdbId) {
  const saved = storage.get(`${MEMORY_PREFIX}${tmdbId}`);
  const norm = normalizeAnimePlayerSource(saved);
  if (norm && ANIME_PLAYER_CHAIN.includes(norm)) return norm;
  return null;
}

export function getNextAnimeSource(currentId) {
  const cur = normalizeAnimePlayerSource(currentId);
  const idx = ANIME_PLAYER_CHAIN.indexOf(cur);
  if (idx === -1) return ANIME_PLAYER_CHAIN[0];
  if (idx >= ANIME_PLAYER_CHAIN.length - 1) return null;
  return ANIME_PLAYER_CHAIN[idx + 1];
}

export function resolveAnilistSeasonId(anilistData, anilistSeasons, selectedSeason) {
  if (anilistSeasons?.length) {
    const hit =
      anilistSeasons.find((s) => s.seasonNum === selectedSeason) ||
      anilistSeasons[selectedSeason - 1];
    if (hit?.id) return hit.id;
  }
  return anilistData?.id ?? null;
}

export function buildAnilistEpisodeList(
  anilistSeasons,
  selectedSeason,
  tmdbEpisodes = null,
  rootEpisodeCount = null,
) {
  if (!anilistSeasons?.length) return [];
  const season =
    anilistSeasons.find((s) => s.seasonNum === selectedSeason) ||
    anilistSeasons[selectedSeason - 1];
  let count = Math.max(0, Number(season?.episodes) || 0);
  if (
    !count &&
    selectedSeason === 1 &&
    rootEpisodeCount != null &&
    rootEpisodeCount > 0
  ) {
    count = Number(rootEpisodeCount);
  }
  const tmdbList = Array.isArray(tmdbEpisodes) ? tmdbEpisodes : [];
  if (!count && tmdbList.length) count = tmdbList.length;

  if (!count) return [];

  if (tmdbList.length >= count) {
    return tmdbList.slice(0, count).map((ep, i) => ({
      ...ep,
      episode_number: i + 1,
      name: ep.name || `Episode ${i + 1}`,
      _tmdbSeason: ep.season_number ?? selectedSeason,
      _tmdbAbsolute: ep.episode_number,
      _anilistSeasonId: season?.id ?? null,
    }));
  }

  return Array.from({ length: count }, (_, i) => ({
    episode_number: i + 1,
    id: `anilist_s${selectedSeason}e${i + 1}`,
    name: `Episode ${i + 1}`,
    _anilistSeasonId: season?.id ?? null,
  }));
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

function resolveSourceKey(sourceId) {
  const id = String(sourceId || "");
  if (id === "vidsrc-anime" || id === "vidsrc") return "vidsrc";
  if (id === "2embed-anime" || id === "2embed") return "2embed";
  if (id === "videasy-anime" || id === "videasy") return "videasy";
  return id;
}

/** Optional AniList-only URL (manual experiment — often blocked). */
export function buildAnimeEmbedUrl(sourceId, opts) {
  const {
    anilistId,
    malId,
    anilistEpisode,
    episode,
    dubMode = "sub",
    preferredLang = "en",
    originalLang = "ja",
    reloadToken,
  } = opts;

  const ep = Math.max(1, Number(anilistEpisode ?? episode) || 1);
  const dubBool = dubMode === "dub";
  const dsLang = resolveSubtitleLang({
    dubMode,
    preferredLang,
    originalLang,
    isAnime: true,
  });
  const key = resolveSourceKey(sourceId);

  let url;
  if (key === "2embed" && malId) {
    url = `https://www.2embed.online/embed/anime/mal/${malId}/${ep}`;
  } else if (key === "2embed") {
    url = `https://www.2embed.online/embed/anime/anilist/${anilistId}/${ep}`;
  } else if (key === "vidsrc") {
    url = withQuery(`https://vidsrc.cc/v3/embed/anime/${anilistId}/${ep}`, {
      dub: dubBool ? "true" : "false",
      ds_lang: dsLang,
      autoplay: "1",
    });
  } else {
    url = `https://player.vidplus.to/embed/anime/${anilistId}/${ep}`;
  }

  if (reloadToken != null) url = withQuery(url, { _rd: String(reloadToken) });
  return url;
}

export function buildAnimeTmdbFallbackUrl(sourceId, tmdbId, season, episode, opts) {
  const dubMode = opts.dubMode === "dub" ? "dub" : "sub";
  const langOpts = { ...opts, isAnime: true };
  const subLang = resolveSubtitleLang(langOpts);
  const audioLang = resolveAudioLang(langOpts);
  const s = season ?? 1;
  const e = episode ?? 1;
  const key = resolveSourceKey(sourceId);

  let url;
  if (key === "vidsrc") {
    url = withQuery(`https://vidsrc.to/embed/tv/${tmdbId}/${s}/${e}`, {
      dub: dubMode === "dub" ? "1" : "0",
      ds_lang: subLang,
      autoplay: "1",
    });
  } else if (key === "2embed") {
    url = withQuery(`https://www.2embed.online/embed/tv/${tmdbId}/${s}/${e}`, {
      lang: subLang,
      audio: dubMode === "dub" ? "dub" : "sub",
    });
  } else if (key === "videasy") {
    url = withQuery(`https://player.videasy.net/tv/${tmdbId}/${s}/${e}`, {
      lang: subLang,
      audioLang: dubMode === "dub" ? subLang : audioLang,
      autoplay: "1",
    });
  } else if (key === "vidplus") {
    url = withQuery(`https://player.vidplus.to/embed/tv/${tmdbId}/${s}/${e}`, {
      autoplay: "true",
      lang: subLang,
      default_lang: subLang,
    });
  } else if (key === "vidnest") {
    url = withQuery(`https://vidnest.fun/tv/${tmdbId}/${s}/${e}`, {
      lang: subLang,
      ds_lang: subLang,
    });
  } else if (key === "neon") {
    url = withQuery(`https://ezvidapi.com/embed/tv/${tmdbId}/${s}/${e}`, {
      autoplay: "1",
      autoPlay: "true",
      sub_lang: subLang,
      ds_lang: subLang,
    });
  } else {
    url = `https://vidsrc.to/embed/tv/${tmdbId}/${s}/${e}`;
  }

  if (opts.reloadToken != null) {
    url = withQuery(url, { _rd: String(opts.reloadToken) });
  }
  return url;
}

/** Map AniList virtual season/ep → TMDB season/ep for embed hosts. */
export function resolveAnimePlayerEpisode({
  useAnilistSeasons,
  anilistSeasons,
  selectedSeason,
  selectedEp,
  tmdbSeasonCount = 1,
}) {
  const epNum = Math.max(1, Number(selectedEp?.episode_number) || 1);

  if (!useAnilistSeasons || !anilistSeasons?.length) {
    return { season: selectedSeason, episode: epNum };
  }

  if (selectedEp?._tmdbAbsolute != null) {
    return {
      season: selectedEp._tmdbSeason ?? 1,
      episode: selectedEp._tmdbAbsolute,
    };
  }

  const multiCour =
    anilistSeasons.length > 1 && tmdbSeasonCount <= 1;
  if (multiCour) {
    let offset = 0;
    for (const s of anilistSeasons) {
      if (s.seasonNum >= selectedSeason) break;
      offset += Math.max(0, Number(s.episodes) || 0);
    }
    return { season: 1, episode: offset + epNum };
  }

  if (tmdbSeasonCount > 1 && selectedSeason <= tmdbSeasonCount) {
    return { season: selectedSeason, episode: epNum };
  }

  return { season: 1, episode: epNum };
}

export function anilistAbsoluteEpisode(anilistSeasons, selectedSeason, episodeInSeason) {
  if (!anilistSeasons?.length) return Math.max(1, episodeInSeason || 1);
  let offset = 0;
  for (const s of anilistSeasons) {
    if (s.seasonNum >= selectedSeason) break;
    offset += Math.max(0, Number(s.episodes) || 0);
  }
  return offset + Math.max(1, episodeInSeason || 1);
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
  const uiEp =
    selectedEp?.episode_number ??
    selectedEp?._uiEpisode ??
    1;
  const anilistEpisode = anilistSeasons?.length
    ? anilistAbsoluteEpisode(anilistSeasons, selectedSeason, uiEp)
    : uiEp;

  return {
    isAnime: true,
    anilistId,
    malId: anilistData?.idMal ?? null,
    anilistEpisode,
    useAnilistPlayback: false,
    dubMode,
    preferredLang,
    originalLang,
    preferredLangName: embedLangLabel(preferredLang),
    reloadToken,
  };
}
