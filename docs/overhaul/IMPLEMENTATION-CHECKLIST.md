# Implementation checklist and evidence index

All items below are future work for Claude Code in the actual repository. They are intentionally unchecked. Creating this plan does not satisfy an implementation gate. Record actual paths, commands, measurements and screenshots beside checked items.

## P0: discovery and baseline

Requirements: ARC-01, ARC-02, ARC-10, ARC-11, ARC-13, ARC-14.

- [ ] Read current repository instructions, branch/status and existing modifications.
- [ ] Record actual script/module loading and initialization order.
- [ ] Map simulation, scene drawing, sprites, UI, events and tests to current code.
- [ ] Record world dimensions, logical viewport, art scale, backing pixels, CSS bounds and DPR policy.
- [ ] Identify current collider/route/station/seat definitions and preserve their IDs.
- [ ] Inventory all HUD information, controls, regular stages and actor families.
- [ ] Identify authoritative service, hit, hunter, shift and spill events.
- [ ] Record baseline test failures separately from new regressions.
- [ ] Capture desktop, portrait, busy orders, hit/caught and tally scenes reproducibly.
- [ ] Record baseline device/browser/scenario performance.
- [ ] Save a verified repository map and next checkpoint.

Gate: current architecture and units are known. Continue without waiting for a routine phase approval.

## P1: presentation boundary and render metrics

Requirements: ARC-01, ARC-02, ARC-03, ARC-14.

- [ ] Isolate the smallest useful scene/renderer boundary without changing simulation behavior.
- [ ] Keep the existing visual path working during extraction.
- [ ] Define units for world positions, source rectangles, pivots, offsets and times.
- [ ] Centralize world-to-raster and raster-to-display conversion.
- [ ] Confirm art scale is applied exactly once.
- [ ] Keep simulation precision and collider coordinates unchanged.
- [ ] Verify pointer mapping at center/corners after resize, orientation and fullscreen.
- [ ] Check context state restoration and smoothing after canvas resize.
- [ ] Confirm render calls cannot update score, positions, timers or orders.
- [ ] Compare baseline behavior and captures; record any intended visual-only difference.

Gate: the old visuals remain playable through the new boundary, with no coordinate regression.

## P2: registry, contracts and failure behavior

Requirements: ARC-04, ARC-05, ARC-14.

- [ ] Inspect an existing loader before adopting the proposed contract vocabulary.
- [ ] Implement schema version, intrinsic image dimensions and bounded frame validation.
- [ ] Declare authored pixels/world-unit, pivots and animation time units.
- [ ] Keep collider data outside asset metadata.
- [ ] Add decode-ready selection and bounded failure handling.
- [ ] Deduplicate loads and reject stale asynchronous completion.
- [ ] Provide per-family coherent fallback and development diagnostics.
- [ ] Test missing image, missing JSON, invalid schema, bad frame, bad duration and decode failure.
- [ ] Test reload/restart while a load is pending.
- [ ] Validate opaque body/prop palette and alpha; separate explicit effect exceptions.
- [ ] Exclude generated reference boards and this plan's example files from runtime loading.

Gate: real validated fixtures load, failures do not break gameplay, and asset status is inspectable.

## P3: convincing playable visual proof

Requirements: ARC-05, ARC-06, ARC-07, ARC-08, ARC-12.

- [ ] Establish one overhead Doe frame and one hunter frame at intended native size.
- [ ] Keep canonical costume details and asymmetric prop rules.
- [ ] Produce a floor sample, counter corner, table and chair in the same projection.
- [ ] Place them using actual geometry in one representative gameplay area.
- [ ] Compare clean base art with lighting disabled and enabled.
- [ ] Verify the silhouette and material upgrade at 1x, not just enlarged.
- [ ] Check scale, feet/contact anchors, floor contrast and player visibility around furniture.
- [ ] Demonstrate a carry pose and hit response without changing gameplay.
- [ ] Refine projection/materials if the result still resembles a recolored old build.
- [ ] Record remaining production-art gaps without marking the full overhaul complete.

Gate: one actual playable scene demonstrates the target sufficiently to justify extending that treatment.

## P4: room and complete cast

Requirements: ARC-01, ARC-05, ARC-06, ARC-07, ARC-11, ARC-12.

- [ ] Derive the full room template from current geometry, not the generated painting.
- [ ] Add deterministic floor variants and verify repeated seams.
- [ ] Rebuild counters, corners, taps, shelves and kitchen/service fixtures.
- [ ] Rebuild table, booth, stool, chair and bench orientations used by the current room.
- [ ] Add restrained wall/window/fireplace/plant/decor treatment where geometry permits.
- [ ] Separate footprint, visual bounds, pivot and sorting depth for every class.
- [ ] Split problematic elongated/tall occluders and verify all approach sides.
- [ ] Add coherent idle/walk/carry/directional animation families for Doe/hunter.
- [ ] Preserve Nazim stage changes and regulars' seated/interaction poses.
- [ ] Cover all actual patron appearances, waiter/Jay and ghost.
- [ ] Upgrade drink/order icons and carrying attachments to match the new density.
- [ ] Preserve all station/table/seat IDs and current routes.
- [ ] Record asset status by family and view; do not mark placeholders complete.

Gate: all required scene and cast families are covered, with pathing and interaction behavior preserved.

## P5: event reactions, effects and light

Requirements: ARC-03, ARC-08, ARC-09, ARC-15.

- [ ] Map existing authoritative outcomes to presentation events once per outcome.
- [ ] Bound event/effect storage and clear session-owned state on restart.
- [ ] Implement supported success, hit and hunter-state feedback in overhead poses.
- [ ] Keep unsupported perfect-service/hunter-damage/fatigue concepts deferred.
- [ ] Test interruption priority and return to the actor's current state.
- [ ] Avoid duplicate hit-stop, score mutation and new input locks.
- [ ] Keep visual recoil distinct from collision position.
- [ ] Separate base material shading, light masks and emissive detail.
- [ ] Remove double lighting from repeated floor tiles and baked reference glow.
- [ ] Verify normal, dark and busy lighting with UI readable.
- [ ] Test reduced nonessential motion while retaining state information.

Gate: presentation follows real events and stays readable without changing the underlying rules.

## P6: UI and responsive shell

Requirements: ARC-02, ARC-10, ARC-12.

- [ ] Retain the complete actual HUD/status inventory, including timer/total if present.
- [ ] Rebuild plate/material treatment with calm text backgrounds.
- [ ] Add compact/urgent/carried marker states using real order data.
- [ ] Check marker overlap, top edge, HUD safe regions and touch-control regions.
- [ ] Reposition/wrap dialogue without obscuring critical action when avoidable.
- [ ] Cover start/help, caught/tally, restart, mute and fullscreen states.
- [ ] Preserve keyboard and touch command funnels.
- [ ] Verify focus, labels and usable touch targets in the DOM shell.
- [ ] Check desktop, portrait, landscape touch, browser zoom and fullscreen.
- [ ] Ensure urgency and success are not communicated by hue alone.

Gate: updated UI is readable, complete and usable without taking over the playfield.

## P7: final integration and release preparation

Requirements: ARC-01 through ARC-15 where applicable; ARC-16 remains optional.

- [ ] Run current regression tests and targeted new contract/metrics/event tests.
- [ ] Exercise routes, all stations, serving, hunter/catch, spills and shifts.
- [ ] Exercise regular stages, wander/water/round behavior, waiter and ghost if present.
- [ ] Check asynchronous failures, repeated restart/resize and hidden-tab resume.
- [ ] Capture fixed-scenario before/after desktop and portrait views.
- [ ] Record native-size and enlarged detail comparisons with viewport/art-scale metadata.
- [ ] Measure a warmed 60-second busy scene against baseline and declared target budget.
- [ ] Check counted resources for monotonic growth across lifecycle tests.
- [ ] Inspect required asset coverage, console/network failures and debug-only leftovers.
- [ ] Update current project docs, asset registry/provenance and HANDOFF truthfully.
- [ ] Prepare a reviewable build and clear remaining-gap statement.
- [ ] Perform external publication/merge only under actual current authorization and repo rules.

Gate: all P0 requirements have evidence and the real game visibly reaches the approved direction.

## Evidence register template

Create an implementation-owned copy and fill it with actual results. Do not use future tense as evidence.

| Evidence ID | Requirement IDs | Scenario / test | Result | Artifact or command | Device / viewport / scale |
| --- | --- | --- | --- | --- | --- |
| EV-001 | ARC-01, ARC-02 | Baseline coordinate and route comparison | Pending | Pending | Pending |
| EV-002 | ARC-04, ARC-05 | Asset success/failure fixtures | Pending | Pending | Pending |
| EV-003 | ARC-06, ARC-07 | Native-size proof scene and occlusion | Pending | Pending | Pending |
| EV-004 | ARC-08, ARC-09, ARC-15 | Light/event/interruption matrix | Pending | Pending | Pending |
| EV-005 | ARC-10 | UI and touch viewport matrix | Pending | Pending | Pending |
| EV-006 | ARC-11, ARC-12 | Full cast/room coverage | Pending | Pending | Pending |
| EV-007 | ARC-13 | Performance and lifecycle measurement | Pending | Pending | Pending |
| EV-008 | ARC-03, ARC-14 | Boundary review and final documentation | Pending | Pending | Pending |

## Asset inventory template

For each real runtime family, record: existing provider, replacement asset ID, reference image, production source, available directions/states, native frame size, authored density, pivot, collision source ID, alpha/palette class, validation result, integration status and remaining blocker. Keep fallback status explicit. Do not place an invented source file in the inventory as if it exists.
