/** Renderer-side subtitle UI helpers (language list + provider badges). */

export const SUBTITLE_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "de", label: "German" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "ru", label: "Russian" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh-CN", label: "Chinese" },
  { code: "ar", label: "Arabic" },
  { code: "tr", label: "Turkish" },
  { code: "sv", label: "Swedish" },
  { code: "da", label: "Danish" },
  { code: "cs", label: "Czech" },
  { code: "hu", label: "Hungarian" },
];

export const LANG_LABEL = Object.fromEntries(
  SUBTITLE_LANGUAGES.map(({ code, label }) => [code, label]),
);

const BADGE_THEMES = {
  subdl: {
    background: "rgba(99,149,255,0.15)",
    color: "#6395ff",
    border: "rgba(99,149,255,0.3)",
  },
  wyzie: {
    background: "rgba(180,130,255,0.15)",
    color: "#b482ff",
    border: "rgba(180,130,255,0.3)",
  },
};

export function sourceBadgeStyle(sub) {
  const theme = sub.via_subdl ? BADGE_THEMES.subdl : BADGE_THEMES.wyzie;
  return {
    fontSize: 9,
    fontWeight: 700,
    padding: "1px 5px",
    borderRadius: 3,
    background: theme.background,
    color: theme.color,
    border: `1px solid ${theme.border}`,
    textTransform: "uppercase",
    flexShrink: 0,
  };
}

export function sourceBadgeLabel(sub) {
  return sub.via_subdl ? "SubDL" : "Wyzie";
}
