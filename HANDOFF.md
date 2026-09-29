# LePub handoff

Current state only; history is in git (the old 180 KB log is at `git show a2fcc23:HANDOFF.md`).

## 2026-09-29 — branch `polish/community-release` (pushed, not merged)

Done on this branch (see the commit message for the full list): seated-patron draw
fix, `game.js` split into `src/game/`, pause on blur, gamepad, touch name entry,
tip cards, guidance layer (action prompt, station colours/badges, edge arrows,
banners, labelled HUD), House Rules booklet, ambience + music, +60 dialogue lines,
WebP sprites (12.8 MB -> 3.8 MB, PNG masters in `art-source/`), start gate,
`tests/run.js` + CI, `.vercelignore`, docs rewrite, unused files removed.

`node tests/run.js` passes.

## Unfinished / next

- `node tools/validate-art.js` fails at "orientation must switch": a timing race in
  the harness (resize event vs. the captured frame). Standalone repro shows the
  game rotates correctly. Fix the harness to wait for the resize, then re-run.
- Music and murmur levels are untested by ear; listen and tune `MUSIC_LEVEL` /
  `MURMUR_*` in `src/engine/ambience.js`.
- Shared online leaderboard not built: needs a backend decision (the Supabase org
  belongs to other businesses and its free projects are used).
- Busboy still procedural art (needs illustrated sheet).
- Not merged to `main`, not deployed.
