# 5. Acceptance, browser evidence and concrete failure diagnosis

[Start here](README.md) · [Integration](04-ATLAS-INTEGRATION.md) · [Nick worked example](06-NICK-CASE-STUDY.md)

Do two reviews: **technical correctness** and **visual correctness**. Neither
can stand in for the other. A valid JSON can point to a poor-looking sprite;
a beautiful source can be cropped/scaled/selected incorrectly in the game.

## Prerequisites for actual checks

The dependency-free Node suites run from the repository root. Current CI
uses Node 22; Nick's local run used Node 24.14.0 on Windows.

The browser tools use `tools/browser-session.js`, local Microsoft Edge
through `channel: 'msedge'`, and an existing `playwright-core` installation.
The harness first tries the local module, then Windows npm's npx cache under
`LOCALAPPDATA`. These are development-tool requirements, not game dependencies.

If Edge or `playwright-core` is unavailable, report that exact blocker and
set up the development tools as a separate concrete step. Do not claim a
mocked Node render was real-browser evidence. Do not change the game to add
a bundler/package system just to run artwork review. Other platforms need an
explicitly adapted browser harness and a report naming that environment.

## Required Node checks

```powershell
node tests/character-art.js
node tests/assets.js
node tests/smoke.js
node tests/alex.js
node tests/cellar.js
node tests/hud.js
git diff --check
```

Inspect each process exit/output. This PowerShell form stops on the first failure:

```powershell
foreach ($artCheck in @('tests/character-art.js', 'tests/assets.js', 'tests/smoke.js', 'tests/alex.js', 'tests/cellar.js', 'tests/hud.js')) {
  node $artCheck
  if ($LASTEXITCODE -ne 0) { throw ('Failed: ' + $artCheck) }
}
git diff --check
if ($LASTEXITCODE -ne 0) { throw 'Whitespace/diff check failed' }
```

| Check | What it establishes | What it does not establish |
| --- | --- | --- |
| Character art contract | Declared kind/family coverage, exactly selected illustrated atlases, RGBA headers/dimensions, density/scale, required poses/timing/seams, regression guards | Image beauty, identity, anatomically correct strides, runtime decode/network behavior |
| Asset registry | Validation, loading/failure handling, deduplication and fallback-related registry behavior | This new source's likeness or every rendered special state |
| Smoke | Runtime loading, customer routes, broad gameplay/rendering integration with a mocked DOM/canvas | Real browser display, texture/camera approval |
| Alex | Workout scheduling/lifecycle/collision/reset regressions | Nick-specific apology correctness |
| Cellar | Stock/hatch/mini-game/ghost/exit/reset regressions | Character style |
| HUD | Portrait booth clearance, status layout, camera and rotation regressions | Actual browser pixels or physical-device approval |
| Diff/syntax checks | Whitespace and parsable edited JavaScript | End-to-end function or visual acceptance |

Suite counts may grow. For the accepted Nick tree they were 11 gameplay
kinds/12 illustrated families/5 art guards, 31 asset checks, 10 smoke scripts/
40 customer routes, 13 Alex gates, and the cellar lifecycle. These are recorded
results, not hardcoded completion criteria for the next character.

## Broad real-browser check

```powershell
node tools/validate-art.js docs/art-review/new-person/full-cast
if ($LASTEXITCODE -ne 0) { throw 'Broad browser art check failed' }
```

Replace the output folder with this task's family. The current checker:

- loads the actual production manifest, with no replacement assets injected;
- checks every contracted family/direction/animation exists;
- exercises regular poses and lead/waiter rendering;
- checks keyboard/touch movement and rotation/resize preserving positions;
- simulates a missing source and verifies functioning fallback;
- saves screenshots and a report; normal console/page/network errors fail it.

It does not automatically stage every new character's special gameplay event.
That needs a focused check. Its timing samples describe CPU render submission,
not physical-device performance, GPU timing or smoothness guarantees.

## Focused real event: Nick example

```powershell
node tools/validate-nick.js docs/art-review/nick
if ($LASTEXITCODE -ne 0) { throw 'Nick focused browser check failed' }
```

Nick's check stages a controlled view but drives real production functions:
spawn Nick through his route, advance the game, confirm illustrated walking,
reach a standing state and trigger the actual fart timer/event, then confirm
`sorry.down`, return to idle and cleanup on restart. It also forces a Nick PNG
404, checks that Jay still loads, and verifies Nick's behavior renders safely
through the retained procedural fallback.

For a new person, use this file as a pattern, not as a ready-made test for
unrelated poses. Replace family/name, states/timers/events, body invariants,
frame assertions and captures deliberately. A talk action or mop sequence
will not have Nick's `fartTimer`/`sorryTimer` lifecycle.

Manually choosing `Assets.frameFor('nick', 'sorry.down', 0)` proves that frame
lookup succeeds. It does not prove that the live fart event selects it. Forcing
the real event's timer in a controlled fixture and calling the production
update functions is valid lifecycle evidence; bypassing the event by setting
only the final atlas frame is not the same evidence.

Test return/exit/reset and loading failure as well as pose entry. Also check
pause/tally/reduced-motion behavior when relevant to a new action.

## Inspect the actual captures

Review at least:

1. Complete source sheet, all cells and gutters.
2. A comparison with Jay/Alex at the same world/display scale.
3. Every direction with idle, both authored strides, and each required action.
4. Native desktop gameplay (1280x720 in the existing review convention).
5. Native phone/touch emulation (390x844), including the actual room.
6. The real special-action capture, its return and any floor-contact concerns.

At native phone size, small tattoos, fingers or individual beard hairs may
be secondary. The person's silhouette, face/hair/cap mass, clothing and action
must remain readable. Do not inflate one character globally to reveal a tiny
detail that other cast members also lose at that size.

Keep the production room lighting on. A bright isolated thumbnail cannot show
whether burgundy cloth disappears against walnut or a pale shoe glows too much.
Watch foreground lamps/boards that can legitimately occlude a staged sprite;
move the review fixture to a clear visible lane before saving proof.

## The live gallery

```powershell
node tools/serve.js 8917
```

Open <http://127.0.0.1:8917/tools/art-review.html#nick> for Nick or the gallery
without the anchor for all characters. Character IDs match family keys.

Choose direction, pose and desktop/phone/2x inspection size. Pose choices
come from the shared contract; a character without a selected pose displays
idle, so read the card's actual-pose label rather than assuming everyone is
showing the requested action.

Leave walk running long enough to inspect both phases. A paused screenshot
of “walk” can capture only one sequence step, possibly idle. Use the authored
source/metadata or a deliberate two-phase capture to review both strides.

If port 8917 is already used, verify it serves THIS checkout and new metadata.
Do not stop an unknown server. Pick another local port if needed and report
the actual preview URL. Browser validators start their own temporary servers.

## Troubleshooting by symptom

| Symptom | Most likely layer | Next concrete check | Appropriate correction |
| --- | --- | --- | --- |
| Looks like a coarse geometric person | Source artwork/selection | Inspect PNG and ready family; check whether only `OH_*`/old exported JSON is selected | Generate/import the required illustrated raster; select the correct atlas |
| Big PNG but still blocky/coarse | Source authorship | Inspect original pixel detail, not file dimensions | Author new detail; upscaling procedural pixels is insufficient |
| Attractive front, eye-level sides | Raster camera | Compare side crowns/shoulders/body ratio with Jay | Targeted camera edit with reference image |
| Face/outfit copied from Jay/Alex | Reference-role confusion | Check attachment labels and identity prompt | Identity/costume edit, keeping finish/camera |
| Cap flips forward/backward between poses | Raster consistency | Inspect strap/brim in all sixteen cells | Correct the affected head views |
| Backward walking or sliding feet | Stride phases/order | Compare both rows in every direction and animation sequence | Correct limb phases or mapping, preserving facing |
| Checkerboard or colored rectangle around sprite | Actual alpha | Inspect downloaded RGBA/alpha; distinguish viewer backdrop | Regenerate/extract real alpha and revalidate edges |
| `opaque pixels cross cell boundary` | Layout or assumed seam | Run declared/equal inspector modes; inspect neighboring silhouettes | Measured horizontal seams for genuine gutters, raster edit for real overlap/clipping |
| Cut-off hand/shoe or giant cropped frame | Frame extraction/layout | Inspect source, rect and row seam | Fix layout/metadata, then reimport; do not invent missing anatomy |
| Too tall/large beside Jay | Density/world size | Check maximum idle crop and contract height | Correct family density/contract/import, not global `ART_SCALE` |
| Special pose shrinks/grows | Inconsistent source size or per-pose scaling | Compare torso/head across rows at one density | Uniform source anatomy; one family density |
| Hovering, sinking, sideways jump | Pivot/cell center | Inspect frame-local contact pivot and asymmetry | Correct measured contact/placement; document floor offsets |
| Nice source but old sprite appears in room | Loader/manifest/runtime family | Inspect `Assets.status()`, `hasFamily`, manifest and `rasterFamilyFor` | Fix exact file/path/family/load error; do not remove fallback |
| Special pose absent although source exists | Contract/state mapping | Check required animation name, `e.pose`, `poseBase` and facing | Declare/select the exact pose through real gameplay |
| Left view swaps bottle/tattoo hand | Mirrored asymmetry | Trace anatomical side, not screen side | Author correct left/right raster views |
| New art test passes but old suite fails | Baseline or integration regression | Reproduce against committed sources; inspect changed behavior | Fix the actual cause within scope; disclose any unresolved unrelated failure |
| Guide promises an unavailable image tool | Tool discovery | Inspect actual tools/MCP schema and reference-input path | Use the manual handoff or configure a real tool as a separate task |

A failed attempt is useful evidence. Name the exact problem; do not regenerate
all characters randomly or alter unrelated gameplay to hide it.

## When to reject rather than “make the tests pass”

Reject a candidate with poor camera, inconsistent identity, duplicated/extra
limbs, missing action, wrong anatomical prop ownership, nontransparent backdrop,
actual figure overlap, or clipped outer anatomy. Do not:

- lower density/edge/coverage guards to accept it;
- add a new procedural exception to bypass required artwork;
- shrink only the difficult action or change its hitbox to suit the picture;
- mirror an asymmetric prop and call the left view authored;
- hardcode old frame coordinates for a changed source;
- claim a Node canvas mock or uninspected screenshot proves visual fidelity.

A metadata fix is appropriate when the image is good and its measured layout,
scale or contact data is wrong. An image edit is appropriate when the pixels
are wrong. A state-selection fix is appropriate when correct art exists but
the live event selects the wrong pose. Identify the layer before changing it.

## Completion checklist

- [ ] User's requested identity/costume and scope recorded.
- [ ] Actual shipped image references inspected and supplied to the generator.
- [ ] Real generation tool/provider or manual supplied-art route recorded.
- [ ] Full source and every required direction/pose inspected.
- [ ] Two distinct strides; correct camera/identity/hand ownership.
- [ ] Original RGBA PNG preserved; no painted background/floor/shadow.
- [ ] Contract declared; no new debt exception or competing atlas.
- [ ] Import PASS with actual dimensions, seams, density and pivots.
- [ ] Production manifest and runtime family/pose/facing selection verified.
- [ ] Existing world scale/colliders/gameplay preserved unless changes requested.
- [ ] Required Node suites PASS, or exact unresolved failures explicitly recorded.
- [ ] Broad and focused real-browser checks run with actual outcomes recorded.
- [ ] Native desktop/mobile and cast-comparison images personally inspected.
- [ ] Special event/return/reset/loading failure exercised.
- [ ] Exact prompt/provenance/review evidence saved and linked.
- [ ] `HANDOFF.md` agrees with actual status, including untracked assets.
- [ ] Commit/push/deploy status stated truthfully; no local-to-live claim.

Use [the review record](templates/REVIEW-RECORD.md). Leave unrun checks marked
**not run**, blocked data **unavailable**, and unknown measurements **not measured**.
Do not replace those states with zero errors or “PASS.”
