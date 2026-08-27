# Encryptic Movies v1.0.16

## Player & sources

- **New servers** — VidFast, MoviesAPI, VidLink, and MultiEmbed (SuperEmbed) for movies/TV (and anime TMDB fallback).
- **Failover fix** — Source auto-switch no longer loops between Neon and VidSrc; it walks the full chain and skips already-tried servers.
- **Broader movie chain** — `vidsrc → neon → videasy → vidfast → moviesapi → vidlink → multiembed → 2embed`.

## Encryptic Shield

- Expanded tracker/ad host blocklists (ads, push, fingerprinting, analytics).
- Stronger in-page scam overlay + notification prompt blocking (Shield v3).
- Removed Cloudflare challenge-platform host block that could break legitimate embeds.
- Updated player User-Agent to Chromium 142; allowlisted new stream hosts for TLS/media.

## Dependencies

- Electron `40.4.1` → `40.10.6`
- React / React DOM `18.2` → `18.3.1`
- Vite `7.3.5` → `7.3.6`
- electron-builder `26.7` → `26.15.7`
- terser `5.46` → `5.51.1`
