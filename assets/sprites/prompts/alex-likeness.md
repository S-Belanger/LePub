# Alex portrait likeness revision

Revised September 25, 2026 with built-in imagegen. The user-supplied portrait
was used only as a likeness reference. It is not in this public repository.
The split atlas was edited as a production source. Its transparent PNG output
is preserved unchanged after generation; the importer measured its bounds,
pivots and density in the matching JSON file.

The portrait establishes swept medium-dark brown hair, exposed forehead,
strong brows, a broad toothy smile and a full neatly shaped medium-brown beard.
Alex does not wear glasses. The photo's suit was not transferred: the teal tee,
charcoal shorts, bare legs and off-white sneakers belong to his game workout
appearance. The split action, overhead camera and collider remain as before.
The earlier [split prompt](alex-prompt.md) documents the original
glasses-bearing art and is retained as history; this revision controls the
shipped likeness.

## Exact accepted split edit prompt

```text
Use case: identity-preserve. EDIT TARGET: Image 1, the existing transparent 4-column by 4-row Alex game sprite atlas. Image 2 is ONLY the real person's facial likeness reference; ignore its suit, white background, social icons and hearts. Image 3 is ONLY the shipped game's illustrated finish and overhead-camera style reference. Modify Image 1 so every Alex pose resembles Image 2: medium-dark brown hair swept upward and to the side with a little volume, natural exposed forehead, thick dark brows, friendly eyes, broad toothy smile, full neatly shaped medium-brown beard with lighter brown around chin. NO GLASSES anywhere, no eyewear. Keep the existing Image 1 teal T-shirt, charcoal shorts, bare lower legs and cream sneakers; keep its stout proportions, warm dark contours, detailed textured illustration, top-down/elevated camera and exact silhouette scale. Preserve ALL SIXTEEN complete independent figures, FOUR equal columns in order DOWN, RIGHT, UP, LEFT and FOUR equal rows: idle, first walking stride, second walking stride, full side split. Keep split legs fully extended and the same feet/contact positions. Only update head likeness, do not invent new props or poses. All figures must remain wholly inside their original cells with transparent margin. A genuinely transparent RGBA background everywhere except the figures, no painted background, ground, checkerboard, text, grid, shadows or borders. Render as one square production atlas, crisp and polished at the existing sheet resolution.
```

The first edit touched a walking-row cell edge and was not imported. The
accepted source used this spacing correction:

```text
Use case: precise-object-edit. This is a TECHNICAL CELL-SPACING CORRECTION of the attached transparent square 4x4 Alex sprite atlas, NOT a redesign. Preserve EXACTLY the existing illustrated man's new facial identity (swept medium-brown hair, no glasses, broad smile, full brown beard), teal shirt, dark shorts, cream shoes, overhead camera, warm outlines, and every original walking/split pose. Every one of the 16 separate figures must be uniformly reduced to 82% of its current size INSIDE ITS OWN 1/4-width by 1/4-height cell, centered in that cell, keeping unchanged head/body proportions and split leg length relative to the body. The image remains 1254x1254 pixels. Four exact equal columns DOWN RIGHT UP LEFT; four exact equal rows idle, walkA, walkB, full side split. Maintain at least 20 PIXELS OF COMPLETELY TRANSPARENT ALPHA at ALL FOUR edges of EVERY cell, including split shoes and walking shoes. No opaque or semi-transparent pixel may touch or cross any internal quarter-cell seam. Keep all 16 complete figures and consistent size across all rows. Genuine transparent RGBA background; no painted background, floor, shadow, checkerboard, grid, labels, text, extra props or eyewear. Only change per-cell size and position to remove boundary contact; keep the art pixels/appearance as faithful as possible.
```

The final `node tools/import-illustrated.js alex` import accepted all 16 transparent cells. The art is a small stylized likeness, so fine facial features will be less visible at phone playing size. The existing unused side-facing split anatomy limitations still apply; gameplay uses the down-facing split.
