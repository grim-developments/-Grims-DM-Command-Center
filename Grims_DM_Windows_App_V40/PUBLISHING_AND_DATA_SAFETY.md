# Public release setup — Grim’s DM Command Center V40

## Before releasing publicly
1. Create a PUBLIC GitHub repository for release artifacts (do not upload copyrighted books unless you have redistribution rights).
2. Edit `package.json` build.publish owner/repo and `update-config.json` owner/repo, then set `enabled: true`.
3. Set a version greater than the last published version, build a signed Windows NSIS installer with `npm install` then `npm run build:win`.
4. Publish the installer, `.blockmap` and `latest.yml` together in the matching GitHub Release. Never omit `latest.yml`.
5. For CI publishing, set `GH_TOKEN` securely in CI; do not commit tokens. Run `npm run release:win` on a Windows runner.
6. Test update from previous installed version with REAL user data before broad rollout.
7. For production, sign installers with a trusted Windows code-signing certificate; test SmartScreen behavior.

## Data safety
- Stable Electron `appId`: com.grims.dmcommandcenter; stable `userData`: %APPDATA%\grims-dm-command-center. Do not change either without migration.
- Electron localStorage persists in the app profile and survives ordinary in-place installs/uninstalls that preserve app data.
- Rolling snapshots of all `grim-` localStorage keys are stored in `campaign-backups` within app data (30 recent snapshots, maximum 80MB each). Backups are local and not cloud synced.
- App > Open Backup Folder opens these snapshots.
- `window.grimListBackups()` and `window.grimRestoreBackup(name)` are recovery helpers (available in developer console), with confirmation and pre-restore backup.
- Before a major overhaul, test migration on a copy of real user data and keep old versions available for rollback.
- Existing Chrome/file:// data does NOT migrate automatically. A dedicated migration workflow is still required.
- Do NOT use NSIS uninstall hooks that delete userData.

## Important release caveats
- Automatic updates are DISABLED until a real public release repository is configured.
- The included D&D book PDFs may not be legally redistributable publicly. Remove them from public builds unless you have distribution rights; offer user-supplied imports instead.
- This package is source for a Windows installer, not a precompiled installer.
- A full end-to-end Windows test, updater test and migration test are required before calling this production-ready.
