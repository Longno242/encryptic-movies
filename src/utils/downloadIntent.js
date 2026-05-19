/** Build navigation payload to open a title on its page ready to download. */
export function itemForDownload(item) {
  const mediaType =
    item.media_type || (item.first_air_date != null ? "tv" : "movie");
  return {
    ...item,
    media_type: mediaType,
    _forDownload: true,
  };
}

export function matchesDownloadIntent(item, page, intent) {
  if (!intent || !item) return false;
  if (Number(intent.tmdbId) !== Number(item.id)) return false;
  const mt =
    intent.mediaType ||
    (page === "tv" ? "tv" : page === "movie" ? "movie" : null);
  const itemMt =
    item.media_type || (item.first_air_date != null ? "tv" : "movie");
  if (mt && itemMt !== mt) return false;
  if (
    mt === "tv" &&
    intent.season != null &&
    item.season != null &&
    Number(intent.season) !== Number(item.season)
  ) {
    return false;
  }
  return true;
}

export function createDownloadIntent(item) {
  const mediaType =
    item.media_type || (item.first_air_date != null ? "tv" : "movie");
  return {
    tmdbId: item.id,
    mediaType,
    season: mediaType === "tv" && item.season != null ? Number(item.season) : null,
    episode:
      mediaType === "tv" && item.episode != null ? Number(item.episode) : null,
  };
}
