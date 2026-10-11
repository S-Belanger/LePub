# Gameplay audit — October 10, 2026

This preserves the initial October 10 audit and its original priorities.
The user subsequently authorized all recommendations and publication to `main`.
See [the completed follow-up and verification limits](followup.md) for the current
route recovery, authored busboy, haze optimization, modules and playable review tools.
Starting revision: `5a6eb03ff226d87d0b5e2645812cda53cdc58b34` on `main`.

## Fixes

| Finding | Cause and resulting behavior | Evidence |
| --- | --- | --- |
| Invisible walls in chair gaps | One rectangle enclosed the whole table/chair group. Physical collision now uses the tabletop/bench body and each visible chair separately. The wider service envelope remains available for deliveries. | Collision tests; [before](desktop-before.png), [after](desktop-after.png), [phone](mobile-after.png) |
| Uneven stopping distance at furniture | A blocked axis discarded the entire step. Sweeps now advance to exact contact, slide along the free axis, and stop even at thin obstacles. | Bar contact x84 before / x86.6 after; speed, diagonal, knockback tests |
| Overlapping wandering patron could trap the player | An overlap rejected even small steps away. Movement now permits steps that reduce penetration, while blocking steps deeper inside. | RED then GREEN overlap-escape regression |
| Alex tripped an idle player and missed approaches from below | Trigger tested only the player's feet anchor rather than the occupied foot rectangle. It now requires movement and measures separation between feet and split ground on all sides. | Four-side/idle regression; actual keyboard trip in Edge |
| Actions worked during Alex's fall | Only movement checked the fall timer. Grabbing, delivering and dropping packs now respect the same 0.9-second lock. | Keyboard/mobile taps; tray/order and reserve checks |
| Recent hazards were absent from player instructions | Help and README now explain the trip, recoverable orders and fading cloud haze. | Small-phone help-scroll/start browser review |

Seats, table dimensions, player/hunter hitbox sizes, speeds, scoring and authored
sprite sources are preserved. Routing and collision share the same physical
rectangles. More open gaps also change which sightlines the hunter can use;
human difficulty tuning remains a separate playtest decision.

## Coverage and limits

| Area reviewed | Actual local evidence |
| --- | --- |
| Furniture/movement | `node tests/collision.js`: 13 checks; chair/stool gaps, solids, route agreement, speed-independent contact, diagonal slide, thin-obstacle sweep, dynamic bodies/escape, world clamp and fractional contact |
| Recent effects | `node tests/effects.js`: 6 checks; idle/four-sided trip, full action lock, two-drink spill with open orders, once per split, movement recovery/reset, haze cap/decay/cellar/reset |
| Serving, routes, chase and shifts | Existing smoke suite: 40 customer entry/exit routes, stations, regulars, hunter states, rounds, hits, bonuses, smoke breaks, visitors, shift/tally/caught/reset; existing Alex/cellar suites |
| Art/loading | Existing character contract/assets suites; real Edge 12 ready atlases, 160 animation mappings per desktop/mobile, talk/lean/slump, missing-sheet fallback |
| Mobile/input | Collision browser: keyboard and diagonal movement, focus loss, native CDP touch stick/cancel, rotation with world position preserved. HUD browser: four phone sizes, toolbar, labels/statuses, booth clearance, scrollable help/start, cellar and reduced motion |
| Effects/visuals | Desktop/mobile, each normal and reduced motion; real trip/action events, haze rendering, reset/help. No browser console/page errors. Reduced motion suppresses the shake and animated haze drift. Native captures inspected |
| Automation | All eight Node suites are included in `.github/workflows/validate.yml`; remote CI has not run for these local changes |

Before-browser capture used five 0.05-second keyboard ticks; the final contact
capture uses six ticks so the player can reach the table. Compare physical
blocking and final contact, not equal-duration displacement. The first after
capture assertion expected contact before enough simulation time had elapsed;
the corrected harness reaches y243 exactly. The detailed journal preserves
this failure and the floating-point/test-fixture corrections.

Browser checks use local headless Microsoft Edge and phone emulation. These
are not physical-device, GPU frame-time, accessibility conformance, multiplayer,
production or long-duration human playtest evidence. No new website/research
dependencies were needed.

Final fresh run: all eight Node suites and the four browser commands below
passed, JavaScript syntax and `git diff --check` passed, and five changed
documentation files had 64 resolving local links. A deterministic sweep of
4,410 player/hunter trajectories from five clear floor positions with axis
offsets from -50 to +50 found zero furniture penetration. This exploration
does not establish every possible route or replace human playtesting.

## Original prioritized improvements

These findings describe the initial audit, before the approved follow-up.
Current implementation and remaining human/device checks are in [the follow-up](followup.md).

1. **Medium — explicit route failure and rerouting.** `computeCustomerPath`
   returns a straight destination when its search finds no walkable route.
   A controlled full-height temporary wall reproduces a returned segment that
   intersects the wall. All 40 shipped customer routes pass, so this is a
   conditional recovery weakness, not evidence that normal seating is broken.
   Add a clear no-route result and a bounded wait/replan policy across the
   customer/waiter/hunter/visitor callers, including obstacles added after
   planning. Avoid changing the return contract in isolation: callers currently
   assume an indexable route. Suggested acceptance: an NPC blocked by a new
   split waits or reroutes and resumes after the blocker clears.
2. **Medium — human chase/balance playtest.** Open chair gaps improve physical
   movement and visibility for both the player and hunter. Existing routes and
   chase checks pass; automated tests cannot establish that the resulting
   difficulty feels right. Play shifts 1–3 on keyboard and touch with a full
   tray, haze, Alex and bathroom urgency before changing speeds or patience.
3. **Low — authored busboy artwork.** The character contract explicitly lists
   the busboy as legacy procedural art debt. A dedicated illustrated
   idle/walk/mop sheet would match the rest of the cast. Ghost's procedural
   material remains an intentional exception. Follow the current visual
   standard and review actual gameplay before changing these assets.
4. **Low — effect cost on real phones.** Haze copies the full backing canvas
   and submits two-unit wobble strips each frame. Normal-scene browser render
   submission measurements are healthy (about 1ms p95 here), but those samples
   do not measure active-haze GPU cost or physical phones. Profile the effect
   on target hardware before optimizing or adding a quality setting.
5. **Low — split the runtime by responsibility.** `game.js` is over 7,700
   lines. Extract collision/routing, effects and input into focused modules
   incrementally, keeping the dependency-free startup and eight suite gates.
   This is a maintenance improvement; no broad refactor was needed for this fix.

## Evidence and reproduction

- [Collision baseline](baseline.json) and [final browser report](report.json).
- [Effects report](effects/report.json), [phone trip](effects/mobile-trip.png),
  [desktop haze](effects/desktop-haze.png), [reduced-motion phone haze](effects/mobile-reduced-haze.png).
- [Full cast report](full-cast/report.json), [phone gameplay](full-cast/mobile-gameplay.png).
- [HUD evidence](hud).
- [Exact request/progress/method/failure journal](../../collaboration/2026-10-10-collision-game-audit.md).

```powershell
node tests/character-art.js
node tests/assets.js
node tests/smoke.js
node tests/alex.js
node tests/cellar.js
node tests/hud.js
node tests/collision.js
node tests/effects.js
node tools/validate-collision.js docs/game-audit/2026-10-10
node tools/validate-effects.js docs/game-audit/2026-10-10/effects
node tools/validate-art.js docs/game-audit/2026-10-10/full-cast
node tools/validate-hud.js docs/game-audit/2026-10-10/hud
git diff --check
```

The two additional audit probes were read-only VM exercises: insert a
`{x:140,y:0,w:2,h:360}` temporary wall and route from `(125,300)` to `(155,300)`;
insert a `w14` dynamic blocker at `(143,300)` and move the `w16` player from
`(140,300)` left by one. The first returns a blocked straight-line fallback;
the second originally returned x140, and now correctly returns x139.
