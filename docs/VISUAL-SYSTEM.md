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

1. **Approved head/gaze benchmark:** the October 6
   [Nick B sheet](art-review/face-perspective/nick-b-candidate.png) and
   [comparison beside actual shipped cast](art-review/face-perspective/nick-b-desktop.png).
   The user explicitly approved this result. People look **along the floor
   toward their cardinal facing direction**, with relaxed head pitch; they do
   not lift their face/eyes to the overhead camera. This overrides earlier
   portrait-facing Nick/Alex artwork and old prompts that omitted gaze.
2. **Shipped camera/finish:** [Jay](../assets/sprites/waiter-illustrated.png),
   [Doe](../assets/sprites/doe-illustrated.png), and
   [Hunter](../assets/sprites/hunter-illustrated.png). Inspect the actual PNGs
   before authoring. Keep their elevated view, crown/shoulder visibility,
   compact anatomy, cloth detail and warm contours. Alex's older sheet is a
   costume/pose/finish reference; its old lifted face is not a gaze standard.
   A revised source must pass this same review before becoming a gaze reference.
3. **Camera study:** [character study](../assets/art-direction/overhead/character-camera-study.png).
   High overhead, visible crowns/shoulders, foreshortened torso/legs;
   cardinal directions retain that elevation. No eye-level side portraits.
4. **Room mood/materials:** [pub painting](../assets/art-direction/warm-overhead-pub-reference.png).
   Translate its texture/light into the existing overhead room.
5. **Geometry:** [approved plan](../assets/art-direction/floor-plan.png).
   Decorative changes must preserve routes, seats and colliders.
6. **Review:** [live cast gallery](../tools/art-review.html), served locally.
   Judge native desktop/phone size and enlarged detail, then the real room.

The room is still procedural. The painting is a material reference, not a
claim that the room already matches it. Busboy remains explicit art debt;
ghost's translucent procedural look is intentional.

Separate reference roles: the user's portrait supplies likeness (face shape,
hair, beard, glasses/headwear and expression); the existing character supplies
its approved outfit, anatomical prop ownership and pose contract; Nick B and
Jay/Doe/Hunter supply camera and gaze. Supply those actual image pixels through
the generator's image-input mechanism. A filename in a prompt is insufficient.
Do not transfer a portrait's eye-level camera, background or unrequested clothes.
Changing head projection can preserve likeness illustratively; it does not
guarantee pixel-identical facial reprojection. Preserve accepted sources.

Raw personal photos belong outside the public repository or in an explicitly
ignored location excluded from the served/deployed tree. An untracked photo
under `assets/` is still exposed by a static server; `.gitignore` alone is not
a deployment exclusion. Check staged files and deployment contents before
publication. Record reference roles without copying private originals into docs.

## Head and gaze in every direction

Keep one fixed high overhead camera (approximately 65 degrees above horizontal;
the approved pixels matter more than a numeric angle). Rotate the person in
the room, not the camera around their face. Their attention stays along the
floor ahead of their facing direction, including walking and special rows.

- **Down:** substantial crown/hair/cap and shoulder tops; a shorter visible face
  below the crown. Down means toward the bottom of the room, not looking up at us.
- **Right/left:** visible crown and near shoulder top at the same elevation;
  foreshortened cheek, neck, torso and legs. Head/eyes follow that room heading.
- **Up:** top/back of head, rear shoulders and costume. No front face painted on
  the back of the head or head turned toward the camera to show the portrait.
- **Specials:** retain natural head pitch and camera while changing the required
  limbs/body. Nazim's lean/slump are deliberate body states; Alex's split is a
  floor pose. They must remain readable without borrowing an eye-level portrait.

Reject a lifted portrait face, a pupil/eyelid-only correction that leaves the
head looking up, a low eye-level profile, or an over-bowed unreadable/dejected
head. Relaxed downward pitch is compatible with a warm smile. Preserve cap
orientation: a backward cap has its opening/strap at the forehead and brim at
the back; a forward cap retains the opposite arrangement in every pose.

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

The current portrait layout's compact walnut score strip has reserved space
above the scrolling pub and remains fixed when temporary status bars appear.
Keep booth patrons clear of the sign; fading an overlapping sign is insufficient.
Desktop retains its corner sign and body-overlap fade. Preserve integer art
scale, world positions and colliders when changing viewport/camera clearance.
See [the mobile HUD review](art-review/mobile-hud/README.md) for current captures
and actual four-phone validation.

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

1. Read this guide and view Nick B plus shipped Jay/Doe/Hunter PNGs.
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

Use the [character brief](claude/templates/CHARACTER-BRIEF.md) and
[copyable generation/head-correction prompts](claude/03-PROMPTS.md) to make
these requirements explicit for the next contributor. Keep historical exact
prompts unchanged; append new revisions/provenance rather than rewriting what
an earlier generator was actually asked to do.

### Acceptance and enforcement

```sh
node tests/character-art.js
node tests/assets.js
node tests/smoke.js
node tests/alex.js
node tests/cellar.js
node tests/hud.js
node tools/validate-art.js
node tools/validate-alex.js
```

The six Node suites run in `.github/workflows/validate.yml` on pushes and PRs.
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

Review gates: inspect every source cell against the approved gaze/identity,
then measure real alpha and seams, then import/register, then exercise actual
pose events/return/reset/fallback and inspect desktop/mobile room captures at
one family scale. Distinguish alpha-zero gutters from alpha>=128 silhouette
gaps; measured seams never repair true overlap or clipped anatomy. A passing
importer proves technical bounds, not camera/likeness approval. When the user
conditions later work on a preview approval, wait for that actual approval.
Once approval and publication are already authorized, continue through these
gates without inventing another permission step. State unrun checks and live
verification separately; a candidate review is not a shipped-art receipt.

## Regular likeness revisions

The October 6 user-supplied new faces replace the default Nazim, Gerald and
Sam likenesses. Preserve each established game outfit, behavior and row
contract; the photos do not set camera, body pose or portrait clothing.

- Nazim: dark textured crop/fade, thin round wire glasses and a neat full dark
  beard, no cap. Keep his olive hoodie/charcoal trousers and the actual source
  rows `idle` / `walkA` / `lean` / `slump`.
- Gerald: black forward cap, clear round glasses, clean-shaven broad smiling
  face. Keep his burgundy cardigan and idle/two-stride/talking rows. The old
  bald/moustached description is historical provenance, not the current likeness.
- Sam: receding short dark hair, black rounded rectangular glasses, full dark
  beard and warm smile, **no hat**. Keep his burgundy/cream striped outfit and
  idle/two-stride/talking rows. Do not carry forward the old flat cap or
  clean-chin rule.

All use Nick B's natural floor-directed head/gaze and the same elevated camera.
Actual source acceptance, import and browser results belong in each revision's
provenance/review record; these instructions alone do not claim completed art.
Exact revision prompts: [Nazim](../assets/sprites/nazim-likeness.md),
[Gerald](../assets/sprites/gerald-likeness.md), and
[Sam](../assets/sprites/sam-likeness.md).

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
the public asset tree. [Current head/gaze edit prompt](../assets/sprites/alex-perspective.md),
[historical likeness prompts](../assets/sprites/alex-likeness.md) and
[original source prompt](../assets/sprites/alex-prompt.md).

Current `game.js` uses a 15–25 second opening delay, at least one delivery,
12 seconds of game time and 8 seconds of the current shift. There is at most
one visit per timed shift; endless shifts use a 25–45 second cooldown starting
after departure. These are source-verified current values, not the older
60–90/120–180-second scheduling described in historical art records.
Entry defers during a chase,
recent hit, active round, bathroom urgency, busy doorway, or final 40 seconds.
He uses a reachable empty split space outside the staff pocket and away
from door/bathroom. Busy/unreachable attempts defer 10 seconds.

A 1.2-second amber floor outline warns before the split. Occupancy is
checked again before a blocker is added. The split blocks 22x7 for 5 seconds
without damage. Last call, an active round,
bathroom urgency or shift end releases the workout early. Exiting or timing
out removes the visitor, and restart clears both blocker and schedule memory.

## Fred

Fred is the fourth walk-in appearance, using the existing customer routes,
orders and hitbox. The September 28 photo controls his likeness: faded
slate-blue baseball cap, short brown hair at the sides, dark brown beard,
broad smile, white tee with a tiny pink/teal/yellow left-chest print, charcoal
shorts, bare lower legs, navy sneakers and a small left-forearm tattoo.
He has four authored directions with idle, two strides and talk; the talking
row is currently reserved because walk-ins have no talk-state event. Keep the
portrait outside the public asset tree and use the 21-world-unit scale shared
by other customers. See [the accepted prompt and provenance](../assets/sprites/fred-prompt.md).

## Nick

Nick uses the October 5 commit's photo as identity reference: a broad friendly
face and toothy grin, thick ginger-brown beard and moustache, and a backward
baseball cap. Keep his established outfit: muted teal cap, burgundy baseball
jersey with cream piping, cream baseball trousers, dark belt and dark cleats.
Match the approved Nick B/Jay/Doe/Hunter head pitch and elevated camera. All four
directions have idle, two strides and an apology with his anatomical right
palm raised and left hand on his stomach. One measured density gives him the
same 21-world-unit maximum idle height as other supporting people.

The existing rotation and fart-cloud gameplay select `sorry` briefly when he
is standing after a fart, then return to idle. A missing sheet uses his old
procedural idle fallback; it is no longer a production-art exception. See
[the exact prompts](../assets/sprites/nick-prompt.md) and run
`node tools/validate-nick.js` for real walking/apology/reset/fallback checks
and desktop/phone-emulation previews. The identity photo was already tracked
by the referenced collaborator commit; this art pass makes no additional copy.
