# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Le Pub: The Chase" — a small top-down 2D serving/chase game rendered in pixel art. You play a guy in a deer onesie waiting tables in a pub while a hunter stalks you: fetch orders from the bar, deliver them before customers give up, and don't get caught. Three named regulars — **Nazim, Sam and Gerald** — hold the corner booth for the whole run, order drinks like anybody else, and comment on what you're doing.

It's plain HTML/CSS/JS with **no build step, no package manager, and no dependencies**: `index.html` loads `style.css` and eight plain `<script>` files directly, and everything is drawn to one `<canvas>` with the 2D context.

There is no `package.json`, no test suite, and no linter configured. The only image asset is `assets/caught.jpg`, the splash shown when the hunter catches you.

## Running it

There is no build command. To run the game, either:
- Open `index.html` directly in a browser, or
- Serve the directory with any static file server and open the served URL.

`.claude/launch.json` defines the one run config used here: `python -m http.server 8917`. A static server is preferred over `file://` so `assets/caught.jpg` loads reliably. Any static server works — the scripts are classic (non-module) `<script>` tags on purpose, precisely so `file://` keeps working and no server-side MIME configuration is needed.

Any change to the JS/HTML/CSS takes effect on a page reload — no compilation step.

## Files and load order

Script order in `index.html` matters: each file only uses things defined in the ones before it, and they share one global scope (top-level `const`/`function` in a classic script is visible to later scripts).

| File | Contains |
| --- | --- |
| `src/pixelfont.js` | 3×5 bitmap font: glyphs, `fontTextWidth`, `fontDrawText`, `fontDrawTextShadow`, `fontWrapText`. Pure data + helpers. |
| `src/scenery.js` | The `PUB` palette, `makeSeededRandom`, and the `makeGlowCanvas`/`makeVignetteCanvas` lighting bakers. No game state. |
| `src/sprites.js` | The sprite DSL (`R`, `buildSprite`), every sprite and palette (doe, hunter, customers, the three regulars, order icons) and the `SPRITES` set map. No canvas, no game state. |
| `src/dialogue-content.js` | `DIALOGUE_LINES` and `DIALOGUE_EXCHANGES` — authored text only. |
| `src/dialogue.js` | The `Dialogue` module: selection, weighting, cooldowns, queueing, repetition control. |
| `src/regulars.js` | `REGULARS` config, `INTOX_STAGES`, `NAZIM_STAGE_VISUALS`, order weighting, mood constants. Data and pure functions. |
| `src/sound.js` | The lazy Web Audio sound system and its synthesized cue definitions. No audio assets. |
| `game.js` | Everything that needs the canvas or mutable game state: viewport, world, collision, entities, customers, regulars runtime, input, page shell, touch, hunter AI, update, render. |

`game.js` is by far the largest (~2150 lines) and is still flat top-level `const`/`function` declarations, no classes. Execution order inside it matters the same way it always did.

## Architecture

### 1. Adaptive viewport

The canvas fills the browser viewport. `applyViewport()` recomputes three things on resize, `orientationchange` and `visualViewport` resize:

- `pixelScale` — an **integer** css-pixels-per-game-pixel factor, so art is never resampled onto fractional pixels.
- `viewW` / `viewH` — the internal (game-pixel) resolution, sized so `viewW*scale × viewH*scale` covers as much of the viewport as possible.

Landscape leans on a 320×180 base, portrait on 180×320 (the world is portrait, so a phone gets a portrait internal resolution instead of a squashed 16:9 letterbox). Both are clamped by `VIEW_MIN`/`VIEW_MAX` so an ultrawide monitor can't reveal empty space outside the pub — the leftover viewport is painted as a dark surround by CSS instead.

**`viewW`/`viewH` are `let`, not constants.** Everything downstream — camera, HUD, bubbles, overlays, the vignette — reads the current values, so a resize or rotation mid-run is just a re-derivation and never touches game state. Resizes are coalesced into the next frame via `viewportDirty`, and layout is read once per resize, never per frame. Setting `canvas.width` resets 2D context state, so `imageSmoothingEnabled = false` is restored there.

`getCamera()` centers on the player and clamps to the world; on any axis where the viewport is **larger** than the world it centers the world instead of pinning it to the top-left corner.

### 2. World and furniture: hand-placed, not procedural

`WORLD_W` 200 × `WORLD_H` 360, portrait. `TILE` (16) is only the floor-rendering grid — not a collision or layout grid.

`BAR_SEGMENTS` is three rectangles forming an L; `TABLES` is a literal array of `makeTable(cx, cy, opts)` calls. `makeTable` takes `{w, h, seats: {n, s, e, w}}` where each side's count is how many chairs are spaced evenly along that edge (default 1, `0` = none), and its collider is padded by `CHAIR_GAP + CHAIR_SIZE` so chairs block movement too. `getTableSeats()` derives those points and is used for **both** gameplay seat positions and chair sprite placement, so the two can't drift apart; each returned seat also carries the `side` it sits on.

`SEATS` is every table's seats flattened, each with a back-reference to its `table` plus `occupied`, `reserved` and `regularId` flags. Changing the layout means editing the literals — there is no generator and no map file.

**`TABLES[0]` is the regulars' booth** at (40, 45), 22×22 with one chair per side. It used to be 18×20 with two chairs down each long edge; that put seats ~7px apart, which is fine for anonymous patrons and unreadable once three 14×15 named characters sit there.

### 3. Sprite authoring and rendering

All visuals are rows-of-palette-characters: `R(char, count, ...)` builds a row string, `buildSprite(rows)` wraps rows into `{rows, w, h}`, and a palette object maps each character to a hex colour (or `null` for transparent). The regulars are authored as literal 14-wide strings instead of `R()` runs because their shapes are irregular enough that the runs would be less readable than the picture.

`drawSprite()` is still the single renderer for the format, but it no longer paints pixel by pixel every frame: it **bakes** each `(sprite, palette, facing)` combination into an offscreen canvas the first time it's needed and blits it afterwards. The cache is nested `WeakMap`s keyed by object identity, so a customer's one-off palette is collected along with the customer.

A sprite set is keyed by pose name. Movers use `idle`/`walk` driven by `legFrame`; the seated regulars set an explicit `pose` field (`idle`/`idleB`/`talk`, plus `lean`/`slump` and their talking variants for Nazim).

### 4. Entities and movement

`makeEntity(kind, x, y)` creates the shared shape used by the player, hunter, customers **and regulars**. **An entity's `(x, y)` is its feet/anchor point, not top-left** — sprites draw upward from `y - sprite.h`, and this underlies collision boxes (`getFootBox`), z-sorting and bubble placement everywhere.

`tryMove(e, dx, dy)` resolves X and Y independently against `FURNITURE` colliders so movement slides along walls/tables instead of stopping dead, returning `{x, y, blockedX, blockedY}`. Base speeds: player **62**, customer 38, hunter 54 (recomputed every frame from the level).

### 5. Customer/order state machine

Walk-in customers cycle `entering → sitting → leaving` (`updateCustomer`), walking directly between `DOOR` and their seat. On sitting they get a patience clock (`sitTimer`, 30–50s, with `patienceDuration` remembered for the bar) and after a short delay roll a random order from `ORDER_TYPES`, shown as a bubble with a green/yellow/red patience bar. Patience running out unserved costs `FORGOTTEN_PENALTY` (15); a delivery earns `POINTS_PER_DELIVERY` (10) and shortens their stay. Orders also record `orderPlacedAt` (in `gameTime` seconds) so the bar queue can be ordered by age.

**`spawnCustomer()` only considers seats that are neither occupied nor `reserved`.** A walk-in can never take a regular's chair.

### 6. Named regulars

Nazim, Sam and Gerald are permanent fixtures of the booth. Config is in `src/regulars.js` (identity, sprite key, `seatSide`, patience range, order cooldowns, weighted `orderWeights`, dialogue `accent` colour); the runtime instances live in `regulars` / `regularById` in `game.js`.

They are **not** generic customers: no `entering`/`leaving` lifecycle, no seat competition, and they stay for the whole run. What they *do* share is the order shape (`orderType`, `sitTimer`, `patienceDuration`, `served`, `beingCarried`, `seat`, `orderPlacedAt`), so pickup, carrying, target highlighting, table-range delivery, patience bars and scoring all reuse the existing serving code unchanged. The only branch is what happens *after* a delivery lands, in `completeDelivery()`.

Their orders are framed in amber (`BUBBLE_FRAME_REGULAR`) so they read apart from walk-ins without any extra HUD.

`resetRegular(r)` holds every mutable field and is called both at construction and on every restart, so a new run never inherits last run's orders, patience, mood, dialogue history or drink count.

#### Nazim's intoxication

`INTOX_STAGES` is a five-step ladder — `sober` (0 drinks), `warm` (1), `buzzed` (2), `drunk` (3–4), `gone` (5+). Only `ALCOHOL_ORDER_TYPES` count; food never does. The counter is incremented **only** inside `completeDelivery()`, so mashing the interact button can't advance his night without a completed trip to the bar.

`NAZIM_STAGE_VISUALS` maps each stage to a pose, cheek blush and eye colour (both palette-driven, so the same sprite rows serve every stage), blink interval, seated sway, and the reaction delay added to his dialogue. His five palettes are built once at load into `NAZIM_STAGE_PALETTES`. **His state is deliberately not shown as a meter** — it reads from how he looks and what he says.

Gerald's escalation is content-side: his lines about Nazim declare a `nazim: [...]` stage gate, so he can't use drunk material on a sober man.

### 7. Carrying and delivery

`player.carrying` holds `{ type, customer }` referencing a *specific* person — walk-in or regular — flagged `beingCarried` so two orders are never picked up for one person. `handleInteract()` (bound to `E`, `Space`, and the touch action button) either grabs an order at the bar or delivers the carried one.

`findOldestPendingOrder()` picks by `orderPlacedAt` across **both** populations, so the queue stays fair now that two feed it.

Delivery works next to the customer *or* anywhere near their table's collider (`nearRect`). If the target stops wanting the order, `update()` retargets each frame — **but only among walk-ins**. Silently re-pointing a drink at a different named regular would make ownership ambiguous, so a regular's order always has to be picked up for them on purpose; `player.carrying.customer` can legitimately be `null`. The validity check includes `orderType`, because a regular's order can lapse while they stay in their seat, whereas for a walk-in leaving is the only way out.

### 8. Dialogue

A reactive layer on top of gameplay. It never pauses the chase, blocks input, or holds up a frame.

- **Content** (`src/dialogue-content.js`) is separate from selection. A line is `{ who, category, text, weight?, stage?, nazim?, rare? }`; an exchange is `{ category, lines: [{who, text, delay}], ... }`. `stage` gates Nazim's own lines; `nazim` gates anyone's line on Nazim's *current* stage. Roughly 3–12 words per line so they're readable on the move.
- **Scheduling** (`src/dialogue.js`) does weighted selection, a global cooldown (shorter for high-priority categories), a per-character cooldown scaled by mood, bounded recent-line history globally and per character, a `MAX_ACTIVE` cap of two bubbles, and a delay queue so replies land while the game runs. `CATEGORY_PRIORITY` lets a real gameplay reaction outrank ambient chatter and flush queued filler.
- **Triggers** are fired from `game.js` at the moments they describe (`onRegularOrdered`, `onRegularGaveUp`, `onRegularServed`, the catch check, the abandonment branch in `updateCustomer`) plus `updateDialogueTriggers()` for the genuinely time-based ones (idle, carrying too long, near miss, hunter near the booth, two waiting, level up, whiffed interactions).
- **`Dialogue.reset()` is called from `resetGame()`**, so a restart cancels everything queued or on screen; `resetDialogueTriggers()` clears the edge-detection state alongside it.
- **Rendering** is `drawDialogueBubbles()`. Placement tries, in order: clear above the speaker's order bubble; straight above their head; pinned to the top of the camera; and only then hanging off the shoulder facing away from the booth. Bubbles are nudged sideways before vertically when two are on screen, and the HUD's footprint is fed in as an obstacle so a line can never sit on the score.

### 9. Hunter AI: pursuit, not wandering

`pickNewHunterDirection()` re-aims at the player's *current* position on a short timer with random angle jitter and a small chance to pause. Level tightens all three: jitter 60°→15°, shorter re-aim timer, smaller pause chance. If `tryMove` reports **both** axes blocked the hunter is wedged in a corner and `pickEscapeDirection()` fires a fully random burst; if only one axis is blocked, `tryMove` has already slid it along the open axis and the code just re-aims sooner. Catch detection is a distance check at the end of `update()`.

### 10. Levels and difficulty

Level is *derived* from score (`getLevel() = floor(score / LEVEL_UP_SCORE) + 1`, `LEVEL_UP_SCORE` 100), so it never needs its own reset. Scaling clamps at `EFFECTIVE_LEVEL_CAP` (10) so the game plateaus, while the displayed level keeps climbing. Per level: hunter speed `min(60, 40 + lvl * 2.5)` — capped just under the player's 62 so a straight-line escape always exists — sharper aim, a higher customer cap (`BASE_MAX_CUSTOMERS` 6 rising to 14), faster spawns, and a heavier night tint.

### 11. Render passes

`render()` runs explicit layers, farthest first:

1. **backdrop** — flat dark fill for wherever the viewport exceeds the world.
2. **room** — one `drawImage` out of `roomCanvas`, a world-sized offscreen canvas baked once at load by `drawGround()` + `drawArchitecture()`: plank floor with dithered grain and static wear, rear wall with windows and posters, side wainscoting, front wall and the door. Both functions take the target context as a parameter that deliberately shadows the screen `ctx`; they are only ever called against that offscreen canvas.
3. **floor light** — `drawFloorLight()` composites prebaked Bayer-dithered glow canvases with `'lighter'`: warm pools under five hanging lamps, cool spill from the windows, and the door, which brightens while somebody is coming through it.
4. **y-sorted scene** — furniture and every character in one pass sorted by `sortY`. The table's `sortY` intentionally uses the table top's own front edge, not the chair-inclusive footprint, so a customer on the south chair draws *in front of* their table (see the comment in `makeTable`). Entries come from a reused pool, so a busy frame allocates nothing.
5. **foreground** — the lamp fixtures themselves, then dust motes.
6. **grade** — a level-scaled midnight tint plus a dithered vignette (`makeVignetteCanvas`, rebuilt only when the viewport size changes).
7. **order bubbles**, then **dialogue bubbles** — above the grade, so a patience bar is never dimmed. `drawOrderBubbleFor()` picks whichever bubble a person warrants: the live order growing in, or the one just dealt with shrinking out. The pop is three discrete steps (`noteOrderPlaced` / `noteOrderCleared` / `tickOrderExit` keep the timing, shared by both populations) so it animates on whole pixels rather than easing through fractional sizes.
8. **floating score text** (`+10`/`-15`), pixel font, fading as it drifts up.
9. **HUD** — a compact pixel-font plate with level and score.
10. **caught overlay** — `assets/caught.jpg` cover-fit into the internal resolution, a dark plate for legibility, "CAUGHT!", the final level and score, the restart prompt, and the newest thing a regular said, attributed in their colour.

Ambient animation (`updateAmbient`, `lampIntensity`, the regulars' blink and sway) is skipped entirely when `prefersReducedMotion` is set. `imageSmoothingEnabled = false` and pixelated CSS rendering are preserved throughout.

### 12. Page shell, input and touch

`index.html` is a fullscreen shell: the canvas is the page, and the title, subtitle and key list live in a start/help overlay (`#overlay`, toggled by the `?` chip and `Escape`) rather than permanently consuming layout. `style.css` uses `100dvh` with a `100vh` fallback, blocks document scrolling and overscroll, honours safe-area insets, and paints the letterbox area as a deliberate dark surround.

- **Keyboard**: WASD/arrows to move, `E` *or* `Space` to grab and deliver, `Space` to restart on the caught screen, `Escape` for the overlay.
- **Touch**: a DOM overlay (`#touch`), not canvas-painted — a constrained virtual stick bottom-left and a large action button bottom-right, both on Pointer Events with per-widget pointer capture so movement and interaction work simultaneously. The stick's centre is cached on `pointerdown` so dragging never reads layout. Targets are ≥44 CSS px and only appear on a coarse pointer/touchscreen (or the first `touchstart`).
- **`clearHeldInputs()`** is the single funnel for anything that can strand an input — restart, `blur`, `visibilitychange`, fullscreen transitions, `pointerup`/`pointercancel`/`lostpointercapture` — so the player can never be left walking.
- **Fullscreen** is a nicety: the button is hidden entirely when the API is absent, and everything else still works.
- The loop skips both simulation and painting while `document.hidden`, and `dt` is still clamped to 0.05 so returning to a background tab never teleports anyone.

### 13. Sound

`src/sound.js` synthesizes short Web Audio cues for orders, pickup, delivery, penalties, level-ups and being caught. It creates its `AudioContext` lazily from the first start/action gesture so browser autoplay rules are respected, and degrades to silence when Web Audio is unavailable. The SFX chip and `M` key toggle sound; the choice persists in `localStorage` when storage is available. Automatic cues have tiny per-event rate limits so simultaneous customer events do not stack into an abrasive burst.

### 14. `resetGame()`

Still the single source of truth for "new game" state. It resets `gameTime`, the player position, a collision-free hunter spawn, `caught`, `score`, `customers`, `floatingTexts`, `player.carrying`, every seat's `occupied` flag and the spawn timer — and now also builds or resets the regulars, calls `Dialogue.reset()`, calls `resetDialogueTriggers()`, fires the `restart` dialogue category (only if a run has already ended), clears held inputs, and syncs the caught-screen DOM.

**Any new piece of mutable global run state needs to be reset here too**, or it will leak across a restart. Reserved seats are the deliberate exception: `reserved`/`regularId` are set once at load and never cleared.

## Development scaffolding

`game.js` ends with `window.__debug = {...}`. **This is disposable console support, not an API** — nothing in the game reads it, and it can be deleted wholesale. Beyond the raw state handles (`player`, `hunter`, `customers`, `regulars`, `SEATS`, `TABLES`, `ctx`, …) it exposes:

| Helper | Use |
| --- | --- |
| `setScore(n)` / `getScore()` / `getLevel()` | Level is derived from score, so `setScore` is how you reach a level. |
| `getViewport()` / `getCamera()` | Current internal resolution, integer scale, orientation, camera origin. |
| `reservedSeats()` / `freeGenericSeats()` | Inspect seat reservation. |
| `forceRegularOrder(id, type?)` | Make a regular order now, optionally of a given type. |
| `setNazimDrinks(n)` | Jump to any intoxication stage; returns the new stage and whether it changed. |
| `regularState()` | Order, patience, mood, drinks, stage and pose for all three. |
| `triggerDialogue(category, who?)` / `clearDialogueCooldowns()` | Fire and unblock dialogue. |
| `dialogueStats()` / `activeDialogue()` | What's queued and on screen. |
| `DIALOGUE_LINES` / `DIALOGUE_EXCHANGES` | The raw content, for coverage checks. |
| `spawnCustomer()` / `forceCaught()` / `resetGame()` / `update(dt)` / `render()` | Drive the simulation by hand. |
