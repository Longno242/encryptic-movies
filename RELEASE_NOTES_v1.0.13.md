# Encryptic Movies v1.0.13

## Playback & TV (free mode)

- **TVMaze cross-matching** — Resolves playable TMDB ids via IMDb, TVDB, TMDB title search, and AniList, with title/year verification (fixes wrong series in the player when metadata looked correct).
- **Episode play** — Clicks scroll to the player; clear notices when playback cannot start; TVMaze numeric ids are never used as TMDB ids in embed URLs.
- **Search TMDB fallback** — Button on unmatched TVMaze shows opens search prefilled with the series title.
- **Fullscreen** — No longer scrolls the page to the top when entering fullscreen.

## Home & search UX

- **Continue watching** — Resume hero for the latest title; Continue row shows other in-progress items only.
- **Search** — Home search bar, sidebar **Ctrl+F** hint, **Ctrl+F** / **Ctrl+K** open global search.
- **Accent presets** — Emerald, Rose, and Amber added in Settings → Appearance.

## Downloads

- **Queue** — One active download at a time; additional jobs show **Queued** and start automatically.
- **Open folder** — In-app toast with **Open folder** when a download completes.

## Fixes

- Startup crash **Cannot access before initialization** (toast/download listener ordering).
