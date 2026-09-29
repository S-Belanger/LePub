# LePub agent rules

Read `CLAUDE.md` first; it applies to every agent, not only Claude.

## Before changing anything

1. Read `HANDOFF.md` (one page: the current state and anything half-done).
2. Check `git status --short --branch` against it. Never discard uncommitted
   work you didn't make unless the user says so.
3. For visual, character, texture or UI work, read `docs/VISUAL-SYSTEM.md`
   and look at the shipped sprite sheets it links before authoring.

## Character art

- Declare every new character in `src/art/character-art.js` with illustrated
  source art and every required directional/special pose.
- PNG masters go in `art-source/sprites/`; run `tools/import-illustrated.js`
  then `tools/build-sprites.js`. Never hand-edit the WebP builds.
- Run `node tests/run.js` and `node tools/validate-art.js <out-dir>`, and look
  at the desktop and phone captures before calling art done.

## Handoff

`HANDOFF.md` is overwritten, not appended: keep it to the current branch and
its state, what was done this session, what's unfinished and the next step,
and anything risky. Update it when you finish a session or stop mid-task.
Never put secrets, `.env` contents or credentials in it. Git history is the
log.
