# Selected art direction

`warm-overhead-pub-reference.png` is the primary environment reference.

Translate its visual language into the game rather than copying its camera:

- keep the current straight-overhead view and generous, readable walk lanes;
- match its authored pixel density and chunky, illustrated silhouettes—not
  only its color palette;
- use narrow dark-walnut boards, deep beveled wood, burgundy upholstery,
  amber lamps, rainy blue windows, patterned rugs, plants, and dense edge
  clutter;
- give counters, tables, stools, chairs, benches, and walls visible depth,
  trim, legs/panels, grain, and contact shadows;
- populate surfaces with readable pints, bottles, glasses, plates, candles,
  menus, taps, and greenery rather than sparse abstract squares;
- keep the Doe, Hunter, regulars, waiter, customers, and order icons on the
  high-density sprite grid with distinct faces, clothing ramps, and props;
- keep the center of routes quieter than seating clusters and the bar;
- preserve gameplay geometry by keeping hitboxes separate from visual sprite
  dimensions;
- favor crisp authored pixels and stepped light over smooth filters.

`floor-plan.png` / `floor-plan.json` are the room as the game plays it,
rendered from the furniture data (see `docs/ART-PLAN.md` §2b).

## Status (2026-09-16)

The camera is now the high overhead of `overhead/gameplay-modernization-concept.png`
(see `../../docs/overhaul/00-CAMERA-DIRECTION.md`, which supersedes the
three-quarter wording below): the whole cast is generated overhead with four
directions and shipped as atlases in `../sprites/`; furniture, counter props
and pendants are drawn for that camera over the same colliders; night
lighting and the fireplace stay. Still to do: hand-cleaned production sheets
replacing the generated atlases file-for-file, rain on the windows, painted
floor/wall tiles in place of the procedural boards, and the second room.

## Acceptance check

A recolor of the old slab furniture and 1x sprites is not this direction. A
review frame should visibly demonstrate all of the following before the pass
is called complete:

1. fine floorboards and material texture at normal browser size;
2. furniture silhouettes that read as furniture even without color;
3. patrons with varied faces/hair/clothing and the Doe/Hunter immediately
   recognizable in a crowded frame;
4. warm local pools/reflections against a genuinely dark room base;
5. dense, intentional detail on room edges and tabletops while walk lanes stay
   clean;
6. HUD, dialogue, controls, and start overlay using the same walnut, parchment,
   burgundy, and brass material language.

`../cover.png` remains a secondary reference for the worn, playful PC-game
tone and the doe-versus-hunter character contrast. It is not a camera or room
layout reference.
