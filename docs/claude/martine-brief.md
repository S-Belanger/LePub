# Martine (manager) — art brief

Filled from [the character brief template](templates/CHARACTER-BRIEF.md).
Status: **illustrated atlas integrated locally (2026-10-14); walk B needs a correction pass.**
Everything below about "art debt" is historical: her `proceduralExceptions` entry was removed
and she is a contracted family. See [martine-prompt.md](../../assets/sprites/martine-prompt.md).

## Task and scope

- Display name: Martine. Family key: `martine`. New gameplay kind `martine`.
- Exact user request (2026-10-14): "Could we add Martine to the pub. She is the
  manager (the woman on the left on the picture)". A photo was attached in chat.
- Behaviour authorised and shipped: manager walk-on (see `game.js`, Martine block).
- Publication scope: none requested; local only.
- Why art is pending: this session had no raster image generator, so no
  illustrated atlas could be produced. `src/character-art.js` lists her under
  `proceduralExceptions` as explicit art debt. When the atlas exists, move her
  to `families` via `person('Martine', 'martine', 'talk')` and remove the
  exception, otherwise `tests/character-art.js` will flag the stale exception.

## Identity (from the user-supplied photo; likeness only)

- Photo stays **outside the repo** (it was supplied in chat; no copy was made
  under `assets/`). Do not commit it.
- Hair: short, silver-lilac grey, cropped sides, straight fringe across the forehead.
- Skin: light, slightly flushed. Face broad, relaxed, small closed-mouth smile.
- No glasses, no beard. Dark eyebrows and eyes.
- Costume to draw (from the photo): dark charcoal zip-neck long-sleeve running
  top with a high collar. Trousers/shoes are not visible: use dark trousers and
  dark shoes (matches the fallback palette `MARTINE_PALETTE` in `src/sprites.js`).
- Do not copy the background, runners' bibs or the other woman's headband/vest.

## Pose and scale contract

- Directions down/right/up/left; rows `idle`, `walkA`, `walkB`, `special`
  (`talk`, which game code does not currently select; keep a relaxed arms-folded
  or clipboard-holding stance). Supporting-person idle height 21 world units.
- Head/gaze: relaxed, looking along the floor in each cardinal heading under the
  fixed overhead camera (Nick B standard), crown visible, face foreshortened.
- Collision box stays 14x17 (`ENTITY_HITBOXES.martine`).

## Next step

Use the paste-ready flow in [03-PROMPTS.md](03-PROMPTS.md) with this brief,
the private photo, Jay, approved Nick B and the shipped Alex/Nick sheets as
references; import with `tools/import-illustrated.js`; wire the contract and manifest.
