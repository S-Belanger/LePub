# Fred overhead concept

A hand-authored SVG concept for a proposed new cast member, Fred. It is a
likeness and costume guide, not production art. Nothing in the game loads
these files, and no family is declared in `src/character-art.js`.

- `fred-concept.html` is the source. Open it directly or serve the repo. It
  shows idle in all four directions and a playing-size row, with the shipped
  Jay and Alex sheets alongside for reference.
- `fred-concept.png` is the rendered snapshot.

Likeness: faded slate-blue ball cap with a small white front mark, short
brown hair at the sides, a full brown beard, a broad squinting grin, a white
tee with a small pink/teal/yellow print on his left chest, charcoal shorts,
bare lower legs, navy sneakers and a small tattoo on his left forearm. The
tattoo is re-painted for each direction rather than mirrored.

Finish follows `docs/VISUAL-SYSTEM.md`: stout proportions with the head at
about half the height, one warm dark silhouette contour, a top-left light
and fine grain. Vector fills are still smoother than the painted finish of
Jay and Alex. A production atlas must be authored like Alex's (see
`assets/sprites/alex-likeness.md`), then imported with
`node tools/import-illustrated.js`. The user-supplied portrait stays outside
the public asset tree.
