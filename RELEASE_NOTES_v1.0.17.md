# Encryptic Movies v1.0.17

## Security

- **Dependabot** — Electron 41.10.x (sandbox iframe fix), postcss 8.5.23, nanoid 3.3.18, undici 6.28.0, js-yaml 4.3.1; installer deps aligned with electron-builder 26.15.7.
- **CodeQL** — Downloader validates redirect targets before following; CodeQL workflow now runs on `master`.
- **extract-zip** — Installer Electron upgrade removes vulnerable transitive `extract-zip` in favor of `@electron-internal/extract-zip`.
