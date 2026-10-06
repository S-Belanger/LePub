# 2026-10-06 — Mobile scorecard visibility and cigarette-pack help

[Changelog](../../CHANGELOG.md) · [Previous README session](2026-10-06-readme-refresh.md) · [Handoff](../../HANDOFF.md)

## Contributors and starting state

- User supplies mobile screenshot, reports booth obstruction, asks about packs.
- Codex investigates/fixes UI and player documentation; no raster generation.
- America/Toronto. Main starts at ec3b8796983109a3d6ed41f49fa76ed6d25bb429,
  independently verified origin/main. Preserve two pending README publication
  receipt docs (HANDOFF/README journal) and complete those receipts in this work.
- Existing authorization to implement/publish main work and maintain shared logs
  continues. Scope now includes mobile HUD/help, regression/browser checks,
  updated README captures/instructions and publication evidence.

## Conversation and action journal

### User report — exact text

> On another note[Image #1], on mobile the score card is blocking the patrons on the top left corner of the bar

Input image matches the [existing mobile gameplay review](../art-review/nick/full-cast/mobile-gameplay.png).

### Assistant progress — exact text

> I see it—the mobile scorecard covers the corner-booth patrons. I’ll check the HUD layout and give it a compact mobile layout in the same pub style, then verify the booth stays visible and refresh the README screenshots. The README update is already published; I’ll include its publication receipt in the logs.

### User clarification — exact text

> You also don't explain what a cigarette pack does when you drop it anywhere (also maybe in game. Are there instructions at least)?

### Assistant answer — exact text

> Dropping a pack puts it at your feet. If the hunter walks close enough to it, he stops chasing, exits the pub, takes a 15-second smoke break outside, then returns. You earn a pack every five deliveries and can hold three; untouched packs expire after 25 seconds.
>
> The in-game help lists the drop key but doesn’t explain that effect. I’ll add the explanation to both the help panel and README while fixing the mobile scorecard.

### 13:05–13:10 — investigation and reproduction

- Read current viewport/camera/HUD/draw/bubble/plate rendering and cigarette
  acquisition/drop/nearby pickup/exit/outside/return logic. Existing checks use
  tests/smoke.js's createRuntime harness; two guessed standalone harness paths
  did not exist, so switched to the actual exported harness after file inventory.
- Real Edge390x844: logical195x360/scale2, HUD{x:3,y:0,w:84,h:35}, camera0/0.
  Sam head19.16/feet40 and Gerald head19.17/feet40 overlap the sign. Fade already
  detects bodies and settles to0.35 but still paints layered board/text on them.
  Snapshot fixture's first frame is more opaque; lowering alpha is insufficient
  to provide an unobstructed booth. Saved temporary before capture.
- Root cause: mobile shares the desktop top-left overlay footprint; there is
  no reserved play area. Use a fixed compact portrait strip above the scene,
  corresponding camera/clipping space and unchanged world/collision/input sizes.
  Keep desktop board/fade and mobile/desktop walnut/brass/pints/bitmap typography.
- Source confirms packs awarded every5 deliveries (reserve3), dropped at player
  feet, pickup only when active hunter passes within8 world units,25s TTL and
 15s outside smoking timer after routed exit. No distant attraction or automatic
  dispatch just from dropping. Explain effect/earning/placement in help/README.
- Assistant progress, exact text:

> I reproduced the overlap: the mobile sign covers Sam and Gerald even after its existing fade settles. I’ll reserve a compact strip for the scorecard above the play area, keeping the walnut board and brass details, so the HUD and patrons no longer share that space.
>
> I also verified the cigarette behavior: dropping a pack doesn’t attract the hunter from across the room; he has to pass near it. The new instructions will make that clear.

### Regression-first decision — exact assistant text

> I’m using the test-driven-development skill to add a regression check for booth visibility before changing the layout.

- Apply systematic-debugging/test-driven-development workflow: real reproduction,
  meaningful failing visibility regression, minimal layout fix, full required
  Node and actual desktop/mobile/rotation/status/cellar checks, inspect captures.
- No production code changed yet. README update is already published/CI-green;
  current pending changes are logs of receipts/new requests. Regression next.

## Checks and publication

At record creation: reproduction measured above; regression/fix not yet run,
all changes pending local. Append exact outcomes and publication receipt later.

### 13:19 — regression RED before implementation

`node tests/hud.js` fails exit1 for 390x844 booth overlap, confirming the actual
runtime bug before production edits. The fixture uses fallback art in Node;
actual illustrated bodies were separately measured in Edge. Reserve the toolbar
band without lowering the existing integer art scale on short phones.

Assistant progress, exact text:

> The regression test now reproduces the obstruction. I’m adding a reserved mobile score strip and clearer cigarette instructions, then checking small screens, rotation, and the live game layout.

### 13:23 — implementation and Node GREEN

- Implemented compact fixed portrait board, reserved toolbar/play area, camera
  offset and world clipping. Kept original integer pixel scale and desktop
  material/content/fade. Extracted common pint/clock/status renderers unchanged.
- Added help paragraph/drop button label and README section covering earning,
  reserve, placement, nearby pickup, exit/outside15s/return, untouched25s expiry.
  Cigarette behavior and illustrated sprite files untouched.
- HUD test GREEN. Short-phone fixtures stand nearer booth to keep it in camera;
  reported390x844 retains62,164. Node fallback art regression and real browser
  illustrated art checks remain distinct. Canvas clipping mocks added; CI HUD.
- Fresh six suites PASS: character-art11/12/5guards, assets31, smoke10scripts/40
  routes/full cases, Alex13gates/lifecycle, cellar lifecycle, HUD4sizes/status/
  rotation/reset. game syntax/diff PASS. Actual browser verification next.

### 13:23 — actual browser and visual acceptance

- Focused `node tools/validate-hud.js docs/art-review/mobile-hud` PASS on actual
  Edge mobile/touch390x844,375x667,360x780,320x568: loaded illustrated booth
  bodies clear sign, all labels/statuses fit, toolbar separated, stable status
  geometry, help paragraph readable/scrollable/start reachable, rotation keeps
  position/desktop sign, cellar/reduced motion/error-free render.
- Broad `node tools/validate-art.js docs/art-review/mobile-hud/full-cast` PASS:
  12 production families/160 directional animations, desktop1280x720/mobile
  390x844, regular poses, keyboard/touch motion, rotation, gallery, forced
  missing-sheet fallback; zero normal page/console/network errors. Performance
  figures are CPU submission only, not phone hardware guarantees.
- Inspected current mobile/desktop gameplay,320x568 statuses/help and375x667
  cellar images. Booth patrons unobstructed; original art/materials retained.
  New review README reports evidence/limits. Main README uses new gameplay
  photos and explains packets; six CI checks propagated to Claude review docs.
- Added bottom-of-pub camera visibility regression: HUD PASS again. Only format
  cleanup since broad browser pass. Six suites passed as previously recorded.
- Logging correction:13:19 CRLF-specific HANDOFF insertion didn't match the
  mixed-newline header; subsequent checkpoints retain RED evidence. No code
  changed before the failing regression. Exact journal/milestones retained.

Assistant progress, exact text:

> The mobile layout and help text are in place, and all six Node suites pass. The desktop/mobile browser checks also pass with all 12 sprite families loaded. I’m now inspecting the booth and help panel on smaller phones before updating the README photos.

### 13:24 — stronger reduced-motion assertion corrected harness

- Strengthened real-browser checks to assert all production atlases ready and
  `prefersReducedMotion` actually active, plus opaque reserved header.
- First stronger run failed that assertion: game reads media preference once at
  startup, so switching emulation after load didn't activate its reduced-motion
  path. This was a test setup issue, not a HUD failure. Earlier label claiming
  reduced-motion coverage was too broad; it only checked render after media
  switch. Corrected validator to reload under reduce before assertion.
- A patch using a guessed README command string was rejected atomically with
  no changes; read actual lines and patched correct command.

### 13:25 — publication-ready validation

Strengthened HUD browser rerun PASS under true startup reduced motion and all
atlases ready on each of four phones. Syntax/diff PASS; nine changed Markdown
files/73 resolving local references/balanced fences PASS before adding the
visual-system review link (which resolves). Propagated portrait clearance rule
to VISUAL-SYSTEM. New evidence26 files/3.44MB; source sprites unchanged. Staging
only reviewed known paths, then authorized direct-main publication.

Assistant progress, exact text:

> The booth stays clear on all four phone sizes, and the cigarette explanation is readable in the scrollable help panel. The README now has fresh gameplay photos. I’m finishing the publication checks and recording the results before pushing to main.
