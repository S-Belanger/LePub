# CLAUDE.md

Guidance for Claude Code (and any other agent) working in this repository.
Keep this file short: the deep reference is [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
and the art standard is [docs/VISUAL-SYSTEM.md](docs/VISUAL-SYSTEM.md).

## What this is

**Le Pub: The Chase** is a top-down pixel-art serving/chase browser game for
the community around CDN (the bar). You play a guy in a deer onesie waiting
tables while a hunter stalks you. Nazim, Sam and Gerald hold the corner booth
all night. It gets passed around on phones at the bar, so it has to teach
itself, load fast on mobile data and read at a glance. It is score-based for
now; a real ending may come later.

Two people own it: Sam leans gameplay and features, Nazim (maisoncastro)
leans infrastructure, design and features.

## Running and checking

- No build step, no package manager, no runtime dependencies. Open
  `index.html`, or serve the folder: `node tools/serve.js` or
  `python -m http.server 8917` (the `.claude/launch.json` config).
- `node tests/run.js` runs everything CI runs: `node --check` on every
  script, then the character-art contract, asset registry, smoke run and
  Alex tests. It also fails if a file under `src/` isn't loaded by
  `index.html`.
- Browser checks (Edge + playwright-core from the npx cache):
  `node tools/validate-art.js <out-dir>` for the cast and gameplay at desktop
  and phone size. `tools/art-review.html` is a live cast gallery.
- Deploy: static Vercel project. `.vercelignore` keeps masters, docs, tests
  and tools out of the deployment.

## Layout

```
index.html        the page; its <script> list IS the load order
style.css         DOM shell in the same walnut/brass/parchment kit as the canvas
src/engine/       game-agnostic systems: font, sound, ambience/music, dialogue scheduler, atlas loader
src/art/          palette, sprite DSL + procedural fallback cast, illustrated-cast contract
src/content/      authored data: dialogue lines, regulars config
src/game/         game state, one file per system, then main.js (loop) and debug.js
src/game/render/  drawing only, one file per pass
assets/           what the page downloads (WebP sprite sheets, splash images)
art-source/       lossless PNG masters for the sprite sheets (not deployed)
docs/             ARCHITECTURE.md, VISUAL-SYSTEM.md
tests/, tools/    checks and the art pipeline
```

## Rules that keep it working

- **Classic scripts, one global scope.** Top-level `const`/`let`/`function`
  are shared across files. A file may only use, *while loading*, what earlier
  files defined; everything is visible at run time. Add a new file to
  `index.html` in the right place (the tests read that list).
- **`resetGame()` (`src/game/reset.js`) is the source of truth for a new
  run.** Any new mutable run state must be reset there or it leaks across a
  restart.
- **Colliders are gameplay, sprites are art.** `ENTITY_HITBOXES` and furniture
  colliders never derive from sprite sizes. The hunter's ~11.6px foot box
  makes narrow gaps walls; check layout edits with `__debug` pathing helpers
  or `node tests/smoke.js`.
- **UI goes through the material kit** (`src/game/render/ui-kit.js`:
  `drawWalnutPlate`, `drawParchmentPlate`, `drawBrassRule`, ...) and the 3x5
  pixel font. No `ctx.fillText`, no rounded cards. `style.css` mirrors the
  same hexes.
- **Station colours are the shared language** for "which counter":
  `BAR_STATIONS[].color` in `src/game/world.js`, repeated in `style.css`.
- **New mechanics should teach themselves**: add a tip card to `HINTS` in
  `src/game/hints.js`, a banner edge in `render/guidance.js` if it changes the
  rules for a while, and a line in the House Rules booklet (`index.html`
  `#rules`).
- **Character art**: read `docs/VISUAL-SYSTEM.md` first. Declare every person
  in `src/art/character-art.js`; masters go in `art-source/sprites/`, then
  `node tools/import-illustrated.js <family>` and
  `node tools/build-sprites.js <family>`. The procedural cast is a fallback,
  not finished art (the busboy is the one documented exception still owed).
- `window.__debug` (`src/game/debug.js`) is disposable console support, not an
  API. Nothing in the game reads it.

## Collaboration

- `HANDOFF.md` is a short "current state" note, not a log. Update it at the
  end of a working session or when leaving something half-done, and keep it
  under a page. History lives in git.
- Commit messages say what changed for the player or the codebase; don't
  make commits whose only content is handoff bookkeeping.
- Work on a branch and merge to `main` once `node tests/run.js` passes.
