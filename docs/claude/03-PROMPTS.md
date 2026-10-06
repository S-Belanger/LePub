# 3. Paste-ready prompts for Claude and the image generator

[Start here](README.md) · [Workflow](02-WORKFLOW.md) · [Integration](04-ATLAS-INTEGRATION.md)

Prompts to **Claude** direct project work. Prompts to the **image generator**
direct raster artwork. Keep those roles separate. Replace every bracketed
placeholder and adapt attachment numbering to the images actually supplied.

These are **current reusable instructions**, including the October 6 approved
Nick B head/gaze correction. Historical exact prompts in individual sprite
records document what was run then; preserve them and append revisions. An
older prompt without explicit gaze is not the current visual standard.

## A. Start a Claude Code character task

```text
We are working in LePub. Add/upgrade [CHARACTER] to the SAME approved
illustrated overhead cast style as approved Nick B, Jay, Doe and Hunter.

First read HANDOFF.md completely and inspect git status --short --branch.
Preserve all existing uncommitted files. Read AGENTS.md, docs/VISUAL-SYSTEM.md,
and docs/claude/README.md plus its linked chapters. The current visual system
supersedes old camera/procedural art plans. Open and visually inspect the actual
waiter-illustrated.png, doe-illustrated.png, hunter-illustrated.png and
docs/art-review/face-perspective/nick-b-candidate.png, not merely filenames.

Identity reference: [PHOTO OR DESCRIPTION]. Its role is [IDENTITY ONLY /
IDENTITY PLUS SPECIFIED CLOTHING]. Costume: [EXACT APPROVED CLOTHES/PROPS].
Required gameplay poses: [IDLE / TWO STRIDES / SPECIAL ACTIONS].
Scope of behavior changes: [NONE / THE USER'S SPECIFIC REQUEST].

Inspect the current family/gameplay/pose selection before authoring. Establish
what actual raster generation/editing tool is callable and whether it accepts
reference images and outputs a downloadable transparent PNG. If unavailable,
prepare the precise prompt and ordered reference attachments for a manual
handoff. Do not replace this requirement with SVG, ohFigure, exported procedural
rows, or an enlarged placeholder; do not call missing art completed.

Keep physical scale, ART_SCALE=4, colliders, routes and UI consistent. Author
the four cardinal directions with the same elevated camera. Heads and eyes
look along the floor in their cardinal facing direction, never up at the
overhead viewer; correct actual head pitch, not only eyelids. Include every
required action. Inspect all source cells, correct only identified defects,
import measured alpha/crop/pivot metadata, and wire the production manifest.

Run the required Node suites and real-browser art checks, exercise the actual
special-pose lifecycle and missing-image fallback, inspect desktop/phone room
captures beside the shipped cast, and show me the result. Record exact prompts,
tools, selected source, failures/corrections, tests and limits. Checkpoint
HANDOFF.md throughout, including before long operations and before ending.
Publication scope: [LOCAL REVIEW ONLY / USER'S EXPLICIT PUBLICATION REQUEST].
```

For the existing Nick, say “inspect/reuse the accepted Nick assets” instead of
“add/upgrade Nick.” Do not accidentally send an approved character through
another generation cycle.

## B. Ask Claude to verify capabilities before promising a sprite

```text
Tell me which actual tools this session can call to generate raster images,
edit a supplied raster with reference images, and return the original file.
Inspect their available schemas rather than guessing names from Codex.
Identify how our portrait/Jay/Nick B/pose-source bytes reach the generator, how alpha
is requested, and where the downloadable output is saved. State the provider
and model only if the tool actually exposes them.

If there is no suitable callable generator, give me the manual handoff packet:
exact prompt, ordered attachment list, required output format, acceptance
criteria, and the next integration step once I return the PNG. Complete the
independent brief/repo inspection. Do not pretend a prompt or code drawing is
already the requested illustrated sprite.
```

This asks for capability discovery, not installation, credentials, billing or
permission to choose an arbitrary provider.

## C. Master raster-generation prompt

This template assumes a portrait, Jay and approved Nick B are attached as images 1/2/3,
and the standard four-row supporting-person layout is appropriate. For a
different layout, rewrite the row list and corresponding character contract.
For a revision, attach the current atlas as image 4 and label it outfit/poses;
for a new person, omit image 4 or replace it with a named costume/pose reference.

```text
Use case: stylized-concept.
Asset: production transparent RGBA raster character atlas for LePub.

Input references:
Image 1: [CHARACTER] portrait for identity only: [FACE SHAPE, SKIN TONE,
HAIR/BEARD/GLASSES/CAP, DISTINCTIVE EXPRESSION]. Do not borrow its background,
eye-level camera, pose, or unrequested clothes.
Image 2: shipped Jay atlas, primary reference for painted HD finish, compact
stout anatomy, warm dark contours, cloth detail, overhead camera and layout.
Image 3: user-approved Nick B atlas for natural head pitch, crown/face balance
and heads/eyes looking along the floor in each cardinal direction only.
Image 4, if supplied: [EXISTING CHARACTER ATLAS / COSTUME-POSE STUDY], controls
[EXACT CLOTHES, ROWS, ANATOMICAL PROP OWNERSHIP AND SPECIAL ACTIONS].
Do not copy Jay's or Nick's identities/clothes from images 2/3. Preserve the
specified identity and approved costume from images 1/4 as directed above.

Create one square sheet containing exactly sixteen separate complete full-body
figures in a strict four-column by four-row grid. Use one consistent character
identity and physical size. Center each figure on its cell axis. Leave at least
12% fully transparent margin at EVERY edge of EVERY cell, including hands and
feet. No overlap and no clipped anatomy.

Columns from left to right:
DOWN toward viewer; RIGHT; UP away from viewer; LEFT.
Rows from top to bottom:
IDLE, neutral standing arms;
WALK A, anatomical left foot forward and right arm forward;
WALK B, anatomical right foot forward and left arm forward, clearly opposite
to WALK A in EVERY direction;
[SPECIAL ACTION], [EXACT BODY/ARM/PROP POSE AND ANATOMICAL OWNERSHIP].

Camera: high overhead, about 65 degrees above horizontal in EVERY cell,
including side views. Large visible crown/cap and shoulder tops, foreshortened
torso and legs. Match Jay's perspective. No eye-level side portraits.
Keep the camera fixed while the person turns. Head and eyes look along the
floor toward each cardinal facing direction, matching approved Nick B.
Down means toward the bottom of the room, not looking up at us. Show a natural
relaxed downward head pitch, substantial crown and a foreshortened face below.
Right/left retain the same elevation and forward floor-directed attention;
up shows top/back of head and rear shoulders. Apply to EVERY row, including
special actions. Keep a warm readable expression; do not over-bow the head.
No lifted portrait face, upward camera eye contact, eyelid-only correction,
unreadable defeated posture, or front face painted on the rear head.

Identity: [CONCRETE PERSON DESCRIPTION].
Costume: [CLOTHING, MUTED COLORS, MATERIALS, SHOES, SEAMS, DISTINCTIVE DETAILS].
Props: [NONE / EXACT PROP AND ANATOMICAL HAND/SIDE].
Special identity constraints: [CAP ORIENTATION / TATTOO / EMBLEM / ASYMMETRY].

Finish: richly painted, detailed HD game illustration matching Jay's finish
and Nick B's overhead head/gaze.
Warm upper-left light, crisp dark warm contours, soft textured shading,
hair/beard clumps, cloth seams/folds and strong readable silhouettes.

Output: genuine transparent alpha outside all figures and between cells.
No captions, numbers, logos, labels, grid, background, floor, painted checkerboard,
cast/drop shadow or extra characters. Preserve all figures fully within their
own cells. This is artwork for the actual game, not a mockup or character poster.
```

Do not insist on 1254x1254 as a universal generator setting. That is the
observed size of Nick's accepted sheet. Ask for the appropriate square
high-quality source, then measure its actual dimensions. Density and visual
detail are the acceptance criteria.

Use the tool's real alpha/output controls when available. Text saying
“transparent” cannot itself verify the downloaded PNG's channel values.

## D. Correct the second walking stride

Attach the current source as the edit target and Jay as a style/gait reference.
Specify the actual problematic cells rather than regenerating the full character.

```text
Edit only WALK B in the third row of the supplied four-by-four character atlas.
Preserve the identity, costume, camera, physical scale, transparent margins,
grid order, idle row, WALK A row and special-action row as closely as possible.

WALK B must be the opposite limb phase from WALK A. If WALK A has anatomical
left leg forward/right arm forward, WALK B has right leg forward/left arm
forward, with the other limbs back. Do this in all four facing directions.
Especially check [IDENTIFIED CELLS]. In the rear-facing view, the forward/lower
shoe must switch screen sides. In side views, change anatomical limb positions
without reversing the person's facing or mirroring the whole figure.

Keep the same painted overhead finish and original identity features. No extra
hands/feet, labels, backdrop, shadow, clipping or new props. Deliver the same
atlas layout with genuine transparent alpha.
```

Nick's [actual generation and refinement prompts](../../assets/sprites/nick-prompt.md)
show the specific version used successfully. Requests to preserve a region
still require post-edit inspection; do not assume pixel-perfect invariance.

## E. Correct eye-level side views

```text
Correct the camera of the [RIGHT / LEFT] cells of this atlas. Match the elevated
overhead view in the supplied Jay reference and in this atlas's accepted
down/up cells: clearly visible cap/hair crown and shoulder tops, shorter
foreshortened torso/legs. Keep each cell facing its original cardinal direction.
Head/eyes must look along the floor in that original cardinal heading, like
approved Nick B, rather than tilt up toward us. Correct the head's projection,
not only the eyelids. Do not make an eye-level profile, tall body, long neck,
over-bowed unreadable head or a different identity.

Preserve costume, anatomical prop ownership, pose sequence, one physical scale,
cell placement and transparent alpha. Keep every figure complete with margins.
```

## F. Correct true boundary clipping or overlap

Use this only after distinguishing a wrong assumed seam from actual overlap.
For a wrong seam with clear gutters, use measured metadata instead.

```text
Correct the layout of the supplied atlas: [EXACT FIGURE/CELL] currently crosses
[EXACT BOUNDARY OR NEIGHBOR]. Keep all characters complete, separate and at
one consistent body scale. Reposition the affected figures within their cells;
if needed, uniformly reduce all figures' source scale enough for safe margins.
Do not shrink only one special pose, crop a hand/shoe, or alter body identity.

Retain four columns in down/right/up/left order and the declared row order.
Preserve finish, camera, costume and distinct stride phases. Add generous
transparent gutters at every cell boundary. Genuine RGBA alpha; no grid or floor.
```

Uniformly reducing artwork in the generated sheet can be recovered by the
family's measured density. Independently shrinking one pose creates scale drift.

## G. Request genuine background extraction

```text
Remove the painted backdrop from this supplied character atlas. Preserve all
sixteen complete figures, their internal colors/detail, cell positions, scale,
direction order and pose sequence. Keep shoes, hands, hair and cloth edges.
Deliver actual transparent alpha outside the figures and between cells;
do not replace the background with a drawn checkerboard or a solid color.
Do not add outlines, shadows, labels or new anatomy.
```

Revalidate the alpha and every figure afterward. Extraction can remove pale
trousers or leave backdrop halos. If it changes character edges materially,
reject the draft or correct it; do not simply loosen the alpha guard.

## H. Hand an accepted PNG back to Claude Code

```text
The accepted illustration is at [EXACT ORIGINAL PNG PATH]. Here is the image
for visual inspection. Reference roles and exact prompt are [LOCATION/TEXT].
Do not regenerate it or convert it to SVG/procedural art. Preserve these PNG
pixels and copy the selected source to assets/sprites/[FAMILY]-illustrated.png.
First verify the actual image dimensions and alpha.

Declare the family and required poses in src/character-art.js; use measured
rowCuts only if measured empty opaque-silhouette gutters differ from equal rows. Run the
repository importer to write metadata. Add exactly one illustrated manifest
entry. Inspect density and pivots and connect actual facing/pose events.
Retain per-family fallback. Do not change colliders or ART_SCALE for artwork.

Run required Node/browser checks, inspect native desktop/phone room captures
and the cast comparison, exercise special-pose return/reset and missing-image
fallback, document provenance/results/limits, and update HANDOFF.md.
```

## I. Ask Claude to review a draft without rubber-stamping it

```text
Review this candidate cell by cell against approved Nick B and Jay/Doe/Hunter.
Report concrete defects with row, column, direction and pose. Judge camera,
head pitch/gaze along the floor (not lifted portrait or eyelid-only correction),
identity, finish, opposite strides, anatomy/hand ownership, source margins,
transparency and native-size readability separately. Do not approve based
only on a passing atlas validator or a nice front-facing close-up.

For each defect, say whether it needs a raster edit, a measured metadata seam,
a scale/pivot correction, or a runtime pose/facing fix. Propose one focused
correction at a time and preserve accepted parts. Identify what has not yet
been tested; do not claim native-size or in-game review from this source alone.
```

## J. Final completion report to request

```text
Give me the accepted PNG and metadata paths, exact prompt/provenance path,
desktop/phone comparison and room captures, actual tests and exit outcomes,
remaining visual limitations, and Git/commit/push/deploy state. Confirm whether
you used generated raster art, imported supplied art, or merely prepared a
handoff. Keep HANDOFF.md aligned with actual git status, including untracked
assets. Never label fallback, an unrun prompt or unverified source as finished.
```

## K. Correct existing head pitch/gaze while preserving likeness

Attach the existing full atlas as image 1 (edit target), approved Nick B as
image 2 (head/gaze only), and Jay plus Doe/Hunter as additional camera/finish
references. The identity portrait is optional; if included, label it identity
only and preserve its privacy. Do not call a stochastic edit exact unchanged
facial pixels or mechanically correct reprojection.

```text
Edit image 1, the existing [CHARACTER] transparent LePub atlas. Retain the SAME
recognizable person: [FACE SHAPE, HAIRLINE, HAIR/BEARD, GLASSES, EXPRESSION].
This is a head-perspective correction, not a new face design. Image 2 is the
explicitly approved Nick B benchmark for head pitch/gaze only. Images [NUMBERS]
are Jay/Doe/Hunter for fixed overhead camera and illustrated finish only.

Correct the head's 3D pitch/projection in ALL [ROW COUNT] rows and all four
down/right/up/left columns. The person looks along the floor in the direction
they face, never up at the overhead viewer. Keep one high overhead camera,
visible crown/hair/cap and shoulder tops, and foreshortened face/torso/legs.
Down: a smaller projected face below the substantial crown, eyes forward along
the floor toward the bottom of the room. Right/left: same elevated profile,
face and attention along that heading. Up: top/back of head, rear shoulders,
no front face or head turn to camera. Match the Nick B natural relaxed pitch.

Preserve a warm readable expression and established likeness. Do not merely
close eyelids or move pupils while leaving the head lifted. Do not bow the
head so far the person becomes dejected or loses their face. No eye-level
profile, camera eye contact, identity substitution or portrait costume.

Keep the ORIGINAL outfit [DETAILS], headwear orientation [DETAILS], body scale,
cell axes, down/right/up/left order, and rows [EXACT CONTRACT]. Preserve WALK A
and WALK B as opposite anatomical limb phases in every direction. Special row
remains [ACTION, EXACT LIMBS/PROP, ANATOMICAL OWNERSHIP]. Keep every hand/foot
complete and isolated, including extended special poses; do not mirror away
asymmetric hands, emblems, tattoos or cap opening/brim orientation.

Same painted warm-contour HD finish and one family physical size. Generous
transparent gutters on every cell edge. Deliver original RGBA transparency;
no backdrop, floor, cast shadow, labels, grid, extra anatomy or clipped figures.
Inspect the entire edit afterward; do not promise untouched pixels identical.
```

## L. Replace a regular's likeness without redesigning their role

Use the master prompt or K with the current regular atlas as edit target and
the supplied new photo for identity only. State the new identity observations
explicitly, including whether glasses, beard or headwear replace old features.
Keep the established game clothes and source rows: Nazim idle/walkA/lean/slump;
Sam/Gerald idle/walkA/walkB/special, with special mapped to the talk action.
Keep poses, same elevated gaze standard,
family scale and gameplay unchanged. Do not force a new two-stride/talk layout
onto Nazim or transfer the photo's jacket, background or camera. Review every
state, including drunk/slumped, before replacing source and measured metadata.
