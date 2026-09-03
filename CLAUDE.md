# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Le Pub: The Chase" — a small top-down 2D serving/chase game rendered in pixelated 8-bit style. You play a guy in a deer onesie waiting tables in a pub while a hunter stalks you: fetch orders from the bar, deliver them before customers give up, and don't get caught.

It's plain HTML/CSS/JS with **no build step, no package manager, and no dependencies**: `index.html` loads `style.css` and `game.js` directly via a `<script>` tag, and `game.js` draws everything to a `<canvas>` with the 2D context.

There is no `package.json`, no test suite, and no linter configured. The only other asset is `assets/caught.jpg`, the splash shown when the hunter catches you.

## Running it

There is no build command. To run the game, either:
- Open `index.html` directly in a browser, or
- Serve the directory with any static file server and open the served URL.

`.claude/launch.json` defines the one run config used here: `python -m http.server 8917`. A static server is preferred over `file://` so `assets/caught.jpg` loads reliably.

Any change to `game.js`/`index.html`/`style.css` takes effect on a page reload — no compilation step.

## Architecture

Everything lives in one file, `game.js` (~960 lines), written as flat top-level `const`/`function` declarations (no classes, no modules). Execution order matters: later sections rely on data built earlier in the file (e.g. rendering closes over `FURNITURE`, `SPRITES`, `SEATS` defined above it). The file is organized top-to-bottom as:

1. **Canvas/world setup** — a small internal resolution (320×180) is drawn to and then scaled up via CSS `image-rendering: pixelated` (960×540, see `style.css`). The world is **portrait**: `WORLD_W` 200 × `WORLD_H` 360, in the same pixel units as sprites, so the camera scrolls vertically far more than horizontally. `TILE` (16) is only the floor-rendering grid — not a collision or layout grid. The camera centers on the player and clamps to the world bounds in `render()`.

2. **Furniture: hand-placed, not procedural** — the floor plan is an explicit list. `BAR_SEGMENTS` is three rectangles forming an L (a short upper-left counter, a vertical stem, and a foot that meets it), and `TABLES` is a literal array of `makeTable(cx, cy, opts)` calls: a small top-left table, a long 8-seat table down the right, a column of three 2-seat tables, and two wide 8-seat tables at the bottom. `makeTable` takes `{w, h, seats: {n, s, e, w}}` where each side's count is how many chairs are spaced evenly along that edge (default 1, `0` = none), and its collider is padded by `CHAIR_GAP + CHAIR_SIZE` so chairs block movement too. `getTableSeats()` derives those evenly spaced points and is used for **both** gameplay seat positions and chair sprite placement, so the two can never drift apart. `SEATS` is every table's seats flattened, each carrying a back-reference to its `table` plus an `occupied` flag. Changing the layout means editing the `TABLES`/`BAR_SEGMENTS` literals — there is no generator and no map file.

3. **Sprite authoring DSL** — all visuals (characters and order icons) are built the same way: `R(char, count, char, count, ...)` builds one row string of palette-key characters, `buildSprite(rows)` wraps an array of rows into a `{rows, w, h}` sprite, and a separate palette object maps each character to a hex color (or `null` for transparent). `drawSprite()` is the single generic renderer for this format — reused for the doe, the hunter, customers, and the tiny 6×8 order glyphs in speech bubbles. Customers share one sprite geometry but get a per-instance palette from `makeCustomerPalette()` so shirt colors vary. Any new character or icon should follow this same rows+palette convention.

4. **Entities and movement** — `makeEntity(kind, x, y)` creates the shared entity shape used by the player, hunter, and every customer. **An entity's `(x, y)` is its feet/anchor point, not top-left** — sprites are drawn upward from `y - sprite.h`, and this convention underlies collision boxes (`getFootBox`), z-sorting, and speech-bubble placement throughout the file. `tryMove(e, dx, dy)` resolves the X and Y axes independently against `FURNITURE` colliders (via `collidesAt`) so movement slides along walls/tables instead of stopping dead, and it returns `{x, y, blockedX, blockedY}` — the hunter uses those blocked flags for its unstick logic. Base speeds: player 62, customer 38, hunter 54 (the hunter's is recomputed every frame from the level, see below).

5. **Customer/order state machine** — each customer cycles through `entering → sitting → leaving` (`updateCustomer`), walking directly (no pathfinding, no collision) between `DOOR` at the bottom wall and its assigned seat. On sitting down it gets a patience clock (`sitTimer`, 30–50s, with `patienceDuration` remembered so the bar can render a fraction) and after a short delay rolls a random order from `ORDER_TYPES` (three beer variants, cocktail, wine, food — derived from the keys of `ORDER_ICONS`), shown as a speech bubble via `drawOrderBubble` with a green/yellow/red patience bar above it. A customer whose patience runs out while unserved costs `FORGOTTEN_PENALTY` (15) points; a delivery earns `POINTS_PER_DELIVERY` (10) and shortens their remaining stay.

6. **Carrying and delivery** — the player's single `player.carrying` slot holds `{ type, customer }`, referencing the *specific customer instance*, and that customer is flagged `beingCarried` so two orders are never picked up for the same person. `handleInteract()` (bound to the `E` key) either grabs the oldest pending order when standing near any bar segment, or delivers the carried one. **Delivery works next to the customer _or_ anywhere near their table's collider** (`nearRect`), since walking around a long table to one exact chair isn't fair. If the target gives up and leaves while you're carrying, `update()` re-targets the order each frame to anyone else waiting on the same type (or `null` until someone does) rather than wasting the trip — so `player.carrying.customer` can legitimately be `null`.

7. **Hunter AI: pursuit, not wandering** — `pickNewHunterDirection()` re-aims at the player's *current* position on a short timer with random angle jitter (so it's not an aimbot) and a small chance to pause instead. Level tightens all three: jitter 60°→15°, shorter re-aim timer, smaller pause chance. If `tryMove` reports **both** axes blocked, the hunter is wedged in a corner and `pickEscapeDirection()` fires a fully random burst (re-aiming at the player there would just re-wedge it); if only one axis is blocked, `tryMove` has already slid it along the open axis and the code just re-aims sooner. Catch detection is a simple distance check at the end of `update()`.

8. **Levels and difficulty** — level is *derived* from score (`getLevel() = floor(score / LEVEL_UP_SCORE) + 1`, `LEVEL_UP_SCORE` 100), so it never needs its own reset. All scaling clamps at `EFFECTIVE_LEVEL_CAP` (10) so the game plateaus instead of becoming impossible, while the displayed level keeps climbing as a badge of endurance. Per level: hunter speed `min(60, 40 + lvl * 2.5)` — deliberately capped just under the player's 62 so a straight-line escape always exists — plus sharper hunter aim, a higher concurrent-customer cap (`BASE_MAX_CUSTOMERS` 6, rising to 14), and faster spawns.

9. **Render pipeline** — `drawGround()` paints a staggered hardwood plank floor (shade picked by a hash of plank index and row, so a plank reads as one board) and skips tiles outside the map. Furniture and all entities are then merged into one `drawables` array and sorted by `sortY` each frame, so nearer (lower on screen) things draw over farther ones. Note the table's `sortY` intentionally uses the table top's own front edge rather than the wider chair-inclusive footprint — a customer seated on the south chair stands closer to the camera than that footprint edge and must draw in front of the table, not behind it (see the comment in `makeTable`). After the sorted loop come three separate passes that always float above the scene: speech bubbles, the fading `floatingTexts` (`+10`/`-15`), and the `LEVEL / SCORE` HUD. When `caught`, `assets/caught.jpg` is cover-fit over the whole canvas under "CAUGHT! / press SPACE to restart" (with a flat dark overlay as the fallback if the image hasn't loaded).

10. **`resetGame()`** is the single source of truth for "new game" state — it re-initializes the player position, re-rolls a collision-free hunter spawn via `pickClearSpawn`, clears `caught`, `score`, `customers`, `floatingTexts`, and `player.carrying`, frees every seat, and resets the spawn timer. Any new piece of mutable global game state needs to be reset here too, or it will leak across a restart (`Space` after being caught).

## Known state to be aware of

- `game.js` currently ends with a `window.__debug = {...}` export exposing internal state (entities, `SEATS`, `handleInteract`, `getScore`/`setScore`/`getLevel`, etc.) to the browser console. This was added as ad-hoc debugging scaffolding, not a supported API — treat it as disposable and feel free to remove or change it rather than preserving its shape.
- The banner comment at the top of `game.js` still calls the game "Waiter Chase", an earlier working title. The user-facing name in `index.html` is "Le Pub: The Chase".
