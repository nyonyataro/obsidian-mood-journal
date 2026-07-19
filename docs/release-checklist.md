# Release checklist

## Automated

- [x] `npm ci`
- [x] `npm run lint`
- [x] `npm run test:run`
- [x] `npm run build`
- [x] `npm run check`
- [x] `main.js` remains below 200 KB
- [x] `manifest.json`, `versions.json`, README, LICENSE, CI, release workflow, and issue template exist

## Before a beta release

- [ ] Review every UI string in Japanese and English.
- [ ] Run the desktop and Android sections of `docs/manual-test-plan.md`.
- [ ] Check a light theme, a dark theme, and a custom theme.
- [ ] Capture README screenshots or a GIF without private note content.
- [x] Confirm the plugin ID and name are unique in the Community directory (checked against the official index on 2026-07-20; re-check immediately before release).

## Before Community 1.0

- [ ] Test on iOS or obtain confirmation from a trusted external tester.
- [x] Create a public GitHub repository and push the reviewed source.
- [ ] Update `manifest.json`, `package.json`, and `versions.json` to `1.0.0` together.
- [ ] Create a `1.0.0` GitHub Release with `main.js`, `manifest.json`, and `styles.css`.
- [ ] Submit the repository through the Obsidian Community directory.

The final two actions require explicit maintainer approval and are intentionally not automated by this repository.
