# Martine — illustrated atlas generation prompt

Status: **prompt prepared, not yet run.** No output exists; do not treat this as art.
Brief: [docs/claude/martine-brief.md](../../docs/claude/martine-brief.md).
Prompt template: section C of [docs/claude/03-PROMPTS.md](../../docs/claude/03-PROMPTS.md).

## Attachments, in this order

1. The user's photo of Martine (the woman on the left). **Private: keep it outside the repo.** Identity only.
2. `assets/sprites/waiter-illustrated.png` (Jay): finish, camera, anatomy.
3. `docs/art-review/face-perspective/nick-b-candidate.png`: head pitch / gaze along the floor.
4. `assets/sprites/nick-illustrated.png` (optional): supporting-cast finish and row layout.

## Prompt (paste into the image generator; turn transparent background ON if the tool has it)

```text
Use case: stylized-concept.
Asset: production transparent RGBA raster character atlas for LePub.

Input references:
Image 1: Martine's photo, for identity only: broad relaxed face, light slightly
flushed skin, short silver-lilac grey hair with cropped sides and a straight
fringe across the forehead, dark brows and eyes, no glasses, no beard, a small
closed-mouth smile. Do not borrow its background, eye-level camera, pose, or
unrequested clothes.
Image 2: shipped Jay atlas, primary reference for painted HD finish, compact
stout anatomy, warm dark contours, cloth detail, overhead camera and layout.
Image 3: user-approved Nick B atlas for natural head pitch, crown/face balance
and heads/eyes looking along the floor in each cardinal direction only.
Image 4, if supplied: shipped Nick atlas, secondary finish and row-layout reference.
Do not copy Jay's or Nick's identities/clothes.

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
TALK, relaxed manager stance: a clipboard held against the chest in the
anatomical LEFT hand, anatomical RIGHT hand resting on the hip.

Camera: high overhead, about 65 degrees above horizontal in EVERY cell,
including side views. Large visible crown of hair and shoulder tops, foreshortened
torso and legs. Match Jay's perspective. No eye-level side portraits.
Keep the camera fixed while the person turns. Head and eyes look along the
floor toward each cardinal facing direction, matching approved Nick B.
Down means toward the bottom of the room, not looking up at us. Show a natural
relaxed downward head pitch, substantial crown and a foreshortened face below.
Right/left retain the same elevation and forward floor-directed attention;
up shows top/back of head and rear shoulders. Apply to EVERY row, including
the TALK row. Keep a warm readable expression; do not over-bow the head.
No lifted portrait face, upward camera eye contact, eyelid-only correction,
unreadable defeated posture, or front face painted on the rear head.

Identity: woman with short silver-lilac grey hair, cropped sides, straight
fringe, broad relaxed face, light flushed skin, small closed-mouth smile.
Costume: dark charcoal long-sleeve zip-neck top with a high collar and visible
zip and seams; dark charcoal trousers; dark shoes. Muted colours, matte cloth.
Props: a clipboard in the TALK row only, anatomical left hand.
Special identity constraints: no glasses, no headwear, no beard.

Finish: richly painted, detailed HD game illustration matching Jay's finish
and Nick B's overhead head/gaze.
Warm upper-left light, crisp dark warm contours, soft textured shading,
hair strand clumps, cloth seams/folds and strong readable silhouettes.

Output: genuine transparent alpha outside all figures and between cells.
No captions, numbers, logos, labels, grid, background, floor, painted checkerboard,
cast/drop shadow or extra characters. Preserve all figures fully within their
own cells. This is artwork for the actual game, not a mockup or character poster.
```

## Free-tier variant actually used (2026-10-14)

The user only had free ChatGPT with one image attachment, so the four references
were combined locally into ONE reference board (A identity photo crop, B Jay sheet,
C Nick B sheet, labelled) and the prompt asked for a flat #00FF00 background
instead of alpha. The board and the user's photo stay private and are not in the repo.
Prompt text (as given to the user in chat): describe parts A/B/C of the board, then
"Draw a NEW sheet of Martine in exactly the same style and layout as B: 4 columns
(down, right, up, left) by 4 rows, 16 complete full-body figures ... Rows: 1 idle;
2 walking, left foot and right arm forward; 3 walking, opposite feet and arms;
4 standing holding a clipboard against her chest in her left hand, right hand on
hip. Outfit: dark charcoal zip-neck top, dark trousers, dark shoes ...
Background: one flat, solid, pure bright green (#00FF00)".

## Provenance

- Generator/tool and model actually used: ChatGPT free tier image generation; model not exposed to us.
- Output: 1254x1254 image (webp download) supplied by the user on 2026-10-14; original kept privately by the user.
- Processing: `docs/claude/scripts/key-green.py` (green keyed to alpha, spill removed) then `import-martine.py` (measurements). Equal quarter rows passed all 16 edge checks; density 12.0 px/world unit.
- Selected source: `assets/sprites/martine-illustrated.png` (keyed result, no repainting).
- **Known defect:** WALK A (row 2) and WALK B (row 3) are near-identical in every direction, so the walk cycle does not alternate feet convincingly. Fix with prompt D in 03-PROMPTS.md (attach this sheet, one image) and re-import.
