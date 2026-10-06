# Nazim portrait and approved overhead revision

October6,2026, built-in imagegen; backend identifier unavailable. Input order: existing Nazim sheet (body/pose edit target); user's local Nazim-New-Face.jpg (identity only); approved Nick B sheet (head pitch/gaze); Jay sheet (finish/camera). Original photo remains local, ignored/excluded from deployment; no raw image copy is added to public assets. transparent_background=true. Exact approved output/import/check/release outcome will be appended after execution.

## Exact edit prompt

```text
Use case: identity-preserve. Create an EDIT of Nazim's existing LePub sprite sheet (image1), replacing its GENERIC HEAD with the real likeness in image2; original green hoodie/drawstrings, dark trousers and brown boots are mandatory. Portrait is IDENTITY ONLY, not its white shirt, background or eye-level camera. Images3/4 are approved Nick B and Jay sheets: overhead posture/gaze/painted finish ONLY, no borrowed face/costume.
New Nazim: warm light-medium skin, dark textured wavy cropped hair on top with closely faded dark sides, high dark hairline texture, dark eyebrows, THIN ROUND WIRE-FRAME bronze/gold glasses with clear lenses (not thick black rectangles), neatly shaped full short dark-brown beard/moustache with clean cheek lines. Natural friendly/quiet expression, no cap. Recognisably match the supplied photo while painted in the shipped game's detailed warm-outline style. Replace the old wild brown curls/no-glasses generic head; do not paste a photo cutout.
Natural head level toward movement direction ALONG FLOOR, substantial hair crown, face compressed/foreshortened under crown, gaze ahead toward facing direction instead of camera above. No upward-craning face, sky-pointing nose, eye-level side portraits, closed-eye-only correction or ashamed bow. Same high-overhead camera/pitch as approved Nick B and Jay across all4 directions, except original deliberate extra lean/slump body posture.
One square TRUE TRANSPARENT RGBA sheet, EXACTLY16 independent complete figures,4columns DOWN/RIGHT/UP/LEFT,4rows IDLE / WALKING STRIDE / LEAN (mild forward drunk bend) / SLUMP (stronger head/upper-body dropped forward). Preserve original sixteen BODY/ARM/LEG poses and their semantic differences; Nazim has NO second walking-stride row. Glasses/beard/hair identity survives bent/slumped poses. Same scale all16, same green hoodie even rear views, no pose enlarged independently. Centered4x4 cells with generous12% transparent margin around silhouettes, feet/hands complete and separate.
Keep original character stout proportions, shoes/hood/body colors/folds, original lighting, detailed painted texture consistent with Jay/Doe/Hunter. No text/logos/grid/background/floor/shadow/checkerboard/watermark/other people, no shirt transfer from portrait. Only Nazim head likeness/pitch changes, not game mechanics.
```


## Accepted output and fresh integration review

October 6, 2026. Accepted output `exec-8a7b2c78-fb56-4483-af2b-6ebc9feee15c.png` copied unchanged
to `assets/sprites/nazim-illustrated.png`; SHA-256 `e3cdf5655f8be1ae8e6b4f81918d984d3adaad9032d001cce373ecd9d6d0c3a8`.
First revision output inspected and retained; no post-generation source-pixel editing.

Measured row cuts `[0, 321, 638, 934, 1254]`,
one density `12`, maximum idle21world units including padding.
Importer PASS16alpha/edge-checked frames; all six Node suites and real Edge
desktop/mobile full-cast/Nick/Alex/HUD checks PASS. Pose contracts/outfits and
mechanics retained; Alex split floor offset1.5 and22×7blocker unchanged.
See [current comparison, source receipt and actual checks](../../docs/art-review/cast-perspective/README.md)
and [release journal](../../docs/collaboration/2026-10-06-cast-perspective-release.md)
for publication receipts. Local emulation is not a physical-phone test; changed
projection preserves illustrated likeness, not identical original face pixels.
