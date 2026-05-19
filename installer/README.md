# Encryptic Movies — Custom Setup Installer

Hybrid installer: this wizard + `Encryptic Movies.exe` bundled as payload.

## Build the setup EXE (recommended)

From project root:

```bash
npm run dist:win-setup
```

This will:

1. Build **Encryptic Movies** portable app (`dist/Encryptic Movies.exe`)
2. Copy it into `installer/payload/`
3. Build **Encryptic Movies Setup.exe** (~app size + wizard)
4. Copy setup to your Desktop

Output: `dist/Encryptic Movies Setup.exe`

## Developer preview (no full build)

```bash
npm run installer:preview
```

Uses payload from `dist/` if present; otherwise preview-only simulated install.

## Posters

```bash
npm run installer:cache-posters
```

## Updates

Set `GITHUB_REPO` in `installer/updateConfig.js` for live update checks in the setup app.
