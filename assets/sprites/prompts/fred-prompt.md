# Fred illustrated source

Generated September 28, 2026 with the built-in imagegen tool. The accepted
transparent PNG is `fred-illustrated.png`; it was copied into the project
without edits. `node tools/import-illustrated.js fred` measured all sixteen
frames into `fred-illustrated.json` at 13.81 source pixels per world unit.

Input images, in prompt order: the user's Fred photo (likeness and clothes),
the shipped Alex and Jay illustrated sheets (finish and overhead camera), and
the existing Fred vector concept (costume and directions). A private local copy
of the portrait stays outside the public asset tree. The earlier branch commit
had already published `Fred.jpeg`; deleting it from the current tree does not
remove that file from Git history.

## Exact accepted prompt

```text
Use case: stylized-concept. Create a NEW production transparent RGBA raster game sprite atlas for LePub, based on the reference images. Image 1 is the real Fred photo for identity and clothing only. Images 2 and 3 are the shipped Alex and Jay atlas sheets; match their richly painted, detailed HD overhead character finish, warm dark contour, soft textured shading, compact stout anatomy, and strong silhouettes. Image 4 is Fred's branch concept for costume and pose orientation only; improve its flat vector finish to the quality of images 2 and 3. One square image containing exactly SIXTEEN separate full-body figures in a strict FOUR COLUMN by FOUR ROW grid, equal-sized cells with at least 12% fully transparent margin at every edge of each cell. Columns in exact order: DOWN toward viewer, RIGHT, UP away, LEFT. Rows in exact order: IDLE, WALK A with one foot forward, WALK B with other foot forward, TALK with a small natural one-hand speaking gesture. The camera is high overhead about 65 degrees above horizontal in EVERY cell, including side views: large visible cap crown and shoulders, foreshortened torso and legs, no eye-level portraits. Keep one consistent Fred identity and one physical size in every cell. Fred has light skin, a faded slate-blue baseball cap with a tiny pale front emblem, short brown hair visible beside the ears, dark brown full but neatly short beard and moustache, broad warm squinting smile, white casual T-shirt with a TINY pink/teal/yellow graphic on HIS LEFT chest, charcoal shorts, bare lower legs, navy sneakers with pale soles, and a small dark tattoo on HIS LEFT forearm. The tattoo and chest graphic stay on the correct anatomical side in both right and left views. Shirt has subtle seams and folds, cap has panel stitching, beard has fine clumps, shorts have textured folds. Upper-left warm pub light and clean dark contours. No props. Do not copy Alex's teal shirt or Jay's apron/glasses. No text, labels, grid lines, background, floor, checkerboard, drop shadow, or other characters. Transparent alpha outside all figures and between cells. Keep every figure fully inside its own cell without overlap or edge clipping.
```

Fred is a fourth walk-in look. His talking row is authored for the shared
customer contract, but current walk-ins have no talk-state event. At playing
size the tattoo, tiny shirt graphic and cap mark are secondary details; the
cap, beard, shirt and shorts carry his identity.
