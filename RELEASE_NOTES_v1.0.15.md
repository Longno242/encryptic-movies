# Encryptic Movies v1.0.15

## Fixes

- **Installer showcase posters** — Replaced mismatched/duplicate local poster images and broken IMDb CDN links with correct artwork (Wikimedia / TMDB). Showcase titles now match the posters on the setup carousel.
- **Safer poster fetching** — Installer poster requests validate hostnames properly instead of loose URL substring checks.

## Security

- **Dependency updates** — Patched Dependabot findings in the app and installer (including vite, undici, tar, form-data, brace-expansion, js-yaml, tmp, ws, esbuild, and related packages).
- **Electron installer** — Re-enabled `webSecurity` for the setup wizard (posters load as data URLs via IPC).
- **Downloader** — Removed TLS certificate bypass; blocked localhost/private SSRF targets before stream downloads.
- **TVMaze summaries** — HTML stripping now uses `DOMParser` instead of fragile multi-pass regex.

## Notes

- In-app updates use the **portable** `Encryptic Movies.exe` from [Releases](https://github.com/Longno242/encryptic-movies/releases).
- Windows users can also install via **Encryptic Movies Setup.exe**.
