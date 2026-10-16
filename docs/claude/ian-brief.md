# Ian (confused old customer) — art brief and ChatGPT prompt kit

Filled from [the character brief template](templates/CHARACTER-BRIEF.md).
Status: **prompt prepared, not yet run. No Ian art exists; no gameplay is built.**

## Task and scope

- Display name: Ian. Family key: `ian`. New gameplay kind, not yet added.
- Exact user request (2026-10-16): "I want to generate a new character, Ian. He is an old
  confused customer. Wearing a grey trench coat... And he often goes to the bathroom. If he
  is there while Richard pee, and if he looks at Richard, the waiter loses life (non lethal
  as well). Can you generate everything I need to generate his sprite using chatGPT?" A photo
  was attached in chat. This is the "another old guy" mentioned in the 2026-10-14 changelog.
- Publication scope: none requested; local only.

## Identity (photo supplies likeness only)

- The photo stays **outside the repo**: the identity crop and reference board are in
  `C:\Projets\Perso\ian-private\`. Do not copy them under `assets/` or commit them.
- Older man, round broad face, short thinning grey-white hair swept back, rimless-looking
  dark rectangular glasses, slightly open mouth, puzzled/vague expression, pale skin.
- **Costume overrides the photo:** the photo shows a striped blue shirt and navy vest. Do
  NOT use them. Ian wears a knee-length **grey trench coat** (belted, collar, shoulder
  epaulettes, buttons), dark trousers, dark brown shoes. Muted matte cloth.
- Likely gameplay silhouette: slightly stooped, small steps. Keep the family physical scale
  (supporting-person idle height 21 world units; collision box to be set like Martine's 14x17).

## Pose and scale contract

Same 4x4 layout as Martine/Nick: columns down/right/up/left; rows `idle`, `walkA`, `walkB`,
`special`. For Ian the special row is **confused**: anatomical right hand raised scratching
the side of his head, anatomical left hand holding his coat lapel/belt, head tilted a little,
eyes still looking along the floor in the facing direction (Nick B standard, crown visible).
The gameplay "looking at Richard" glance is derived from his facing direction, not a pose.

## Files you need

| File | Role |
| --- | --- |
| `C:\Projets\Perso\ian-private\ian-reference-board.png` | The ONE attachment (free ChatGPT allows one image). Panel A face (identity), B Jay sheet (style/layout), C Nick B sheet (head angle). |
| `C:\Projets\Perso\ian-private\ian-face-crop.png` | Face crop alone, if the board is too big for the tool. |

## Prompt A: generate the sheet (free tier, one attachment, green background)

Attach `ian-reference-board.png`, paste:

```text
The attached image is a reference board with three parts.
Part A (left): a photo of a man, used for IDENTITY ONLY: older man, round broad face, short
thinning grey-white hair, dark rectangular glasses, pale skin, vague puzzled expression with
the mouth slightly open. Do NOT copy his clothes, the background or the camera angle.
Part B (middle): the style and layout reference. Match its painted HD game-illustration
finish, compact stout anatomy, warm dark outlines, cloth detail, scale and 4x4 grid exactly.
Part C (right): the head-angle reference. Heads and eyes look along the floor in the
direction the person is facing, never up at the camera; crown of the head clearly visible,
face foreshortened.

Draw a NEW sheet of the man from part A (call him Ian) in exactly the same style and layout
as part B: 4 columns (DOWN toward the viewer, RIGHT, UP away from the viewer, LEFT) by 4 rows,
16 complete full-body figures, one consistent identity and size, each centered in its cell
with at least 12% empty margin on every side (hands and feet included), no overlap, no
clipping.
Rows, top to bottom:
1. IDLE, standing, arms relaxed at his sides, slightly stooped.
2. WALK A: anatomical left foot forward and right arm forward.
3. WALK B: the clearly OPPOSITE phase of walk A in every direction (anatomical right foot
   forward and left arm forward). The feet and arms must visibly swap sides.
4. CONFUSED: anatomical right hand raised scratching the side of his head, anatomical left
   hand holding the lapel of his coat, head tilted slightly.
Camera: high overhead, about 65 degrees above horizontal in EVERY cell including side views,
like part B. Big visible crown of grey hair and shoulder tops, foreshortened body and legs.
UP shows the back of the head and shoulders only, no face.
Outfit: knee-length GREY TRENCH COAT, belted, with a collar, shoulder epaulettes, buttons and
seams, dark trousers, dark brown shoes. Matte muted colours. Keep the glasses in all views
where the face is visible. No hat, no beard.
Background: one flat, solid, pure bright green (#00FF00), no gradient. No text, labels, grid,
floor, shadows or extra characters. This is artwork for a game, not a poster.
```

Paid tier with transparency: use section C of [03-PROMPTS.md](03-PROMPTS.md) instead, with
the values above, and ask for real alpha.

## Prompt A2: stricter grid (use after the first Gemini attempt failed)

First attempt (2026-10-16, Gemini) was rejected: 8 columns instead of 4, inconsistent direction
order, row 3 smaller and one figure oversized, walk rows not clearly opposite, confused pose
missing in some cells, some "down" figures looking up at the camera. Good: finish, coat, likeness.
Attach `ian-reference-board.png` (and optionally the rejected sheet as "identity and coat only").

```text
Attached: image 1 is a reference board (A identity photo, B style and layout sheet, C head-angle
sheet). Optional image 2 is a rough earlier try: use it ONLY for Ian's face, glasses, grey hair
and trench coat design, NOT for its layout, scale or poses.

OUTPUT FORMAT, strict: ONE SQUARE image (1:1). Exactly 4 columns x 4 rows = 16 figures, no more.
Imagine an invisible 4x4 grid of equal square cells. One figure per cell, centered, same height
in every cell (about 70% of the cell height), at least 15% empty margin on all sides. Never put
two figures in one cell, never add extra columns.
Columns, always in this order, every row: 1 = facing DOWN (toward the bottom of the image),
2 = facing RIGHT, 3 = facing UP (back to us, no face), 4 = facing LEFT.
Rows: 1 IDLE (arms relaxed, slightly stooped). 2 WALK A: left foot and right arm forward.
3 WALK B: the exact OPPOSITE of row 2 (right foot and left arm forward); feet and arms must
visibly swap sides in every column. 4 CONFUSED: right hand scratching the side of his head, left
hand holding his coat lapel; in the UP column show the raised right elbow/hand beside the head.
The figure is the same size in all 16 cells (a figure in row 3 must not be smaller or larger).

Character: Ian, the older man from part A (round broad face, short thinning grey-white hair,
dark rectangular glasses, pale skin, vague puzzled look). Costume: knee-length grey belted
trench coat with collar, epaulettes, buttons and seams, dark trousers, dark brown shoes.
Style: exactly the painted HD game finish, proportions, warm dark outlines and cloth detail of
part B.
Camera: high overhead, about 65 degrees, the same in all 16 cells, like part B. Big visible crown
of hair and shoulder tops, foreshortened body. His head and eyes look ALONG THE FLOOR in the
direction he faces, never up at the camera (see part C): the DOWN figure shows crown plus a
small foreshortened face below it, eyes forward and down, not an upward portrait.
Background: flat solid pure green #00FF00, no gradient. No text, labels, grid lines, shadows,
floor or extra characters.
```

If it still ignores the grid, generate ONE ROW per request (4 figures: down, right, up, left, one
square-ish image, same size, same green) with the same character text and only that row's pose,
attaching the best earlier sheet as identity. Then stack the four rows locally.

## Prompt B: fix walk phases (very likely needed; Martine needed it)

Attach the generated sheet only, paste prompt D from [03-PROMPTS.md](03-PROMPTS.md), or:

```text
Edit only the third row (WALK B) of this 4x4 character sheet. Keep identity, coat, camera,
size, grid, and the other three rows exactly as they are. WALK B must be the opposite limb
phase of the second row: wherever row 2 has the left leg forward and right arm forward, row 3
has the right leg forward and left arm forward. In the UP column the forward shoe must switch
sides. Do not mirror the whole figure. Keep the same green background.
```

## After you have the PNG

1. Save the raw download outside the repo (e.g. `C:\Projets\Perso\ian-private\ian-raw.png`).
2. Key the green to alpha: `python -I docs/claude/scripts/key-green.py <raw> assets/sprites/ian-illustrated.png`.
3. Come back to Claude Code with the file path. Then: declare `ian` in `src/character-art.js`,
   run the importer (`tools/import-illustrated.js` / `import-martine.py` pattern), add one
   manifest entry, and build the behaviour below. Review each cell against Jay/Nick B first.

## Behaviour proposal (not built; confirm before implementing)

- Ian is a walk-on like Martine, not a seat customer: visits the bathroom door every so often
  (more often than Nazim), wanders confusedly, may walk into the wrong place.
- Trigger: while Richard is relieving himself (the 1.6 s urinal/toilet action in
  `bathroomInteract`) and Ian is in the bathroom **facing** Richard (his facing vector points at
  him within the room), Richard loses one life segment via the existing non-lethal pattern used
  for the smell (`life - LIFE_HIT_FRACTION > 0`, never the last segment), once per visit with a
  cooldown, plus a dialogue line ("Er... hello?").
- Questions for you: should Ian use a urinal next to Richard (forces proximity), and should the
  relief be cancelled when he looks, or just cost life and finish?

## Provenance

Nothing generated yet. Record the tool, model (if exposed), exact prompt used, and the selected
source here once the sheet exists.
