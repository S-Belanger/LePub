# LePub durable handoff

This file is maintained throughout active work, not only at the end. Read the
newest checkpoint before making changes. Do not record secrets or `.env`
contents here.

## 2026-09-14 23:04 America/Toronto — preview PR opened

### Published state

- Committed the complete art-direction, routing, test, and continuity pass as
  `8f7cc5a` (`feat: apply warm overhead pub art direction`).
- Pushed `feat/regulars-responsive-pixel-polish`; the local branch and
  `origin/feat/regulars-responsive-pixel-polish` are synchronized (`0 0`).
- Opened PR #3, **Warm overhead pub visual overhaul**, against `main`:
  <https://github.com/S-Belanger/LePub/pull/3>
- The branch is one commit ahead of `origin/main`, which remains at `e0a5b2e`.
- GitHub had not yet reported a Vercel check, deployment, or bot comment when
  this checkpoint was written. The PR was opened specifically to trigger the
  connected Vercel preview; check PR #3 for the preview URL/status.

### Validated contents of the PR

- Warm overhead environmental pass plus character, HUD, dialogue, and order
  bubble polish based on the supplied reference.
- Exact feet-aware route collision fix and viewport-safe bubble placement.
- `tests/smoke.js`, including all 40 customer routes in/out, regulars, waiter,
  render pass, and authored sprite-palette coverage.
- 20/20 randomized smoke passes plus clean desktop/mobile Edge sessions with
  no console, page, request, or HTTP errors.
- `AGENTS.md` and this ledger provide the interruption failsafe requested by
  the user.

### Remaining work / next action

- This is a visual review checkpoint, not a claim that the reference-level
  redesign is finally approved. Inspect the Vercel preview, collect the user's
  feedback, and continue refining density/materials/animation as needed.
- Commit and push this final ledger update so the remote branch itself contains
  the exact PR/publish state.

## 2026-09-14 23:02 America/Toronto — visual pass browser-validated, ready to publish

### Repository state

- Branch: `feat/regulars-responsive-pixel-polish`; HEAD is still `e0a5b2e`.
- A fresh `git fetch origin --prune` confirms `HEAD...origin/main` is `0 0`;
  no newer collaborator commit needs integration.
- All redesign, routing, documentation, reference, and test changes remain
  uncommitted at this checkpoint. The branch's previous PR (#2) is merged, so
  this work must be opened as a new PR after pushing new commits to the branch.

### Browser validation

- Served the repository locally and exercised the real app in headless Edge.
- Desktop: 1280x720 browser, 320x180 internal canvas at 4x integer scale.
- Mobile: 390x844 browser, 195x360 portrait canvas at 2x integer scale with
  touch UI enabled.
- Staged six seated patrons, multiple order types, regular orders/dialogue,
  score 24, and partial life to inspect the busiest gameplay presentation.
- Both viewports loaded with zero console errors, page errors, failed requests,
  or HTTP responses >= 400.
- Visual review confirmed the overhead routes remain legible, player/Hunter
  markers remain visible, dialogue stays in frame, and rear-seat order bubbles
  are no longer cut off by the top edge/HUD.
- Temporary review images are outside the repository at
  `%TEMP%/lepub-review-desktop.png` and `%TEMP%/lepub-review-mobile.png`.

### Automated validation

- `node tests/smoke.js` passed 20/20 randomized runs.
- The smoke suite now also verifies that every authored sprite pixel resolves
  to a defined palette color.
- `git diff --check` reports no whitespace errors; its only output is the
  existing LF-to-CRLF warning on this Windows checkout.

### Next concrete action

- Stage and review the complete file list, commit the visual overhaul, push the
  feature branch, open a new PR against `main`, then record the commit and PR
  URL in a final handoff checkpoint.

## 2026-09-14 22:58 America/Toronto — character and gameplay-UI pass implemented

### Work completed in this milestone

- Re-authored the Doe and Hunter palettes/sprite pixels with warm outlines,
  highlights, shaded clothing, clearer face detail, and stronger signature
  props while preserving their idle sprite dimensions and gameplay hitboxes.
- Upgraded generic patrons from flat shirt fills to six coordinated
  highlight/base/shadow ramps plus hair, skin, and trouser shading.
- Added restrained broken-pixel ground markers for the player and Hunter so
  their roles remain readable in a crowded room without changing collision.
- Rebuilt order bubbles as larger clipped-corner paper placards with shadows,
  palette-based trim, top stitching, better carried-order emphasis, and
  in-palette patience meters.
- Added viewport/HUD/peer-bubble avoidance for order-bubble placement so rear
  booth orders no longer disappear above the camera or under the score plate.
- Integrated order-bubble bounds into dialogue layout, then restyled dialogue
  as matching clipped-corner paper placards.
- Restyled the compact HUD as a dark forest-green, brass-trimmed pub plate with
  clearer segmented life treatment.

### Validation so far

- `node tests/smoke.js` passes after this milestone.
- `git diff --check` reports no whitespace errors (only the repository's
  existing PowerShell line-ending notices).
- Browser comparison captures are the next action; this checkpoint records
  implementation only and is deliberately not a claim of visual completion.
- The user requested a PR for Vercel preview. After browser validation, commit
  the complete working tree, push `feat/regulars-responsive-pixel-polish`, and
  open a PR into `main`.

## 2026-09-14 22:55 America/Toronto — redesign explicitly remains in progress

### Status correction

- The user asked whether the visual upgrade was complete. It is not.
- The previous checkpoint describes a validated foundation/first environment
  pass, not final visual parity with the supplied reference.
- Do not describe the redesign as finished until browser captures demonstrate
  comparable richness, strong character silhouettes, cohesive lighting and
  materials, polished HUD/bubbles, and preserved overhead playability.
- Immediate next pass: character silhouettes and movement frames, followed by
  HUD/order/dialogue polish and new desktop/portrait comparison captures.
- Repository state is otherwise unchanged from the checkpoint below: HEAD is
  `e0a5b2e`, it matches `origin/main`, and all redesign work is uncommitted and
  unpushed.

## 2026-09-14 22:50 America/Toronto — overhead art-direction pass validated

### Repository state

- Working branch: `feat/regulars-responsive-pixel-polish`.
- HEAD: `e0a5b2e` (`feat: added Jay. Bug fix: customers getting stuck in the entrance`).
- `HEAD` matches `origin/main` (`0 0` from `git rev-list --left-right --count HEAD...origin/main`).
- Local `main` was fast-forwarded to `origin/main` at the same commit.
- The feature branch reports three commits ahead of its own upstream because
  those three commits came from `main`.
- Current work is uncommitted and has not been pushed.

### User direction now in force

- Use the warm, crowded night-pub image as the primary environmental art
  reference.
- Keep the game straight overhead, comparable to Overcooked or the earlier
  playable build. Do not convert gameplay to a literal isometric camera.
- Preserve clear routes, readable characters, order bubbles, and collision
  geometry while translating the reference's palette, materials, lighting,
  and decorative density.

### Work completed

- Fetched `origin` and synchronized the working branch and local `main` with
  collaborator changes from `origin/main`.
- Preserved the pre-existing palette work and supplied reference image through
  the synchronization.
- Found and fixed a routing regression introduced by the merged pathfinding:
  long diagonal route smoothing could shave through the lower corners of
  tables because it sampled only 24 points and inflated colliders symmetrically
  despite feet-anchored collision.
- Replaced sampled line collision with exact segment/AABB intersection.
- Added asymmetric path-footprint inflation, visible endpoint grid anchors,
  and collision validation for every A* edge.
- Added `tests/smoke.js`, a dependency-free mocked DOM/canvas runtime test.
- Added a favicon and removed the browser's missing-favicon request.
- Organized the primary visual reference under `assets/art-direction/` and
  documented how it should be interpreted.
- Implemented the first complete overhead environment pass:
  - honeyed plank floor and forest-green shadow palette;
  - patterned burgundy/green rugs beneath seating clusters;
  - richer outlined bar fronts, counter grain, brass trim, and glassware;
  - alternating burgundy and muted-blue chair upholstery;
  - rainy windows with tiny skyline lights;
  - hanging wall greenery;
  - stronger wood treatment on tables and benches;
  - warmer lamp pools, reduced night/vignette darkness, and a subtle player
    readability halo;
  - matching green/amber page shell, start panel, controls, and touch UI;
  - customer shirt colors and order-bubble frames aligned to the new palette.
- Replaced `assets/gameplay.png` with a staged browser capture of the new build.
- Updated `README.md` and `CLAUDE.md` with the selected direction, testing
  workflow, and implementation guardrails.

### Files currently changed or added

- `AGENTS.md` — continuity/checkpoint rules for future agents.
- `HANDOFF.md` — this durable session ledger.
- `CLAUDE.md` — art-direction guardrails, routing details, smoke-test guidance.
- `README.md` — selected-direction and test documentation.
- `game.js` — pathfinding fixes plus rugs, windows, plants, furniture detail,
  lighting, and palette-based bubble frames.
- `src/scenery.js` — selected warm pub palette and vignette color.
- `src/sprites.js` — customer clothing colors aligned with the room palette.
- `style.css` — green/amber/burgundy shell, overlay, and controls.
- `index.html` — SVG favicon reference.
- `assets/favicon.svg` — pixel beer favicon.
- `assets/art-direction/README.md` — reference interpretation rules.
- `assets/art-direction/warm-overhead-pub-reference.png` — selected visual reference.
- `assets/gameplay.png` — refreshed gameplay screenshot.
- `tests/smoke.js` — dependency-free runtime and routing smoke test.

### Validation completed

- `node --check game.js`: passed.
- `node --check` for every `src/*.js`: passed.
- `node --check tests/smoke.js`: passed.
- `node tests/smoke.js`: passed; loads all eight production scripts, tests all
  40 generic customer routes in and out, three regulars, Jay's full visit, and
  a render pass.
- Twenty randomized smoke-test runs passed after the routing fix; a later set
  of ten randomized runs also passed after the art changes.
- `git diff --check`: passed. PowerShell reports expected LF-to-CRLF warnings,
  but no whitespace errors.
- Real Microsoft Edge/Playwright validation passed at 1280x720 desktop and
  390x844 touch portrait.
- Desktop keyboard input moved the player; portrait selected a 195x360
  internal viewport at integer scale 2 and enabled touch controls.
- Browser console, page-error, request-failure, and required-asset checks were
  clean. The favicon returns HTTP 200/304.
- Desktop, top-room, bottom-room, and full portrait captures were visually
  inspected for readability.

### Remaining work / recommended next step

- Do a character-focused polish pass: strengthen the player and hunter
  silhouettes, check every regular/customer against rugs and lamp pools, and
  refine walk/spray animation readability without changing hitboxes.
- Then polish the HUD and order/dialogue bubbles, especially at the top edge
  and in the full-room portrait view.
- Re-run `node tests/smoke.js`, syntax checks, `git diff --check`, and real
  desktop/portrait browser captures after each pass.
- Review the complete diff with the user before committing or pushing.
