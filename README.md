# Encryptic Movies

Cross-platform Electron desktop app for browsing movies, TV series, and anime. Metadata from [TMDB](https://www.themoviedb.org/) and [AniList](https://anilist.co/); playback uses third-party embed providers in-app.

## Features

- Stream movies, TV, and anime
- Built-in HLS downloads (ffmpeg bundled on Windows)
- Watchlist, history, progress, category hub
- Custom setup wizard on Windows (install, repair, uninstall, update check)
- Ad/tracker blocking in player sessions

## Requirements

- **TMDB Read Access Token** — see [tmdb-tutorial.md](./tmdb-tutorial.md)
- Users enter their own API key in the app (stored locally)

## Development

```bash
npm install
npm start
```

## Build locally

```bash
npm run dist:win-desktop   # Windows portable .exe
npm run dist:win-setup     # Windows Setup.exe (wizard + app)
npm run dist:linux         # Linux AppImage, .deb, pacman
npm run dist:mac           # macOS DMG (x64 + arm64)
```

## Releases

Tagged pushes (`v*`) build **Windows**, **Linux**, and **macOS** artifacts via GitHub Actions and attach them to a [GitHub Release](https://github.com/Longno242/encryptic-movies/releases).

| Platform | Downloads |
|----------|-----------|
| Windows | `Encryptic Movies Setup.exe` (recommended), `Encryptic Movies.exe` (portable) |
| Linux | `.AppImage`, `.deb` |
| macOS | `.dmg` (Intel + Apple Silicon) |

## Project layout

```
├── electron/           # Electron main process
├── src/                # React UI (Vite)
├── installer/          # Custom Windows setup wizard
└── scripts/            # Build helpers
```

## Legal

This app does not host media. You are responsible for complying with laws in your region.

## License

GPL-3.0 — see [LICENSE](./LICENSE).
