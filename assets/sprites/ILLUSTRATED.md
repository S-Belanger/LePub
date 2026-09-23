# Illustrated overhead cast

The production manifest selects eleven `*-illustrated.json` atlases: Doe,
Hunter, Nazim, Sam, Gerald, Jay (`waiter`), Alex, Alex with macebell, and three walk-in looks. These
are new raster illustrations, not exports of `ohFigure`. Built-in imagegen
produced the PNGs on September 21–23, 2026. No external image API was used.
Source PNGs remain unchanged after generation; the importer only writes JSON.
These are AI-generated, visually reviewed assets, not hand-cleaned Aseprite art.

Alex was added September 23 using Jay's sheet as reference; see
[his exact prompt and limitations](alex-prompt.md). The current
[visual system](../../docs/VISUAL-SYSTEM.md) and `src/character-art.js` govern
new characters. Importer, runtime pose selection and gallery share that
contract; `node tests/character-art.js` enforces production coverage.

With a local server running, open [/tools/art-review.html](/tools/art-review.html)
to inspect every direction and pose at desktop, phone or enlarged size.

## Frame contract

Every selected source is 1254×1254 with four columns. Most have four rows;
Alex's supplemental macebell sheet has six, with measured transparent row
cuts declared in `src/character-art.js`.
Columns are **down, right, up, left**. Cell boundaries are rounded from actual
image dimensions; do not assume the prompt's requested 384px cells were obeyed.
`tools/import-illustrated.js` measures alpha bounds in each cell, keeps its
horizontal centre and anchors the bottom of the visible silhouette to the floor.
One density per family preserves scale across poses/directions: maximum idle
height is 24 world units for leads and 21 for other people, including padding.
The original world coordinates, colliders, movement and seat positions remain.

| Family | Row 1 | Row 2 | Row 3 | Row 4 |
| --- | --- | --- | --- | --- |
| Doe | Idle | Walk A | Walk B | Holding a pint |
| Hunter | Idle, gun slung | Walk A | Walk B | Holding a pint, gun slung |
| Nazim | Idle | Walk | Lean | Slump |
| Sam / Gerald | Idle | Walk A | Walk B | Talking gesture |
| Jay | Idle | Walk A | Walk B | Cleaner spray bottle |
| Three walk-ins | Idle | Walk A | Walk B | Talking gesture, reserved |
| Alex | Idle | Walk A | Walk B | Full split (gameplay uses down) |

`alex-mace` has idle, walkA, walkB, maceA, maceB and maceC rows. The three
swing phases plus idle make an 880ms loop. Carrying and exercise use this
appearance; split visits keep the original Alex sheet. See
[mace provenance and exact prompt](alex-mace-prompt.md).

`carryWalk` currently uses the held-pint frame with the game's existing step
lift; it has no independently illustrated carry strides. Nazim's wander uses
his leaning state as before. Fine facial blush/blink variants are not baked
into these sources; overhead lean/slump/sway and dialogue communicate his stage.
Generated side-view prop anatomy still merits artist review before a final art
sign-off. The ghost stays procedural and translucent by design.

## Rendering and fallback

The single `ART_SCALE=4` transform now preserves more source detail. At
1280×720 desktop the backing is 1280×720; at 390×844 portrait it is 780×1440
displayed at 390×720. The logical viewport and integer CSS world scale are
unchanged. Mobile downsampling is deliberate; no DPR or world multiplier is
introduced. This is illustrated raster art sampled onto a crisp backing grid,
not a strict 30-colour native pixel sheet.

Continuous-alpha light pools and vignette replace the coarse Bayer pattern
that obscured faces and material detail. Glow cache keys include opacity.
The room/furniture remain procedural; these sprites do not establish full
visual parity with the painted environment reference.

`rasterFamilyFor` selects a walk-in sheet using its existing `look`; `kind`
stays `customer`, with its old palette retained for fallback. The eleven selected
sheets replace the former six procedural exports. On missing/invalid images,
the existing per-family procedural renderer still runs. Original `doe.png`,
`hunter.png`, etc. are preserved. The exporter must never append a competing
procedural entry to the manifest for an illustrated family.

## Prompt set and provenance

The named cast used
[`character-camera-study.png`](../art-direction/overhead/character-camera-study.png)
as camera/style reference. Walk-ins used `waiter-illustrated.png` as the
transparent layout and camera template. The following is the production prompt
recipe, with per-character differences listed below:

```text
Production transparent PNG game sprite atlas for LePub. Detailed illustrated
pixel-art, warm upper-left shading, dark outlines, fabric seams and readable
silhouettes. High overhead orthographic-looking camera, about 65 degrees above
horizontal: visible crowns and shoulders, foreshortened bodies and legs.
Side views use the same elevated camera. Square sheet, strict 4 columns × 4 rows.
Columns: DOWN toward viewer, RIGHT, UP away, LEFT. Same physical scale and floor
contact in every cell. All 16 figures complete, isolated, no overlap/clipping.
Truly transparent alpha, no backdrop, checkerboard, floor, cast shadow, text,
labels or grid. Match reference material detail rather than geometric blobs.
```

| Source | Identity and pose instructions |
| --- | --- |
| `doe-illustrated.png` | Brown deer hood, small antlers, glasses, dark beard, cream chest, black boots; rows idle / left stride / right stride / pint in anatomical left hand. |
| `hunter-illustrated.png` | Revised September 23 from the user's portrait: swept brown hair/high forehead, wide rectangular glasses, fuller cheeks, light chin stubble, no cap; red/black plaid sleeves, olive vest, shotgun slung over right shoulder. Same idle/walk rows; last row drinking. [Exact revision prompt](hunter-prompt.md). |
| `nazim-illustrated.png` | Medium-brown skin, tousled dark hair, stubble, olive hoodie with hood down, charcoal trousers; idle / walk / leaning / deeply slumped, no furniture included. |
| `sam-illustrated.png` | Navy flat cap, glasses, sandy side hair, burgundy/cream stripes, charcoal trousers; idle / two strides / talking. Follow-up edit: remove beard/moustache in all visible faces; retain glasses, positions and transparency. |
| `gerald-illustrated.png` | Bald older man with grey side hair, moustache and eyebrows, ruddy skin, burgundy cardigan; idle / two strides / talking gesture. |
| `waiter-illustrated.png` | Short dark hair, glasses, clean chin, black tee, pale waist apron; idle / two strides / teal cleaner bottle with red trigger in right hand. |
| `customer-teal-illustrated.png` | Auburn-haired adult woman, teal knit sweater, charcoal trousers, brown boots; idle / two strides / talking. |
| `customer-ochre-illustrated.png` | Darker-brown-skinned adult man, grey tweed flat cap, ochre overshirt, dark stubble; same rows. |
| `customer-blue-illustrated.png` | Fair-skinned man, wavy dark hair, slate-blue rolled-sleeve shirt, charcoal trousers, clean chin; same rows. |

A combined customer-sheet attempt and its background-removal edit were rejected
because they retained an opaque painted backdrop. Neither is shipped.

## Reproduce validation

```sh
node tests/character-art.js
node tests/smoke.js
node tests/alex.js
node tests/assets.js
node tools/validate-art.js
node tools/validate-alex.js
node tools/import-illustrated.js doe hunter nazim sam gerald waiter customer-teal customer-ochre customer-blue
```

The last command rebuilds metadata only; use `node tools/import-illustrated.js alex alex-mace` for Alex. Browser tools require Edge and an
existing `playwright-core` install (direct or in npm's npx cache); the game
itself still has no runtime dependencies. Browser validation checks all eleven
loaded sheets, animation coverage, reactions/poses, keyboard/touch movement,
rotation without teleporting, and a simulated missing-image fallback. Its
timings measure CPU render submission in desktop Edge/emulation, not physical
phone or GPU/frame-pacing performance.
