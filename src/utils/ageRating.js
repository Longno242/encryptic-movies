/** Parental guidance: country certs → minimum age, TMDB lookups. */

import { tmdbFetch } from "./api";

export const RATING_COUNTRIES = [
  { code: "US", label: "United States (MPAA / TV Parental)" },
  { code: "DE", label: "Germany (FSK)" },
  { code: "GB", label: "United Kingdom (BBFC)" },
  { code: "FR", label: "France (CNC)" },
  { code: "AU", label: "Australia (ACB)" },
  { code: "NZ", label: "New Zealand (OFLC)" },
  { code: "BR", label: "Brazil (DEJUS)" },
  { code: "CA", label: "Canada (CRTC)" },
  { code: "JP", label: "Japan (EIRIN)" },
];

const MIN_AGE_BY_COUNTRY = {
  US: {
    g: 0,
    nr: 0,
    "not rated": 0,
    unrated: 0,
    "tv-y": 0,
    "tv-y7": 7,
    "tv-g": 0,
    pg: 7,
    "tv-pg": 7,
    "pg-13": 13,
    "tv-13": 13,
    "tv-14": 14,
    r: 17,
    "nc-17": 18,
    "tv-ma": 18,
    x: 18,
  },
  DE: {
    "fsk 0": 0,
    0: 0,
    "fsk 6": 6,
    6: 6,
    "fsk 12": 12,
    12: 12,
    "fsk 16": 16,
    16: 16,
    "fsk 18": 18,
    18: 18,
    "ab 0": 0,
    "ab 6": 6,
    "ab 12": 12,
    "ab 16": 16,
    "ab 18": 18,
  },
  GB: { u: 0, uc: 0, pg: 7, "12a": 12, 12: 12, 15: 15, 18: 18, r18: 18 },
  FR: { u: 0, g: 0, "tous publics": 0, 10: 10, 12: 12, 16: 16, 18: 18 },
  AU: {
    g: 0,
    pg: 7,
    m: 15,
    ma: 15,
    "ma 15+": 15,
    "ma15+": 15,
    r: 18,
    "r 18+": 18,
    "r18+": 18,
    "x 18+": 18,
    "x18+": 18,
    rc: 18,
  },
  NZ: {
    g: 0,
    pg: 7,
    m: 0,
    r13: 13,
    r15: 15,
    r16: 16,
    r18: 18,
    rp13: 13,
    rp16: 16,
  },
  BR: { l: 0, livre: 0, 10: 10, 12: 12, 14: 14, 16: 16, 18: 18 },
  CA: {
    g: 0,
    pg: 7,
    "14a": 14,
    "18a": 18,
    r: 18,
    a: 18,
    "13+": 13,
    "16+": 16,
    "18+": 18,
  },
  JP: {
    g: 0,
    pg12: 12,
    "pg-12": 12,
    r15: 15,
    "r-15": 15,
    r18: 18,
    "r-18": 18,
    "rz-18": 18,
  },
};

function lookupTable(countryCode) {
  return MIN_AGE_BY_COUNTRY[countryCode] ?? MIN_AGE_BY_COUNTRY.US;
}

export function certToMinAge(cert, countryCode) {
  if (!cert?.trim()) return null;

  const table = lookupTable(countryCode);
  const normalized = cert.trim().toLowerCase();

  if (normalized in table) return table[normalized];

  const compact = normalized.replace(/\s+/g, "");
  for (const [label, age] of Object.entries(table)) {
    if (label.replace(/\s+/g, "") === compact) return age;
  }
  return null;
}

export function isRestricted(contentMinAge, ageLimitSetting) {
  if (ageLimitSetting == null) return false;
  if (contentMinAge == null) return false;
  return contentMinAge > ageLimitSetting;
}

async function tmdbGet(path, apiKey) {
  try {
    return await tmdbFetch(path, apiKey);
  } catch {
    return null;
  }
}

function pickCertFromMovieReleaseDates(data, countryCode) {
  const results = data?.results ?? [];
  const tryCodes = countryCode !== "US" ? [countryCode, "US"] : ["US"];

  for (const code of tryCodes) {
    const block = results.find((r) => r.iso_3166_1 === code);
    if (!block) continue;

    const dates = block.release_dates ?? [];
    const theatricalFirst = [
      ...dates.filter((d) => d.type === 3),
      ...dates.filter((d) => d.type !== 3),
    ];
    const withCert = theatricalFirst.find(
      (d) => d.certification?.trim(),
    );
    if (withCert) {
      const cert = withCert.certification.trim();
      return { cert, minAge: certToMinAge(cert, code) };
    }
  }
  return { cert: null, minAge: null };
}

function pickCertFromTVContentRatings(data, countryCode) {
  const results = data?.results ?? [];
  const tryCodes = countryCode !== "US" ? [countryCode, "US"] : ["US"];

  for (const code of tryCodes) {
    const block = results.find((r) => r.iso_3166_1 === code);
    const cert = block?.rating?.trim();
    if (cert) return { cert, minAge: certToMinAge(cert, code) };
  }
  return { cert: null, minAge: null };
}

export async function fetchMovieRating(movieId, apiKey, countryCode) {
  try {
    const data = await tmdbGet(`/movie/${movieId}/release_dates`, apiKey);
    if (!data) return { cert: null, minAge: null };
    return pickCertFromMovieReleaseDates(data, countryCode);
  } catch {
    return { cert: null, minAge: null };
  }
}

export async function fetchTVRating(tvId, apiKey, countryCode) {
  try {
    const data = await tmdbGet(`/tv/${tvId}/content_ratings`, apiKey);
    if (!data) return { cert: null, minAge: null };
    return pickCertFromTVContentRatings(data, countryCode);
  } catch {
    return { cert: null, minAge: null };
  }
}

export function getAgeLimitSetting(storage) {
  const raw = storage.get("ageLimit");
  if (raw === null || raw === undefined || raw === "") return null;
  return Number(raw);
}

export function getRatingCountry(storage) {
  return storage.get("ratingCountry") || "US";
}
