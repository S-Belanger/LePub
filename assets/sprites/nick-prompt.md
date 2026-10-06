# Nick illustrated source

Generated October 6, 2026 with the built-in imagegen tool. Nick's existing
tracked `Nick.jpeg` supplies identity only; Jay's `waiter-illustrated.png` and
Alex's `alex-illustrated.png` supply the shipped finish and overhead camera.
The photo's jacket is not part of Nick's established baseball outfit. No
external image API, additional portrait copy or procedural export was used.

The accepted source is the second output, after a targeted stride refinement.
Its 1254×1254 RGBA pixels are copied unchanged to `nick-illustrated.png`.
The importer writes metadata only. The first draft stays outside the repository.

## Exact generation prompt

```text
Use case: stylized-concept.
Create a NEW production transparent RGBA raster game sprite atlas for LePub, using the supplied reference images. Image 1 is Nick's real photo for IDENTITY ONLY: fair skin, broad rounded cheerful face, full long thick ginger-brown beard and moustache, broad toothy smile, short hair and a backward baseball cap. Images 2 and 3 are shipped Jay and Alex sprite sheets: match their richly painted detailed HD overhead character finish, warm dark contour, soft textured shading, compact stout anatomy and clean readable silhouettes. Do NOT copy Nick's jacket from the photo; retain his established baseball outfit.
One SQUARE image with exactly SIXTEEN separate complete full-body figures in a strict FOUR COLUMN by FOUR ROW grid of equal-sized cells. Leave at least 12% fully transparent margin at EVERY edge of EVERY cell. All figures consistent scale, positioned on the same cell-center axis.
Columns left-to-right: DOWN toward viewer, RIGHT, UP away, LEFT. Rows top-to-bottom: IDLE neutral arms, WALK A left foot forward/right arm forward, WALK B right foot forward/left arm forward, SORRY with his right hand raised palm-out and his left hand on his stomach, sheepish pardon-me gesture. Author all four directions, retain anatomical hand ownership.
Camera high overhead about 65 degrees above horizontal in EVERY cell, including side views: visible large cap crown and shoulders, foreshortened torso and legs, same camera as Jay. No eye-level side portraits.
Nick wears a muted slate-blue-teal (#263d43) baseball cap BACKWARDS with adjustment strap above his forehead and the brim behind his head, thick ginger-brown beard, muted burgundy (#8d342f) short-sleeved baseball jersey with cream piping, buttons, cloth seams and folds, warm cream (#e6d8b4) baseball pants with dark belt and textured folds, dark baseball cleats. Friendly broad grin. Upper-left warm pub light, dark crisp contour, painterly cloth and beard details.
Transparent alpha outside figures and between cells. NO props, text, labels, numbers, logos, grid lines, background, floor, checkerboard, cast/drop shadow or other characters. No overlap or edge clipping. Large clean transparent gutters.
```

## Exact stride-refinement prompt

Inputs: first generated Nick atlas (edit target), shipped Jay atlas (gait/style reference).

```text
Edit the supplied Nick sprite atlas only to correct the WALK B gait in row THREE (third row from the top), across its four directions. Preserve row ONE idle, row TWO WALK A, and row FOUR apology EXACTLY: identity, clothes, camera, figures, transparency, grid, scale, spacing and artwork finish unchanged. Image 2 is Jay's atlas only as gait/style reference.
Row THREE must be the OPPOSITE walking phase from row TWO. In row TWO Nick's anatomical LEFT leg is forward and RIGHT arm forward. In row THREE, clearly move his anatomical RIGHT foot forward and LEFT arm forward, LEFT leg back and RIGHT arm back. All four directions MUST show that phase change: especially the UP/back-facing cell, its LEFT screen-side foot must now be the forward/lower extended foot and RIGHT screen-side foot must be tucked back, the opposite of row TWO. For right/left facing views, exchange which arm swings forward and which is back, and which leg extends, retaining his same facing and camera elevation. Show distinct alternation, do not repeat WALK A or mirror the entire figure. Keep both feet readable without extra limbs. Keep every figure centered in its equal cell and complete with generous fully transparent margins.
Preserve Nick's rounded broad smiling photo-informed face, thick ginger-brown beard, backward teal baseball cap with brim at the back, burgundy baseball jersey with cream piping, cream pants and dark cleats. Preserve painted HD overhead finish. No text, backdrop, grid, shadows or clipping. Output same square 4x4 atlas, true transparent alpha.
```

## Measured layout and integration

- Columns: down, right, up, left. Rows: idle, walk A, walk B, apology.
- The generated row spacing differs from equal quarters. Opaque-silhouette
  gaps (no pixels with alpha >= 128) are y311–340, y619–639 and y911–934.
  `src/character-art.js` records seams `[0, 326, 630, 923, 1254]` inside
  those gaps. The initial equal-quarter import correctly failed because its
  third/fourth seam cut into the apology cap; no source editing was needed.
- Final importer PASS: sixteen non-clipped alpha-checked frames, one density
  13.095238095238095 authored pixels per world unit, maximum idle height
  21 world units including crop padding. Same density across all poses/facings.
- Each cropped frame retains its cell-center X and silhouette-bottom contact
  pivot. Nick's existing 14×17 collision body and all rotation/fart rules stay.
- The family declares `sorry`; existing gameplay selects it after a fart while
  standing, then returns to idle. The old procedural set remains load-failure
  resilience, with idle fallback when an illustrated apology is unavailable.

## Review

Run `node tools/validate-nick.js docs/art-review/nick` for actual entry,
fart/apology/idle/reset, missing-image fallback and desktop/mobile-emulation
captures. The shared gallery includes Nick at `tools/art-review.html#nick`.
The comparison board shows imported production frames beside Jay and Alex,
then all sixteen Nick poses using the same per-family world scale.

These are reviewed AI illustrations, not hand-cleaned artwork. Fine likeness
and finger detail reduce at phone size. Browser emulation is not a physical
phone or production performance test. See the review README/report and newest
`HANDOFF.md` checkpoint for actual validation results and publication state.
