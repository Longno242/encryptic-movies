# Encryptic Movies v1.0.14

## Fixes

- **TMDB key after update** — Routine in-app updates no longer delete your saved API token. The one-time catalog chooser only runs when upgrading from versions before v1.0.11. If a token is still in Credential Manager, the chooser is dismissed automatically.
- **In-app update hang** — Fixed a Windows download bug where the update could finish downloading but never install (stuck progress / nothing happens).
- **Saved key on chooser** — “Continue with saved TMDB key” is shown again on the post-update screen when your token is still stored.

## Notes

- In-app updates require the **portable** `Encryptic Movies.exe` from [Releases](https://github.com/Longno242/encryptic-movies/releases) — not `npm start` dev mode.
- If v1.0.13 update failed, download **v1.0.14** manually once; later updates should work in-app.
