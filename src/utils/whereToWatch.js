import { tmdbFetch } from "./api";

export async function fetchWatchProviders(mediaType, id, apiKey, country = "US") {
  const path =
    mediaType === "tv"
      ? `/tv/${id}/watch/providers`
      : `/movie/${id}/watch/providers`;
  try {
    const data = await tmdbFetch(path, apiKey);
    const region = data.results?.[country] || data.results?.US || null;
    if (!region) return null;
    const flat = region.flatrate || [];
    const rent = region.rent || [];
    const buy = region.buy || [];
    const link = region.link || null;
    return {
      link,
      flatrate: flat.map((p) => p.provider_name),
      rent: rent.map((p) => p.provider_name),
      buy: buy.map((p) => p.provider_name),
    };
  } catch {
    return null;
  }
}
