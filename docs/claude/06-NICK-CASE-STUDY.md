# 6. Nick: the actual successful workflow, including what failed

[Start here](README.md) · [Original and refinement prompts](../../assets/sprites/nick-prompt.md) · [Review evidence](../art-review/nick/README.md)

This is a reconstruction from the actual October 6 local work, not an idealized
claim that the first image was flawless. The user approved the visual result.

**Historical source snapshot:** the numbers, exact prompts and captures below
describe the first illustrated Nick pass. The user subsequently approved
[Nick B](../art-review/face-perspective/nick-b-candidate.png) with heads/eyes
looking along the floor, as shown [beside Jay/Doe/Hunter](../art-review/face-perspective/nick-b-desktop.png).
That is the current gaze standard. Preserve this history; do not reuse its old
seams/density for replacement pixels or use the older lifted face as a benchmark.

## Before the upgrade

Commit `eb7d72e` added Nick as a recurring baseball-uniform visitor with fart
clouds/apology behavior. It supplied a photo and a procedural `OH_NICK` set.
The art contract listed him as an explicit procedural exception. His prompt
file described an illustrated source that had not been generated.

Current base `c915e9d` still had no `nick-illustrated.png/.json` selected.
The practical diagnosis was therefore “missing illustrated source and
integration,” not “the color palette alone is wrong” or “movement is broken.”

We cannot infer which generator/tools the collaborator had or why they stopped.
The repository evidence explains the difference in deliverables.

## Reference and identity decisions

| Input | Role |
| --- | --- |
| Existing Nick photo | Broad rounded face, cheerful toothy grin, thick ginger-brown beard/moustache, backward cap |
| Jay illustrated sheet | Primary compact overhead camera, dark warm contour, richly painted finish |
| Alex illustrated sheet | Secondary face/beard/cloth finish reference |

Nick retained the already established baseball appearance: muted teal/slate
backward cap, burgundy jersey with cream piping, cream trousers, dark belt and
dark cleats. The photo's black quilted jacket was not transferred.

No new copy of the already tracked photo was added to production or this guide.
New private identity photos should be kept outside the public asset tree.

## First generation

The coding agent invoked its real built-in `image_gen` tool with those three
image references and actual transparent-background output requested.
The tool generated sixteen full figures in down/right/up/left columns and
idle/strideA/strideB/apology rows. The first source matched the finish and
likeness well enough to continue, but walking rows needed closer review.

In particular, rear/side WALK B phases were too similar to WALK A. Accepting
the good front-facing image alone would have missed this.

## Focused second generation

The edit used the first source as target and Jay as gait/style reference.
It asked only for opposite anatomical limb phases in the third row while
preserving identity, clothes, camera, spacing and the other rows.

The rear WALK B now advanced the opposite screen-side foot. The source was
inspected again as a complete sheet. The second output was selected and copied
unchanged to `assets/sprites/nick-illustrated.png`.

Both exact prompts are retained in [Nick's prompt record](../../assets/sprites/nick-prompt.md).
No specific public image-model identifier was exposed/recorded by the tool;
the record names built-in imagegen without inventing a backend model.

## Import failure that required metadata, not another redraw

The first import assumed equal quarter rows and failed:

```text
nick: opaque pixels cross cell boundary 2,0
```

The diagnostic measured a 1254x1254 source. In zero-based row2/col0,
the quarter seam ran into the top of the next row's cap. Complete figures
were actually separated by shared horizontal opaque-silhouette gaps:

| Gap between rows | No alpha>=128 pixels in these image rows | Chosen cut |
| --- | --- | --- |
| Idle / Walk A | 311–340 | 326 |
| Walk A / Walk B | 619–639 | 630 |
| Walk B / Apology | 911–934 | 923 |

These threshold-based bands are not a claim that every pixel there has alpha0;
low-alpha antialiasing exists. The read-only inspector reports both definitions.
All selected seams satisfy the importer's existing boundary rule.

The family declared:

```javascript
nick: person('Nick', 'nick', 'sorry', {
  rowCuts: [0, 326, 630, 923, 1254],
}),
```

The importer then passed sixteen alpha/edge-checked frames without changing
source pixels or disabling a guard. This was allowed by the current visual
system's measured-row-seam provision. True overlapping or missing anatomy
would instead have required correcting the raster.

These read-only commands were used for the first-source diagnosis:

```powershell
node docs/claude/scripts/inspect-atlas.js nick
node docs/claude/scripts/inspect-atlas.js nick --equal-rows
```

They now inspect whichever Nick PNG/contract is in the checkout. The following
results were verified against the first accepted source on October 6, before
the B replacement; rerunning them on revised pixels need not reproduce counts:

| Diagnostic mode | Actual row cuts | Cells with opaque boundary hits |
| --- | --- | --- |
| Declared contract | `[0,326,630,923,1254]` | 0 |
| Equal rows | `[0,314,627,941,1254]` | 8 |

Both modes inspect the same sixteen cells and 1254x1254 RGBA PNG. The
second command is deliberately diagnostic; it does not rewrite the contract
or indicate that the accepted source fails with its correct metadata. These
counts are this source's measured results, not constants for other characters.

## Correct physical size

Maximum padded idle crop height was 275 source pixels. Dividing by the
21-world-unit supporting-person target gave density `275/21 = 13.095238...`.
One density was used for all directions/actions, with measured cell-center X
and silhouette-bottom feet pivots. Nick's existing 14x17 collider did not change.

The contract declared the `sorry` animation; the production manifest selected
his illustrated JSON. Existing runtime `e.pose = 'sorry'` then resolved to
the authored apology. His original `OH_NICK` stayed as image-failure fallback.

## Verification and the unrelated stale test

Node character-art/assets/smoke/cellar checks passed. Alex's reset assertion
failed because it still expected 60–90 seconds, while the collaborator's
current code uses 15–25. The failure was reproduced using exact committed
production/test sources before changing anything. Only the stale test
expectation was aligned; no gameplay timing was changed for this art task.
The Alex suite then passed.

Real Edge focused review passed at 1280x720 desktop and 390x844 touch/phone
emulation: routed illustrated walking, all required directional pose mappings,
actual fart → apology → idle, unchanged body, reset cleanup and deliberate
missing-Nick-image fallback. Broad review loaded twelve atlases and checked
160 directional animation mappings per viewport, movement, rotation and fallback.
Normal browser errors were zero.

The project PNG's SHA256 matched the selected imagegen output. The comparison
board and desktop/mobile room captures were inspected; fine likeness/fingers
are smaller on a whole-room phone view. No physical-device or live-production
verification was claimed. Publication state is in the newest handoff.

![Accepted comparison and Nick pose grid](../art-review/nick/preview.png)

## The repeatable part

Claude users can repeat the **roles and method**: use actual reference pixels,
obtain real illustrated raster output, inspect/correct specific defects,
measure the source, select it in production and verify the real state lifecycle.

They should not repeat Nick's defect, hardcode his row seams for new sources,
guess the image backend, or regenerate approved Nick to reproduce him exactly.
For exact Nick pixels, reuse the accepted PNG and matching metadata/contract.
