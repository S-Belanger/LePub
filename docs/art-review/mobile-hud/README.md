# Mobile score strip and cigarette help review

The portrait scorecard has its own fixed walnut/brass strip above the pub.
Sam, Gerald and Nazim no longer share their bodies' screen space with it.
World positions, colliders, sprite assets and cigarette mechanics are unchanged.
Desktop retains its corner sign and overlap fade. The mobile scene scrolls in
the remaining space; its header stays fixed when temporary status bars appear.

## Evidence

- [Current mobile gameplay](full-cast/mobile-gameplay.png) and
  [desktop gameplay](full-cast/desktop-gameplay.png), also linked from the README.
- [Small-phone status layout](hud-320x568.png),
  [scrollable help](help-320x568.png),
  [cellar](cellar-375x667.png).
- [Four-phone measurements](hud-report.json) and
  [broad cast/runtime report](full-cast/report.json).
- [Exact requests, decisions, checks and publication journal](../../collaboration/2026-10-06-mobile-hud-help.md).

## Checks performed

`node tests/hud.js` first failed the existing booth overlap, then passed after
the fix: four portrait sizes, fixed status/camera geometry, bottom-of-pub player
visibility, rotation preserving world coordinates and reset. All six Node suites
passed. The smoke suite also verifies existing pack/drop/smoke routes and reset.

`node tools/validate-hud.js docs/art-review/mobile-hud` passed in headless Edge
with true mobile/touch emulation at390×844,375×667,360×780,320×568. It measures
loaded illustrated bodies, HUD/text clearance, DOM toolbar separation, temporary
statuses, help text/scroll/start, rotation, cellar and reduced motion. Inspected
mobile/desktop gameplay, small-phone active statuses/help and cellar captures.

`node tools/validate-art.js docs/art-review/mobile-hud/full-cast` passed on
1280×720 desktop and390×844 mobile:12 families/160 direction-animation entries,
regular poses, keyboard/touch motion, orientation, gallery and missing-sheet
fallback. No normal browser page/console/network errors. Timings in the report
measure CPU render submission; they do not prove phone hardware performance.

These are controlled fixtures using real production code and images. Node uses
a mocked DOM/canvas, and browser capture is emulation. No physical phone or
live deployment claim follows from these checks. Original Nick review evidence
remains under its original folder.
