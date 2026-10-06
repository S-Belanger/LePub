# Nick illustrated review — October 6, 2026

Nick now uses a dedicated illustrated source/atlas in the production manifest,
with the shipped Jay/Alex finish, photo-informed face/beard, backward cap and
established baseball uniform. See [the exact prompts and measured seams](../../../assets/sprites/nick-prompt.md).

## Look at the result

- [Comparison and all sixteen poses](preview.png): actual imported frames,
  Nick beside Jay/Alex at 2x inspection scale; the four-direction pose grid
  uses native desktop size. No independent special-pose scaling.
- [Desktop in the pub](desktop-sorry.png), [phone in the pub](mobile-sorry.png).
- Idle views: [desktop](desktop-idle.png), [phone](mobile-idle.png).
- `detail-*.png`: enlarged gallery views of all four directions with idle,
  walking and apology. Both authored strides also appear on the comparison board.
- Live animation: run `node tools/serve.js`, then open
  <http://127.0.0.1:8917/tools/art-review.html#nick> and select `walk` or `sorry`.

## Verified

`node tools/validate-nick.js docs/art-review/nick` PASS in real local Edge,
1280x720 desktop and 390x844 phone/touch emulation. [Focused report](report.json):
real routed entry, all direction/pose mappings, actual fart → illustrated
apology → idle, unchanged 14x17 hitbox, restart cleanup, deliberate missing-Nick
image fallback retaining Jay and Nick gameplay. Zero normal browser errors.

`node tools/validate-art.js docs/art-review/nick/full-cast` PASS:
12 loaded atlases, 160 directional animation mappings per viewport, regular
poses, keyboard/touch motion, rotation preserving positions, and missing-Doe
fallback. [Broad report](full-cast/report.json). Timings are CPU submission
only; they do not prove GPU frame pacing or physical-phone performance.

`node tests/character-art.js` PASS11 gameplay kinds/12 families/5 guards;
`node tests/assets.js` PASS31; `node tests/smoke.js` PASS10 scripts/40 routes;
`node tests/alex.js` PASS13 gates/full lifecycle;
`node tests/cellar.js` PASSfull lifecycle. The committed baseline had a stale
Alex reset-delay assertion (60–90 instead of its current 15–25 seconds),
reproduced from exact Git HEAD and corrected in the test only. Gameplay timing
is unchanged by this art pass. Nick importer PASS16 alpha/edge-checked cells,
density13.10, 21-world-unit maximum idle crop height.

## Visual review and limits

Inspected the full source, measured boundaries, comparison board, desktop/phone
room captures and enlarged gallery views. The cap crown, ginger beard,
burgundy jersey, cream trousers and raised palm remain readable in the room.
Fine likeness/finger details reduce at native phone size. Generated rows have
uneven spacing; measured transparent-gutter seams preserve every figure without
changing source pixels. Art is reviewed AI illustration, not hand-cleaned work.

This evidence is local Edge/emulation, with deterministic staging for captures.
No physical-device, remote CI, hosted preview or production verification was
performed. See the newest `HANDOFF.md` checkpoint for exact Git/publication state.
