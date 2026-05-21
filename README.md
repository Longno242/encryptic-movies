# Encryptic Movies

[![Latest release](https://img.shields.io/github/v/release/Longno242/encryptic-movies?label=release)](https://github.com/Longno242/encryptic-movies/releases/latest)

Cross-platform Electron desktop app for browsing movies, TV series, and anime. Metadata from [TMDB](https://www.themoviedb.org/) and [AniList](https://anilist.co/); playback uses third-party embed providers in-app.

**Latest:** [v1.0.12](https://github.com/Longno242/encryptic-movies/releases/tag/v1.0.12) — Windows in-app updates, post-update catalog chooser, free/TMDB browse fixes, Issues page updated.

## Features

- **Browse & play** — Movies, TV, and anime with a modern home layout (continue watching, category hub, browse rows)
- **Anime** — TMDB + AniList mapping, VidSrc-first sources, automatic server failover, English subtitle preference
- **Player** — In-app fullscreen (including embed controls), pop-out window, faster load with source switching
- **Downloads** — Built-in HLS downloads (ffmpeg bundled on Windows)
- **Library** — Watchlist, history, progress, collapsible sidebar with saved vault
- **Issues & bugs** — In-app page with active issues and recently fixed items
- **Auto-update** — Packaged Windows builds check [GitHub Releases](https://github.com/Longno242/encryptic-movies/releases) and can download/install updates
- **Encryptic Shield** — Ad/tracker blocking in player sessions
- **Windows installer** — Custom setup wizard (install, repair, uninstall, update check)

## Requirements

- **TMDB Read Access Token** — see [tmdb-tutorial.md](./tmdb-tutorial.md)
- Users enter their own API key in the app (stored locally)

## Download

Get the latest build from **[Releases](https://github.com/Longno242/encryptic-movies/releases/latest)**:

| Platform | File | Notes |
|----------|------|--------|
| Windows | `Encryptic Movies Setup.exe` | Recommended installer |
| Windows | `Encryptic Movies.exe` | Portable; used by in-app auto-update |
| Linux | `.AppImage`, `.deb` | |
| macOS | `.dmg` | Intel + Apple Silicon |

## Auto-update (Windows packaged builds)

1. Install or run **`Encryptic Movies.exe`** from a release (not `npm start`).
2. Keep **Settings → Check for updates automatically** enabled.
3. When a newer release is published, the app prompts to download and restart.

Dev preview of the update UI:

```bash
npm run start:test-updates
```

## Development

```bash
npm install
npm start
```

| Script | Purpose |
|--------|---------|
| `npm start` | Build UI and launch Electron |
| `npm run dev` | Vite watch build (run Electron separately) |
| `npm run start:test-updates` | Dev mode with fake update prompt |
| `npm run restart` | Kill Electron, rebuild, relaunch (Windows) |

## Build locally

```bash
npm run dist:win-desktop   # Windows portable .exe → dist/
npm run dist:win-setup     # Windows Setup.exe (wizard + app)
npm run dist:linux         # Linux AppImage, .deb, pacman
npm run dist:mac           # macOS DMG (x64 + arm64)
```

## Releases

Pushing a version tag (`v*`) runs [`.github/workflows/release.yml`](./.github/workflows/release.yml), which builds **Windows**, **Linux**, and **macOS** artifacts and publishes a [GitHub Release](https://github.com/Longno242/encryptic-movies/releases).

```bash
# After committing on master:
git tag -a v1.0.12 -m "Encryptic Movies v1.0.12"
git push origin master
git push origin v1.0.12
```

Repo config for update checks: [`github.config.json`](./github.config.json).

## Project layout

```
├── electron/           # Main process, IPC, player webview preload
├── src/                # React UI (Vite)
├── installer/          # Custom Windows setup wizard
├── scripts/            # Build helpers
└── .github/workflows/  # CI release builds
```

## Documentation

- [tmdb-tutorial.md](./tmdb-tutorial.md) — TMDB API token setup
- [DOCUMENTATION.md](./DOCUMENTATION.md) — App documentation (if present)

## Legal

This app does not host media. You are responsible for complying with laws in your region.

## License

GPL-3.0 — see [LICENSE](./LICENSE).
