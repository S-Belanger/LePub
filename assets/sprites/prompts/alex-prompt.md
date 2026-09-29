# Alex source provenance

The original September 23 glasses-bearing source described below was
superseded by the September 25 [portrait likeness revision](alex-likeness.md).
This file remains the exact historical prompt record.

Generated September 23, 2026 with the built-in imagegen tool. Reference:
`waiter-illustrated.png` for finish, camera and layout. That original PNG is
preserved in Git history; the current PNG contains the September 25 portrait
likeness edit. Metadata measured with `tools/import-illustrated.js`.
This is reviewed AI illustration, not hand-cleaned or palette-locked pixel art.

## Exact generation prompt

Use case: stylized-concept. Create a production transparent PNG sprite atlas for LePub using the attached waiter sheet ONLY as the style, overhead camera, material rendering and 4x4 layout reference. New character ALEX, adult male regular: dark swept-back hair, black rectangular glasses, short full dark beard, wide friendly grin, muted teal t-shirt (#2f6f6a), charcoal grey shorts ending above knee, bare lower legs, off-white sneakers. No apron, no bottle. Match the reference's detailed warm illustrated raster artwork, dark brown contours, amber upper-left shading, textured hair and fabric folds, chunky recognizable proportions and elevated overhead camera with visible crown/shoulders and foreshortened body. Genuinely transparent alpha background, no backdrop, ground, baked shadows, checkerboard, text or grid. Square sheet exactly FOUR equal columns and FOUR equal rows, complete isolated figures with generous transparent margins, consistent head/body size in all 16 cells. Columns DOWN, RIGHT, UP, LEFT. Row1 standing idle. Row2 walking left foot forward. Row3 walking right foot forward. Row4 Alex doing a full SIDE SPLIT seated low on floor, straight legs extended in opposite directions with shoes at ends, hands out for balance. Make the split torso lower but DO NOT shrink his head/body to fit; all figures must fit in their cells. Down/up split legs run horizontally across image; right/left split legs follow corresponding foreshortened floor axis. Keep same camera and identity in every pose. Clean transparent cutout, no overlapping cells. This is a matching new cast member, not a redesign of the existing waiter.

## Review limits

Initial source was rejected by the browser alpha check: 62 opaque pixels
crossed the first split cell boundary. The selected source is the built-in
imagegen spacing correction below, copied unchanged and remeasured.

### Exact correction prompt

Edit this Alex sprite atlas ONLY to fix cell spacing. Preserve this exact illustrated character, material detail, facial identity, teal tee, grey shorts, bare legs, sneakers, all poses, elevated overhead camera, transparency and 4x4 grid. Every figure must fit completely inside its OWN exact quarter-width/quarter-height cell, with at least 22 transparent pixels on every edge of each cell. The split shoes currently extend past the cell boundaries, especially bottom-left. Uniformly reduce ALL SIXTEEN figures to 82% of their current size within their respective cells, preserving the SAME head/body scale ratio between idle/walk/split and without shortening limbs or altering anatomy. Center each entire figure inside its cell, all sixteen fully isolated, no overlap/clipping across cells. Keep crisp detail. Do not add any background, checkerboard, shadow, floor, grid lines, labels or text. Genuinely transparent RGBA PNG. Four columns down/right/up/left, rows idle/walk-left/walk-right/full split. Leave ample empty margins around the widest split shoes. This is a technical spacing correction of the attached image, not a redesign.

Gameplay uses the down-facing split over its existing horizontal collider.
The side-facing split illustrations do not rotate the leg axis fully; they
are retained as source variations and are not used by the gameplay split.
The standing/walking directions and down-facing split are the acceptance focus.
