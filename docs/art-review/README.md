# Character artwork review — September 22, 2026

Open the game locally with `node tools/serve.js`, then visit
<http://127.0.0.1:8917/> or the interactive cast at
<http://127.0.0.1:8917/tools/art-review.html>.

- `desktop.png`: regulars' booth and the two leads at 1280×720.
- `mobile.png`: full-room portrait at 390×844 with touch controls.
- `cast.png`: the interactive review showing the nine production characters.
- `report.json`: actual loaded atlas status, pose checks, movement, rotation,
  render-submission timings, and the single-image failure/fallback result.
- `../../assets/gameplay.png`: current in-game carry, drinking and spray poses.

These are real Edge screenshots from a controlled game scene, not generated
gameplay mockups. `node tools/validate-art.js` reproduces the checks/captures
into the OS temporary folder (or an explicitly supplied output directory).
Customer seating is randomized by the game, so exact crowd positions vary.

Both viewports loaded nine atlases without normal console/page/request/HTTP
errors and passed 112 direction/pose mappings, actual intoxication/talking
transitions, carry/drink/spray rendering, keyboard/touch movement and rotation
without changing player coordinates. A deliberate Doe-image 404 retained a
playable procedural Doe and the illustrated Hunter. The gallery loaded 9/9.

Latest 300-sample CPU render-submission measurements: desktop median 2.9ms /
p95 5.0ms; mobile emulation median 3.1ms / p95 5.6ms. These exclude GPU/frame
pacing and do not establish physical-phone performance.

The overhead camera, approved layout and gameplay rules are preserved.
The environment remains procedural. See
[`ILLUSTRATED.md`](../../assets/sprites/ILLUSTRATED.md) for source prompts,
frame contracts, fallbacks and remaining animation/art limitations.
