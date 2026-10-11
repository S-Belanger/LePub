# Busboy illustrated review — October 10, 2026

The supporting busboy now uses a production illustrated atlas with four directions
and five rows: idle, two opposite strides, mop A and mop B. Short dark hair,
goatee, olive work shirt, linen apron, charcoal trousers and wooden/string mop
come from his existing gameplay appearance. Jay supplies materials/camera and
approved Nick B supplies floor-directed gaze. No personal photo was used.

[Exact generation and spacing correction prompts](../../../assets/sprites/busboy-prompt.md).
Built-in imagegen output was inspected; backend model identity was not exposed.
The first source crossed a bottom-row cell edge and was rejected by the importer;
[that failed source](rejected-spacing.png) remains review evidence. The corrected
source is preserved without script pixel editing.

Corrected PNG:1122×1402 RGBA,70.26% alpha-zero pixels; row cuts
`[0,280,552,813,1082,1402]`. Import measured20 complete alpha-checked frames,
no opaque cell-edge crossings, and9.14 source pixels/world unit. One density
sets maximum idle height21world units in all directions; hitboxes/cleanup timing
are preserved. Runtime `mop` and `mopB` map to the respective authored rows.

`node tools/validate-busboy.js` passed actual Edge desktop1280×720 and
phone emulation390×844:16runtime pose/direction mappings each, actual routed entry,
two mop phases, puddle cleanup, exit/reset and single-source failure fallback.
[Report](report.json), [desktop mop A](desktop-mop.png),
[phone mop B](mobile-mopB.png). Native captures inspected: body scale/outfit
fit the shipped cast and both work phases keep the mop at the floor.
The ghost remains the only intentional procedural-art exception.

These are generated, reviewed assets, not manually cleaned illustration or
physical-phone/human art-signoff evidence. Use the cast gallery to inspect every
direction/pose at phone, desktop and enlarged scale.
