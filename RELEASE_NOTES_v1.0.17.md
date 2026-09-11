# Encryptic Movies v1.0.17

## Getting started

- **No TMDB setup screen** — The app signs into the catalog automatically so you can browse movies and TV immediately.
- **Support** — Sidebar → Support opens the Encryptic contact page in your browser.

## Player & Shield

- **Source failover** — Switching servers no longer resets the tried list mid-stream, so dead sources are skipped cleanly.
- **Shield** — Safer handling of large player iframes, captcha/human-verification pages, and allowlisted media hosts (`users.videasy.net`, etc.).
- **Anime** — Avoids broken `/tv/0/...` routes; prefers AniList builders when no TMDB id is available.
- **Health checks** — Softened false “unavailable” detection that could kill working streams.

## Security

- **Dependabot** — Electron 41.10.x, postcss, nanoid, undici, js-yaml; installer deps aligned with electron-builder 26.15.7.
- **CodeQL** — Downloader validates redirect targets; workflow runs on `master`.
