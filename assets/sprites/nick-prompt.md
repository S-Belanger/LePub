# Nick illustrated source (not yet generated)

Nick is the baseball-uniform waiter who farts a lot (see the Nick block in
`game.js`). He currently ships on the procedural `ohFigure` set only and is
listed in `proceduralExceptions` in `src/character-art.js`. This file is the
prompt and checklist for giving him the same illustrated atlas as Jay and Alex.

## Prompt (proposed, unrun)

Input images, in order: the user's Nick photo (identity only), the shipped
`waiter-illustrated.png` and `alex-illustrated.png` (finish and overhead camera).
Keep the portrait outside the public asset tree, as for Fred.

```text
Use case: stylized-concept. Create a NEW production transparent RGBA raster game sprite atlas for LePub, based on the reference images. Image 1 is the real Nick photo for identity only. Images 2 and 3 are the shipped Jay and Alex atlas sheets; match their richly painted, detailed HD overhead character finish, warm dark contour, soft textured shading, compact stout anatomy, and strong silhouettes. One square image containing exactly SIXTEEN separate full-body figures in a strict FOUR COLUMN by FOUR ROW grid, equal-sized cells with at least 12% fully transparent margin at every edge of each cell. Columns in exact order: DOWN toward viewer, RIGHT, UP away, LEFT. Rows in exact order: IDLE, WALK A with one foot forward, WALK B with other foot forward, SORRY with one hand raised palm-out and the other on his stomach in a sheepish "pardon me" gesture. The camera is high overhead about 65 degrees above horizontal in EVERY cell, including side views: large visible cap crown and shoulders, foreshortened torso and legs, no eye-level portraits. Keep one consistent Nick identity and one physical size in every cell. Nick has light skin, a muted slate-blue-teal (#263d43) baseball cap worn BACKWARDS (brim behind his head, so it shows past the crown when he faces away from the camera), a full, thick ginger-brown beard and moustache, a broad cheerful grin, a muted burgundy (#8d342f) short-sleeved baseball jersey with subtle seams, folds and cream piping, warm cream baseball pants (#e6d8b4, not pure white) with a dark belt and textured folds, and dark baseball cleats. No props. Upper-left warm pub light and clean dark contours. No text, labels, numbers, grid lines, background, floor, checkerboard, drop shadow, or other characters. Transparent alpha outside all figures and between cells. Keep every figure fully inside its own cell without overlap or edge clipping.
```

## To ship it

1. Generate and save as `assets/sprites/nick-illustrated.png` unedited;
   record tool, date and any rejected attempts here.
2. Add to `src/character-art.js`: `nick: person('Nick', 'nick', 'sorry')`, and
   delete the `nick` entry from `proceduralExceptions`.
3. `node tools/import-illustrated.js nick`, inspect scale/pivots, add
   `nick-illustrated.json` to `manifest.json`.
4. `node tests/character-art.js && node tests/assets.js && node tests/smoke.js`.
5. Check idle, both strides and the `sorry` pose beside Jay at desktop and
   phone size, then trigger it for real with `__debug.spawnNick()`.

Gameplay already sets `e.pose = 'sorry'` after each fart; it resolves directly
once the family declares that animation.
