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
      "Addressed in v1.0.13 and recent updates. If something still fails, treat it as active and try another source or add a TMDB key.",
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
    id: "free-catalog-movies",
    section: "active",
    severity: "warning",
    status: "By design",
    title: "Free catalog: movie rows need a TMDB key",
    summary:
      "Without a TMDB token you get TV (TVMaze) and anime (AniList). Full movie browse — New Releases, genres, Trending Movies — needs a free key from themoviedb.org.",
    tryThese: [
      "On startup choose Continue with TMDB API key, or Continue with saved TMDB key.",
      "Settings → Change catalog mode, or add/update your TMDB token.",
      "Free mode still shows TV series rows and cached movie posters if you used TMDB before.",
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
      "Hosts limit request rates — extra jobs are queued automatically.",
      "Leave the active job running — it retries with delays.",
      "Download one title at a time when possible.",
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
    id: "tvmaze-match",
    section: "fixed",
    severity: "info",
    status: "Improved in v1.0.13",
    title: "Wrong show in player from TVMaze (free mode)",
    summary:
      "Free-mode TV now cross-matches IMDb, TVDB, TMDB, and AniList before playback, with title verification. Wrong embeds (e.g. metadata correct but wrong series in the player) should be rare; use Search TMDB on the show page if match still fails.",
    tryThese: [
      "Check Playback match under Episodes before playing.",
      "Tap Search TMDB for this title if no match is found.",
      "Add a TMDB key for the most reliable metadata and episodes.",
    ],
  },
  {
    id: "startup-boot",
    section: "fixed",
    severity: "info",
    status: "Fixed in v1.0.11",
    title: "Stuck on startup splash or black screen",
    summary:
      "Bootstrap now runs before the UI loads, with a safety timeout so the splash does not hang at 4%.",
    tryThese: [
      "Restart the app — you should reach home or the catalog chooser.",
      "If it persists, run npm run reset-catalog from the project folder.",
    ],
  },
  {
    id: "home-crash-storage",
    section: "fixed",
    severity: "info",
    status: "Fixed in v1.0.11",
    title: "Home page error: storage is not defined",
    summary:
      "Free-mode catalog cache loading no longer references an undefined variable.",
    tryThese: ["Open Discover again after restart — the home page should load normally."],
  },
  {
    id: "free-catalog-home",
    section: "fixed",
    severity: "info",
    status: "Fixed in v1.0.11",
    title: "Home only showed Continue Watching + Trending Anime",
    summary:
      "Free mode fills browse rows from TVMaze again; cached TMDB movie rows still appear when available. Explore categories scroll to the right row.",
    tryThese: [
      "Scroll down on Discover for full rows, or tap an Explore category.",
      "Use Restore full movie library if you have a saved TMDB key.",
    ],
  },
  {
    id: "catalog-chooser",
    section: "fixed",
    severity: "info",
    status: "Fixed in v1.0.11",
    title: "Catalog choice (free vs TMDB) and saved key",
    summary:
      "Startup asks how you want to browse. A saved TMDB key can sign you in with one tap; Settings has Change catalog mode.",
    tryThese: [
      "Continue with saved TMDB key on the setup screen.",
      "Settings → Change catalog mode to switch without deleting your token.",
    ],
  },
  {
    id: "series-episodes-free",
    section: "fixed",
    severity: "info",
    status: "Fixed in v1.0.11",
    title: "Series had no episodes without a TMDB key",
    summary:
      "TV shows now load season and episode lists from TVMaze in free mode while keeping your TMDB id for playback when known.",
    tryThese: [
      "Open a series — season tabs and episode cards should appear.",
      "Click an episode to play; use ← → on the player or keyboard [ ].",
    ],
  },
  {
    id: "wrong-posters",
    section: "fixed",
    severity: "info",
    status: "Fixed in v1.0.11",
    title: "Wrong poster on cards, correct on detail page",
    summary:
      "Browse cards now use TMDB poster paths when present instead of guessing from Wikipedia or TVMaze search.",
    tryThese: [
      "Refresh home or reopen a title — thumbnails should match the detail page.",
    ],
  },
  {
    id: "episode-auto-next",
    section: "fixed",
    severity: "info",
    status: "Fixed in v1.0.11",
    title: "Series: auto-next episode and on-screen arrows",
    summary:
      "Near the end of an episode the next one starts automatically. Hover the player for ‹ › arrows; Prev/Next and [ ] / arrow keys still work.",
    tryThese: [
      "Play a series episode and let it finish, or use the side arrows while watching.",
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
    status: "Fixed in v1.0.14",
    title: "In-app update download finishes but nothing happens",
    summary:
      "Fixed a Windows download bug that could leave the update stuck after the progress bar. Use the portable Encryptic Movies.exe from Releases (not npm start). The app restarts automatically when install completes.",
    tryThese: [
      "Run the installed portable .exe from Releases, not dev mode.",
      "Use Download & install — wait for “Installing…” then the app should quit and reopen.",
      "If it still fails, download Encryptic Movies.exe manually from GitHub.",
    ],
  },
  {
    id: "post-update-catalog",
    section: "fixed",
    severity: "info",
    status: "Fixed in v1.0.14",
    title: "After update: TMDB key removed or chooser every time",
    summary:
      "Routine in-app updates (e.g. 1.0.12 → 1.0.13) no longer wipe your saved TMDB token. If the chooser still appears but your key is in Credential Manager, use Continue with saved TMDB key — v1.0.14 auto-dismisses that gate when a token is found.",
    tryThese: [
      "Update to v1.0.14+ from GitHub if in-app update hangs.",
      "On the chooser, tap Continue with saved TMDB key if shown.",
      "Settings → Change catalog mode if you need to switch free vs TMDB.",
    ],
  },
  {
    id: "catalog-setup-crash",
    section: "fixed",
    severity: "info",
    status: "Fixed in v1.0.12",
    title: "Crash on catalog setup screen after update",
    summary:
      "Fixed a startup error (“Cannot access before initialization”) that could appear on the browse chooser right after updating.",
    tryThese: [
      "Restart the app — the chooser should load normally.",
      "Choose free or TMDB, then continue into the app.",
    ],
  },
  {
    id: "tv-episode-play",
    section: "fixed",
    severity: "info",
    status: "Fixed in v1.0.13",
    title: "TV episode clicks did nothing or played wrong show",
    summary:
      "Episode play now scrolls to the player, shows a clear notice when no TMDB match exists, and uses verified cross-API matching so TVMaze ids are never sent to embed URLs as TMDB ids.",
    tryThese: [
      "Open Episodes — confirm Playback match shows the right TMDB title.",
      "Use Search TMDB if playback cannot start.",
    ],
  },
  {
    id: "fullscreen-scroll",
    section: "fixed",
    severity: "info",
    status: "Fixed in v1.0.13",
    title: "Fullscreen jumped page to top",
    summary:
      "Entering fullscreen no longer forces the page to scroll to the top, so the player stays in view.",
    tryThese: ["Enter fullscreen from the player — scroll position should stay put."],
  },
  {
    id: "home-continue-dup",
    section: "fixed",
    severity: "info",
    status: "Fixed in v1.0.13",
    title: "Duplicate continue watching on home",
    summary:
      "Resume hero shows your latest title; the Continue row lists other in-progress items only (More in progress).",
    tryThese: ["Open Discover — one resume banner plus a single continue row when you have multiple titles."],
  },
  {
    id: "search-shortcuts",
    section: "fixed",
    severity: "info",
    status: "Fixed in v1.0.13",
    title: "Search hard to discover",
    summary:
      "Home search bar, sidebar Ctrl+F hint, and Ctrl+F / Ctrl+K open global search (Ctrl+K still filters on Downloads).",
    tryThese: [
      "Press Ctrl+F or Ctrl+K from any page except Downloads.",
      "On a TVMaze show without a match, use Search TMDB for this title.",
    ],
  },
  {
    id: "download-queue",
    section: "fixed",
    severity: "info",
    status: "Fixed in v1.0.13",
    title: "Multiple downloads triggered rate limits",
    summary:
      "Only one download runs at a time; additional jobs queue and start automatically. Completed downloads show an Open folder toast.",
    tryThese: [
      "Queue several downloads — extras show Queued until the active job finishes.",
      "Tap Open folder on the completion toast.",
    ],
  },
  {
    id: "app-init-crash",
    section: "fixed",
    severity: "info",
    status: "Fixed in v1.0.13",
    title: "App crash: Cannot access before initialization",
    summary:
      "Fixed startup ordering so download notifications and toasts do not reference helpers before they are defined.",
    tryThese: ["Reload the app — Discover and playback should load normally."],
  },
];

export function getIssuesBySection(sectionId) {
  return KNOWN_ISSUES.filter((issue) => issue.section === sectionId);
}
