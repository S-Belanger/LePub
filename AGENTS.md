# LePub agent continuity rules

## Mandatory startup

Before changing the repository:

1. Read `HANDOFF.md` completely.
2. Inspect `git status --short --branch` and compare it with the handoff.
3. Preserve all uncommitted work unless the user explicitly asks to discard it.
4. For visual, character, texture or UI work, read `docs/VISUAL-SYSTEM.md` and
   view its linked shipped sprite references before authoring. It is the current
   art standard; older art plans and historical handoffs do not override it.

## Character art requirements

- Declare every new character/appearance in `src/character-art.js`, with
  illustrated source art and all required directional/special poses.
- Follow `docs/VISUAL-SYSTEM.md` for materials, camera, density, pivots and
  review. Procedural fallback is resilience, not completed production artwork.
  Existing busboy/ghost exceptions are explicit; do not copy them for new people.
- Run `node tests/character-art.js`, `node tests/assets.js`, and
  `node tests/smoke.js` before publishing character changes. Run real-browser
  art checks and inspect desktop/mobile captures for visual changes; record
  evidence and limits in `HANDOFF.md`.

## Mandatory progress checkpoints

`HANDOFF.md` is the durable source of truth when a chat ends, context is
compacted, or another agent continues the work. Do not wait until the end of a
session to update it.

Update `HANDOFF.md` immediately after any of these events:

- pulling, merging, rebasing, switching branches, or resolving conflicts;
- making a substantial code, design, asset, or architecture change;
- discovering or fixing a bug;
- completing a test or browser-validation milestone;
- changing the agreed direction or making a material implementation decision;
- encountering a blocker or leaving unfinished work.

Before a long-running tool call or whenever the remaining context may be low,
checkpoint first. A checkpoint must include:

- local date/time, branch, HEAD commit, and upstream relationship;
- what the user asked for and the decisions currently in force;
- files changed and what changed in each;
- tests run and their exact outcome;
- unfinished work, risks, and the next concrete step;
- whether changes are committed or pushed.

Keep the newest checkpoint at the top. Preserve older checkpoints below it as
history. Never include secrets, `.env` contents, credentials, or private keys.

## Mandatory handoff

Before ending a substantial work session, update `HANDOFF.md` one final time
and make sure it agrees with the actual Git status. If the session terminates
unexpectedly, the most recent milestone checkpoint is the failsafe.
