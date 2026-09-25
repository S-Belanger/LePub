# LePub visual system

This is the current art standard for every future session and contributor.
Read it before adding or changing a character, texture, prop, effect or UI.
It supersedes older three-quarter camera and procedural-character plans in
`ART-PLAN.md`, `overhaul/`, and historical handoffs. The latest user direction
and current handoff still control scope.

## The feeling

A lived-in neighborhood pub at night: warm amber lamps, dark walnut, worn
burgundy upholstery, cloudy glass, brass hardware, cool rainy windows, and
recognizable regulars. Cozy, crowded, playful, slightly scruffy. Rich surfaces
and readable silhouettes at actual playing size. Keep the floor routes quiet
enough that people, drinks and hazards are easy to follow.

## References and precedence

1. **Shipped character finish:** [Jay's sheet](../assets/sprites/waiter-illustrated.png)
   and [Alex's sheet](../assets/sprites/alex-illustrated.png).
   Inspect the PNG itself before authoring a new cast member.
2. **Camera:** [character study](../assets/art-direction/overhead/character-camera-study.png).
   High overhead, visible crowns/shoulders, foreshortened torso/legs;
   cardinal directions retain that elevation. No eye-level side portraits.
3. **Room mood/materials:** [pub painting](../assets/art-direction/warm-overhead-pub-reference.png).
   Translate its texture/light into the existing overhead room.
4. **Geometry:** [approved plan](../assets/art-direction/floor-plan.png).
   Decorative changes must preserve routes, seats and colliders.
5. **Review:** [live cast gallery](../tools/art-review.html), served locally.
   Judge native desktop/phone size and enlarged detail, then the real room.

The room is still procedural. The painting is a material reference, not a
claim that the room already matches it. Busboy remains explicit art debt;
ghost's translucent procedural look is intentional.

## Materials and color

Reuse `PUB` in `src/scenery.js`, `UI` in `game.js`, and matching shell colors
in `style.css`. These are the current implementation sources, not a single
generated token file. Coordinate changes to canvas and DOM together.

| Material | Existing anchors | Treatment |
| --- | --- | --- |
| Walnut | `#3b2219`, `#5c3626`, `#22130f` | Narrow irregular grain, dark seams, worn edges, short amber highlights |
| Brass | `#d99a38`, `#f6d688`, `#7d521a` | Small rivets, thin trim, bright edge against dark metal |
| Parchment | `#e5c78d`, `#f5e3b9`, `#c8a66c` | Warm paper, edge wear, dark ink, restrained stitching |
| Upholstery | `#652b2b`, `#8d342f`, `#263d43` | Burgundy/blue fabric, subtle folds, shaded cushion edges |
| Lamps | `#f0b84c`, `#b87524` | Local amber pools with gentle continuous alpha, readable dark gaps |
| Windows | `#102a3a`, `#326685`, `#8ec8d4` | Cooler restrained accents; keep warm/cool contrast |
| Clothes | Muted teal, olive, ochre, burgundy, slate | Fabric seams/folds, light/base/shadow, character-specific identity |

Illustrated sprites may contain smooth alpha and additional colors. The old
30-color palette is a harmony reference, not a hard raster quantization rule.
Avoid checkerboard lighting over faces, flat geometric people, giant uniform
floor tiles, plastic surfaces, neon outlines and generic rounded/glass UI.
UI uses walnut signs, parchment tickets and brass/leather controls. Reuse
`drawWalnutPlate`, `drawParchmentPlate` and the existing pixel font.

## What HD means here

HD means newly authored detail: hair clumps, glasses, beard, clothing seams,
folds, layered shading and clean contours. Enlarging an old low-resolution
sprite or exporting procedural rows to PNG does not meet this standard.

- Keep the single `ART_SCALE = 4` canvas transform. World coordinates, CSS
  viewport scale, input, movement and collisions remain independent.
- Source pixels divided by `authoredPixelsPerWorldUnit` give world size.
  One density per family for every direction/pose. Maximum idle crop height
  is 24 world units for leads, 21 for other people, including crop padding.
- At least four authored pixels per world unit; the shipped sources exceed
  that. Density alone cannot prove style: compare artwork with Jay/the study.
- Transparent RGBA PNG; no painted backdrop, checkerboard, captions, shadow,
  grid or floor. Runtime supplies grounding and room lighting.
- Feet/contact pivots are frame-local image pixels, not collision dimensions.
  Floor poses may need a documented pivot offset measured in world units.
  Never resize the whole special pose independently.
- Preserve anatomy, identity and prop ownership across directions. Author
  left and right; do not mirror asymmetric props blindly.

## One character contract

`src/character-art.js` is shared by runtime named-pose selection, importer,
gallery and browser/Node validation. Each family declares its gameplay `kind`,
name, target height, sheet rows and required animation sequences.
`proceduralExceptions` lists the only current exceptions.

The importer uses four columns (down/right/up/left) and the row count declared
by each family. Most sheets use idle/walkA/walkB/special; Nazim differs.
Optional `rowCuts` store measured seams
when generated spacing differs from equal rows. Actual dimensions are
measured; prompt cell sizes are not authoritative. See
[ILLUSTRATED.md](../assets/sprites/ILLUSTRATED.md) for provenance/frame notes.
If a character needs more rows, declare them and their animation sequences;
never squeeze unrelated states into idle to satisfy validation.

### Add a character

1. Read this guide and view the camera study and a shipped illustrated PNG.
   Define identity, clothes/props, directions and every gameplay special pose.
2. Declare the family in `src/character-art.js`. New `SPRITES` kinds without
   a contract fail validation. Customer variants share kind `customer`.
3. Author using a shipped illustrated sheet as style reference. Save
   `<family>-illustrated.png`; preserve source pixels. Record the tool, exact
   prompt, references and remaining limitations.
4. Run `node tools/import-illustrated.js <family>`; inspect transparency,
   cropping, physical scale and pivots. Add its JSON to `manifest.json`.
5. Connect gameplay facing and pose events. Declared `e.pose` names resolve
   directly; aliases such as `sprayB` need explicit normalization. Reset any
   new state through the existing reset function.
6. Run the checks below. Review idle, both strides and special poses at
   desktop/phone size, under room light, beside the existing cast. Exercise
   the real state transition, not only a manually selected atlas frame.
7. Update `HANDOFF.md` with files, tests, visual evidence and remaining debt.

### Acceptance and enforcement

```sh
node tests/character-art.js
node tests/assets.js
node tests/smoke.js
node tests/alex.js
node tools/validate-art.js
node tools/validate-alex.js
```

The first four run in `.github/workflows/validate.yml` on pushes and PRs.
The art contract rejects undeclared people, missing/duplicate manifest families,
legacy selections, insufficient density, scale drift and missing/wrong pose
mappings. Loader tests cover invalid/missing assets; smoke covers gameplay.
Browser checks require local Edge and an existing `playwright-core` install.
Alex's check provides a pattern for future special-pose lifecycle evidence.
Making CI a required merge check remains a repository settings choice.

The game retains per-family procedural fallback when assets fail to load.
That resilience must not be used to call missing production art done.
Exceptions are explicit debt, never the default for new people. Tests cannot
judge the pub's vibe: visual inspection and truthful review notes are required.

## Hunter

The September 23 user-supplied portrait controls his likeness: short swept
brown hair with a high forehead, broad oval cheeks, wide black rectangular
glasses, a slight smile and light salt-and-pepper chin/jaw stubble. No cap or
heavy full beard; those belonged to the superseded generic design. Keep his
olive vest, red/black plaid sleeves, olive trousers, boots and slung shotgun.
All four directions and idle/two strides/drink poses share the same identity.
Keep the portrait out of the public asset tree. See the
[exact prompt and provenance](../assets/sprites/hunter-prompt.md).

## Alex

The September 25 user-supplied portrait controls Alex's likeness: swept
medium-dark brown hair with an exposed forehead, strong brows, a broad toothy
smile and a full neatly shaped medium-brown beard. No glasses. Keep his teal
tee, charcoal shorts, bare lower legs and off-white sneakers for the workout
appearance; do not transfer the portrait's suit. Four directions with idle/two
strides/full split. Same finish as Jay. Gameplay turns him down for the split,
keeping the legs horizontal over the unchanged 22x7 blocker. Split floor pivot
is 1.5 world units above the cropped silhouette bottom. No pose-dependent
art scaling or collider change. Other split directions are source variations
for inspection; right/left source poses have imperfect rotated leg anatomy
and are not used by the gameplay split. The personal portrait stays outside
the public asset tree. [Current likeness prompts](../assets/sprites/alex-likeness.md)
and [original source prompt](../assets/sprites/alex-prompt.md).

Visits start only after a 60–90 second opening delay, at least three deliveries
and 30 seconds of the current shift. There is at most one visit per timed
shift; endless shifts use a 120–180 second cooldown starting after departure.
Entry defers during a chase,
recent hit, active round, bathroom urgency, busy doorway, or final 40 seconds.
He uses a reachable empty split space outside the staff pocket and away
from door/bathroom. Busy/unreachable attempts defer 10 seconds.

A 1.2-second amber floor outline warns before the split. Occupancy is
checked again before a blocker is added. The split blocks 22x7 for 5 seconds
without damage. Last call, an active round,
bathroom urgency or shift end releases the workout early. Exiting or timing
out removes the visitor, and restart clears both blocker and schedule memory.
