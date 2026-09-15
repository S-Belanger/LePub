# LePub durable handoff

This file is maintained throughout active work, not only at the end. Read the
newest checkpoint before making changes. Do not record secrets or `.env`
contents here.

## 2026-09-15 16:58 America/Toronto — session resumed in Claude Code; UI rehaul started

### Context recovered after the Codex session was cut off

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `32a1fef`, in sync with
  its upstream; PR #3 is still a draft with the rejected first preview.
- The 23:22 high-density renderer/furniture work is still present as
  uncommitted changes (`game.js`, `src/scenery.js`, `src/sprites.js`,
  `tests/smoke.js`, docs, `assets/gameplay.png`). `node tests/smoke.js`
  passes on this tree, so it is a safe base to build on.

### Direction in force for this session

- User request: a complete rehaul of the *UI* so it matches the cinematic
  warm-pub look of the sprites and room (see
  `assets/art-direction/README.md`, acceptance item 6).
- Scope: in-canvas HUD, order tickets, dialogue placards, caught and level
  splash plates, floating text; plus the DOM shell — corner chips, start/help
  overlay, restart button, touch stick/action button, letterbox surround.
- Material language: dark walnut boards, brass rivets/trim, parchment paper,
  burgundy leather, amber lamp glow. Crisp stepped pixels, no rounded modern
  cards, no blurred glass.
- Keep gameplay geometry, routes, hitboxes, and all input funnels unchanged.
- Python is not on this machine's PATH; use `node` for scripts and
  `npx serve`/Edge for browser checks.

### 18:45 — visual pass 1: darkness + additive light, 3/4 furniture (committed)

- User rejected the state as "still the old style"; executing the reference
  look now. Decision: drawing switches to three-quarter top-down (fronts on
  everything, characters facing camera) while colliders/routes/hitboxes stay.
- Render order now: room → `drawDarkness(DARK_FLOOR)` (multiply) → spills →
  y-sorted → `drawDarkness(DARK_SCENE)` → `drawFloorLight` (additive) →
  `drawForeground` → grade. Floor ends near-black between lamps; furniture
  and people take only the lighter step.
- Seven pendant lamps (`DECOR.lamps`, pool point + `LAMP_DROP` 26 above it):
  wide warm pool + hot core (`HOT_RGB`), long broken varnish streak, a
  stepped additive cone from the green enamel shade to the pool, big fixture
  with brass rim and bulb. Candle glows stronger; bottle light along every
  counter (`glowFor(18, HOT)` every 20 px); halos on Doe (r22) and hunter.
- Bar: 9 px panelled front with brass foot rail, side face on the stem;
  `drawTapRow` (brass fonts + handles) on the taps, `drawBottleGantry`
  (two lit shelves of bottles, hanging glasses, its own lamp) down the stem,
  `drawKitchenHatch` (heat lamp, plates) on the foot. Tables: 5–8 px fronts
  with panel slats and turned legs. Chairs: cushion + back rail placed away
  from the table (north behind, south in front, sides outside). Wall benches
  get a buttoned back. Night tint reduced (0.03–0.16), vignette 0.55.
- Smoke passes; review frame captured (scratchpad `review/review-frame.png`).
- Next: Doe + hunter re-authored at 32×36 backing pixels with faces; then
  regulars/customers; then perimeter props; then ticket weight.

### 18:20 — honest art-direction review published

- Branch already in sync with origin at the ledger commit; nothing new to
  push. Review page (reference vs current frame, 4x crops, six gaps, ranked
  next pass): <https://claude.ai/code/artifact/39030cca-bc0a-4f34-b45e-380df32ca476>
- Verdict: UI matches the reference's material language; room lighting,
  character resolution, furniture fronts, perimeter props and ticket weight
  do not. Proposed order: (1) lighting overhaul — darken the baked room,
  additive pendant cones/pools, specular streaks, lit bar/bottles, rim on
  leads; (2) Doe + hunter re-authored at 36–40 backing px with faces;
  (3) regulars + walk-ins likewise; (4) furniture front faces + back-bar
  (after the user's plan arrives); (5) perimeter props + fireplace;
  (6) compact tickets at rest.
- Capture tooling for review frames: scratchpad `capture-review.js`.
- Waiting on: user's go-ahead on that order, and the bar plan.

### 18:03 (wall clock; earlier stamps in this session were estimates) — pushed and previewed

- Branch at `302047f`, in sync with upstream, 11 commits ahead of
  `origin/main`. Preview: <https://lepub-ft9jl787e-maisoncastros-projects.vercel.app>
  (`dpl_DnwySQjAqqXZdhLYsJzbXBaB3AN2`); link posted on PR #3. Draft, not for
  merging. Native Vercel checks still need the repo owner to install the
  Vercel GitHub App (see 17:26).
- Waiting on: the user's real bar architectural plan for a layout pass.

### 19:35 — batch E (juice) done; docs updated; all ten recommendations in

- Hit-stop (`HIT_STOP` 0.08 s freeze) and the emptied HUD pint rocking with
  a splash (`pintKnockTimer`/`pintKnockIndex`).
- `drawDangerEdge()`: stepped red bands on the hunter's side while he
  chases within `DANGER_RANGE` 80, pulsing, stronger off camera; `step`
  footstep cue paced by distance (`hunterStepTimer`).
- The ghost passing within 14 px of a scanning/chasing hunter forces a 1.2 s
  `lost` with a "?!" placard, once per apparition (`ghost.spooked`);
  `hunterSpooked` lines.
- `CLAUDE.md` sections 6/7/9/10/11/15 and the debug table rewritten for
  stations, tray, tips, hunter states, footprint-aware A*, Nazim's
  consequences, the round, shifts. `README.md` how-to-play updated. Start
  overlay hint names the stations and the tray.
- Smoke: 8 scripts, loop, hunter, Nazim, round, spook, shifts, boards —
  passes repeatedly. Edge captures clean. `assets/gameplay.png` refreshed.
- Next: commit, push, redeploy preview, note on PR #3. Then wait for the
  user's real bar plan (layout pass: re-trace `BAR_SEGMENTS`/`TABLES`/
  `BENCHES`, remap `station` ids, re-run smoke for routes).

### 19:15 — batch D (shifts) done: timed shifts, last call, tally board

- Level is no longer derived from score: `getLevel()` returns `shift`, so
  losing tips never eases the room. A shift ends when `shiftTips` reaches
  `shiftTarget(n)` = 100 + 40(n−1), or — for shifts 1–5 (`SHIFT_TIMED_COUNT`)
  — when its 180 s clock runs out. Final 15 s = last call: bar bell (`bell`
  cue), `lastCall` lines, no new walk-ins, patience drains ×1.5
  (`patienceRate()`), HUD clock turns red and blinks under 5 s.
- `endShift()` snapshots `shiftTally` (tips/target/total/stats) and freezes
  the floor; `drawShiftTallyOverlay` replaces the level splash (title DONE
  or OVER, rows for served/forgotten/clutch/doubles/rounds/hits/best shift,
  "SPACE FOR SHIFT n" / "TAP FOR SHIFT n"). Space/E or the touch action
  calls `startNextShift()`. Shifts ≥ 6 are untimed (target only).
- All tips flow through `earnTips`/`loseTips` so `shiftStats` stays true;
  the HUD shows "TIPS shift/target" on the top line and "TOTAL n  m:ss" by
  the pints. `LEVEL_UP_SCORE`/`levelSplashTimer`/`splashLevel`/
  `highestLevelReached` are gone; `LevelDone.png` now backs the tally.
- Debug: `getShift`, `setShift`, `setShiftClock`, `endShift`,
  `startNextShift`. Smoke covers last-call arming and spawn gate, clock
  close, frozen floor, next shift's fresh target, and target close on an
  untimed shift. 6/6 runs pass; Edge clean (HUD at last call, tally).
- Next: batch E (juice) — off-camera hunter vignette pulse + footsteps,
  hit-stop + HUD pint knock, ghost shudders the hunter; then docs, push,
  redeploy.

### 18:55 — batch C (regulars) done: Nazim's night has consequences, the round

- Drunk/gone Nazim: order cooldown ×0.6 (`NAZIM_FAST_ORDER`), alcohol tips
  ×2 (`NAZIM_TIP_MULT`, "X2 +N" float). Gone: 50% a delivery knocks a pint
  (`addSpill`; `spills` slow player and hunter to 60% within 9 px for 25 s,
  drawn by `drawSpills` under the y-sorted pass; `spill` cue); every 12–20 s
  he gets up (`startNazimWander`/`updateNazimWander`: lean pose + sway,
  14 px/s to a spot near the booth, pause, back to his seat) and is a
  `dynamicBlockers` entry so `collidesAt` slides others round him.
- Entering `gone` sets `waterOwed`; his next order is `'water'` (new
  `ORDER_ICONS.water`, made at the taps, excluded from walk-in
  `ORDER_TYPES`); delivering it takes 2 drinks off (gone → drunk) with the
  `sobered` exchange instead of the thank-you. `waterOrdered` exchange from
  Gerald.
- The round: every 90–150 s when none of the three is mid-order,
  `tryCallRound` gives all three an order with 32 s patience; all three
  served inside 20 s pays `ROUND_BONUS` 25 (`noteRoundDelivery`), else
  `roundMissed`. Exchanges `roundCalled`/`roundDone`.
- Debug: `getSpills`, `getRound`, `callRound`, `startNazimWander`. Smoke
  covers double tip, water owed → ordered → sobers, wander out and back to
  the seat, and a full round. 6/6 runs pass; Edge clean.
- Next: batch D — shifts with a last-call rush and a tally board.

### 18:40 — batch B (hunter) done: states, A*, door arrival, buy him a pint

- `updateHunter()` state machine replaces the inline pursuit: `arriving`
  (hidden at the door 20 s first run / 8 s restart, then `hunterArrives`
  dialogue) → `scanning` (half-speed prowl to random clear spots, pause-and-
  look; sees the Doe inside a ±60° cone with clear LOS within 70+4/lvl px, or
  within 24 px regardless) → `chase` ("!" placard, whistle; A* route to the
  player recomputed every 1.5→0.8 s with half the old jitter on top; rub/
  slide kept as the safety net; trail lost after 4+0.5/lvl s out of sight)
  → `lost` ("?" 3 s) → scanning. Walking into him while he prowls counts as
  being spotted. Catch detection is gated off while arriving/drinking.
- Routing is footprint-aware: `footprintFor(kind, cell)`; `findBlockingObstacle`
  / `pointBlocked` / `cellCenter` / `computeCustomerPath` take an optional
  `fp`. `HUNTER_FOOTPRINT` uses a 4 px grid because the 8 px grid has no clear
  centre in the 15 px lane beside the bar stem. Customers unchanged.
- Serve the hunter: `hunter.isHunter`, shares the order shape; wants a
  `beer-blond` every 45–75 s (patience 25 s, no penalty); in the queue
  (`findOldestPendingOrder`), ticket framed tomato; `HUNTER_SERVE_RANGE` 26
  (catch radius is ~15); `hunterServed()` pays tip + 20 "ON THE HOUSE" and
  sits him out 8 s (`drinking`). `stillWantsOrder()` helper for retargeting.
- New sound cues `whistle`/`lost`; dialogue categories hunterArrives/
  hunterSpotted/hunterLost/hunterOrdered/hunterServed with lines for all
  three regulars (Nazim's stage-gated). Near-miss trigger gated to chase.
- Debug: `getHunterState`, `setHunterState`, `hunterCanSeePlayer`,
  `hunterWantsPint`. Smoke covers arrival, cone/LOS, chase route clear of
  furniture for his footprint, and the pint. 8/8 runs pass; Edge clean.
- Next: batch C — Nazim's stages with consequences (double tips, wander,
  spill, water from Gerald) and the round.

### 18:05 — batch A (loop) done: stations, tips, tray

- `BAR_STATIONS` (taps/shelf/hatch → order types) and a `station` on each
  `BAR_SEGMENTS` entry; `nearestBarSegment()` resolves the L's corner by
  distance; `findOldestPendingOrder(types)` filters by station; a
  wrong-station press floats "SHELF >" toward the right counter.
  `drawStationTag` paints a parchment label on each counter.
- `deliveryTip()`: 10 + round(10 × patience fraction), +5 CLUTCH under 20%.
- `player.carrying` → `player.tray` (max `TRAY_MAX` 2); full tray sets speed
  `TRAY_SPEED` 54; `doubleArmed`/`doubleHitFree` pay `DOUBLE_BONUS` 10 when
  both land unhit (a hit or a dropped order cancels it). `canDeliverTo()`
  extracted; interact tries delivery first, then pickup.
- Smoke test covers the loop end to end (station refusal, two pickups, speed
  54/62, both deliveries, double). Passes. Edge capture clean.
- Next: batch B — hunter states (scan/chase/lost), A* pursuit, late entry
  through the door, serve-the-hunter.

### 17:40 — design pass approved; implementation starting

- `git fetch`: branch is 6 ahead / 0 behind `origin/main` — nothing to merge.
- User approved the full design review. Direction in force, in this order:
  1. Station pickup: each `BAR_SEGMENTS` rect serves a group of order types;
     interact at a station grabs the oldest order of that group.
  2. Speed-scaled tips: 10 + round(10 × patience fraction), "CLUTCH +5"
     under 20% patience.
  3. Tray: carry two, speed 62→54, "DOUBLE" bonus if both land unhit.
  4. Hunter states: scanning (cone + line of sight) → chase ("!" + whistle)
     → lost (3 s). 5. Serve the hunter: periodic order; delivery seats him
     8 s. 6. Hunter A* pursuit (recomputed ~1.5 s) under the jitter layer.
  7. Nazim stages matter: drunk = faster orders/double tips; gone = wanders
     the booth lane + spill puddles; Gerald orders water (non-alcohol, drops
     a stage). 8. The round: all three regulars order together, 20 s bonus.
  9. Shifts end: 100 tips or 3 min, 15 s last-call rush, tally board;
     endless after shift 5. 10. Hunter enters via DOOR after 20 s.
  Juice: off-camera hunter vignette pulse + footsteps, hit-stop + HUD pint
  knock, ghost shudders the hunter.
- User will send the bar's real architectural plan; expect a layout pass
  afterwards. Build station pickup against `BAR_SEGMENTS` data so a remap is
  a one-line change.

### 17:26 — why PR #3 gets no Vercel check (blocked on repo owner)

- Diagnosis: Vercel project `lepub` (`prj_6vjBFT18p2WKio9SJNGZiIpEtU3M`, team
  `maisoncastros-projects`, Hobby) has **no Git connection**. It was created
  by a CLI `vercel deploy`, and `get_git_deployment_context` lists every
  linked project on the team — all `maisoncastro/*` repos — and `lepub` is
  not among them. So Vercel never sees pushes/PRs on `S-Belanger/LePub`.
- `vercel git connect --yes` fails: "Failed to connect S-Belanger/LePub to
  project". The repo is owned by the personal account `S-Belanger`;
  `maisoncastro` has push but not admin. The Vercel GitHub App must be
  installed on the repo owner's account with access to LePub, which only
  S-Belanger can do.
- Unblock: S-Belanger installs <https://github.com/apps/vercel> on their
  account, granting access to `LePub`; then run `vercel git connect` from
  this checkout (linked `.vercel/project.json` already points at `lepub`).
  After that every push/PR gets the native Vercel check + preview.
- Caveat on Hobby: commits authored by S-Belanger will be skipped with
  "Git author must have access to the project on Vercel" unless the project
  moves to a team they're a member of (Pro). maisoncastro's commits deploy.
- Fallback if they'd rather not install the app: a GitHub Actions workflow
  running `vercel deploy` needs `VERCEL_TOKEN` as a repo secret — also
  admin-only, so it's the same ask.
- Until then, previews are made manually with `vercel deploy --yes` and the
  URL posted on the PR (see 17:18).

### 17:18 — committed, pushed, new preview deployed

- Committed the whole tree (Codex renderer milestone + UI rehaul) as
  `fa51bdf` and pushed; branch is in sync with its upstream. Only this
  ledger entry is uncommitted after it.
- GitHub still reports no Vercel check on PR #3, so a non-production preview
  was made from the linked project: <https://lepub-8gdszbpj1-maisoncastros-projects.vercel.app>
  (inspector: <https://vercel.com/maisoncastros-projects/lepub/5tha4DBDQVGXNzEaN36ddfJ7Yezj>,
  `dpl_5tha4DBDQVGXNzEaN36ddfJ7Yezj`). Deployment Protection remains on.
  The first `vercel deploy` returned "Not authorized"; the retry succeeded.
- Preview link posted on PR #3. PR stays a draft pending the user's review.
- Next: collect the user's feedback on the hosted build.

### 17:12 — UI rehaul complete and browser-validated (now committed in fa51bdf)

- DOM shell rebuilt in `style.css`/`index.html` on the same walnut/brass/
  parchment/leather palette as the canvas kit: wainscot letterbox with one
  amber lamp, brass-and-walnut canvas frame, `chip board` corner plaques
  (gradient-drawn fullscreen brackets, red strike when muted), the start
  panel as a riveted hanging sign (`panel board riveted` + `.panel-scroll`
  so the `::before/::after` chains aren't clipped), a parchment `.keys` menu
  card with brass keycaps, burgundy-leather `.primary` buttons, beer-mat
  stick with brass knob, leather-and-brass action button.
- `#top-bar` z-index raised above the overlay (45 > 40): previously SFX and
  fullscreen were unreachable while paused and `?` could not close the
  overlay it opened.
- No JS bindings changed: every id/class `game.js` reads is untouched.
- Validation: `node --check` on all scripts; `node tests/smoke.js` 5/5 runs
  (now also renders HUD/level/caught/ledger boards); `git diff --check`
  clean; headless Edge at 1280x720 and 390x844 touch — Press Start 2P
  confirmed loaded via `document.fonts.check`, zero console/page/request/
  HTTP errors. Captures reviewed: start sign, gameplay HUD + tickets +
  placards, level board, caught board with name field and ledger, chips
  hover/muted, mobile play/caught.
- Capture tooling: `%TEMP%claude...scratchpadcapture.js` (node static
  server + playwright-core from the npx cache driving Edge via
  `channel: 'msedge'`). Shots under the same scratchpad `shots/`.
- `assets/gameplay.png` replaced with the new desktop gameplay capture.
- `CLAUDE.md` updated: pixelfont scale, render passes 7/9/10, material kit,
  page-shell section.
- Not committed or pushed. Next: user reviews; then commit the whole tree
  (Codex renderer milestone + this UI pass), push, and redeploy the PR #3
  preview.

### 17:05 — canvas UI implemented (uncommitted)

- Normalized the Codex-era mixed CRLF/LF back to LF in `game.js`,
  `src/scenery.js`, `src/sprites.js`, `style.css`, `index.html`,
  `CLAUDE.md` (HEAD is pure LF; `core.autocrlf=true` would do this on commit
  anyway). No content changed by that step.
- `src/pixelfont.js`: `fontDrawText`/`fontDrawTextShadow` take an optional
  integer `scale` so boards can have real pixel-font headlines.
- `game.js`: added a `UI` material palette and painters —
  `fillClipped`, `drawRivet`, `drawWalnutPlate` (bevel, grain, rivets,
  optional brass rails and hanging chains), `drawParchmentPlate` (aged
  edges, stitched top), `drawPlateTail`, `drawBrassRule`,
  `drawSplashImage`, `drawCenteredText`.
- HUD is now a walnut sign hung on two brass chains: SHIFT/TIPS labels in dim
  cream with values in cream/amber, and life as three pint glasses
  (`drawPint`, `PINT_*` constants) that drain from the top and refill.
  `hudRect` now starts at (3,0) and includes the chains.
- Order tickets and dialogue placards paint through `drawParchmentPlate`;
  the patience bar is a brass-capped gauge. Semantic frame colours unchanged.
- Caught screen: walnut board with brass rails, 3x pixel-font "CAUGHT!",
  SHIFT/TIPS summary, restart prompt (keyboard vs touch wording), "BEST TIPS"
  ledger with flanking brass rules, name entry as an ink-on-parchment field,
  and the caught quip on a parchment note in the speaker's accent. The
  `16px monospace` `fillText` is gone.
- Level splash: walnut board, 2x "SHIFT N DONE", "LAST CALL - SHIFT N+1
  STARTS NOW".
- `tests/smoke.js` now also renders the HUD at score 240 / half life, the
  level-done board, the caught board with the name field open, and the ledger
  after filing. `node tests/smoke.js` passes.
- Not yet browser-captured. Next: DOM shell (`style.css`, `index.html`), then
  Edge captures of start overlay, gameplay HUD, caught and level boards.

### Next concrete step (original plan)

- Implement canvas UI first (`game.js`, small `fontDrawText` scale support in
  `src/pixelfont.js`), then the DOM shell (`style.css`, `index.html`), run
  `node tests/smoke.js`, capture Edge screenshots, checkpoint here again.

## 2026-09-14 23:22 America/Toronto — high-density renderer/furniture milestone captured

### Implemented since rejection

- Added `ART_SCALE = 2`: gameplay remains in the original logical world while
  the canvas backing store now has two authored pixels per logical unit.
- Decoupled every entity's collision box from sprite sheet dimensions, so art
  resolution and silhouettes can change without changing routes/catch range.
- Added half-unit sprite rendering and generated genuinely denser character
  sheets with refined diagonal contours, fabric/hair shading, and material
  ramps at the same on-screen footprint.
- Refined every order icon onto the same dense backing grid.
- Replaced the giant 16px floor grid with deterministic 6px walnut boards,
  varied 23–46px lengths, half-pixel seams, scratches, knots, and highlights.
- Rebuilt rugs with fine woven borders, repeated medallions, and uneven fringe.
- Expanded the rear wall into raised timber panels with carved rails, larger
  rainy city windows, fine mullions/rain, side-wall panels, portraits, brass
  sconces, and a layered front doorway.
- Rebuilt counters with orientation-aware worktops/front faces, panel slats,
  grain, edge bevels, brass foot rails, and denser detailed bottles/taps/glass.
- Rebuilt chairs, benches, and tables with legs, backs, cushions, tufting,
  clipped silhouettes, deep front lips, narrow wood boards, and fine grain.
- Expanded deterministic table clutter to include mugs, candles, bottles,
  plates, menus, glasses, and coasters; candles now contribute local light.
- Added broken varnish reflections beneath hanging lamps and rebuilt the HUD
  as a clipped walnut/brass pub sign using `SHIFT` and `TIPS` language.

### Validation and honest visual assessment

- `node --check` passes for `game.js` and every `src/*.js` file.
- `node tests/smoke.js` passes all scripts, 40 customer routes in/out, three
  regulars, waiter visit, palette coverage, and render pass.
- `git diff --check` has no whitespace errors (Windows line-ending warnings
  only).
- Real Edge capture at 1280x720 uses a 640x360 backing canvas displayed at
  1280x720; no console/page/request/HTTP errors were observed.
- Temporary capture: `%TEMP%/lepub-rebuild-checkpoint.png`.
- The capture is materially different from the rejected build: board scale,
  architecture, furniture depth, rug weave, prop density, and pixel density
  all changed. It is closer to the reference, but this is an intermediate
  comparison—not yet the updated PR/Vercel preview or a completion claim.

### Current files / next step

- Modified, uncommitted: `HANDOFF.md`, `game.js`, `src/scenery.js`,
  `src/sprites.js`, and `tests/smoke.js`.
- Branch remains at pushed commit `32a1fef`; `origin/main` has not changed.
- Next: improve illustrated character presentation, side/back-bar clutter,
  and DOM overlay/touch UI; then capture desktop and full-room portrait,
  update `assets/gameplay.png`, test repeatedly, commit, push, and redeploy the
  draft PR preview.

## 2026-09-14 23:12 America/Toronto — first preview rejected; full visual rebuild started

### User feedback / corrected acceptance bar

- The user correctly rejected the first preview: it still looks like the old
  game with a palette/decor pass, rather than like
  `warm-overhead-pub-reference.png`.
- Treat the visual work in commits `8f7cc5a` through `32a1fef` as a foundation,
  not an accepted art-direction result.
- The next pass must materially change authored pixels and proportions: higher
  sprite detail at the same on-screen footprint, narrow floorboards,
  dimensional furniture, recognizable chair/stool silhouettes, dense
  tabletop/bar props, layered wall decor, localized warm reflections, and an
  illustrated in-world UI.
- Preserve the straight-overhead camera, collision geometry, routes, and
  playability. Do not copy the reference's literal isometric projection.

### Concrete visual diagnosis from side-by-side review

- Current floor uses giant 16px tile/plank blocks; the reference uses much
  narrower boards with frequent seams, grain, knots, and reflected lamplight.
- Current tables/bar are flat rectangular slabs; the reference has bevels,
  deep front faces, wood trim, legs, stools, glassware, candles, and clutter.
- Current characters are visibly 14–21 authored pixels wide with flat block
  anatomy; the reference has roughly 2–3x the internal contour/fabric/face
  detail at a comparable on-screen footprint.
- Current room is uniformly bright and sparse; the reference is built from
  dark walnut architecture, concentrated amber pools, cool rainy windows,
  framed wall layers, and dense edge detail.
- Current HUD is still a generic score strip; it needs to feel like a physical
  pub sign/ledger while remaining compact enough for gameplay.

### Repository state and next implementation step

- Branch `feat/regulars-responsive-pixel-polish` is clean at `32a1fef`, fully
  synchronized with its upstream and three commits ahead of `origin/main`.
- A fresh fetch found no new collaborator commits on `origin/main`.
- PR #3 remains a draft; the existing Vercel preview shows the rejected pass.
- Next: introduce a 2x internal art backing scale, decouple visual sprite
  resolution from collision boxes, rebuild the static room renderer and
  furniture, then capture/compare before updating the preview.

## 2026-09-14 23:06 America/Toronto — protected Vercel preview ready

### Preview links and state

- PR #3 is now a **draft**, matching the explicit in-PR direction not to merge
  while visual work continues: <https://github.com/S-Belanger/LePub/pull/3>
- GitHub's Vercel integration did not report a check or deployment, so the
  already-linked local Vercel project was used to create a non-production
  preview of commit `0fc3a32`.
- Preview: <https://lepub-8oxma8m00-maisoncastros-projects.vercel.app>
- Vercel inspector:
  <https://vercel.com/maisoncastros-projects/lepub/6qN2xoFcJjLyBUxHFML9tP2MCxEB>
- Deployment ID: `dpl_6qN2xoFcJjLyBUxHFML9tP2MCxEB`; Vercel reported
  `READY` with a non-production target.
- Deployment Protection is enabled. An anonymous Edge session reaches the
  Vercel login screen; the authenticated `vercel curl` check returns
  `Le Pub: The Chase` and confirms the game canvas is present. The user should
  sign into the project account when opening the preview.
- The preview URL and protection note were also posted on PR #3.

### Handoff state

- The complete visual/gameplay change and prior publish ledger are committed
  and pushed. This final deployment checkpoint is the only subsequent local
  change and should be committed/pushed as a docs-only update.
- Do not merge the draft PR until the user approves the hosted visuals.
- Continue to treat the redesign as reviewable/in progress rather than final;
  use feedback from this preview for the next polish pass.

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
