# Alex portrait likeness review — September 25, 2026

The supplied portrait was used as a private likeness reference for Alex's
split sprite sheet. The portrait itself is outside the repository. The final
source was visually inspected at original resolution: all visible faces show
swept brown hair, a full brown beard, a broad smile and no glasses. The teal
workout outfit and full split are intact. The accepted spacing edit keeps all
16 figures within their transparent cells; the importer measured new pivots
and density.

Real Edge browser captures in this directory show desktop 1280×720 and touch
mobile 390×844. Inspected `desktop-idle.png`, `desktop-split.png` and their
mobile equivalents at native size. The new face is evident in desktop gameplay.
On mobile, Alex's hair/beard and split silhouette remain readable, while
tooth/eye detail is necessarily reduced. The split stays centered on its
marked workout area and clear of nearby people and furniture.

`report.json` records `node tools/validate-alex.js` passing for both viewports:
16 transparent cells, all four walking facings, split animation/blocker,
missing-sheet fallback, reduced-motion split behavior and zero
page errors. `full-cast/report.json` records `node tools/validate-art.js` passing
all 10 atlases and 136 pose mappings per viewport, input/rotation/fallback,
with zero page errors. CPU numbers there are browser render-submission timing,
not physical-device performance. The historical unused side-facing split
anatomy limitation remains; gameplay uses the down-facing split.
