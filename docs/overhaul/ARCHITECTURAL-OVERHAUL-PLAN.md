# LePub overhead visual overhaul: implementation plan for Claude Code

Status: actionable implementation plan, pending inspection of the actual repository. No game code was available when this plan was written. Images in this pack are visual references, not production assets. The user has approved the overhead art direction, not every generated pixel or a completed implementation.

## 1. Mission and finish line

Rebuild the game's presentation so the existing overhead pub becomes a materially richer, coherent scene: finely authored walnut surfaces, brass and glass, burgundy upholstery, recognizable overhead characters, localized warm light, quieter travel lanes and compact readable UI. Preserve the existing gameplay loop, world geometry, input behavior and game rules during this visual overhaul.

Use `overhead/gameplay-modernization-concept.png` as the main visual target and `source/current-overhead-gameplay.png` as the visible layout reference. The goal is a real in-game result at native play scale. A gallery, a polished mockup, a higher-resolution canvas, a new palette or passing smoke tests alone is not completion.

Implement incrementally in the real repository. First establish a stable renderer boundary and one convincing playable area, then expand assets and presentation across the room. Continue through all unblocked work. Do not stop after auditing, creating interfaces or writing a plan. If production art cannot be created with available capabilities, finish the useful integration/fallback work and state exactly which assets block visual completion.

## 2. Authority and evidence

| Source | Use | Evidence limitation |
| --- | --- | --- |
| Current user direction and `00-CAMERA-DIRECTION.md` | High overhead camera, rich pub look, preserve readable space | Does not define exact engine camera degrees |
| Actual checkout, local instructions and current tests | Real architecture, behavior and integration contracts | Must be inspected by Claude |
| Supplied current screenshot | Visible arrangement and UI problems | Cropped, no hidden geometry or coordinates |
| New overhead mockup | Material/projection target | Generated, approximate geometry and UI |
| Original pub painting | Atmosphere, surfaces, furnishing density | Different camera and hunter costume |
| `ART-PLAN.md` | Original asset inventory, palette and base frame counts | Camera and scaling proposals have been superseded in part |
| `HANDOFF.md` | Historical implementation clues and regression risks | Not a substitute for inspecting today's code |
| Earlier character/reaction boards | Costume and acting intent | Require overhead redraw, palette and anchor cleanup |

The handoff mentions `game.js`, `src/scenery.js`, `src/sprites.js`, `src/pixelfont.js`, a script-based Canvas application, procedural string sprites, `ART_SCALE=2`, feet-aware collision and `tests/smoke.js`. These are reported facts from the supplied document, not verified facts about the current checkout. It also records changing branch heads and multiple milestones. Discover current state rather than trusting one old commit identifier.

### Conflicts resolved for this plan

- Keep simulation units unchanged by default. ART-PLAN's proposed world/speed multiplier is not the default implementation because HANDOFF already records a 2x art renderer.
- Use high overhead character projection. Earlier frontal character images do not override the user's latest camera clarification.
- The 640x360 backing target is an art-resolution reference, not an instruction to make every world, viewport and screen use those dimensions.
- Use four independently authored cardinal directions for the first complete directional character set. Additional diagonals are later polish unless the existing renderer genuinely needs them. Eight-view reference boards do not mandate eight copies of every animation.
- Keep original gameplay. Perfect-service, hunter-damage and fatigue concepts do not authorize new mechanics simply because a pose exists.
- Keep the exact supplied palette for production body/prop pixels initially. Handle lighting and intentional translucency separately. Any justified palette extension must be explicit and documented, not silently accepted by weakening validation.

## 3. Scope and exclusions

In scope: presentation architecture; render-coordinate contract; optional PNG/atlas loading; production asset preparation; room/furniture reconstruction; overhead character animation; visual event reactions; lighting and particles; HUD, tickets, dialogue, overlays and touch shell; performance; regression tests; visual evidence; durable handoff.

Preserve: world and collider coordinates, player speed, hunter logic, serving ranges, table/seat IDs, station IDs, order rules, tips and shift logic, regulars' behaviors, spills and existing effects, save/storage behavior, sound semantics, input mappings and route behavior unless a separately identified defect must be fixed.

Do not introduce a game engine, 3D renderer, React migration, TypeScript conversion, bundler migration, ECS rewrite, new backend, account system or new persistence mechanism just to complete this task. Keep the existing module/script loading style unless discovery demonstrates a specific need to change it. A visual rebuild does not require rebuilding simulation.

## 4. Stable requirements

Priority P0 means required for completion; P1 means required if supported by the existing game or explicitly included below; P2 means optional follow-up. The requirement IDs persist in implementation notes and evidence.

| ID | Priority | Requirement | Verification |
| --- | --- | --- | --- |
| ARC-01 | P0 | Preserve simulation geometry and rules during presentation migration | Baseline fixture and behavior comparisons |
| ARC-02 | P0 | One explicit world-to-raster-to-CSS mapping; no duplicate scale | Coordinate examples, pointer mapping and resize tests |
| ARC-03 | P0 | Render code cannot change gameplay state | Boundary review and unchanged simulation traces |
| ARC-04 | P0 | Invalid or missing optional art falls back without breaking play | Missing image/JSON/decode fixtures |
| ARC-05 | P0 | Final body/prop assets meet declared size, palette, alpha and anchor contracts | Asset validator and native-scale review |
| ARC-06 | P0 | Characters and furniture use one high overhead projection | In-game proof scene, all directions and seat orientations |
| ARC-07 | P0 | Visual depth never changes collision or hides required interactions | Traversal and occlusion scene matrix |
| ARC-08 | P0 | Lighting is bounded, layered and readable without doubled glow | Fixed-state normal/dark/busy captures |
| ARC-09 | P0 | Reactions consume existing events and cannot alter rewards or control rules | Event deduplication and interruption tests |
| ARC-10 | P0 | Required HUD/status information remains available in desktop and portrait | UI inventory and viewport checks |
| ARC-11 | P0 | Named cast and gameplay fixtures remain recognizable and behaviorally intact | Asset inventory and regression scenarios |
| ARC-12 | P0 | Updated visuals replace the whole required scene, not just the two leads | Coverage checklist and full-room captures |
| ARC-13 | P0 | Performance and memory meet the recorded target-device budget | Repeatable measurements against baseline |
| ARC-14 | P0 | Current instructions, references and implemented status remain traceable | Updated docs, asset registry and evidence index |
| ARC-15 | P1 | Success, hit and existing hunter-state reactions get overhead treatment | Native-scale playback linked to supported events |
| ARC-16 | P2 | Extra diagonals, portraits and unsupported reaction concepts remain optional | Clearly separated backlog |

## 5. Phase 0: repository discovery and baseline

Read applicable repository instructions and the current `CLAUDE.md`/`HANDOFF.md`. Inspect branch, status and existing modifications. Preserve other work. Do not reset, clean, replace the checkout, merge a draft PR or overwrite a working image because an older file in this pack says to do so.

Inventory these areas with actual paths and function names:

- Entry HTML, scripts/import order, build and development commands.
- Loop timing, pause/caught/tally handling, restart lifecycle and debug controls.
- World dimensions, static/dynamic colliders, table and seat definitions, station mappings and route construction.
- Canvas logical dimensions, backing dimensions, CSS sizing, camera transforms, `ART_SCALE`, `pixelSize`, anchors and DPR handling.
- Sprite providers, current actor directions, animation clocks, palette/regular stage variants and order icons.
- Render passes, static caches, foreground occluders, blend operations and light sources.
- Input conversion and keyboard/touch funnels; fullscreen, resize and orientation behavior.
- Authoritative service/hit/shift/hunter events and existing hit-stop or shake.
- Tests, browser-capture helpers, local server and deployment configuration.

Write a concise repository map and a list of verified discrepancies from this plan in a new implementation checkpoint. Adapt names and boundaries to the code; do not create empty modules solely to match the proposed tree.

Capture the current game with a reproducible scenario. Prefer an existing seeded/debug fixture. If randomness prevents comparison, add a narrowly scoped test fixture or injectable random source; never change the production random behavior to make a screenshot deterministic.

Baseline evidence: desktop and portrait gameplay, busy orders, hit/caught, tally/start overlay, all regulars, top/bottom camera positions, baseline performance, current test results and an inventory of outstanding failures. Classify old failures separately from regressions.

Phase 0 exit: actual architecture and coordinate units are understood, baseline is reproducible, and all changes can be compared without guessing. Continue into Phase 1 once this is established.

## 6. Target boundaries and dependency direction

Use these conceptual responsibilities. The exact file split is a recommendation, not a requirement to create this many files at once.

| Responsibility | Possible location | Owns | Must not own |
| --- | --- | --- | --- |
| Simulation | Existing `game.js` and gameplay modules | Entity state, physics, orders, tips, hunter, shifts | Asset pixel sizes and shader-style effects |
| Scene adapter | `src/render/scene.js` | Read-only render description and stable IDs | Changing entity position to fit art |
| Asset registry | `src/assets.js` or existing loader | Decode, metadata, validation state, fallback selection | Colliders, score or input locks |
| Render metrics | `src/render/metrics.js` | World/raster/CSS transforms and anchor conversion | Rewriting speeds or world coordinates |
| Actor presentation | `src/render/actors.js` | Direction, pose, attachments and visual offsets | Damage or serving decisions |
| Room presentation | `src/render/room.js` | Surfaces, modules, caches and depth partitions | Independent duplicate map geometry |
| Lights/effects | `src/render/lighting.js`, `effects.js` | Light masks, bounded particles, ambient motion | Gameplay random stream or world timers |
| UI | Existing UI files or `src/ui/` | HUD, order marker layout, dialogue and overlays | A second scoring or order model |
| Debug/evidence | Existing dev tooling | Inspection toggles, fixtures, captures, diagnostics | Production-only hidden cheats |

Allowed data flow: simulation state and authoritative events feed presentation. Asset metadata feeds presentation. Metrics map positions to the screen. UI input goes through the existing command/input funnel into simulation. Drawing never feeds new score, movement, collision or event decisions back into simulation.

A scene adapter can build lightweight reused records rather than clone the world each frame. Treat them as read-only by convention and tests; do not add deep freezing or per-frame JSON serialization to production. Keep stable entity IDs so pose timers, marker priority and sorting do not reset when an array order changes.

Preserve script compatibility. If the app uses global scripts, introduce a small namespace/closure boundary with explicit initialization order. Do not mix uncoordinated globals, ESM imports and different load timings. Audit collisions before naming exports.

## 7. Coordinate and resolution contract

Name four distinct quantities in code and documentation:

| Quantity | Meaning | Example only |
| --- | --- | --- |
| World unit | Simulation position/range/speed unit | Existing 200x360 world if still current |
| Logical viewport | Camera view measured in world-like units | 320x180 if still current |
| Art raster scale A | Authored raster pixels per world unit | 2 |
| CSS display rectangle | Browser area containing the rendered raster | 1280x720 |

If the existing logical viewport is 320x180 and A=2, a 640x360 art backing canvas follows. Displaying that at 1280x720 adds a 2x CSS enlargement. This does not require doubling simulation positions or speeds. A 64px sprite cell authored at 2 pixels/world-unit occupies 32 world units before camera/display scaling; a 48px visible silhouette occupies approximately 24 world units. These are explanatory examples, not proof of current values or final art size.

Choose one transform policy for the world pass. Recommended: translate by camera in world units, scale by A once, and draw assets at source-size divided by their authored pixels/world-unit. An equally valid raster-space renderer can compute all destination pixels explicitly. Do not do both.

For an untrimmed frame with pixel-space pivot `(px, py)`, source size `(fw, fh)`, and authored density D:

```text
worldLeft = entityX - px / D + visualOffsetX
worldTop  = entityY - py / D + visualOffsetY
worldDrawWidth  = fw / D
worldDrawHeight = fh / D
```

Offsets in this formula are world units. Source atlas rectangles and pivots are native image pixels. Animation frame time is milliseconds. Collider coordinates remain simulation units. State every unit in the eventual metadata contract.

Use image intrinsic dimensions for source-rectangle validation, and pass source and destination rectangles deliberately when drawing an atlas. [MDN drawImage](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage)

Snap rendered origins/camera positions to the selected art grid if needed; keep simulation precision unchanged. Quantize shared tile boundaries consistently to avoid seams. Review moving shadows, attachments and markers with the same transform. Do not floor each subsystem differently.

The art raster is not automatically the device-pixel canvas. Inspect existing DPR handling. If a separate display canvas is required, scale the art raster into it once with smoothing disabled; do not multiply A, sprite size and DPR independently. Choose integer enlargement when it fits; for constrained screens, record the chosen fit/crop policy and preserve aspect ratio. Do not stretch width and height separately.

Disable smoothing on every context that scales pixel art, including cached/offscreen contexts, and reapply drawing state after canvas dimension changes. [MDN imageSmoothingEnabled](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled)

For pointer/touch mapping, account for the actual content rectangle and any internal letterbox margins before converting to raster and world coordinates. The element rectangle is viewport-relative, so pair it with matching client coordinates. DOM borders/padding must not be mistaken for drawable content. [MDN getBoundingClientRect](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect)

Test center, all four corners, resize, scrolling, fullscreen, portrait and touch controls. Preserve the existing input funnel; do not introduce a second coordinate conversion in a UI listener.

## 8. Asset contract and loader behavior

Adopt an explicit versioned internal metadata contract, or extend the actual existing one. The machine-readable file `examples/atlas-contract.example.json` is a proposed vocabulary example with invented asset paths and only two illustrative frames. It is not importable game art and does not assert compatibility with an existing loader.

Minimum metadata: schema version, asset ID, image relative path, expected intrinsic dimensions, frame rectangles, pixel-space pivots, authored pixels/world-unit, animation frame IDs/durations/loop rule, available directions, alpha/palette policy, attachment locations where needed, and procedural fallback key. Keep collision data out of this contract.

Prefer untrimmed, unrotated 64x64 actor cells initially. Packed/trimmed atlases complicate pivots and require source-size/trim-offset support. Do not enable them just to save a little transparent texture area. If later supported, normalize them in one adapter and verify rotated/trimmed cases explicitly.

Separate asset identity from pose identity. Entity kind selects a character family; direction and state select an animation; time selects a frame. Never scatter absolute crop coordinates throughout game logic.

### Registry lifecycle

Each entry transitions through unloaded, loading, ready or failed, with a stored failure reason. A generation/session token prevents a late response from an old reload or restart replacing a newer entry. Cache successful immutable image data. Deduplicate simultaneous loads for the same source. A restart resets presentation clocks and live effects, not necessarily decoded immutable textures.

Validate metadata before registering an asset: finite numbers, positive dimensions and density, integer in-bounds source rectangles, unique IDs, known frame references, positive finite durations, valid loop modes and documented pivots. Validate intrinsic decoded size against declared dimensions. Reject incompatible schema versions with a clear diagnostic.

Wait for the image to decode before selecting it for rendering; handle rejection and broken images. `HTMLImageElement.decode()` provides a promise for decoding readiness. [MDN image decode](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode)

Use bounded startup behavior. Optional art must not keep the game in an endless loading state. Once a deadline or load failure occurs, use a stable fallback and allow a controlled retry. Do not retry a missing asset every frame. In development, show a clear diagnostic with asset ID/reason; in normal gameplay, preserve a coherent fallback without spam.

Swap a character animation family atomically where possible, so one walk cycle does not alternate between old and new camera projections. If only one cleaned frame is available, use it in an explicit review mode while the default family remains coherent. Missing optional reaction poses fall back to a compatible neutral/locomotion pose; never switch to a wrong direction or opposite carrying hand invisibly.

### Asset validation policy

Final character bodies and opaque props use binary alpha and the agreed palette. Ghosts, light masks and explicitly translucent effects use separate classes with declared exceptions. Validate asset pixels, not a final screenshot after blending, because lighting naturally produces colors outside the base palette. Validate closed contours and perceptual readability by visual review; a color-count test cannot prove artistic quality.

Keep raw generated references outside the runtime asset registry. Add provenance/status for each asset: reference, draft, cleaned, validated, integrated. Do not pass a high-resolution reference board as a sprite just because it loads as PNG.

## 9. Room data, materials and depth

Reuse actual world geometry as the source of truth. Build visual instances keyed to existing counter/table/bench/station IDs. A decoration record may add surface style, art anchor, draw layers or a light source. It must not create a parallel set of collision rectangles that slowly drifts from the game.

Recommended room approach: modular floor and rugs, authored furniture/modules, and a hand-composed perimeter. Keep a layered room painting as an option only if it matches exact geometry and provides required occluder layers. Do not stretch the wide empty pub painting into the tall world or use it as a flat background behind incompatible colliders.

For each asset, record the real footprint, art anchor, visual bounds and depth behavior separately. A counter front can extend visually beyond its footprint without expanding collision. Conversely, a decorative object must not appear walk-through while an invisible collider blocks it.

Cache static material work, not simulation-dependent content. Floor variants should be deterministic for a given room seed. Do not regenerate grain with the gameplay random stream. Invalidate room caches on explicit dependencies such as geometry revision, asset version, art scale or material settings. Do not rebuild the entire floor every frame or every minor HUD update.

Suggested compositing responsibilities, adapted to the actual current renderer:

1. Clear/reset context state and paint background/floor/rugs.
2. Draw background architecture that is always behind actors.
3. Draw ground decals and spills using their actual lifetimes.
4. Draw depth-sorted furniture parts, actors and props with stable tie-breakers.
5. Draw necessary foreground occluders and selected fixture layers.
6. Apply the tested scene-lighting composition without covering UI.
7. Draw world markers and then screen-space HUD/dialogue/overlays as appropriate.

This is a responsibility outline, not an instruction to reorder the existing multiply/additive passes blindly. Preserve their effect while extracting boundaries, then adjust intentionally with comparison captures.

Sort using world contact depth and stable IDs. Do not sort using the top of a sprite cell or variable antler height. Split long counters, benches or high gantries where one depth value cannot express actors moving around both sides. Test approach from every accessible side, chair behind/in front of tables, actor near a bar corner and crossing actors at the same y.

Art direction: narrower staggered floorboards; shallow furniture fronts appropriate to the high camera; refined bottle/tap construction; burgundy cushions; dark walnut frames; brass details; green lamps. Keep primary routes less noisy than perimeter clusters. If removing large station labels, replace their affordance with recognizable station construction and minimal readable indicators, not unexplained identical counters.

## 10. Character production and directional animation

Start with Doe and hunter in the same actual room view. Lock camera, contour weight, body scale and foot/contact anchor before expanding frames. Overhead means crown and shoulder tops, foreshortened torsos and limited face visibility. The generated studies still need consistency work. Do not create full frontal bodies and merely rotate them on the floor.

Identity rules: Doe retains antler hood, small ears, glasses, beard and brown/cream costume. Hunter retains orange trapper cap, glasses, beard, plaid, vest, olive trousers and boots. Canonical hunter keeps the slung gun even though the clean overhead camera study omits it. Add it after the body projection is established, on a consistent anatomical side.

Initial directional set: down, right, up, left. Use existing movement/facing semantics where available. If none exist, choose facing from the dominant nonzero movement component, retain last facing when stopped, and add a small tie/dead-zone rule to prevent diagonal flicker. This changes visual facing only. Do not alter movement vectors or normalize input differently to drive art.

Do not automatically mirror carry or gun views: that swaps handedness. Author asymmetric directions or use verified attachment transforms with occlusion. For directional states not yet authored, use a documented coherent fallback rather than pretend the actor has the full set.

Base inventory from ART-PLAN: Doe 13 frames (2 idle, 4 walk, 2 carry idle, 4 carry walk, 1 hit); hunter 10 (2 idle, 4 walk, 2 look around, 2 drink). Those are original state counts, not an agreed per-direction total. During discovery, record which states need multiple directions in the actual game. A four-direction expansion may require more artwork; do not silently claim 13 frames cover every angle.

Use time/distance-driven visual animation consistent with the existing loop. Walking should not depend on how many render calls happen. When stationary, stop stepping. Tie foot contact and arm/mug motion to the same authored frame. Define behavior for pause, hit-stop, caught, tally and hidden-tab resume from existing simulation semantics; clamp visual catch-up rather than advancing through hundreds of missed frames.

Preserve all other actor families: Nazim, Sam, Gerald, six patron appearances, waiter/Jay if that identity exists, and ghost. Verify current naming. Retain Nazim's drunk/lean/slump stages, water/sobering and any palette-stage behavior in the handoff. A new static raster must not erase state-dependent identity. Provide variants or a carefully tested material-mask/palette mechanism as needed; avoid opaque whole-sprite tint that changes eyes, beer and skin indiscriminately.

Convert order/drink icons and carrying attachments too. Upgrading only Doe and hunter while leaving the rest at mismatched camera/detail density does not satisfy ARC-12.

## 11. Reactions and effects without rule changes

Use `REACTIONS-AND-ANIMATION.md` for pose intent. Find authoritative outcomes in code before connecting them. The handoff reports hit-stop, spills, hunter/ghost reactions, shift events and centralized tip changes, but verify their present names and behavior.

Create a thin presentation event seam at the point an outcome is committed, not by guessing from repeated renderer observations. An event should have stable event/session identity, type, actor/order reference where relevant, simulation time and an immutable minimal payload. Consume it once for cosmetic feedback. Bound and clear the queue so old events cannot replay after restart.

Possible mappings: accepted delivery to brief success; an existing exceptional-service result to a stronger success accent; spill event to spill feedback; actual hit to recoil; hunter state transition to scan/spotted/chase/miss; existing drink outcome to appreciation if appropriate. If perfect service or hunter damage does not exist, retain the artwork as optional and use existing success/stun semantics. No new score thresholds, invulnerability, knockback, fatigue or hunter rewards are introduced here.

Pose priority: terminal/caught state and actual hit response outrank optional celebration. Required interaction animation may outrank locomotion according to the existing input rules. Expressions should usually decorate current locomotion rather than locking it. A reaction ending returns to the actor's current state, not a stale remembered idle state.

Avoid double hit-stop or duplicate camera shake. Existing mechanics must be reused, not stacked because the new artwork has impact frames. Distinguish visual recoil offset from real world position. Effects inherit their own bounded lifetime and attachment coordinates, not permanent entity mutations.

Overhead acting emphasizes shoulders, arm reach, head direction, body compression and short readable motion. Tiny facial details are secondary. Keep the success pint upright, preserve anatomical carrying side, and use a separate spill effect if that fits the renderer. Honor reduced-motion preferences by suppressing nonessential shake/pulse while retaining clear state feedback. Do not remove information when reducing motion.

## 12. Lighting and ambient animation

Separate material shading from light contribution. Base wood can have form shading and small specular detail; repeated floor tiles should not carry large fixed lamp pools. Dynamic lights draw those pools at actual lamp locations. Do not add strong engine glow on top of the already-bloomed concept PNG.

Start with three controlled contributions: readable ambient floor/scene value, localized warm light masks, and sparse emissive details/reflections. Preserve cool windows as a localized accent. Keep HUD and order symbols readable independently of scene darkness.

Use cached radial/masked sources or the existing efficient implementation rather than allocating new gradients and canvases for every lamp every frame. Cull lights with their full influence radius, not just source point. Bound particles and reuse storage where measurement justifies it. Animated fireplace/window rain/pendants are polish after core readability works.

Reset composite mode, alpha, transforms, filters and smoothing at defined boundaries; use balanced save/restore around local changes. A missing restore must not darken every order ticket. Provide development toggles for base art, lighting, UI, anchors, colliders and depth labels to isolate defects.

Lighting acceptance: Doe, hunter, spills, order state and route edges remain understandable in the darkest playable area; pools do not bleach faces or glass; light motion does not simulate an important gameplay warning unless intended; no double-lit repeated floor highlights.

## 13. HUD, order markers, dialogue and input shell

Inventory existing information first: shift, current tips/target, total, timer/last call, health/pints or equivalent, order item, patience, carried status, dialogue, start/help, caught/tally, restart, mute/fullscreen and touch controls. Preserve real state names and controls. The concept image's simplified HUD is not permission to drop the timer or total.

Use the same material language with restrained texture: dark walnut plates, readable parchment text areas, brass edge accents, burgundy warnings and amber highlights. Avoid heavy grain behind text. Keep the playfield dominant. Rework actual information hierarchy rather than only changing frame colors.

Order markers use a compact resting state and a clearly readable urgent/carried state. Anchor to the actor/table interaction context with candidate placements; clamp to camera bounds and reserve HUD/touch safe regions. Resolve overlapping markers by priority and stable placement, not random jitter. Test the topmost seated customer, clustered orders, offscreen actors and a patron behind a tall object.

Dialogue must not cover the player, active service point or critical order marker where a viable alternate placement exists. Bound width and line count with readable wrapping. Handle long names and messages. If collision cannot be avoided, use a deliberate fallback placement rather than clipping text.

UI coordinates are separate from world camera coordinates. Draw HUD after scene transforms/lighting are reset. Preserve the existing keyboard/touch command funnel. Use actual button elements where the DOM shell already supports them, visible focus, descriptive labels and adequate touch target areas. Avoid making the decorative wood plate itself the only hit target.

Test desktop, narrow portrait, landscape touch, browser zoom and fullscreen. Place touch controls within safe available space without blocking interactions. Keep help and muted sound states legible; do not communicate urgency by hue alone. Reduce scanline/noise strength so final art and text remain clear.

## 14. Performance and lifecycle targets

Record hardware, browser, viewport, art scale, actor/light count, scenario duration and measurement method before comparing results. Frame time includes simulation and rendering; measure render cost separately where practical. CPU emulation is diagnostic and must not be described as testing a physical phone.

Initial engineering budgets proposed by this plan: target steady 60Hz on the baseline development desktop with median full-frame work at or below 16.7ms; on the selected constrained/mobile target, record whether 60Hz or a stable 30Hz tier is intended, with a 33.3ms frame-work budget for the latter. Investigate p95 regressions greater than 20% versus the same baseline scenario even when averages look acceptable. These are proposed project targets, not measured achievements or guarantees across all devices.

Use a warm-up followed by a reproducible 60-second busy scene. Separate load/decode from steady-state timing. Inspect repeated restart/resize cycles for increasing listeners, canvases, registry entries, active effects or retained image objects. There must not be monotonic growth in those counted resources after stabilization.

Cull by visual bounds including antlers, props and light radius. Keep static caches reusable. Load only runtime art, not the entire reference ZIP. Profile before adding workers, WebGL or complex chunk streaming. Provide a lower-effects tier if required, preserving essential state cues and geometry.

## 15. Delivery phases and concrete exit evidence

| Phase | Work | Required evidence before moving on |
| --- | --- | --- |
| P0 | Discovery and baseline | Verified repository map, scale table, behavior/UI inventory, baseline captures/tests |
| P1 | Render boundary and metrics | Old visual path still works; world/pointer mapping tests pass; no gameplay changes |
| P2 | Loader and validation | Valid fixture renders; missing/invalid fixture falls back; schema and lifecycle tests pass |
| P3 | One-area visual proof | Clean overhead Doe/hunter plus floor, counter, table and chair in actual game; comparable captures |
| P4 | Room and full cast rollout | Station/table IDs preserved; all required asset families tracked; traversal/occlusion checks |
| P5 | Reactions and lighting | Actual event mappings, interruption checks, readable light/dark/busy captures |
| P6 | UI and responsive shell | Required information retained; desktop/portrait/touch/long-dialogue captures |
| P7 | Integration and delivery | Full regression, performance evidence, asset coverage, documented remaining gaps and reviewable build |

Phases are implementation checkpoints, not requests for permission at every step. The user has asked for the overhaul direction to be carried forward. Continue unblocked work, make reversible choices and record them. Ask only when a genuinely consequential decision cannot be resolved from the repository and current brief. Do not claim user approval of a specific asset or build that has not been reviewed.

P3 is the key artistic checkpoint. If the actual scene still looks like the old game with new colors, refine silhouette, material scale, projection and furnishing depth before duplicating that treatment across the world. Meanwhile, other unblocked integration work may continue. Missing final art is a visual completion blocker, not a reason to abandon loader, fallback or testing work.

Use focused reversible commits/checkpoints consistent with repository instructions. Suggested units: baseline/diagnostics; render adapter/metrics; loader/contracts; proof assets; room/cast batches; reactions/light; UI; final integration. Avoid mixing an unrelated pathfinding rewrite into an art commit. If a newly exposed functional defect must be fixed, isolate and test it.

## 16. Verification matrix

| Area | Cases | Failure to catch |
| --- | --- | --- |
| Units | A=1/A=2 fixture, camera offset, CSS scale, DPR, portrait | Doubled sprite/world size or wrong input mapping |
| Loader | Missing PNG/JSON, bad rect, bad pivot/duration, decode fail, stale load | Crash, endless loading or wrong family swap |
| Animation | Idle/walk/carry, diagonal direction tie, pause/restart, hit interruption | Foot sliding, hand swap, flicker or stuck pose |
| Gameplay | All existing customer routes, stations, serving ranges, hunter/catch, spills | Changed collision, reward or movement behavior |
| Regulars | Nazim stages/wander/water, Sam/Gerald, round behavior if present | Lost state art or side effects |
| Other actors | Patrons, waiter visit/spray, ghost/hunter interaction if present | Missing family, wrong alpha or lost event |
| Depth | Every accessible furniture side, corners, same-y crossings | Actor hidden incorrectly or sorting flicker |
| UI | Busy markers, top edge, long dialogue, carried/urgent states | Occlusion, clipped text or missing timer/status |
| Lifecycle | Repeated restart, resize, orientation, fullscreen, hidden-tab resume | Duplicate events/listeners, stale state or huge catch-up |
| Performance | Warm busy scene, representative desktop/mobile target | Unbounded effects/caches or frame-time regression |
| Assets | Dimensions, frame IDs, palette, alpha, anchor consistency, tile seams | False claims that references are finished art |

Extend existing tests where they exercise real behavior. Do not invent a new test framework or broad dependency stack without need. The historical smoke command is `node tests/smoke.js`; verify it exists before using it. Add focused unit fixtures for math, metadata, event consumption and depth ties. Keep full browser checks for canvas behavior, rendering, UI and input.

Freeze scenario state for meaningful before/after screenshots. Compare at native play scale plus enlarged detail crops. Report camera, actor positions, scenario, art scale and viewport alongside captures. Different random scenes cannot substantiate a precise regression claim.

## 17. Definition of done

The overhaul is complete only when all P0 requirements have evidence, all required scene/cast/UI families use the intended overhead treatment, and the real gameplay captures demonstrate the material/projection upgrade without changing core behavior. P1 supported reactions are integrated; unsupported concepts are clearly deferred. P2 remains optional.

There are no new console errors, broken required runtime assets, stuck loading screens, unintended input locks or unexplained test regressions. Performance is measured against the declared target, not inferred from a still screenshot. Fallback paths remain tested for optional assets. Source art/provenance and export metadata are retained where actually available.

Deliver: changed-file summary; how to run; tests and captures with actual results; measured performance context; asset coverage; known visual differences; repository checkpoint; and a precise next action if art or access remains blocked. Update project docs and HANDOFF to reflect implemented state. Never describe proposed modules as already implemented.

Publishing is separate from local completion. Inspect applicable repository instructions and the user's authorization before pushing, deploying or merging. Historical HANDOFF text about old PRs and deployments does not itself authorize a new production release. Keep a draft review artifact where appropriate; do not invent preview URLs.

## 18. Open issues and safe defaults

| ID | Unknown | Safe default until verified |
| --- | --- | --- |
| OI-01 | Current script/module architecture | Preserve the existing loading style; add only needed boundaries |
| OI-02 | Actual units, camera, scale and DPR | Document before editing; preserve simulation units |
| OI-03 | Production pixel-art capability and source files | Treat supplied PNGs as reference; continue fallback/integration work honestly |
| OI-04 | Existing service-quality/hunter event contracts | Bind only verified outcomes; no new mechanics |
| OI-05 | Real full-room architectural plan | Use actual code geometry; screenshot only guides visible relationships |
| OI-06 | Target hardware and achievable art budget | Measure baseline, use stated provisional budgets, report limits |
| OI-07 | Required facing directions | Four-cardinal first pass where needed; preserve movement semantics |
| OI-08 | Final overhead footprint and art dimensions | Test a native-size proof; do not force old tall silhouette proportions |
| OI-09 | Existing custom loader versus Aseprite JSON | Inspect and normalize in one adapter; do not assume direct compatibility |

These unknowns are discovery tasks, not reasons to stop at planning. Escalate only a blocker that truly needs a user decision; otherwise choose the smallest reversible implementation and document it.
