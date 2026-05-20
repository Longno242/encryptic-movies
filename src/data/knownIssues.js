/**
 * Known issues shown in Issues & bugs. Update when fixing or discovering problems.
 */
export const KNOWN_ISSUES = [
  {
    id: "anime-playback",
    severity: "warning",
    status: "Fix in progress",
    title: "Anime movies & series may not play",
    summary:
      "Anime titles can load, buffer forever, or fail depending on the source and episode. This is an active area of work for Project Encryptic.",
    tryThese: [
      "Open the player and click the Source button (bottom-left overlay).",
      "Try another server (e.g. AllManga, Neon, or other anime sources).",
      "Wait a few seconds — the app may auto-switch to Neon if loading stalls.",
      "For series, pick the correct season/episode, then switch source if needed.",
    ],
  },
  {
    id: "player-loading",
    severity: "warning",
    status: "Mitigated",
    title: "Player stuck on loading",
    summary:
      "Some embed hosts are slow or block the app. Loading can hang on the first server you try.",
    tryThese: [
      "Wait ~5 seconds for automatic failover to another server.",
      "Click Source on the player and pick a different server manually.",
      "Stop playback, go back, and press Play again.",
      "Close pop-out (if open) and play in the main window instead.",
    ],
  },
  {
    id: "download-429",
    severity: "warning",
    status: "Expected behavior",
    title: "Downloads fail or pause (HTTP 429)",
    summary:
      "Hosts limit how many requests you can make. The app downloads slowly on purpose to avoid bans.",
    tryThese: [
      "Leave the download running — it will retry with delays.",
      "Download one title at a time instead of several at once.",
      "Open View Log on the download for the exact error.",
      "Try again later if the host is rate-limiting you.",
    ],
  },
  {
    id: "download-tls",
    severity: "error",
    status: "Network / router",
    title: "Downloads blocked by TLS or security filter",
    summary:
      "Some routers (e.g. ASUS AiProtection) intercept HTTPS and break downloads with certificate errors.",
    tryThese: [
      "Disable “HTTPS filtering” or parental blocking on your router.",
      "Use a different network (phone hotspot) to test.",
      "Check the download log for “certificate” or “ASUS” in the message.",
    ],
  },
  {
    id: "fullscreen",
    severity: "info",
    status: "Use app control",
    title: "Fullscreen only grows a little or shakes",
    summary:
      "The fullscreen button inside the video site is disabled on purpose — it conflicts with the app layout.",
    tryThese: [
      "Use the app’s Fullscreen button on the player overlay (not the embed’s).",
      "Press Esc to exit fullscreen.",
      "Pop-out window: use the maximize button on the pop-out title bar.",
    ],
  },
  {
    id: "popout",
    severity: "info",
    status: "Improved",
    title: "Pop-out player errors or blank window",
    summary:
      "The pop-out window loads the stream in a separate window. Rare crashes can still happen on some hosts.",
    tryThese: [
      "Restart the app if you see a JavaScript error dialog.",
      "Close pop-out and play in the main window instead.",
      "Switch Source before opening pop-out if the current server fails.",
    ],
  },
  {
    id: "audio-video",
    severity: "info",
    status: "Improved",
    title: "No audio or video jumping during playback",
    summary:
      "Some embeds start muted or resize their player, which can cause layout flicker.",
    tryThese: [
      "Unmute in the embed player controls if you hear nothing.",
      "Switch Source to another server.",
      "Avoid using the embed’s own fullscreen — use the app fullscreen button.",
    ],
  },
  {
    id: "tmdb-token",
    severity: "error",
    status: "Configuration",
    title: "Movies and shows won’t load (TMDB token)",
    summary:
      "Browse and search need a valid TMDB API token stored in Settings.",
    tryThese: [
      "Open Settings and update your TMDB token.",
      "Check your internet connection.",
      "Use the Retry button on the banner at the top if TMDB is unreachable.",
    ],
  },
  {
    id: "ssl-embed",
    severity: "warning",
    status: "Source-specific",
    title: "SSL / connection errors on some sources",
    summary:
      "A server may refuse HTTPS connections (ERR_SSL_PROTOCOL_ERROR) for certain titles or regions.",
    tryThese: [
      "Switch Source to a different server.",
      "Try again later — the host may be down.",
      "For anime, prefer AllManga or other anime-specific sources.",
    ],
  },
];
