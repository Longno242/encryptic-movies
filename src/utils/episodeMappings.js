/**
 * Manual overrides when TMDB numbering ≠ streaming-source numbering.
 * Group IDs: https://www.themoviedb.org/tv/{id}/episode_groups
 */
export const EPISODE_GROUP_IDS = {
  71446: "5eb730dfca7ec6001f7beb51", // Money Heist — Netflix cut
};

export function applyEpisodeMapping(tmdbId, season, episode, groupMap) {
  if (!groupMap) return { season, episode };
  const hit = groupMap.get(`${season}_${episode}`);
  return hit ?? { season, episode };
}

/**
 * @param {object} groupData — `/tv/episode_group/{id}` payload
 * @returns {Map<string, { season: number, episode: number }>}
 */
export function buildEpisodeGroupMap(groupData) {
  const lookup = new Map();
  if (!groupData?.groups?.length) return lookup;

  const orderedGroups = [...groupData.groups].sort((a, b) => a.order - b.order);

  orderedGroups.forEach((group, idx) => {
    const targetSeason = idx + 1;
    const eps = [...(group.episodes || [])].sort((a, b) => a.order - b.order);

    eps.forEach((ep, epIdx) => {
      lookup.set(`${ep.season_number}_${ep.episode_number}`, {
        season: targetSeason,
        episode: epIdx + 1,
      });
    });
  });

  return lookup;
}
