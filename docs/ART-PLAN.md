# Art plan: getting the room to the reference

Reference: `assets/art-direction/warm-overhead-pub-reference.png`.
Status of the procedural art as of `ad61922`: night lighting, three-quarter
furniture, the cast at backing resolution, perimeter props. That is the
ceiling of code-drawn art. Matching the reference means **painted assets**,
loaded by the game instead of drawn by it. This document is the plan for that:
what the game will load, what the art has to be, and how to make it.

## 1. What changes in the game (my side)

- **Asset loader.** `src/assets.js` loads PNG sprite sheets and a room
  painting, with a small JSON per sheet describing frames and the feet anchor.
  The string-sprite DSL stays for anything without art yet, so the game never
  breaks while sheets arrive one at a time.
- **Internal resolution 640×360** (portrait 360×640), from today's 320×180.
  Characters go from ~20 px to ~48 px tall on screen. World coordinates,
  colliders and routes scale ×2 once, in one place (`WORLD_SCALE`); gameplay
  numbers (speeds, ranges) scale with them so the feel is identical.
- **Room as a painting.** The floor, walls and fixed furniture become one
  painted image (or a tileset) traced over the architectural plan; colliders
  stay data. Lighting stays in-engine (the additive lamp pass) so the lamps
  can still flicker, the fireplace breathe, and the night deepen per shift.
- **Camera stays three-quarter top-down.** Not isometric: the reference's
  diamond grid would mean rebuilding movement and collision for a look that
  three-quarter already gives.

Nothing about the loop, the hunter, the regulars or the shifts changes.

## 2. The art spec (what to make)

All sheets: PNG, transparent background, **no anti-aliasing**, nearest-
neighbour only, one light source from the **top-left**, three tones per
material, dark outline (`#16110c`), palette below. Camera: three-quarter
top-down — you see the front of a figure and a slice of the top of its head,
exactly as in the reference.

### Palette (the room's — keep to it)

| Role | Hex |
|---|---|
| outline / ink | `#16110c` `#181515` |
| walnut boards | `#563827` `#62402b` `#70492f` `#4a3024` `#7a5032` |
| walnut furniture | `#3b2219` `#5c3626` `#22130f` |
| bar top / lit wood | `#754324` `#a86632` `#e1a052` |
| brass | `#7d521a` `#d99a38` `#f6d688` |
| burgundy leather | `#4e1d1a` `#8d342f` `#b34a3f` |
| forest green | `#294936` `#4f7654` |
| amber lamp | `#b87524` `#f0b84c` `#fff4d6` |
| parchment / cream | `#e5c78d` `#f1d9a8` `#f5e3b9` |
| cool window | `#102a3a` `#326685` `#8ec8d4` |

### Characters (48 px tall on a 64×64 frame, feet at y = 60, centred)

| Sheet | Frames | Notes |
|---|---|---|
| `doe` | idle ×2, walk ×4, carry-idle ×2, carry-walk ×4, hit ×1 | brown deer onesie with hood, ears, small antlers; **glasses and beard**; cream chest patch; pint held out at arm's length in carry frames |
| `hunter` | idle ×2, walk ×4, look-around ×2, drink ×2 | orange trapper cap, glasses, beard, red/black plaid, brown vest, olive trousers, boots, shotgun over the shoulder |
| `nazim` | idle ×2, blink ×1, talk ×2, lean ×2, lean-talk ×2, slump ×2, slump-talk ×2 | dark hair, stubble, green hoodie; seated; lean/slump progressively lower |
| `sam` | idle ×2, blink ×1, talk ×2 | flat cap, glasses, cream/red striped shirt, smirk; seated |
| `gerald` | idle ×2, blink ×1, talk ×2 | bald, grey sides, heavy brows, big moustache, burgundy cardigan, arms folded; seated |
| `patron-a … patron-f` | idle ×2, walk ×4 | six looks: two with hats, two with coats, one woman with red hair, one bald |
| `waiter` | idle ×2, walk ×4, spray ×2 | apron, spray bottle |
| `ghost` | drift ×2 | translucent, no feet |

### Furniture and fixtures (three-quarter, transparent PNG each)

| Asset | Size (px) | Notes |
|---|---|---|
| bar counter, straight | 32 wide modular, 64 tall incl. front | panelled front, brass foot rail, worktop |
| bar corner (L) | 64×64 | |
| back-bar / gantry | 32 wide modular, 96 tall | two shelves of lit bottles, hanging glasses |
| taps | 32×48 | three brass fonts with handles |
| kitchen hatch | 64×48 | heat lamp, plates |
| round table | 48×48 | with candle |
| booth table | 96×64 | |
| long table | 192×64 | |
| stool | 24×32 | red cushion, dark legs |
| chair (N/S/E/W) | 24×40 | back rail away from table |
| wall bench | 32 wide modular ×48 | buttoned burgundy back |
| pendant lamp | 32×64 | green enamel dome, brass rim, bulb, cord |
| fireplace | 64×96 | stone, mantel, embers |
| stag trophy, coat stand, barrel, palm, string lights, rainy window (64×48), door (64×48) | | |

### Room

Floorboards as a **32×32 tileable** walnut board tile (two or three variants)
plus rug tiles; walls as three tiles (rear, side, front) plus corners. Or one
painting of the whole room at 400×720 traced over the architectural plan —
either works with the loader; tiles are easier to change when the plan does.

## 3. How to make them (the honest answer on "1:1")

No generator produces a game-ready sheet that is pixel-identical to a
concept painting; what gets you to "looks like the same artist" is a
**generate → clean → animate** workflow. Three routes, most to least
faithful:

### A. Commission a pixel artist (most faithful)
Hand the artist the reference and this spec. Ask for a **style sample** of
the Doe first (one idle frame) before the full order. Where to look:
r/gameDevClassifieds, r/PixelArt commissions, ArtStation, Fiverr (search
"pixel art sprite sheet top-down"). Budget roughly per sheet, not per hour,
and ask for `.aseprite` sources, not only PNGs.

### B. AI generation with a style reference, then clean-up (fastest)
The reference itself is a generated image, so the same family of tools can
produce matching pieces — **if** you anchor them on the reference every time:

- **Midjourney**: attach the reference as a *style reference* (`--sref` with
  the image URL) and, for a character, also as a *character reference*
  (`--cref`). Add `--stylize 50` to keep it literal.
- **ChatGPT / GPT image generation**: attach the reference image and ask for
  the specific asset "in exactly this style, same palette, same camera".
  Good at single figures and props; weaker at sheets.
- **PixelLab (pixellab.ai)**: built for game sprites — give it a character
  image and it produces idle/walk cycles and directions consistent with it.
  This is the tool for turning one approved Doe frame into the whole sheet.
- **Retro Diffusion (retrodiffusion.ai)**: pixel-art-tuned Stable Diffusion
  with an **Aseprite plugin**, palette control and tileable-tile mode; the
  right tool for the floorboard/wall tiles and the bar modules.
- **Scenario (scenario.com)**: train a small style model on the reference
  plus a handful of approved pieces, then generate everything else from it —
  the most *consistent* AI route once you have four or five good assets.

Whatever generates it, the output is not done until it goes through
**Aseprite** (aseprite.org, ~$20; the standard pixel editor):

1. Downscale to the spec size with *nearest neighbour* (Sprite → Sprite Size,
   "Nearest-neighbor").
2. Snap to the palette: Sprite → Color Mode → Indexed, with the palette
   above loaded (`.gpl` file — I'll add one to the repo).
3. Remove anti-aliased halo pixels; re-ink the outline.
4. Check the light direction (top-left) and fix any pillow shading.
5. Export as a sheet: File → Export Sprite Sheet, with the JSON data file —
   that JSON is what the game's loader reads.

### C. Trace by hand from the reference
Crop each character or prop from the reference, drop it into Aseprite as a
reference layer at 30% opacity, and draw the sprite over it on the spec grid.
Slow, but this is the only way that is literally 1:1 with the picture.

### The prompt (use with any of the AI tools; attach the reference)

> Pixel art game sprite in the exact style of the attached image: warm
> night-time pub, dark walnut wood, brass, burgundy leather, amber lamp
> light. Three-quarter top-down view, front of the figure visible.
> **[SUBJECT]**. Single subject, full body, centred, facing the camera,
> transparent background, crisp pixels, no anti-aliasing, no blur, no
> gradients, hard dark outline, light from the top-left, limited palette,
> 64×64 pixel canvas, character 48 pixels tall.

Subjects to substitute:

- *a man in a brown deer onesie with hood, deer ears and small antlers,
  round glasses, full brown beard, cream chest patch, holding out a pint of
  beer*
- *a burly hunter in an orange trapper cap, glasses, beard, red and black
  plaid shirt, brown vest, olive trousers, boots, shotgun over his shoulder*
- *a relaxed man with dark hair and stubble in a green hoodie, seated at a
  pub table* / *…slumped drunk over the table*
- *an older man in a flat cap and glasses in a cream and red striped shirt,
  seated, smirking*
- *a bald older man with grey side hair, heavy brows and a big moustache in
  a burgundy cardigan, arms folded, seated*
- *a green enamel pendant lamp with a brass rim and a lit bulb, hanging on a
  cord* — and so on down the furniture table.

For tiles add: *"seamless tileable texture, 32×32"*. For the room painting
add: *"top-down three-quarter view of the whole pub floor plan, no people"*
and attach the architectural plan alongside the reference.

## 4. Acceptance (what I check when a sheet comes in)

- Sizes and frame counts match the tables above; feet on the anchor row.
- No pixel outside the palette (the smoke test will check this).
- Outline present and closed; no anti-aliased edge pixels.
- Light from the top-left on every frame; no pillow shading.
- The Doe is recognisable at 1× in a crowded frame against the darkest
  board; the hunter's cap reads from across the room.

## 5. Order of work

1. Palette file (`assets/art-direction/lepub.gpl`) and the loader with the
   640×360 resolution — the game keeps running on procedural art meanwhile.
2. The Doe sheet first (it's the style sample for everything else), then the
   hunter, then the room tiles, then the regulars, then patrons and props.
3. Each sheet drops into `assets/sprites/<name>.png` + `.json`; I wire it,
   capture, compare against the reference, iterate.
