# Le Pub: The Chase

A compact pixel-art serving game where a waiter in a deer onesie works a crowded pub while a hunter stalks the room. Pick up the oldest waiting order at the bar, deliver it before the customer loses patience, and keep moving long enough to finish the next level.

![Le Pub gameplay showing active orders, the regulars, dialogue, and the life bar](assets/gameplay.png)

## Play the game

Le Pub is a static browser game. It has no build step, package manager, runtime dependencies, or backend.

To play locally, clone the repository and start any static file server from its root:

```powershell
git clone https://github.com/S-Belanger/LePub.git
Set-Location LePub
npx --yes serve . --listen 8917
```

Then open <http://localhost:8917>. If Python is already installed, this works too:

```powershell
python -m http.server 8917
```

Opening `index.html` directly also works in modern browsers, although serving the folder over HTTP is more reliable for image loading and closer to production behavior.

## How to play

1. Watch for order bubbles above seated customers and the three corner-table regulars.
2. Move beside any section of the L-shaped bar and grab the oldest waiting order.
3. Carry it to the highlighted customer. You can deliver beside the customer or anywhere close to their table.
4. Deliver quickly for 10 points. Letting an order expire costs 15 points.
5. Avoid the hunter. Contact removes one of three life segments and briefly shoves you to safety.
6. Survive and keep serving. Every 100 points completes a level and makes the pub busier and the hunter more accurate.

Life begins regenerating after three hit-free seconds. A fully empty bar takes 20 seconds to refill, and the third hit before recovery ends the shift.

### Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | `WASD` or arrow keys | Left virtual stick |
| Grab / deliver | `E` or `Space` | Right action button |
| Mute sound effects | `M` | `SFX` button |
| Pause / help | `Escape` or `?` button | `?` button |
| Restart after being caught | `Space` | On-screen restart/action button |
| Fullscreen | Fullscreen button | Fullscreen button, where supported |

The canvas adapts to landscape and portrait screens using integer pixel scaling, so the artwork remains crisp instead of being stretched across fractional pixels.

## The corner-table regulars

Nazim, Sam, and Gerald keep permanent seats at the booth in the upper-left corner. They participate in the same order queue as walk-in customers, but each has distinct patience, drink preferences, mood, dialogue, and reactions to the chase.

- **Nazim** is patient and orders steadily. Alcoholic deliveries move him through five visible intoxication stages; food does not.
- **Sam** has balanced patience and tends toward cocktails, food, and blond beer.
- **Gerald** is the most impatient, favors dark beer, and becomes increasingly opinionated about the room.

Their dialogue reacts to successful and missed deliveries, near misses, the hunter approaching the booth, level changes, long waits, idle play, and other events. Dialogue never pauses the chase.

## Gameplay systems

- **Fair order queue:** the bar serves the oldest unclaimed order across walk-ins and regulars.
- **Patience:** each order bubble includes a green, amber, or red countdown bar.
- **Delivery feedback:** score changes float above the affected customer, while order bubbles pop in and shrink away on a whole-pixel animation.
- **Life and recovery:** three partially refillable segments, a short post-hit invulnerability window, collision-aware knockback, and visible player flicker.
- **Difficulty:** higher levels add customers, speed up arrivals, improve the hunter's tracking, and deepen the night tint.
- **Responsive presentation:** separate portrait and landscape viewports, camera clamping, safe-area-aware controls, and optional fullscreen.
- **Sound:** lightweight synthesized Web Audio cues with no audio downloads; the mute preference is stored locally when browser storage is available.
- **Reduced motion:** ambient dust, lamp flicker, and seated sway are disabled when the operating system requests reduced motion.

## Project structure

The game uses classic scripts that share one global scope. Their order in `index.html` is intentional.

| Path | Purpose |
| --- | --- |
| `index.html` | Fullscreen canvas shell, help panel, touch controls, and script order |
| `style.css` | Responsive layout, safe areas, overlay controls, and pixel scaling |
| `game.js` | Mutable game state, input, entities, collision, AI, update loop, rendering, and debug helpers |
| `src/pixelfont.js` | Small bitmap font, measurement, drawing, and word wrapping |
| `src/scenery.js` | Pub palette, seeded scenery helpers, glow baking, and vignette baking |
| `src/sprites.js` | Sprite DSL, character art, palettes, and order icons |
| `src/dialogue-content.js` | Authored lines and multi-character exchanges |
| `src/dialogue.js` | Dialogue selection, priorities, cooldowns, queueing, and repetition control |
| `src/regulars.js` | Regular configuration, order weighting, mood, and Nazim's intoxication rules |
| `src/sound.js` | Lazy Web Audio initialization and synthesized sound cues |
| `assets/` | Gameplay screenshot, game-over art, level-completion art, and the floor-plan reference |

Static room art and lighting textures are baked into offscreen canvases. Sprite renders are cached by sprite, palette, and facing, while furniture and characters share one pooled y-sorted render pass.

## Development

Edit the HTML, CSS, or JavaScript and refresh the browser. There is no compilation or generated bundle.

There is currently no automated test suite. A quick syntax check from PowerShell is:

```powershell
node --check game.js
Get-ChildItem src -Filter *.js | ForEach-Object { node --check $_.FullName }
git diff --check
```

For browser testing, exercise both a wide desktop viewport and a portrait mobile viewport. Useful checks include resizing during a run, simultaneous movement and touch interaction, restarting after a catch, muting before and after the first sound, and crossing a 100-point level boundary.

### Debug console

`game.js` exposes a disposable `window.__debug` object for manual browser-console testing:

```js
__debug.forceRegularOrder('nazim', 'beer-blond');
__debug.setNazimDrinks(5);
__debug.setScore(100);
__debug.setLife(1 / 3);
__debug.triggerDialogue('hunterNear');
__debug.forceCaught();
__debug.resetGame();
```

Other helpers expose the current viewport, camera, reserved seats, regular state, dialogue queue, score, life, and level-splash state. This debug object is not a public API.

## Deploying

The repository is ready to deploy as a plain static Vercel project. No framework preset, build command, or output directory is required.

With the PowerShell deployment helper configured in the development environment:

```powershell
shipit "Deploy Le Pub" -Direct
```

Or use the Vercel CLI directly:

```powershell
vercel deploy --prod --yes
```

The `.vercel/` directory and local environment files should remain untracked.

## Browser support

Le Pub targets current desktop and mobile browsers with Canvas 2D and Pointer Events. Web Audio is optional: when it is unavailable, the sound control is hidden and gameplay continues silently. Fullscreen is also optional and disappears when the browser does not expose the API.
