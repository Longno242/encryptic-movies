/**
 * Known issues for Issues & bugs. `section`: "active" | "fixed"
 */
export const ISSUE_SECTIONS = [
  {
    id: "active",
    title: "Active issues",
    description:
      "Problems that may still affect playback, downloads, or browsing. Try the steps under each card first.",
  },
  {
    id: "fixed",
    title: "Recently fixed",
    description:
      "These were addressed in recent app updates. If something still fails, treat it as active and try another source or server.",
  },
];

export const KNOWN_ISSUES = [
  {
    id: "anime-playback",
    section: "active",
    severity: "warning",
    status: "Ongoing",
    title: "Some anime episodes still won’t play",
    summary:
      "Anime maps AniList seasons to TMDB episode numbers. The app starts on VidSrc and auto-switches servers (and AniList URLs) when a host fails.",
    tryThese: [
      "Wait for episodes to load, then press Play.",
      "Use Source and try VidSrc, Neon, or 2Embed.",
      "If stuck at 0:00, wait ~6s for auto-failover or tap Switch server on the overlay.",
      "Split-cour shows: pick the correct season tab first.",
      "Subtitles: Settings → Player language → English, use SUB (not DUB), try VidSrc or 2Embed.",
    ],
  },
  {
    id: "player-loading",
    section: "active",
    severity: "warning",
    status: "Mitigated",
    title: "Player stuck on loading",
    summary:
      "Some embed hosts are slow or block the app. Failover usually moves you to another server within a few seconds.",
    tryThese: [
      "Wait ~5 seconds for automatic failover.",
      "Click Source and pick a different server.",
      "Stop playback, go back, and press Play again.",
      "Close pop-out and play in the main window.",
    ],
  },
  {
    id: "download-429",
    section: "active",
    severity: "warning",
    status: "Expected",
    title: "Downloads fail or pause (HTTP 429)",
    summary:
      "Hosts limit request rates. The app throttles downloads on purpose to avoid bans.",
    tryThese: [
      "Leave the job running — it retries with delays.",
      "Download one title at a time.",
      "Open View Log on the download for details.",
      "Try again later if the host is rate-limiting you.",
    ],
  },
  {
    id: "download-tls",
    section: "active",
    severity: "error",
    status: "Network",
    title: "Downloads blocked by TLS or security filter",
    summary:
      "Some routers (e.g. ASUS AiProtection) intercept HTTPS and break downloads with certificate errors.",
    tryThese: [
      "Disable HTTPS filtering or parental blocking on your router.",
      "Test on another network (phone hotspot).",
      "Check the download log for “certificate” or “ASUS”.",
    ],
  },
  {
    id: "tmdb-token",
    section: "active",
    severity: "error",
    status: "Setup",
    title: "Movies and shows won’t load (TMDB token)",
    summary: "Browse and search need a valid TMDB API token in Settings.",
    tryThese: [
      "Open Settings and update your TMDB token.",
      "Check your internet connection.",
      "Use Retry on the banner at the top if TMDB is unreachable.",
    ],
  },
  {
    id: "ssl-embed",
    section: "active",
    severity: "warning",
    status: "Source-specific",
    title: "SSL / connection errors on some sources",
    summary:
      "A server may refuse HTTPS for certain titles or regions (ERR_SSL_PROTOCOL_ERROR).",
    tryThese: [
      "Switch Source to another server.",
      "Try again later — the host may be down.",
      "For anime, prefer VidSrc, Neon, or 2Embed over AllManga.",
    ],
  },
  {
    id: "fullscreen",
    section: "fixed",
    severity: "info",
    status: "Fixed in v1.0.9",
    title: "Fullscreen only grew a little or shook",
    summary:
      "App fullscreen and embed fullscreen now both use true window fullscreen on Windows. Leaving embed fullscreen no longer exits app fullscreen.",
    tryThese: [
      "Use Fullscreen on the Encryptic player bar (top-left) or the embed control (bottom-right).",
      "Press Esc to exit.",
    ],
  },
  {
    id: "anime-subtitles",
    section: "fixed",
    severity: "info",
    status: "Fixed in v1.0.9",
    title: "Anime subtitles missing or wrong language",
    summary:
      "SUB mode now requests your preferred language (e.g. English) for embeds, and the app reapplies subtitle settings after load.",
    tryThese: [
      "Settings → Player language → English, playback mode SUB.",
      "Try VidSrc or 2Embed if one host has no subs for that show.",
    ],
  },
  {
    id: "home-scroll-overlap",
    section: "fixed",
    severity: "info",
    status: "Fixed in v1.0.9",
    title: "Explore panel covered movies while scrolling",
    summary:
      "The category hub no longer sticks on top of browse rows; the continue banner is also smaller so rows stay visible.",
    tryThese: ["Scroll the home page — rows should pass under Explore normally."],
  },
  {
    id: "sidebar-vault-thumb",
    section: "fixed",
    severity: "info",
    status: "Fixed in v1.0.9",
    title: "Sidebar vault poster looked stretched",
    summary:
      "Saved titles in the sidebar use compact poster thumbnails again instead of full-width banners.",
    tryThese: ["Drag titles in the vault to reorder; right-click to remove."],
  },
  {
    id: "popout",
    section: "fixed",
    severity: "info",
    status: "Improved",
    title: "Pop-out player errors or blank window",
    summary: "Pop-out stability improved; rare host crashes may still require a restart.",
    tryThese: [
      "Restart the app after a JavaScript error dialog.",
      "Close pop-out and play in the main window.",
      "Switch Source before opening pop-out if the current server fails.",
    ],
  },
  {
    id: "auto-update",
    section: "fixed",
    severity: "info",
    status: "Added in v1.0.9",
    title: "App updates from GitHub releases",
    summary:
      "Packaged Windows builds can download and install updates when a newer GitHub release is published. Dev mode (npm start) only shows a test prompt if enabled in Settings.",
    tryThese: [
      "Settings → enable Check for updates automatically.",
      "In dev only: run npm run start:test-updates to preview the update flow.",
    ],
  },
];

export function getIssuesBySection(sectionId) {
  return KNOWN_ISSUES.filter((issue) => issue.section === sectionId);
}
