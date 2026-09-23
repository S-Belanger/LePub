# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

For visual/character work, first read [docs/VISUAL-SYSTEM.md](docs/VISUAL-SYSTEM.md)
and inspect its shipped PNG references. It is the current texture, camera,
sprite and UI standard. `src/character-art.js` is the shared family/scale/pose
contract; `node tests/character-art.js` enforces production coverage in CI.
Keep procedural fallback for failures; it is not finished production art.

## What this is

"Le Pub: The Chase" — a small top-down 2D serving/chase game rendered in pixel art. You play a guy in a deer onesie waiting tables in a pub while a hunter stalks you: fetch orders from the bar, deliver them before customers give up, and don't get caught. Three named regulars — **Nazim, Sam and Gerald** — hold the corner booth for the whole run, order drinks like anybody else, and comment on what you're doing.

It's plain HTML/CSS/JS with **no build step, no package manager, and no runtime dependencies**: `index.html` loads `style.css` and ten plain `<script>` files directly, and everything is drawn to one `<canvas>` with the 2D context.

There is no `package.json` or linter. `node tests/smoke.js` is a dependency-free
runtime smoke test for script loading, customer/waiter routing, and rendering;
`node tests/assets.js` covers the raster asset registry. `node tools/export-sheets.js`
regenerates `assets/sprites/*.png+json` from the procedural sets (needs Edge and
playwright-core in the npx cache).
Runtime image assets are `assets/caught.jpg` and `assets/LevelDone.png`, used for
the game-over and completed-level splashes; `assets/planFloor.png` is the
retained floor-plan reference the current layout is traced from.
`assets/cover.png` and `assets/gameplay.png` are not loaded by the game — the
first is a leftover from a canvas title screen that the HTML start overlay
replaced, the second is for the README.

## Running it

There is no build command. To run the game, either:
- Open `index.html` directly in a browser, or
- Serve the directory with any static file server and open the served URL.

`.claude/launch.json` defines the one run config used here: `python -m http.server 8917`. A static server is preferred over `file://` so `assets/caught.jpg` loads reliably. Any static server works — the scripts are classic (non-module) `<script>` tags on purpose, precisely so `file://` keeps working and no server-side MIME configuration is needed.

Any change to the JS/HTML/CSS takes effect on a page reload — no compilation step.

## Art-direction guardrails

`assets/art-direction/warm-overhead-pub-reference.png` is the primary room-art
reference. Borrow its honeyed wood, forest-green shadows, burgundy seating,
amber light, rainy windows, rugs, plants, and crowded edge detail, but keep the
game's straight-overhead camera. The reference's isometric composition is not
a layout target. Preserve furniture colliders while the visual language is
being established, and keep main walk lanes calmer than the bar and seating
clusters so orders, characters, and chase routes stay readable.

Palette swaps alone do not satisfy this direction. The current review renderer uses
a 4x art backing grid, fine floorboards, dimensional furniture, dense readable
props, localized light/reflections, varied patrons, and coherent walnut/brass/
parchment UI. `assets/art-direction/README.md` is the concrete acceptance list.

## Files and load order

Script order in `index.html` matters: each file only uses things defined in the ones before it, and they share one global scope (top-level `const`/`function` in a classic script is visible to later scripts).

| File | Contains |
| --- | --- |
| `src/pixelfont.js` | 3×5 bitmap font: glyphs, `fontTextWidth`, `fontDrawText`, `fontDrawTextShadow`, `fontWrapText`. `fontDrawText`/`fontDrawTextShadow` take an optional integer `scale` for headlines. Pure data + helpers. |
| `src/scenery.js` | The `PUB` palette, `makeSeededRandom`, and the `makeGlowCanvas`/`makeVignetteCanvas` lighting bakers. No game state. |
| `src/sprites.js` | The sprite DSL (`R`, `buildSprite`, `composeSprite`, `detailSprite`), every sprite and palette (doe, hunter, customers, the three regulars, the waiter, order icons) and the `SPRITES` set map. No canvas, no game state. |
| `src/dialogue-content.js` | `DIALOGUE_LINES` and `DIALOGUE_EXCHANGES` — authored text only. |
| `src/dialogue.js` | The `Dialogue` module: selection, weighting, cooldowns, queueing, repetition control. |
| `src/regulars.js` | `REGULARS` config, `INTOX_STAGES`, `NAZIM_STAGE_VISUALS`, order weighting, mood constants. Data and pure functions. |
| `src/sound.js` | The lazy Web Audio sound system and its synthesized cue definitions. No audio assets. |
| `src/assets.js` | `Assets`: optional PNG+JSON sprite atlases (schema v1), validation, decode, per-family fallback to the procedural sets. No game state. |
| `game.js` | Everything that needs the canvas or mutable game state: viewport, world, collision, entities, customers, regulars runtime, input, page shell, touch, hunter AI, update, render. |

`game.js` is by far the largest (~2850 lines) and is still flat top-level `const`/`function` declarations, no classes. Execution order inside it matters the same way it always did.

## Architecture

### 1. Adaptive viewport

The canvas fills the browser viewport. `applyViewport()` recomputes three things on resize, `orientationchange` and `visualViewport` resize:

- `pixelScale` — an **integer** css-pixels-per-game-pixel factor, so art is never resampled onto fractional pixels.
- `viewW` / `viewH` — the internal (game-pixel) resolution, sized so `viewW*scale × viewH*scale` covers as much of the viewport as possible.

`ART_SCALE` is separate from both: the canvas backing store is
`viewW*ART_SCALE × viewH*ART_SCALE` (currently 4x), while CSS size and all
simulation/camera coordinates remain in logical units. The context transform
maps logical drawing calls to that denser store. Half-unit scenery strokes and
`pixelSize: 0.5` sprite sheets therefore resolve to two backing pixels; illustrated atlases use their own measured source density.

Landscape leans on a 320×180 base, portrait on 180×320 (the world is portrait, so a phone gets a portrait internal resolution instead of a squashed 16:9 letterbox). Both are clamped by `VIEW_MIN`/`VIEW_MAX` so an ultrawide monitor can't reveal empty space outside the pub — the leftover viewport is painted as a dark surround by CSS instead.

**`viewW`/`viewH` are `let`, not constants.** Everything downstream — camera, HUD, bubbles, overlays, the vignette — reads the current values, so a resize or rotation mid-run is just a re-derivation and never touches game state. Resizes are coalesced into the next frame via `viewportDirty`, and layout is read once per resize, never per frame. Setting `canvas.width` resets 2D context state, so `imageSmoothingEnabled = false` is restored there.

`getCamera()` centers on the player and clamps to the world; on any axis where the viewport is **larger** than the world it centers the world instead of pinning it to the top-left corner.

### 2. World and furniture: hand-placed, not procedural

`WORLD_W` 200 × `WORLD_H` 360, portrait. The floor renderer uses deterministic
6-unit walnut plank rows with varied lengths; this is visual texture only, not
a collision or layout grid.

`BAR_SEGMENTS` is three rectangles forming an L; `TABLES` and `BENCHES` are literal arrays of `makeTable(cx, cy, opts)` calls, all traced from `assets/planFloor.png`. `makeTable` takes `{w, h, seats: {n, s, e, w}, type, seatStyle}` where each side's count is how many chairs are spaced evenly along that edge (default 1, `0` = none). `getTableSeats()` derives those points and is used for **both** gameplay seat positions and chair sprite placement, so the two can't drift apart; each returned seat also carries the `side` it sits on.

A collider is padded by `CHAIR_GAP + CHAIR_SIZE` **only on sides that actually have a chair** — padding chairless sides by the same margin made the corridors around them needlessly tight. A bare stool row (`type: 'bench'` with the default `seatStyle: 'chairs'`) has no tabletop to walk around at all, so it gets a tight box around wherever its chairs land instead of its `w`/`h` footprint, which is only there to space them out.

`BENCHES` is seating with no tabletop of its own: three wall benches (`seatStyle: 'bench'`, drawn as one long seat) tucked just inside the decorative wall bands so they aren't painted over by them, plus two rows of bar stools. They reuse `makeTable` purely for the seat math and the collider that the "near their table" delivery check needs; `type: 'bench'` tells the renderer to skip the tabletop.

`reachablePoint(e, p)` clamps a destination into the box an entity can actually stand in (movement is clamped to half a sprite in from every world edge). `DOOR` sits below that box, so anything routed straight at it stops a few pixels short of its final waypoint and never registers as arrived — which is how leaving customers used to pile up invisibly against the bottom wall, holding seats' worth of the spawn cap forever. Every route *to* the door goes through it; routes to seats don't need it.

`SEATS` is every table's *and bench's* seats flattened, each with a back-reference to its `table` plus `occupied`, `reserved` and `regularId` flags. Changing the layout means editing the literals — there is no generator and no map file.

**`TABLES[0]` is the regulars' booth** at (62, 40), 40×22 with one chair each on south, west and east (Nazim, Sam, Gerald). It used to be 18×20 with two chairs down each long edge; that put seats ~7px apart, which is fine for anonymous patrons and unreadable once three 14×15 named characters sit there. The north side is left chairless because the plan's top wall bench is already within reach there.

**Gaps matter more than they look.** The hunter's foot box is the widest in the game (~11.5px), so any corridor narrower than that is a wall as far as the chase is concerned, and a floor that is "connected" for a customer can still be sealed for the hunter. `window.__debug.FURNITURE` plus a flood fill over each body size is the quick way to check a layout edit.

### 3. Sprite authoring and rendering

The procedural fallback uses rows-of-palette-characters: `R(char, count, ...)` builds a row string, `buildSprite(rows)` wraps rows into `{rows, w, h}`, and a palette object maps each character to a hex colour (or `null` for transparent). **The camera is high overhead** (`docs/overhaul/00-CAMERA-DIRECTION.md`): crowns of heads, hats and hoods, shoulder tops, foreshortened bodies, a sliver of face only when facing the camera or sideways. **The fallback cast is generated, not hand-typed.** `ohFigure(spec, dir, frame, opts)` paints a 40×44 backing-pixel figure (`pixelSize 0.5`, feet at the bottom) from a spec — head kind (`hood`/`cap`/`hair`/`bald`/`flatcap`), ears/antlers/flaps, coat/hands/feet/chest/vest, glasses/beard/moustache/brows — then `ohOutline` and `lightSprite` (one top-left light, three tones per material). `ohSheetSet` builds a **directional set** (`dirs: true`): keys are `pose.facing` — `idle`, `walk`/`walkB` (two-step), and prop variants `carry*` (Doe), `gun*` (hunter), `spray*` (waiter), `lean`/`slump` (Nazim: head pushed toward what he faces). `down`, `up` and `right` are painted; `left` mirrors the body and **re-paints the prop on the anatomical side** — never mirror a carry or gun frame. `OH_CUSTOMER.variants` gives walk-ins three head shapes over the six palette looks. Nazim keeps the `r`/`w` keys for `NAZIM_STAGE_PALETTES`, though from above his face is hidden when he faces the table (by design). The ghost is `OH_GHOST` (alpha, outside the palette policy). The frontal HD sheets (`lightSprite` on literal rows: `DOE_HD`, `HUNTER_HD`, `NAZIM_HD`…) and the coarse `DOE_IDLE`-style rows remain as costume references; `detailSprite()` still refines the order icons.

**Raster atlases can replace any family.** `src/assets.js` (`Assets`) loads optional PNG+JSON atlases listed in `assets/sprites/manifest.json` (schema v1: image-pixel rects and pivots, `authoredPixelsPerWorldUnit`, timed animations keyed `pose.facing`), validates them before registering, waits for decode, drops stale loads after a restart and falls back per family to the generated sets. `drawEntity` asks `rasterFrameFor(e)` first and draws through `drawRasterFrame` (pixels ÷ density = world units, pivot at the feet). Production selects eleven illustrated atlases: seven named people (Alex has a separate macebell appearance) plus three walk-in looks selected by existing `look`. Their old per-entity palettes remain for fallback. `tools/import-illustrated.js` measures source alpha bounds and writes metadata without modifying PNGs. `tools/export-sheets.js` retains procedural exports without switching the selected manifest families. See `assets/sprites/ILLUSTRATED.md` for source provenance, frame layouts and limitations.

`drawSprite()` is still the single renderer for the format, but it no longer paints pixel by pixel every frame: it **bakes** each `(sprite, palette, facing)` combination into an offscreen canvas the first time it's needed and blits it afterwards. The cache is nested `WeakMap`s keyed by object identity, so a customer's one-off palette is collected along with the customer.

A sprite set is keyed by pose name. Movers use `idle`/`walk` driven by `legFrame`; the seated regulars set an explicit `pose` field (`idle`/`idleB`/`talk`, plus `lean`/`slump` and their talking variants for Nazim).

### 4. Entities and movement

`makeEntity(kind, x, y)` creates the shared shape used by the player, hunter, customers **and regulars**. **An entity's `(x, y)` is its feet/anchor point, not top-left.** Every entity also carries a visual `facing` (`down`/`up`/`right`/`left`) set by `faceToward(e, dx, dy)` from its movement (dominant axis, small dead-zone, keeps the last facing when still) or by `seatFacing(seat)` when seated; it selects the sprite direction and never changes the movement vector. `ENTITY_HITBOXES` preserves the original physics dimensions; visual width/height and optional `anchorX` come from the selected sheet. Never derive collision from refined sprite dimensions or a wider prop pose.

`tryMove(e, dx, dy)` resolves X and Y independently against `FURNITURE` colliders so movement slides along walls/tables instead of stopping dead, returning `{x, y, blockedX, blockedY}`. `collidesAt(e, x, y, exclude)` takes an optional piece of furniture to ignore — that is what lets a customer walk *into* their own table's padded collider to reach the chair inside it. Base speeds: player **62**, customer 38, hunter 54 (recomputed every frame from the level), waiter 46, ghost 16.

### 5. Customer/order state machine

Walk-in customers cycle `entering → sitting → leaving` (`updateCustomer`), following a routed path between `DOOR` and their seat. On sitting they get a patience clock (`sitTimer`, 30–50s, with `patienceDuration` remembered for the bar) and after a short delay roll a random order from `ORDER_TYPES`, shown as a bubble with a green/yellow/red patience bar. Patience running out unserved costs `FORGOTTEN_PENALTY` (15); a delivery earns `POINTS_PER_DELIVERY` (10) and shortens their stay. Orders also record `orderPlacedAt` (in `gameTime` seconds) so the bar queue can be ordered by age.

**`spawnCustomer()` only considers seats that are neither occupied nor `reserved`.** A walk-in can never take a regular's chair.

**Customers are routed, not steered.** They have no real-time obstacle avoidance, but the floor plan is static, so `computeCustomerPath(from, to, excludeTable)` works a route out once — a coarse A* over `PATH_CELL` (8px) cells, then a line-of-sight string-pulling pass that collapses it to a handful of waypoints so the walk still reads as straight lines rather than grid-snapping. Exact segment/AABB checks use the same asymmetric, feet-anchored footprint as runtime collision; endpoint grid anchors are chosen only when the real endpoint can see them. It runs only when a customer starts entering or leaving, never per frame, and `c.path` / `c.pathIndex` are walked by `updateCustomer`. Per-step collision is still applied as a safety net, excluding the customer's own table. A seat with no walkable route falls back to a straight line, so a layout edit that seals a seat off shows up as customers walking through furniture — check with `__debug.computeCustomerPath` or run `node tests/smoke.js`.

**The ghost** (`updateGhost`) is purely decorative: every 35–80s an apparition drifts in a straight line across the pub, through walls and furniture alike, with no collision and no effect on score, hunter or player. It draws in the y-sorted pass via `drawGhost`, which deliberately skips the contact shadow `drawEntity` gives everyone else.

**The waiter** (`updateWaiter`) is the other walk-on, and the one that actually uses the floor. He comes in through `DOOR`, walks a routed path (the same `computeCustomerPath`, with nothing excluded — he isn't headed for a seat) into the pocket the bar's L wraps around, stands against the upper-left counter and works it over with a spray bottle for `WAITER_SPRAY_TIME`, then routes back to the door and is removed. He has no order, no seat, no dialogue and no effect on score or the chase — changing any of that means giving him the customer order fields, not a new system. `drawWaiter` paints his sprite, then the droplets, then the sparks, so both read as coming off him rather than from under his hand.

**One visit per level, taken at a random moment inside it.** `waiterLevel` is the highest level he has already shown up for and `waiterDelay` only counts down while a visit is owed (`getLevel() > waiterLevel`), so he lands `WAITER_DELAY_MIN`–`WAITER_DELAY_MAX` into each new level rather than on the level-up frame itself. Comparing against the highest level visited, not the current one, is what stops a run that loses points and re-crosses the same threshold from sending him round again.

Squirts fire on `WAITER_SQUIRT_INTERVAL`. Each one holds the `sprayB` squeeze frame for a moment, pushes `WAITER_SQUIRT_DROPS` droplets out of the nozzle (arcing down under gravity, fading with their ttl), and arms `sparkTimer`: `WAITER_SPARK_DELAY` later — the water's flight time — `waiterSparkBurst()` fires sparks off the counter top where the jet lands, plus a one-frame white flash at the point of contact. Sparks are drawn with `'lighter'` and weighted toward white (`Math.random() ** 2` into `WAITER_SPARK_COLORS`), because the bar top is already a row of amber glassware and a yellow spark sitting on it reads as one more bottle.

The `spray`/`sprayB` sprites are 20 wide instead of the walking 14 so the outstretched arm and bottle have somewhere to go, with the extra columns split evenly either side of the body — `drawSprite` centres on the sprite's own width, so uneven padding would slide him sideways every time he starts spraying. `WAITER_NOZZLE_DX`/`DY` in `game.js` point at where the nozzle pixel sits in those rows; move the bottle in `src/sprites.js` and the mist origin has to move with it.

### 6. Named regulars

Nazim, Sam and Gerald are permanent fixtures of the booth. Config is in `src/regulars.js` (identity, sprite key, `seatSide`, patience range, order cooldowns, weighted `orderWeights`, dialogue `accent` colour); the runtime instances live in `regulars` / `regularById` in `game.js`.

They are **not** generic customers: no `entering`/`leaving` lifecycle, no seat competition, and they stay for the whole run. What they *do* share is the order shape (`orderType`, `sitTimer`, `patienceDuration`, `served`, `beingCarried`, `seat`, `orderPlacedAt`), so pickup, carrying, target highlighting, table-range delivery, patience bars and scoring all reuse the existing serving code unchanged. The only branch is what happens *after* a delivery lands, in `completeDelivery()`.

Their orders are framed in amber (`BUBBLE_FRAME_REGULAR`) so they read apart from walk-ins without any extra HUD.

`resetRegular(r)` holds every mutable field and is called both at construction and on every restart, so a new run never inherits last run's orders, patience, mood, dialogue history or drink count.

#### Nazim's intoxication

`INTOX_STAGES` is a five-step ladder — `sober` (0 drinks), `warm` (1), `buzzed` (2), `drunk` (3–4), `gone` (5+). Only `ALCOHOL_ORDER_TYPES` count; food never does. The counter is incremented **only** inside `completeDelivery()`, so mashing the interact button can't advance his night without a completed trip to the bar.

`NAZIM_STAGE_VISUALS` maps each stage to a pose, cheek blush and eye colour (both palette-driven, so the same sprite rows serve every stage), blink interval, seated sway, and the reaction delay added to his dialogue. His five palettes are built once at load into `NAZIM_STAGE_PALETTES`. **His state is deliberately not shown as a meter** — it reads from how he looks and what he says.

Gerald's escalation is content-side: his lines about Nazim declare a `nazim: [...]` stage gate, so he can't use drunk material on a sober man.

**His night costs and pays.** Drunk or gone (`nazimIsFarGone`): order cooldown ×`NAZIM_FAST_ORDER` 0.6 and alcohol tips ×`NAZIM_TIP_MULT` 2. Gone: each delivery has a `NAZIM_SPILL_CHANCE` of knocking the pint (`addSpill` — `spills` slow player and hunter to `SPILL_SLOW` 60% within 9px for 25 s, drawn by `drawSpills` under the y-sorted pass), and every 12–20 s he gets up (`startNazimWander`/`updateNazimWander`: lean pose plus his sway, 14 px/s to a spot near the booth, a pause, then home). While up he is in `dynamicBlockers`, which `collidesAt` checks after `FURNITURE` so everyone slides round him; routes ignore him. Entering gone sets `waterOwed`, so his next order is `'water'` (an `ORDER_ICONS` entry made at the taps and excluded from walk-in `ORDER_TYPES`); delivering it takes `NAZIM_WATER_SOBERS` 2 drinks off with the `sobered` exchange instead of a thank-you. Keep pouring for double tips, or cut him off — that's the choice.

**The round.** Every `ROUND_INTERVAL` 90–150 s, when none of the three is mid-order, `tryCallRound()` gives all three an order with `ROUND_PATIENCE` 32 s; all three served inside `ROUND_WINDOW` 20 s pays `ROUND_BONUS` 25 (`noteRoundDelivery`), otherwise `roundMissed`.

### 7. Stations, the tray, tips and delivery

**Orders are picked up at the station that makes them.** `BAR_STATIONS` maps each `BAR_SEGMENTS` entry's `station` (`taps` → beers and water, `shelf` → wine/cocktail, `hatch` → food) to its order types, and `findOldestPendingOrder(types)` filters the queue by them. `nearestBarSegment()` resolves the L's corner by distance, not array order. A press at the wrong counter floats the right station's label (`SHELF >`) instead of just buzzing. `drawStationTag` paints a parchment label on each counter. Remapping a station is a one-word edit.

**The tray.** `player.tray` holds up to `TRAY_MAX` (2) `{ type, customer }` items, each referencing a *specific* person — walk-in, regular or the hunter — flagged `beingCarried` so two orders are never picked up for one person. A full tray drops speed to `TRAY_SPEED` (54, under the hunter's late-game 60); landing both without a hit pays `DOUBLE_BONUS` (`doubleArmed`/`doubleHitFree`, cancelled by a hit or a dropped order). `handleInteract()` (`E`, `Space`, the touch action) tries a delivery first — whichever tray item's customer is in reach (`canDeliverTo`) — then a pickup.

**Tips** (`deliveryTip`): `POINTS_PER_DELIVERY` 10 plus another 10 scaled by remaining patience, plus `CLUTCH_BONUS` 5 under `CLUTCH_FRACTION` 20%. The patience bar is a score meter, not just a fail timer. Every tip earned or lost goes through `earnTips`/`loseTips` so the shift ledger (`shiftStats`) stays exact.

`findOldestPendingOrder()` picks by `orderPlacedAt` across walk-ins, regulars **and the hunter**, so the queue stays fair.

Delivery works next to the customer *or* anywhere near their table's collider (`nearRect`); the hunter is served at arm's length (`HUNTER_SERVE_RANGE` 26, wider than the ~15px catch radius). If a target stops wanting its order (`stillWantsOrder`), `update()` retargets it — **but only among walk-ins**. Silently re-pointing a drink at a different named regular would make ownership ambiguous, so a regular's order always has to be picked up for them on purpose. If no walk-in wants the stranded item, it is dropped from the tray so the player cannot get stuck carrying an undeliverable order. The validity check includes `orderType`, because a regular's order can lapse while they stay in their seat, whereas for a walk-in leaving is the only way out.

#### The Jameson

Roughly two **alcoholic** deliveries in five (`JAMESON_CHANCE`) comes back as a shot for the player: `grantJameson()` sets `jamesonTimer` to `JAMESON_DURATION` (10s), during which the hunter cannot take a life segment. Food never qualifies, so the real rate sits a little under the nominal chance. The roll lives in `completeDelivery()` next to the points, which is what keeps it tied to a trip that actually landed, and it fires for walk-ins and regulars alike.

While it is up:

- **Contact runs backwards.** The catch check still detects the overlap, but instead of costing life it shoves the *hunter* clear (`JAMESON_BOUNCE_FORCE`, rate-limited by `JAMESON_BOUNCE_COOLDOWN` so a sustained overlap isn't a buzz).
- **The hunter flees.** `pickNewHunterDirection()` reverses its base angle and keeps everything else — jitter, speed, pause chance — so it reads as the same animal in retreat. `hunterSlide` is cleared every frame of the effect: the wall following exists to close distance, and leaving it on would let the hunter use it to hold station.
- **The tint is palette-driven.** `DOE_JAMESON_PALETTES` (three prebuilt objects in `src/sprites.js`) are cycled by `jamesonPaletteFor()`. Prebuilt rather than mixed per frame because `drawSprite` bakes one canvas per palette *object identity* — a fresh palette every frame would be a fresh bake every frame. Over the last `JAMESON_WARN_TIME` the cycle alternates with the ordinary palette so the effect visibly runs out, and `prefersReducedMotion` pins it to one steady tint.
- **Illustrated status effects** use `statusRasterFrame()` to cache tinted atlas crops with the original alpha, density and feet pivot; a wet-pants stain affects only the lower part of the figure. The source PNGs remain unchanged.
- **The aura is a lamp.** `drawFloorLight()` blits the same prebaked `glowFor()` canvas the lamps use under the player, so it composites as room lighting rather than an overlay.
- **The HUD grows a row.** `jamesonRowHeight()` is folded into `measureHud()`, so the taller plate is also what the dialogue layout avoids for exactly as long as the shot lasts.

Refresh, not stack: a second shot restarts the clock. `jamesonTimer` and `jamesonBounceTimer` are cleared in `resetGame()`.

Three shots fill the bladder and start a 60s bathroom timer. Reaching `BATHROOM` clears it; expiry loses 20 tips through the shared shift ledger and leaves a puddle that scares walk-ins away. The busboy routes to reachable puddles and mops them. Every five non-hunter deliveries earns a held cigarette pack (up to three); C or the touch C button drops one. A hunter who finds it clears his order and tray item, walks out, smokes for 15s, returns and resumes scanning. Smoke routes use `HUNTER_FOOTPRINT`; busboy/Alex routes use their own footprints. Alex alternates split and steel-mace visits after a random first choice. The illustrated contract includes split.down and a separate alex-mace appearance with carry strides/three swing poses. Both have a 1.2s preparation cue and an occupancy recheck: split blocks 22x7 for 5s, mace 28x14 for 6s, without damage. First entry waits 60–90s, three deliveries and 30s of the shift; later visits wait 120–180s after departure, at most once per timed shift. Entry defers for chase, recent hit, round, bathroom urgency, busy doorway or final 40s. Full workout bounds exclude furniture, staff pocket, door and bathroom; routes are validated. Last call, round, bathroom urgency and shift end release an active blocker. Reset clears visit/activity memory. See node tests/alex.js and docs/VISUAL-SYSTEM.md. The busboy remains an explicit procedural art-debt exception until dedicated overhead idle/walk/mop artwork is authored.

### 8. Dialogue

A reactive layer on top of gameplay. It never pauses the chase, blocks input, or holds up a frame.

- **Content** (`src/dialogue-content.js`) is separate from selection. A line is `{ who, category, text, weight?, stage?, nazim?, rare? }`; an exchange is `{ category, lines: [{who, text, delay}], ... }`. `stage` gates Nazim's own lines; `nazim` gates anyone's line on Nazim's *current* stage. Roughly 3–12 words per line so they're readable on the move.
- **Scheduling** (`src/dialogue.js`) does weighted selection, a global cooldown (shorter for high-priority categories), a per-character cooldown scaled by mood, bounded recent-line history globally and per character, a `MAX_ACTIVE` cap of two bubbles, and a delay queue so replies land while the game runs. `CATEGORY_PRIORITY` lets a real gameplay reaction outrank ambient chatter and flush queued filler.
- **Triggers** are fired from `game.js` at the moments they describe (`onRegularOrdered`, `onRegularGaveUp`, `onRegularServed`, `grantJameson`, the catch check, the abandonment branch in `updateCustomer`) plus `updateDialogueTriggers()` for the genuinely time-based ones (idle, carrying too long, near miss, hunter near the booth, two waiting, level up, whiffed interactions).
- **`Dialogue.reset()` is called from `resetGame()`**, so a restart cancels everything queued or on screen; `resetDialogueTriggers()` clears the edge-detection state alongside it.
- **Rendering** is `drawDialogueBubbles()`. Placement tries, in order: clear above the speaker's order bubble; straight above their head; pinned to the top of the camera; and only then hanging off the shoulder facing away from the booth. Bubbles are nudged sideways before vertically when two are on screen, and the HUD's footprint is fed in as an obstacle so a line can never sit on the score.

### 9. Hunter AI: a rhythm, then pursuit

`updateHunter()` is a state machine (`hunterState`): **arriving** (hidden at `DOOR` for `HUNTER_ARRIVAL_FIRST` 20 s on a first run, `HUNTER_ARRIVAL_RETRY` 8 s on a restart, so a new player learns the bar before the chase; not drawn, can't catch) → **scanning** (half-speed prowl between random clear spots with a pause-and-look; he notices the Doe only inside a ±60° cone in front of him with a clear line through the furniture, within `hunterSightRange()` 70 + 4/level px — or within `HUNTER_HEAR_RANGE` 24 regardless; walking into him counts) → **chase** ("!" placard via `showHunterAlert`, `whistle` cue) → **lost** ("?" for `HUNTER_LOST_TIME` 3 s after `hunterLoseTime()` 4 + 0.5/level s out of sight) → scanning. **drinking** is 8 s sat out after being bought a pint. The ghost drifting through him forces a 1.2 s `lost` once per apparition. `setHunterState()` clears the route and slide state.

**He is a patron too.** `hunter.isHunter` and the shared order fields; `hunterWantsPint()` every `HUNTER_ORDER_INTERVAL` 45–75 s with 25 s patience and no penalty; his ticket is framed `BUBBLE_FRAME_HUNTER` (tomato); `hunterServed()` pays the tip plus `HUNTER_SERVE_BONUS` 20 and seats him. Buying the man who's hunting you a pint is the joke the premise was begging for.

**In chase he is a pathfinder.** `hunterRouteTo()` runs the same A* as customers with `HUNTER_FOOTPRINT` — the search is body-size aware (`footprintFor(kind, cell)`; `findBlockingObstacle`/`pointBlocked`/`cellCenter`/`computeCustomerPath` take an optional `fp`) and the hunter uses a **4px grid**, because on the 8px one his 11.6px foot box finds no clear centre in the 15px lane beside the bar stem though he physically fits. The route is recomputed every `hunterRepathInterval()` 1.5 → 0.8 s. `pickNewHunterDirection()` then aims at the next waypoint with half the old angle jitter and a small chance to pause, so he still reads as a man running rather than a homing missile. Level tightens all three: jitter 60°→15°, shorter re-aim timer, smaller pause chance. If `tryMove` reports **both** axes blocked the hunter is wedged in a corner and `pickEscapeDirection()` fires a fully random burst.

Only one axis blocked means it is scraping along something. Re-aiming sooner is the first response, but pursuit alone cannot get round a *long* obstacle: every re-aim re-rolls the sideways component, so the hunter random-walks up and down the same wall forever and the player is safe just by standing on the other side of the bar. So after `HUNTER_RUB_TIME` of getting nowhere it commits to one direction along the open axis (`hunterSlide`) and holds it for `HUNTER_SLIDE_TIME` before trying the other way — plain wall following. The slide vector still leans into the wall, so the frame the obstacle runs out nothing is blocked, the slide clears itself, and pursuit resumes. `hunterRubTimer` and `hunterSlide` both reset in `resetGame()`.

The rub/slide layer stays as the safety net for the cases the grid can't express; a route that fails outright falls back to a straight line and lets the slide sort it out. A red edge pulse (`drawDangerEdge`) and footstep cues (`step`) mark him within `DANGER_RANGE` 80 while chasing, strongest when he's off camera.

### 10. Life and capture

Contact with the hunter removes one of three life segments instead of ending the run immediately, unless Jameson is active and bounces the hunter away. A 1.5-second invulnerability window and a collision-aware shove give the player room to escape; the sprite flickers while protected. Regeneration begins after three hit-free seconds and takes 20 seconds to refill an empty bar. A hit also holds the floor for `HIT_STOP` 0.08 s, rocks the emptied pint on the HUD sign (`pintKnockTimer`/`pintKnockIndex`) and starts the `hit` **reaction**. Reactions (`REACTIONS`, `react(e, kind)`, `squashFor`) are presentation-only timers on the player and hunter — `hit` squashes, `serve` lifts, `spotted` stretches — drawn as a feet-anchored scale in `drawSprite`/`drawRasterFrame`; a hit outranks a celebration, they tick with the simulation, and `resetGame` clears them. They never move an entity, change a score or lock input; the hunter's pint while `drinking` is drawn from that existing state. Only the final hit sets `caught`, plays the caught cue and triggers the room's caught dialogue.

**High scores** live in `localStorage` under `lepub_highscores` (top 5, `{name, score}`; plain numbers from older saves are normalized on read, and every access is wrapped because storage can throw outright). Being caught with a score calls `beginNameEntry()`: while `enteringName` is true the caught screen shows a name field instead of the restart prompt, and the keydown handler takes the keyboard outright so no other shortcut can eat a letter or drop the score. The DOM restart button is hidden for the same reason (`syncCaughtDom`). Typing a name needs a keyboard, so on a touch device (`canTypeName()`) the score is filed unnamed rather than showing a field nobody can fill.

### 11. Shifts and difficulty

The run is a sequence of **shifts**, and `getLevel()` returns the shift number — difficulty follows the shift, not the score, so losing tips never makes the room easier. A shift ends when `shiftTips` reaches `shiftTarget(n)` = 100 + 40(n−1), or, for the first `SHIFT_TIMED_COUNT` (5) shifts, when its `SHIFT_LENGTH` 180 s clock runs out. The final `LAST_CALL_TIME` 15 s are **last call**: bar bell, `lastCall` lines, no new walk-ins, patience drains ×`LAST_CALL_PATIENCE` (1.5), the HUD clock turns red and blinks under 5 s. Shifts ≥ 6 are untimed.

`endShift()` snapshots `shiftTally` and freezes the floor; `drawShiftTallyOverlay` shows it on a walnut board over `LevelDone.png` (DONE in cream if the target was met, OVER in red if the clock beat you; served / forgotten / clutch / doubles / rounds / hits / best shift) and waits for Space, `E` or the touch action (`startNextShift()`). That press is the run's natural stopping point. The HUD sign reads `TIPS shift/target` on its top line and `TOTAL n  m:ss` beside the pints.

Scaling clamps at `EFFECTIVE_LEVEL_CAP` (10) so the game plateaus, while the shift number keeps climbing. Per shift: hunter speed `min(60, 40 + lvl * 2.5)` — capped just under the player's 62 so a straight-line escape always exists — wider sight, faster repath, longer memory, a higher customer cap (`BASE_MAX_CUSTOMERS` 6 rising to 14), faster spawns, and a heavier night tint.

### 12. Render passes

**The room is dark first and lit second.** `render()` runs explicit layers, farthest first:

1. **backdrop** — flat dark fill for wherever the viewport exceeds the world.
2. **room** — one `drawImage` out of `roomCanvas`, a world-sized offscreen canvas baked once at load by `drawGround()` + `drawArchitecture()`: plank floor with dithered grain and static wear, rear wall with windows and posters, side wainscoting, front wall and the door, and `drawWallProps()`: the stone fireplace in the bar pocket (`FIREPLACE`), the stag over the rear wall, string lights on the crown rail, a coat stand and a barrel in the front corners, palms on the side walls — all on the wall bands or in dead corners, no colliders. Both functions take the target context as a parameter that deliberately shadows the screen `ctx`; they are only ever called against that offscreen canvas.
3. **floor darkness** — `drawDarkness(DARK_FLOOR)`: a multiply over the room so the boards go near-black between lamps.
4. **y-sorted scene** — furniture and every character in one pass sorted by `sortY`, drawn for the high overhead camera: tops dominate, a 4px bar lip with brass rail and a 2px side face on the stem, tap fonts from above with a drip tray, bottles standing on the shelf counter (`drawBottleRows`) with glasses and an ice bucket, the kitchen hatch as a heat-lamp bar over plates, 3px table lips, chairs as cushions with a thin far-side rail, benches with a thin back, small brass station plaques at the counter's left/top end. Colliders are unchanged; only the drawing has depth. The table's `sortY` intentionally uses the table top's own front edge, not the chair-inclusive footprint, so a customer on the south chair draws *in front of* their table (see the comment in `makeTable`). Entries come from a reused pool, so a busy frame allocates nothing.
5. **scene darkness** — `drawDarkness(DARK_SCENE)`: a lighter multiply over everything drawn so far, so people and furniture sit in the dark without vanishing.
6. **floor light** — `drawFloorLight()` composites prebaked continuous-alpha glow canvases with `'lighter'`: a wide warm pool and a hot core under each of seven pendant lamps with a long broken varnish streak, bottle light along every counter, candle glows, the fireplace (`FIRE_RGB`, breathing), cool window spill, the door (brighter while somebody comes through), and readability halos on the Doe and hunter.
7. **foreground** — the pendant fixtures seen from above: a green enamel shade disc with a brass rim and the bulb burning through the middle, floating over its own pool (no cone, no cord — the camera looks down the wire), then dust motes.
8. **grade** — a light shift-scaled midnight tint plus a quiet continuous-alpha vignette (`makeVignetteCanvas`, rebuilt only when the viewport size changes), then the hunter danger edge.
9. **order bubbles**, then **dialogue bubbles** — above the grade, so a patience bar is never dimmed. Both are parchment cards painted by `drawParchmentPlate()`; the frame colour stays semantic (regular, carried, speaker accent) and the patience gauge is brass-capped. A ticket is compact (1px pad) while its patience is above 40% and it isn't yours, so the lamps stay the brightest thing on screen. `drawOrderBubbleFor()` picks whichever bubble a person warrants: the live order growing in, or the one just dealt with shrinking out. The pop is three discrete steps (`noteOrderPlaced` / `noteOrderCleared` / `tickOrderExit` keep the timing, shared by both populations) so it animates on whole pixels rather than easing through fractional sizes.
10. **floating score text** (`+10`/`-15`), pixel font, fading as it drifts up.
11. **HUD** — a walnut pub sign hung on two brass chains from the top of the frame (`drawWalnutPlate` with `chains`): `SHIFT n` and `TIPS n` on the top line, and life as three pint glasses (`drawPint`) that drain from the top and refill. `hudRect` starts at (3, 0) and includes the chains, because it doubles as the bubble-layout obstacle.
12. **state overlay** — either `assets/caught.jpg` with the final score/reaction plus the high-score ledger (or the name field, while one is being filed), or `assets/LevelDone.png` with the completed and incoming shifts, cover-fit to the live internal resolution (`drawSplashImage`). Both boards are `drawWalnutPlate` with brass rails and pixel-font headlines at `scale` 3 / 2 — there is no `ctx.fillText` anywhere in the game. The caught board is sized from the rows it has to hold, so the ledger, the ink-on-parchment name field and the speaker's quip note fit without overflowing it.

All of that interface is built from one **material kit** (`UI` palette plus `fillClipped`, `drawRivet`, `drawWalnutPlate`, `drawParchmentPlate`, `drawPlateTail`, `drawBrassRule`, `drawCenteredText` in `game.js`): walnut, brass, parchment, clipped corners, no rounded cards. New UI should go through those painters rather than fresh `fillRect` styling, and `style.css` mirrors the same hexes so the DOM shell matches the canvas.

Ambient animation (`updateAmbient`, `lampIntensity`, the regulars' blink and sway) is skipped entirely when `prefersReducedMotion` is set. `imageSmoothingEnabled = false` and pixelated CSS rendering are preserved throughout.

### 13. Page shell, input and touch

`index.html` is a fullscreen shell: the canvas is the page, and the title, subtitle and key list live in a start/help overlay (`#overlay`, toggled by the `?` chip and `Escape`) rather than permanently consuming layout. `style.css` uses `100dvh` with a `100vh` fallback, blocks document scrolling and overscroll, honours safe-area insets, and paints the letterbox area as the pub's own dark wainscoting under one amber lamp.

The shell uses the same materials as the canvas UI: `.board` is a walnut plank (bevels, grain, ink outline) and `.riveted` adds brass corner rivets as backgrounds; the corner chips are `chip board` plaques with brass lettering (the fullscreen icon is four gradient-drawn brackets, not a glyph); the start panel is a `panel board riveted` sign with brass rails, chains drawn by its `::before`/`::after` (which is why its content scrolls inside `.panel-scroll` rather than the panel clipping itself), a parchment `.keys` menu card with brass `kbd` keycaps, and burgundy-leather `.primary` buttons. The touch stick is a beer mat with a brass knob and the action button a leather-and-brass bell. `#top-bar` sits above the overlay so sound and fullscreen stay reachable while paused.

- **Keyboard**: WASD/arrows to move, `E` *or* `Space` to grab and deliver, `Space` to restart on the caught screen, `Escape` for the overlay.
- **Touch**: a DOM overlay (`#touch`), not canvas-painted — a constrained virtual stick bottom-left and a large action button bottom-right, both on Pointer Events with per-widget pointer capture so movement and interaction work simultaneously. The stick's centre is cached on `pointerdown` so dragging never reads layout. Targets are ≥44 CSS px and only appear on a coarse pointer/touchscreen (or the first `touchstart`).
- **`clearHeldInputs()`** is the single funnel for anything that can strand an input — restart, `blur`, `visibilitychange`, fullscreen transitions, `pointerup`/`pointercancel`/`lostpointercapture` — so the player can never be left walking.
- **Fullscreen** is a nicety: the button is hidden entirely when the API is absent, and everything else still works.
- The loop skips both simulation and painting while `document.hidden`, and `dt` is still clamped to 0.05 so returning to a background tab never teleports anyone.

### 14. Sound

`src/sound.js` synthesizes short Web Audio cues for orders, pickup, delivery, penalties, level-ups, the Jameson (grant, bounce and wearing off) and being caught. It creates its `AudioContext` lazily from the first start/action gesture so browser autoplay rules are respected, and degrades to silence when Web Audio is unavailable. The SFX chip and `M` key toggle sound; the choice persists in `localStorage` when storage is available. Automatic cues have tiny per-event rate limits so simultaneous customer events do not stack into an abrasive burst.

### 15. `resetGame()`

Still the single source of truth for "new game" state. It resets `gameTime`, the player position, a collision-free hunter spawn, `caught`, life/invulnerability/regeneration, score/shift-tally state, `customers`, `floatingTexts`, `player.tray`, every seat's `occupied` flag and the spawn timer — and also builds or resets the regulars, calls `Dialogue.reset()`, calls `resetDialogueTriggers()`, fires the `restart` dialogue category (only if a run has already ended), clears held inputs, and syncs the caught-screen DOM.

It also clears `enteringName`/`nameInput`, the Jameson/bladder/smoke timers and packs/puddles, the ghost, waiter, busboy and Alex, the tray and double state, the hunter's state machine and order (he restarts `arriving` at the door), spills, dynamic blockers, the round, the shift (number, clock, tips, tally, stats) and the hit-stop/pint-knock timers. **Any new piece of mutable global run state needs to be reset here too**, or it will leak across a restart. Reserved seats are the deliberate exception: `reserved`/`regularId` are set once at load and never cleared.

## Development scaffolding

`game.js` ends with `window.__debug = {...}`. **This is disposable console support, not an API** — nothing in the game reads it, and it can be deleted wholesale. Beyond the raw state handles (`player`, `hunter`, `customers`, `regulars`, `SEATS`, `TABLES`, `ctx`, …) it exposes:

| Helper | Use |
| --- | --- |
| `setScore(n)` / `getScore()` / `getLevel()` | Total tips; `getLevel()` is the shift number (use `setShift` to change it). |
| `setLife(n)` / `getLife()` | Inspect the damage/regen bar. |
| `getJameson()` / `giveJameson(seconds?)` | Hand over the shot without a delivery, or with a shorter clock to watch it expire. |
| `getViewport()` / `getCamera()` | Current internal resolution, integer scale, orientation, camera origin. |
| `reservedSeats()` / `freeGenericSeats()` | Inspect seat reservation. |
| `forceRegularOrder(id, type?)` | Make a regular order now, optionally of a given type. |
| `setNazimDrinks(n)` | Jump to any intoxication stage; returns the new stage and whether it changed. |
| `computeCustomerPath` / `findBlockingObstacle` / `pointBlocked` | Check a layout edit hasn't sealed a seat off. |
| `FURNITURE` / `BENCHES` | Every collider in one array — what a flood-fill reachability check runs over. |
| `getGhost()` / `spawnGhost()` | Summon the apparition instead of waiting 35–80s for it. |
| `getHunterState()` / `setHunterState(s, t?)` / `hunterCanSeePlayer()` / `hunterWantsPint()` | Drive the hunter's state machine, test his sight, make him order. |
| `getShift()` / `setShift(n)` / `setShiftClock(t)` / `endShift()` / `startNextShift()` | Jump shifts, force last call, open and close the tally board. |
| `getSpills()` / `getRound()` / `callRound()` / `startNazimWander()` | Nazim's consequences and the round, on demand. |
| `getWaiter()` / `spawnWaiter()` | Send the waiter in now; the returned entity's `state`/`pose`/`mist` can be driven by hand. |
| `loadHighScores()` / `saveHighScore()` / `clearHighScores()` / `getNameEntry()` | Inspect and wipe the stored table, and see the live name field. |
| `regularState()` | Order, patience, mood, drinks, stage and pose for all three. |
| `triggerDialogue(category, who?)` / `clearDialogueCooldowns()` | Fire and unblock dialogue. |
| `dialogueStats()` / `activeDialogue()` | What's queued and on screen. |
| `DIALOGUE_LINES` / `DIALOGUE_EXCHANGES` | The raw content, for coverage checks. |
| `spawnCustomer()` / `forceCaught()` / `resetGame()` / `update(dt)` / `render()` | Drive the simulation by hand. |
