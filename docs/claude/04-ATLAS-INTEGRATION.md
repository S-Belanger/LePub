# 4. Import and integrate the raster without changing the game's scale

[Start here](README.md) · [Prompts](03-PROMPTS.md) · [Review](05-REVIEW-TROUBLESHOOTING.md)

This chapter describes the actual importer/runtime in this checkout. Work from
the repository root. New tools or future refactors may change their contract;
inspect current source rather than treating prose as executable truth forever.

## File map

| File | Responsibility |
| --- | --- |
| `assets/sprites/<family>-illustrated.png` | Accepted original RGBA illustration; preserve its pixels |
| `assets/sprites/<family>-illustrated.json` | Measured image size, frame crops, contact pivots, density and animations |
| `src/character-art.js` | Authoritative family/kind/name/height/rows/poses/seams/offsets contract |
| `assets/sprites/manifest.json` | Exactly one selected illustrated JSON for each contracted family |
| `src/assets.js` | Validate/decode/load atlases; per-family ready/failure state and frame lookup |
| `src/sprites.js` | Existing procedural sets for load-failure resilience, not final illustrated art |
| `game.js` | Entity kind/facing/movement, state-to-pose mapping, world-space rendering |
| `tools/import-illustrated.js` | Read source alpha/cell bounds and write JSON; never alter PNG pixels |
| `tools/art-review.html` | Live production-manifest gallery with direction/pose/native-scale controls |
| `tools/validate-art.js` | Broad real Edge cast/poses/input/rotation/fallback checks |
| `tools/validate-nick.js` | Worked example of actual special-pose lifecycle/fallback and captures |
| `docs/art-review/<family>/` | Inspected screenshots, reports, review explanation |
| `assets/sprites/<family>-prompt.md` | Exact prompts/reference roles/selected output/provenance/limits |
| `HANDOFF.md` | Durable state of the current work and verification |

## 1. Confirm whether this is a new kind or a new appearance

A **kind** is gameplay identity (`nick`, `waiter`, `customer`). A **family**
is an illustrated appearance (`fred`, `customer-teal`, `nick`). They often
have the same name, but not always: Fred is family `fred`, kind `customer`.

A brand-new gameplay kind needs a corresponding entity/footprint/behavior and
procedural fallback entry. The contract check rejects kinds/families that do
not connect. Only do that behavior work within the user's requested scope.

An additional appearance for an existing kind needs explicit runtime family
selection. `rasterFamilyFor(e)` currently selects customer appearances through
`CUSTOMER_ATLASES` and otherwise returns `e.kind`. Merely adding another family
to the manifest does not make a waiter automatically choose it.

Nick's case is simpler: `SPRITES.nick`, entity kind `nick`, routing, cardinal
facing and `e.pose = 'sorry'` already existed. The new family matched his kind.

## 2. Declare the required artwork

Inside the existing `families` object in `src/character-art.js`, an ordinary
person is declared through the local `person` helper:

```javascript
// Worked Nick example: already present; do not insert a duplicate.
nick: person('Nick', 'nick', 'sorry', {
  rowCuts: [0, 326, 630, 923, 1254],
}),
```

This means:

- Family key: `nick`.
- Display name: `Nick`.
- Gameplay kind: `nick`.
- Maximum idle crop height: 21 world units, inherited from `person`.
- Source rows: `idle`, `walkA`, `walkB`, `special`.
- Animation `idle`: the idle row for each direction.
- Animation `walk`: `walkA → idle → walkB → idle` for each direction.
- Animation `sorry`: the special row for each direction.
- Optional `rowCuts`: measured source-pixel seams, specific to THIS source.

The standard walk steps are 160 milliseconds each; a stationary sequence
uses 1000 milliseconds. The importer and tests consume this same contract.
Do not hide a new special state inside `idle` to make validation pass.

If Nick had truly equal rows, omit `rowCuts`; the importer rounds boundaries
from actual width/height. If another character needs more/different rows,
declare them explicitly with its animation sequences. Existing Nazim/Alex
entries provide examples. Do not reuse Nick's numeric seams for new artwork.

Remove an existing temporary debt exception only when replacing it with an
actual illustrated family/source. Do not make a new exception just to ship
missing art. Ghost and busboy's explicit exceptions are not a template for new people.

## 3. Preserve and place the accepted source

Copy the original downloaded/generated PNG to its canonical production name.
For example, after checking both exact paths:

```powershell
Copy-Item -LiteralPath 'D:\ArtWorking\accepted-new-person.png' -Destination 'assets/sprites/new-person-illustrated.png'
```

This is an example path, not a file supplied by this guide. For replacement
work, confirm that replacing the existing production file is part of the task.
Preserve the previous accepted file in Git/history or a working backup.

Do not screenshot the preview, flatten against black, palette-quantize, resize,
hand-repaint, or crop the atlas during this step. If an intentional raster
edit is necessary, treat it as a new candidate with its own provenance/review.

Optional source-identity check, using the real paths:

```powershell
Get-FileHash -LiteralPath 'D:\ArtWorking\accepted-new-person.png' -Algorithm SHA256
Get-FileHash -LiteralPath 'assets/sprites/new-person-illustrated.png' -Algorithm SHA256
```

Matching hashes prove the PNG files match; they do not by themselves prove
the art, runtime selection or rendered result is correct.

## 4. Inspect alpha and layout without modifying the image

The optional read-only [atlas inspector](scripts/inspect-atlas.js) uses the
same Edge harness as the importer. Declare the family first, then run:

```powershell
node docs/claude/scripts/inspect-atlas.js nick
node docs/claude/scripts/inspect-atlas.js nick --equal-rows
```

For another family, substitute its existing contract key and source filename.
The first command uses its declared seams; the second deliberately inspects
equal rows to diagnose a suspected seam error. It reports actual PNG/RGBA
information, image dimensions, global empty-row bands, per-cell bounds,
fully transparent/opaque pixels and boundary hits. It writes no files.

**This diagnostic is not a replacement for the importer or visual review.**
Its alpha>=128 bands describe empty opaque silhouettes; low-alpha antialiasing
may still exist there. It separately reports fully transparent rows (alpha=0).
Do not label threshold-based bands “all pixels exactly transparent.”

## 5. Understand and resolve cell-boundary failures

The importer checks each cell for visible content, at least 20% fully
transparent pixels, and no alpha>=128 pixel on its boundary. If it fails:

1. Identify its zero-based row/column. `2,0` means third row, first column.
2. View that location on the complete source.
3. Measure whether the expected boundary falls through a real figure or a
   different row's figure because the generated spacing is uneven.
4. Look for a clean horizontal gutter shared across all four columns.
5. Choose the relevant response below, then reimport all cells.

| Actual situation | Correct response |
| --- | --- |
| Complete separate figures, clean horizontal gutters, quarter seam misplaced | Store measured `rowCuts` inside those gutters |
| Hand/shoe extends into a neighboring figure | Correct the raster layout; metadata cannot separate overlapping pixels |
| A figure is cut off at the outer image edge | Generate/edit complete anatomy and safe margins; missing pixels cannot be recovered by a crop |
| Columns drift away from the required four equal-width columns | Correct the source layout or explicitly develop/validate an importer extension; current importer has no arbitrary `columnCuts` option |
| Painted background or checkerboard | Regenerate/extract genuine alpha and inspect the resulting edges |

`rowCuts` must contain `rowCount + 1` integers, start at 0, end at the actual
image height and increase strictly. Each cut is a seam BETWEEN rows; it is
not a crop of one pose. Use boundaries that work across all four directions.

Nick's actual opaque-silhouette gaps were 311–340, 619–639 and 911–934.
Cuts 326, 630 and 923 sit inside them. A quarter seam at 941 would include
the top of the fourth-row cap in the third row. Moving the declared seam
preserved all source pixels and gave the correct cells. No edge guard was removed.

## 6. Import metadata and check the real process result

```powershell
node tools/import-illustrated.js nick
if ($LASTEXITCODE -ne 0) { throw 'Nick atlas import failed' }
```

The family must be declared and its source must be at the canonical filename.
On success, the importer writes `nick-illustrated.json` and prints dimensions,
alpha-checked frame count and density. It runs its own temporary local server
and Edge session; the preview server need not already be running.

Stop if the importer fails. Do not continue with stale JSON from a different
PNG. An error can occur after copying a draft into the repo, leaving the tree
temporarily invalid. Record that explicitly and finish or revert only your
candidate change as appropriate; do not discard unrelated work.

On Windows, the exit code of a sequence can be the final command's code.
For example, an import followed by `Get-Date` can end with overall exit 0 even
when the import failed. Check `$LASTEXITCODE` immediately and read the output.

## 7. The scale and pivot math

The importer measures each cell's alpha>=128 silhouette and adds two source
pixels of crop padding where possible. It computes:

```text
H = maximum crop height among the four idle directions
targetHeight = contract height (21 supporting person, 24 lead)
density = H / targetHeight

rendered crop width  = rect.width / density
rendered crop height = rect.height / density
rendered pivot X    = pivot.x / density
rendered pivot Y    = pivot.y / density
```

For Nick, `H = 275` and `targetHeight = 21`, so
`density = 275 / 21 = 13.095238...`. The same density applies to every cell.
A stride may extend a foot farther, and a gesture may widen the silhouette;
that does not justify independently rescaling those frames.

The horizontal pivot preserves the column's center instead of recentering
every asymmetric crop. The vertical pivot uses the silhouette's bottom contact,
expressed in frame-local source pixels. Frame-local means relative to the
cropped rect, not absolute atlas coordinates or collider dimensions.

Standing feet should stay on the floor when the pose changes. A split or
other floor pose may need a measured `floorOffsets` entry expressed in world
units, as Alex's contract does. Measure/contact-review it; do not borrow
another character's offset or set the pivot to the image center.

Leave `ART_SCALE = 4`, CSS/world/input scaling and collision dimensions alone.
To diagnose a too-large sprite, inspect its family density/contract before
changing global rendering. Source resolution and physical world size are separate.

## 8. Select the atlas in production

Add exactly one canonical JSON entry for the family to
`assets/sprites/manifest.json`, for example `nick-illustrated.json`.
Do not append the competing old procedural-export JSON for the same family.

The metadata must have the appropriate `fallbackKey`, illustrated policy,
RGBA image and all required directional animation sequences. The importer
builds these fields; `tests/character-art.js` checks production coverage.
Changing only the PNG without JSON/manifest is not a reliable integration.

The per-family load-failure renderer must remain available. It keeps the game
working if an image request/decode fails. That resilience does not justify
claiming missing production art is acceptable.

## 9. Verify real facing and pose selection

Runtime selection follows this chain:

```text
entity.kind / appearance → rasterFamilyFor(entity)
entity state / moving / pose → poseBase(entity)
entity.facing → animation id, such as sorry.down
Assets.hasFamily + Assets.frameFor → ready illustrated frame
drawRasterFrame → source crop, measured density, feet pivot
```

`poseBase` recognizes special poses declared by the selected art contract.
Nick's existing `e.pose = 'sorry'` therefore became a real illustrated pose
after the family was declared. Do not render an apology only by manually
selecting an atlas frame and call its gameplay event integrated.

Set cardinal facing through the existing movement/seat mechanism. A `flip`
boolean alone does not give four authored views. Normalize aliases explicitly
when needed (`sprayB` currently maps to `spray`).

Check special-pose enter, hold, return, exit/reset, pause/tally behavior and
missing-image fallback. For a new state variable, verify `resetGame()` clears
it. For an existing behavior, preserve it unless the user requested a change.

## 10. Record provenance accurately

Store the exact initial and accepted correction prompts, ordered reference
roles, generator/tool information actually available, original output identity,
date, dimensions, seams/density/pivot choices and rejected-attempt reasons.

The current importer inserts a generic built-in-imagegen provenance string.
If a future source came from a different generator or was supplied by an
artist, update that field accurately as part of integration and document the
source in `<family>-prompt.md`. Do not leave a false built-in-imagegen claim.
If import regenerates the default string later, reapply/review the truthful
provenance or deliberately extend the importer within the task's scope.

Then complete [the acceptance review](05-REVIEW-TROUBLESHOOTING.md), preserve
the evidence and update the durable handoff.
