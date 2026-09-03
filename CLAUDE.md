# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Le Pub" — a small top-down 2D chase/serving prototype rendered in pixelated 8-bit style. It's plain HTML/CSS/JS with **no build step, no package manager, and no dependencies**: `index.html` loads `style.css` and `game.js` directly via a `<script>` tag, and `game.js` draws everything to a `<canvas>` with the 2D context.

There is no `package.json`, no test suite, and no linter configured.

## Running it

There is no dev server or build command defined in this repo. To run the game, either:
- Open `index.html` directly in a browser, or
- Serve the directory with any static file server (e.g. `npx serve` or `python -m http.server`) and open the served URL.

Any change to `game.js`/`index.html`/`style.css` takes effect on a page reload — no compilation step.

## Architecture

Everything lives in one file, `game.js`, written as flat top-level `const`/`function` declarations (no classes, no modules). Execution order matters: later sections rely on data built earlier in the file (e.g. rendering closes over `FURNITURE`, `SPRITES`, `SEATS` defined above it). The file is organized top-to-bottom as:

1. **Canvas/world setup** — a small internal resolution (320×180) is drawn to and then scaled up via CSS `image-rendering: pixelated` (960×540, see `style.css`). `WORLD_SIZE` (256) is the map's logical size in the same pixel units as sprites; the camera centers on the player and clamps to the world bounds in `render()`.

2. **Furniture generation** — the bar and the 10 tables (with 4 seats each) are generated procedurally into `FURNITURE` (colliders) and `SEATS` (world-space seat points derived from each table via `getTableSeats`), rather than hand-placed or loaded from a map file. Changing table/bar layout means editing the generator constants (`TABLE_ROWS`, `TABLE_COLS`, `BAR`), not per-object data.

3. **Sprite authoring DSL** — all visuals (characters and order icons) are built the same way: `R(char, count, char, count, ...)` builds one row string of palette-key characters, `buildSprite(rows)` wraps an array of rows into a `{rows, w, h}` sprite, and a separate palette object maps each character to a hex color (or `null` for transparent). `drawSprite()` is the single generic renderer for this format — it's reused for characters, and for the tiny order-icon glyphs shown in speech bubbles. Any new character or icon should follow this same rows+palette convention.

4. **Entities and movement** — `makeEntity(kind, x, y)` creates the shared entity shape used by the player, hunter, and every customer. **An entity's `(x, y)` is its feet/anchor point, not top-left** — sprites are drawn upward from `y - sprite.h`, and this convention underlies collision boxes (`getFootBox`), z-sorting, and speech-bubble placement throughout the file. `tryMove(e, dx, dy)` resolves the X and Y axes independently against `FURNITURE` colliders (via `collidesAt`) so movement slides along walls/tables instead of stopping dead — both the player and the wandering hunter route through this same function.

5. **Customer/order state machine** — each customer cycles through `entering → sitting → leaving` (`updateCustomer`), walking directly (no pathfinding) between the door and its assigned seat. While `sitting`, a customer waits a short random delay and then rolls a random order type (`ORDER_TYPES`: three beer variants, cocktail, wine, food), shown as a speech bubble via `drawOrderBubble`. The player's single `player.carrying` slot holds `{ type, customer }` — it references the *specific customer instance*, not just an order type, so delivery is unambiguous even when multiple customers want the same thing. `handleInteract()` (bound to the `E` key) either grabs the oldest pending order when standing near the bar, or delivers the carried order when standing near its matching customer.

6. **Hunter AI** — pure random wandering (`pickNewHunterDirection`): a random direction/pause is picked on a timer, and hitting a wall or furniture on one axis reverses that axis's direction (hitting a corner on both axes triggers an immediate redirect rather than getting stuck).

7. **Render pipeline** — furniture and all entities (player, hunter, customers) are merged into one `drawables` array and sorted by a `sortY` value each frame, so nearer (lower on screen) things draw over farther ones. Note the table's `sortY` intentionally uses the table top's own front edge rather than the wider chair-inclusive footprint — a customer seated on the south chair stands closer to the camera than that footprint edge and must draw in front of the table, not behind it (see the comment in `makeTable`). Speech bubbles are drawn in a separate pass *after* the sorted `drawables` loop so they always float above everything.

8. **`resetGame()`** is the single source of truth for "new game" state — it re-initializes player/hunter positions, clears `customers`, frees every seat, and resets `player.carrying`. Any new piece of mutable global game state needs to be reset here too, or it will leak across a restart (`Space` after being caught).

## Known state to be aware of

`game.js` currently ends with a `window.__debug = {...}` export exposing internal state (entities, `SEATS`, `handleInteract`, etc.) to the browser console. This was added as ad-hoc debugging scaffolding, not a supported API — treat it as disposable and feel free to remove or change it rather than preserving its shape.
