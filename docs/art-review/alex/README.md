# Alex and character-system review — September 23, 2026

Reproduce: `node tools/validate-alex.js docs/art-review/alex`.
These are actual Edge screenshots at 1280x720 desktop and 390x844 mobile
emulation. The scene is staged in the existing pub to compare Alex with Doe,
Hunter and Jay. Screenshot fixtures do not alter the shipped gameplay.

- `desktop-idle.png` / `mobile-idle.png`: standing Alex beside the cast.
- `desktop-split.png` / `mobile-split.png`: real `updateAlex` split transition,
  illustrated down-facing pose, unobstructed in the aisle.
- `desktop-leaving.png` / `mobile-leaving.png`: standing and walking away.
- `desktop-mace-ready.png` / `mobile-mace-ready.png`: carrying the macebell,
  with the preparation area marked before it blocks anyone.
- `*-mace-left.png`, `*-mace-behind.png`, `*-mace-front.png`: three actual
  illustrated phases of the swing, with the 28x14 workout area marked below.
- `report.json`: source alpha/edge measurements and actual lifecycle results.

PASS: 16 split-source and 24 mace-source cells have transparency and no opaque boundary pixels; all
four walk directions resolve; split art width 24.39 world units surrounds the
unchanged 22x7 collider; body stays 14x17; blocker removed on standing; missing
Alex PNG still permits procedural split and other illustrated cast. Zero
normal browser errors. Desktop/mobile captures visually inspected.

The final browser run also verifies all mace carrying directions and reduced
motion: the swing pose stays static while its temporary blocker still works.

Full cast `node tools/validate-art.js` also passed: eleven atlases, 148 pose
mappings per viewport, gallery, controls, resizing and missing-Doe fallback.
Source detail and overhead appearance match the illustrated cast. Tests do
not constitute physical-phone performance testing or final user art approval.
Unused side-split anatomy limits are recorded in
[the source prompt notes](../../../assets/sprites/alex-prompt.md).
