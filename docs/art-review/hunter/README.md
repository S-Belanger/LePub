# Hunter likeness review — September 23, 2026

The supplied portrait replaces the earlier generic capped/bearded identity.
The source now shows swept brown hair, a high forehead, wider black rectangular
glasses, fuller cheeks and light grey chin/jaw stubble. The hunting clothes,
equipment, overhead view, directional poses and gameplay remain consistent.

- `desktop.png`: actual room at 1280×720; hunter faces down beside the bar.
- `mobile.png`: actual room at 390×844 with touch controls; same front view.
- `report.json`: `node tools/validate-art.js` output, all 11 atlases ready,
  148 pose mappings per viewport, movement/rotation/fallback, no browser errors.

Both captures were visually inspected at native size. Hair and glasses read
clearly on desktop; fine stubble is naturally less visible at phone size.
The full 16-frame source was also inspected against the supplied photograph
and shipped cast. This is a stylized likeness, not a photographic reproduction.
Source import passed real alpha and cell-edge checks at density 10.71, with a
maximum idle height of 24 world units. No runtime or collision changes.

See [exact prompt and provenance](../../../assets/sprites/hunter-prompt.md).
