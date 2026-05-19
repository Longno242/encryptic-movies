# Encryptic Movies — Documentation

Encryptic Movies is a desktop app for browsing movies, TV series, and anime. Metadata comes from [TMDB](https://www.themoviedb.org/). Playback uses third-party embed providers inside the app.

---

## First launch — TMDB token

1. Get a **free** TMDB account and create an API key at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api).
2. Copy the **API Read Access Token** (long JWT starting with `eyJ`). Do **not** use the shorter “API Key” field alone.
3. Paste it on the welcome screen and click **Save token & continue**.

You can **Skip for now** to open the app without metadata (search and browse will not work until a token is saved).

See also: [tmdb-tutorial.md](./tmdb-tutorial.md) for step-by-step screenshots.

---

## How your API key is stored (important)

Encryptic Movies does **not** save your TMDB token as plain text in a file you can read in Notepad.

### Windows (default)

| What | Where |
|------|--------|
| **TMDB token** | **Windows Credential Manager** → **Windows Credentials** → **Encryptic Movies** → `apikey` |
| **Subtitle keys** (optional) | Same place: `subdlApiKey`, `wyzieApiKey` |

The token is stored using the OS credential vault (via `keytar`). Only your Windows user account can access it through the system APIs Encryptic Movies uses.

**To view or remove it manually:**

1. Press **Win**, search **Credential Manager**.
2. Open **Windows Credentials**.
3. Find **Encryptic Movies** and expand the entry (e.g. `apikey`).
4. Use **Remove** to delete the token (next launch will show the welcome screen again).

### Fallback (if Credential Manager is unavailable)

The app may fall back to an encrypted file:

`%APPDATA%\mov\secure-store.json` (or `encryptic-movies` on fresh installs)

On Windows this uses **DPAPI** (`v10…` encrypted blobs). It is still **not** your raw JWT in readable form, but a file exists on disk. The app migrates secrets to Credential Manager when possible.

### What is stored in normal app data

`%APPDATA%\mov\` also holds non-secret data, for example:

- Watch history, progress, saved titles (localStorage-style settings)
- Download list, block stats, caches  
- **Not** your TMDB token (after migration to Credential Manager)

---

## Automatic login

After you save your token once, Encryptic Movies **loads it automatically** on every startup. You do not need to paste it again unless you:

- Click **Change API Token** in Settings → General, or  
- Remove the credential in Windows Credential Manager.

---

## Home screen

- **Release year** — filter a row of popular movies from that year.
- **Category chips** — jump to Recently Added, Most Popular, Top Viewed, genres, etc.
- Rows can be reordered or hidden in **Settings → Home layout**.

---

## Library, downloads, player

- **Your Vault** — watch history, in-progress titles, and pinned sidebar items.
- **Downloads** — HLS downloads (requires external tools; see README).
- **Player** — embedded webview; ad/tracker blocking in player sessions.
- **Pop-out** — separate window for playback.

---

## Settings overview

| Area | Purpose |
|------|---------|
| General | TMDB token, updates, version |
| Appearance | Theme accent, font size, compact mode |
| Home layout | Show/hide and reorder home rows |
| Player | Default source, anime source, progress |
| Subtitles | Wyzie / SubDL keys (also in Credential Manager) |
| Backups | Export/import app data (token can be included if you choose) |
| Danger zone | Reset app, clear downloads |

---

## Privacy notes

- Your TMDB token is sent only to **api.themoviedb.org** for metadata.
- Stream URLs are loaded from third-party embed sites you choose in settings.
- Encryptic Movies does not operate its own streaming servers.

---

## Keyboard shortcuts

| Keys | Action |
|------|--------|
| `Ctrl+F` | Open search |
| `Ctrl+Z` | Back |
| `Ctrl+R` | Reload app |
| `?` | Shortcuts panel |
| `Esc` | Close modal / search |

---

## Troubleshooting

**“Invalid token”** — Use the Read Access Token (JWT), not the short API key. Regenerate at TMDB if needed.

**Movies won’t load** — Check internet and token in Credential Manager.

**Token visible in a file** — Open the app once after updating; it should migrate to Credential Manager and remove the old `secure-store.json` entry.

---

## Development

```bash
npm install
npm start
```

Build installers: `npm run dist:win` (and other platforms in package.json).
