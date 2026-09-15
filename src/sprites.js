// ============================================================================
// Le Pub - sprite data
// Pure data plus the tiny authoring DSL. No canvas and no game state: this
// file is loaded before game.js and only defines sprite geometry and palettes.
// A sprite is { rows, w, h } where each row is a string of palette-key
// characters; drawSprite() in game.js is the single renderer for the format.
// ============================================================================

// ---- Small pixel-art sprite authoring helper --------------------------------
// R(char, count, char, count, ...) builds a row string from repeated runs.
// Row width is derived automatically (no need to hand-count characters).
function R(...parts) {
  let s = '';
  for (let i = 0; i < parts.length; i += 2) s += parts[i].repeat(parts[i + 1]);
  return s;
}

// ---- "Le Pub" cast: deer-onesie guy (antlers, glasses, beard) being
// stalked by a flannel-and-fedora hunter (glasses, shotgun). --------------

function buildSprite(rows) {
  const w = Math.max(...rows.map(r => r.length));
  const h = rows.length;
  return { rows, w, h };
}

// --- Doe: antler headband, blonde hair, glasses, beard, brown deer onesie
// with a cream chest patch. ------------------------------------------------
const DOE_PALETTE = {
  '.': null,
  i: '#24170f', // warm outline
  n: '#a9764f', // antler
  N: '#d3a26b', // antler catchlight
  f: '#f2e8da', // hood ear fluff
  h: '#c9a86a', // hair
  H: '#936f3f', // hair shade
  k: '#f0c090', // skin
  K: '#c9855e', // skin shade
  g: '#141414', // glasses
  e: '#5a4030', // beard
  d: '#6b4a30', // onesie
  D: '#49301f', // onesie shade
  c: '#e8ddc0', // chest patch
  C: '#c9b98f', // chest patch shade
  s: '#2a2018', // feet
};

const DOE_IDLE = buildSprite([
  R('.', 4, 'n', 1, 'N', 1, '.', 4, 'N', 1, 'n', 1, '.', 4),
  R('.', 3, 'n', 1, '.', 1, 'n', 1, '.', 4, 'n', 1, '.', 1, 'n', 1, '.', 3),
  R('.', 3, 'i', 1, 'f', 2, '.', 4, 'f', 2, 'i', 1, '.', 3),
  R('.', 3, 'i', 1, 'H', 2, 'h', 4, 'H', 2, 'i', 1, '.', 3),
  R('.', 2, 'i', 1, 'H', 1, 'k', 8, 'H', 1, 'i', 1, '.', 2),
  R('.', 3, 'i', 1, 'g', 3, 'k', 2, 'g', 3, 'i', 1, '.', 3),
  R('.', 3, 'i', 1, 'K', 1, 'k', 6, 'K', 1, 'i', 1, '.', 3),
  R('.', 3, 'i', 1, 'e', 8, 'i', 1, '.', 3),
  R('.', 4, 'i', 1, 'e', 6, 'i', 1, '.', 4),
  R('.', 2, 'i', 1, 'D', 2, 'd', 1, 'c', 4, 'd', 1, 'D', 2, 'i', 1, '.', 2),
  R('.', 1, 'i', 1, 'D', 3, 'd', 1, 'c', 4, 'd', 1, 'D', 3, 'i', 1, '.', 1),
  R('.', 1, 'i', 1, 'D', 2, 'd', 2, 'C', 4, 'd', 2, 'D', 2, 'i', 1, '.', 1),
  R('.', 2, 'i', 1, 'D', 2, 'd', 6, 'D', 2, 'i', 1, '.', 2),
  R('.', 3, 'i', 1, 'D', 2, 'd', 4, 'D', 2, 'i', 1, '.', 3),
  R('.', 4, 'D', 3, '.', 2, 'd', 3, '.', 4),
  R('.', 4, 'd', 3, '.', 2, 'D', 3, '.', 4),
  R('.', 4, 'D', 3, '.', 2, 'd', 3, '.', 4),
  R('.', 3, 's', 3, '.', 2, 's', 3, '.', 3),
]);

const DOE_WALK = buildSprite([
  ...DOE_IDLE.rows.slice(0, 14),
  R('.', 4, 'd', 3, '.', 2, 'd', 3, '.', 4),
  R('.', 3, 'd', 3, '.', 4, 'd', 3, '.', 3),
  R('.', 2, 'd', 3, '.', 6, 'd', 3, '.', 2),
  R('.', 1, 's', 3, '.', 8, 's', 3, '.', 1),
]);

// --- Hunter: fedora, glasses, red/black flannel, olive pants, and a
// shotgun barrel jutting out at shoulder height. ---------------------------
const HUNTER_PALETTE = {
  '.': null,
  i: '#171511', // warm outline
  o: '#5c5a3e', // fedora crown
  O: '#7d7750', // fedora highlight
  r: '#454330', // fedora brim
  k: '#f0c090', // skin
  K: '#c9845d', // skin shade
  g: '#141414', // glasses
  w: '#e8e4d8', // collar
  f: '#8a2020', // flannel red
  F: '#b53d32', // flannel highlight
  x: '#1c1c1c', // flannel black check
  p: '#4a4630', // pants
  P: '#666044', // pants highlight
  s: '#1a1512', // shoes
  u: '#3a2f22', // shotgun
  U: '#8d7552', // gun-metal catchlight
};

const HUNTER_IDLE = buildSprite([
  R('.', 4, 'r', 1, 'o', 6, 'O', 1, '.', 4),
  R('.', 2, 'i', 1, 'r', 10, 'i', 1, '.', 2),
  R('.', 4, 'i', 1, 'o', 6, 'i', 1, '.', 4),
  R('.', 4, 'K', 1, 'k', 6, 'K', 1, '.', 4),
  R('.', 4, 'g', 3, 'k', 2, 'g', 3, '.', 4), // round lenses + skin bridge, not a bar
  R('.', 4, 'K', 1, 'k', 6, 'K', 1, '.', 4),
  R('.', 4, 'i', 1, 'w', 6, 'i', 1, '.', 4),
  // Buffalo-check plaid runs the full torso (not just the shoulders), two
  // alternating 2x2 blocks per row so it reads as a checked flannel.
  R('.', 2, 'w', 2, 'F', 2, 'x', 2, 'f', 2, 'x', 2, 'w', 2, '.', 2, 'U', 1, 'u', 4),
  R('.', 2, 'w', 2, 'x', 2, 'f', 2, 'x', 2, 'F', 2, 'w', 2, '.', 2, 'U', 1, 'u', 4),
  R('.', 2, 'w', 2, 'f', 2, 'x', 2, 'F', 2, 'x', 2, 'w', 2, '.', 2),
  R('.', 2, 'i', 1, 'x', 8, 'i', 1, '.', 2),
  R('.', 3, 'i', 1, 'x', 8, 'i', 1, '.', 3),
  R('.', 3, 'P', 2, 'p', 6, 'P', 2, '.', 3),
  R('.', 4, 'P', 2, 'p', 4, 'P', 2, '.', 4),
  R('.', 4, 'P', 2, '.', 2, 'p', 2, '.', 4),
  R('.', 4, 'p', 2, '.', 2, 'P', 2, '.', 4),
  R('.', 4, 'p', 2, '.', 2, 'p', 2, '.', 4),
  R('.', 3, 's', 3, '.', 2, 's', 3, '.', 3),
]);

const HUNTER_WALK = buildSprite([
  ...HUNTER_IDLE.rows.slice(0, 14),
  R('.', 4, 'p', 2, '.', 2, 'p', 2, '.', 4),
  R('.', 3, 'p', 2, '.', 4, 'p', 2, '.', 3),
  R('.', 2, 'p', 2, '.', 6, 'p', 2, '.', 2),
  R('.', 1, 's', 3, '.', 8, 's', 3, '.', 1),
]);

// --- Customer: plain pub patron. Geometry is shared; each customer gets
// its own palette instance so shirt color varies. ---------------------------
const CUSTOMER_IDLE = buildSprite([
  R('.', 5, 'q', 2, 'h', 2, '.', 5),
  R('.', 4, 'q', 2, 'h', 4, '.', 4),
  R('.', 3, 'h', 1, 'k', 6, 'h', 1, '.', 3),
  R('.', 4, 'K', 1, 'k', 4, 'K', 1, '.', 4),
  R('.', 4, 'l', 6, '.', 4),
  R('.', 3, 'l', 1, 'm', 6, 'l', 1, '.', 3),
  R('.', 2, 'v', 1, 'm', 8, 'v', 1, '.', 2),
  R('.', 2, 'v', 1, 'm', 8, 'v', 1, '.', 2),
  R('.', 3, 'v', 8, '.', 3),
  R('.', 3, 'P', 2, 'p', 4, 'P', 2, '.', 3),
  R('.', 4, 'P', 2, '.', 2, 'p', 2, '.', 4),
  R('.', 4, 'p', 2, '.', 2, 'p', 2, '.', 4),
  R('.', 3, 's', 3, '.', 2, 's', 3, '.', 3),
]);

const CUSTOMER_WALK = buildSprite([
  ...CUSTOMER_IDLE.rows.slice(0, 10),
  R('.', 3, 'p', 2, '.', 4, 'p', 2, '.', 3),
  R('.', 2, 'p', 2, '.', 6, 'p', 2, '.', 2),
  R('.', 1, 's', 3, '.', 8, 's', 3, '.', 1),
]);

const CUSTOMER_SHIRT_COLORS = [
  { base: '#47728e', light: '#6f9cb4', dark: '#31566e' },
  { base: '#8e3733', light: '#c05748', dark: '#632725' },
  { base: '#315f48', light: '#5b896c', dark: '#214535' },
  { base: '#b87524', light: '#dda248', dark: '#805019' },
  { base: '#c94f3d', light: '#e9785e', dark: '#8e342b' },
  { base: '#4c6868', light: '#769393', dark: '#344c4c' },
];

function makeCustomerPalette() {
  const shirt = CUSTOMER_SHIRT_COLORS[Math.floor(Math.random() * CUSTOMER_SHIRT_COLORS.length)];
  return {
    '.': null,
    h: '#3a2a1a',
    q: '#76502c',
    k: '#f0c090',
    K: '#c9855e',
    l: shirt.light,
    m: shirt.base,
    v: shirt.dark,
    p: '#2a2418',
    P: '#4b4331',
    s: '#1a1512',
  };
}

// ---- Order icons: tiny (6x8) glyphs shown in a customer's speech bubble
// and above the player's head while carrying an order. -----------------
const MUG_ROWS = [
  R('.', 1, 'f', 4, '.', 1),
  R('f', 6),
  R('o', 1, 'L', 4, 'o', 1),
  R('o', 1, 'L', 4, 'o', 1),
  R('o', 1, 'L', 4, 'o', 1),
  R('o', 1, 'L', 4, 'o', 1),
  R('o', 1, 'L', 4, 'o', 1),
  R('o', 6),
];
const COCKTAIL_ROWS = [
  R('o', 6),
  R('.', 1, 'L', 4, '.', 1),
  R('.', 2, 'o', 2, '.', 2),
  R('.', 2, 'o', 2, '.', 2),
  R('.', 2, 'o', 2, '.', 2),
  R('.', 1, 'o', 4, '.', 1),
  R('.', 6),
  R('.', 6),
];
const WINE_ROWS = [
  R('.', 1, 'o', 4, '.', 1),
  R('o', 1, 'L', 4, 'o', 1),
  R('o', 1, 'L', 4, 'o', 1),
  R('.', 1, 'o', 4, '.', 1),
  R('.', 2, 'o', 2, '.', 2),
  R('.', 2, 'o', 2, '.', 2),
  R('.', 1, 'o', 4, '.', 1),
  R('.', 6),
];
const FOOD_ROWS = [
  R('.', 6),
  R('.', 1, 'p', 4, '.', 1),
  R('p', 1, 'M', 2, 'G', 1, 'M', 1, 'p', 1),
  R('p', 1, 'M', 4, 'p', 1),
  R('p', 6),
  R('.', 6),
  R('.', 6),
  R('.', 6),
];

function beerPalette(liquid) {
  return { '.': null, f: '#f5f0e0', o: '#2a1c10', L: liquid };
}

const ORDER_ICONS = {
  'beer-dark': { sprite: buildSprite(MUG_ROWS), palette: beerPalette('#3a2414') },
  'beer-red': { sprite: buildSprite(MUG_ROWS), palette: beerPalette('#8a2418') },
  'beer-blond': { sprite: buildSprite(MUG_ROWS), palette: beerPalette('#e8b830') },
  cocktail: { sprite: buildSprite(COCKTAIL_ROWS), palette: { '.': null, o: '#2a1c10', L: '#d94f8c' } },
  wine: { sprite: buildSprite(WINE_ROWS), palette: { '.': null, o: '#2a1c10', L: '#7a1428' } },
  food: { sprite: buildSprite(FOOD_ROWS), palette: { '.': null, p: '#d8d8d8', M: '#a9622f', G: '#5a8a3a' } },
};
const ORDER_TYPES = Object.keys(ORDER_ICONS);
function randomOrderType() { return ORDER_TYPES[Math.floor(Math.random() * ORDER_TYPES.length)]; }

// ---- The regulars: Nazim, Sam and Gerald ------------------------------------
// Three seated NPCs at the corner booth. Each gets its own silhouette so they
// read apart at 1x: Nazim has tall hair and a bulky hoodie, Sam a flat cap and
// a striped shirt, Gerald a bald dome, a moustache and folded arms.
//
// These are authored as literal 14-wide rows rather than R() runs, because the
// shapes are irregular enough that the runs would be harder to read than the
// picture. Poses share one palette per character, and the per-character detail
// that changes at runtime (skin tone, blush, eye colour) is palette-driven so
// it can be swapped without touching geometry — that is how Nazim's
// intoxication changes his face.
//
// Swapping these for art drawn from a real reference later means replacing the
// row arrays and palette entries here; nothing outside this file knows the
// shapes, only the pose names.

// Nazim — dark hair, stubble, olive hoodie. 'r' is the cheek pixel (equal to
// the skin colour while sober, a blush once he's had a few) and 'w'/'v' are
// the open and heavy-lidded eye colours.
const NAZIM_IDLE = buildSprite([
  '....hhhhhh....',
  '...hhhhhhhh...',
  '...hkkkkkkh...',
  '...hkwkkwkh...',
  '...krkkkkrk...',
  '....kbbbbk....',
  '....mMMMMm....',
  '..mmMMMMMMmm..',
  '.mmmMMMMMMmmm.',
  '.mmmMMMMMMmmm.',
  '.mmmMMMMMMmmm.',
  '.kkmMMMMMMmkk.',
  '..mmmmmmmmmm..',
  '..pppppppppp..',
  '..pppppppppp..',
]);

// Idle variation: a blink. Its timer speeds up as he drinks.
const NAZIM_BLINK = buildSprite([
  ...NAZIM_IDLE.rows.slice(0, 3),
  '...hkkkkkkh...',
  ...NAZIM_IDLE.rows.slice(4),
]);

const NAZIM_TALK = buildSprite([
  ...NAZIM_IDLE.rows.slice(0, 5),
  '....kooook....',
  ...NAZIM_IDLE.rows.slice(6),
]);

// Drunk: leaning onto the table, head dropped a row, heavy lids.
const NAZIM_LEAN = buildSprite([
  '..............',
  '....hhhhhhh...',
  '....hhhhhhhh..',
  '....hkkkkkkh..',
  '....hkvkkvkh..',
  '....krkkkkrk..',
  '.....kbbbbk...',
  '.....mMMMMm...',
  '...mmMMMMMMmm.',
  '..mmmMMMMMMmmm',
  '..mmmMMMMMMmmm',
  '.kkmmMMMMMmkk.',
  '..mmmmmmmmmm..',
  '..pppppppppp..',
  '..pppppppppp..',
]);

const NAZIM_LEAN_TALK = buildSprite([
  ...NAZIM_LEAN.rows.slice(0, 6),
  '.....kooook...',
  ...NAZIM_LEAN.rows.slice(7),
]);

// Gone: fully slumped over the table.
const NAZIM_SLUMP = buildSprite([
  '..............',
  '..............',
  '.....hhhhhh...',
  '....hhhhhhhh..',
  '....hkkkkkkh..',
  '....hkvkkvkh..',
  '....krkkkkrk..',
  '.....kbbbbk...',
  '...mmMMMMMMm..',
  '..mmmMMMMMMmm.',
  '..mmmMMMMMMmm.',
  '.kkmmMMMMMmmk.',
  '..mmmmmmmmmm..',
  '..pppppppppp..',
  '..pppppppppp..',
]);

const NAZIM_SLUMP_TALK = buildSprite([
  ...NAZIM_SLUMP.rows.slice(0, 7),
  '.....kooook...',
  ...NAZIM_SLUMP.rows.slice(8),
]);

const NAZIM_PALETTE = {
  '.': null,
  h: '#241a12', // hair
  k: '#c98d5c', // skin
  r: '#c98d5c', // cheek — replaced with a blush by the intoxication stage
  w: '#f5efe0', // open eye
  v: '#6b4630', // heavy-lidded eye
  b: '#3a2a1c', // stubble / closed mouth
  o: '#1d0f0a', // open mouth
  m: '#4f6440', // hoodie
  M: '#3a4b2e', // hoodie shade
  p: '#2e3040', // legs
};

// Sam — flat cap, glasses, striped shirt, permanent half-smirk.
const SAM_IDLE = buildSprite([
  '..cccccccccc..',
  '..cCCCCCCCCc..',
  '...HkkkkkkH...',
  '...gwgkkgwg...',
  '...kkkkkkkk...',
  '....kbbkkk....',
  '....mmMMmm....',
  '..mmMMmmMMmm..',
  '..mmMMmmMMmm..',
  '..mmMMmmMMmm..',
  '.kkmMMmmMMmkk.',
  '..mmmmmmmmmm..',
  '..pppppppppp..',
  '..pppppppppp..',
  '..pppppppppp..',
]);

// Idle variation: head tilted a pixel, smirk moved to the other side.
const SAM_IDLE_B = buildSprite([
  '...cccccccccc.',
  '...cCCCCCCCCc.',
  ...SAM_IDLE.rows.slice(2, 5),
  '....kkkbbk....',
  ...SAM_IDLE.rows.slice(6),
]);

const SAM_TALK = buildSprite([
  ...SAM_IDLE.rows.slice(0, 5),
  '....kooook....',
  ...SAM_IDLE.rows.slice(6),
]);

const SAM_PALETTE = {
  '.': null,
  c: '#2c3a58', // cap
  C: '#1d2740', // cap band
  H: '#a8814a', // hair under the cap
  k: '#e0ab7c', // skin
  g: '#16161c', // glasses frame
  w: '#5d6b82', // lens catchlight
  b: '#5a3a24', // mouth line
  o: '#1d0f0a', // open mouth
  m: '#ddd4b8', // shirt stripe, light
  M: '#8f3a38', // shirt stripe, red
  p: '#3a3a46',
};

// Gerald — bald dome with grey sides, heavy brows, big moustache, arms folded
// across a burgundy cardigan.
const GERALD_IDLE = buildSprite([
  '.....kkkk.....',
  '....kkkkkk....',
  '...HkGGGGkH...',
  '...HkwkkwkH...',
  '...HkkkkkkH...',
  '....bbbbbb....',
  '.....kkkk.....',
  '....mMMMMm....',
  '..mmMMMMMMmm..',
  '.mmMMMMMMMMmm.',
  '.mmkkMMMMkkmm.',
  '.mmmkkMMkkmmm.',
  '..mmmmmmmmmm..',
  '..pppppppppp..',
  '..pppppppppp..',
]);

// Idle variation: the brows come all the way down onto the eyes.
const GERALD_IDLE_B = buildSprite([
  ...GERALD_IDLE.rows.slice(0, 3),
  '...HkGGGGkH...',
  ...GERALD_IDLE.rows.slice(4),
]);

const GERALD_TALK = buildSprite([
  ...GERALD_IDLE.rows.slice(0, 6),
  '.....kook.....',
  ...GERALD_IDLE.rows.slice(7),
]);

const GERALD_PALETTE = {
  '.': null,
  k: '#d59a70', // ruddy skin
  H: '#b9b5ac', // grey side hair
  G: '#6e6a62', // brows
  w: '#2a1c14', // eyes
  b: '#cfcac0', // moustache
  o: '#1d0f0a', // open mouth
  m: '#5c2431', // cardigan
  M: '#3f1720', // cardigan shade
  p: '#2a2430',
};

// A sprite set is keyed by pose name. Movers use idle/walk; the seated
// regulars use idle/idleB/talk (plus lean/slump for Nazim), chosen by the
// entity's `pose` field in game.js.
// --- Ghost: a purely decorative apparition (see the ghost block in game.js).
// Translucent fill baked into the palette itself (via rgba) so it reads as
// see-through even before the render pass's extra globalAlpha fade is
// applied. Single frame — it drifts, it doesn't walk.
const GHOST_PALETTE = {
  '.': null,
  g: 'rgba(225,235,255,0.75)',
  e: 'rgba(30,30,45,0.85)',
};
const GHOST_IDLE = buildSprite([
  R('.', 4, 'g', 4, '.', 4),
  R('.', 3, 'g', 6, '.', 3),
  R('.', 2, 'g', 8, '.', 2),
  R('.', 1, 'g', 10, '.', 1),
  R('g', 12),
  R('g', 4, 'e', 1, 'g', 2, 'e', 1, 'g', 4),   // eyes
  R('g', 4, 'e', 1, 'g', 2, 'e', 1, 'g', 4),
  R('g', 12),
  R('g', 12),
  R('.', 1, 'g', 2, '.', 2, 'g', 2, '.', 2, 'g', 2, '.', 1),   // scalloped, wispy tail
]);

// --- Waiter: the bar hand who wanders in now and then to give the counter a
// squirt of water (see the waiter block in game.js). Drawn from a photo
// reference: swept auburn hair, black rectangular glasses, a wide grin, dark
// tee with a thin chain, and a service apron so he reads as staff at 1x.
//
// The spray poses are 20 wide instead of 14 so the outstretched arm and the
// bottle have somewhere to go. The extra columns are split evenly either side
// of the body, so swapping between walking and spraying doesn't slide him
// sideways — drawSprite centres on the sprite's own width.
const WAITER_PALETTE = {
  '.': null,
  h: '#5e3218', // auburn hair
  H: '#8a5028', // the swept-back highlight in it
  k: '#f2c39a', // skin
  g: '#16161c', // heavy rectangular frames
  w: '#8fa8bd', // lens catchlight
  e: '#2a1c14', // eye behind the lens
  m: '#f7f2e4', // grin
  t: '#3c3f46', // dark grey tee
  n: '#c9a227', // chain
  a: '#d3c8b0', // apron
  p: '#2b2b34', // jeans
  s: '#1a1512', // shoes
  b: '#5a94b4', // spray bottle
  B: '#2f5f7c', // bottle shade / nozzle
};

const WAITER_IDLE = buildSprite([
  '....hhhhhh....',
  '...hHHhhhhh...',
  '..hhHHhhhhhh..',
  '..hkkkkkkkkh..',
  '..ggggkkgggg..', // heavy rectangular frames, skin bridge between them
  '..gwegkkgweg..', // catchlight, then the eye, behind each lens
  '...kkkkkkkk...',
  '....kmmmmk....', // the grin he's never photographed without
  '....kkkkkk....',
  '..tttnttnttt..', // chain over the collar
  '.ttttttnttttt.', // ...down to the pendant
  '.ttaaaaaaaatt.',
  '.ktaaaaaaaatk.',
  '..aaaaaaaaaa..',
  '...ppp..ppp...',
  '...ppp..ppp...',
  '...sss..sss...',
]);

const WAITER_WALK = buildSprite([
  ...WAITER_IDLE.rows.slice(0, 14),
  '..ppp....ppp..',
  '.ppp......ppp.',
  'sss........sss',
]);

// Spraying: arm out, bottle in hand. The mist itself isn't in the sprite —
// drawWaiter() puffs it out of the nozzle so it can drift and fade. The
// nozzle's position here is what WAITER_NOZZLE_DX/DY in game.js point at.
const WAITER_SPRAY = buildSprite([
  '.......hhhhhh.......',
  '......hHHhhhhh......',
  '.....hhHHhhhhhh.....',
  '.....hkkkkkkkkh.....',
  '.....ggggkkgggg.....',
  '.....gwegkkgweg.....',
  '......kkkkkkkk......',
  '.......kmmmmk.......',
  '.......kkkkkk.......',
  '.....tttnttnttt.....',
  '....ttttttnttttt....',
  '....ttaaaaaaaattkkB.', // forearm, then the nozzle
  '....ktaaaaaaaatk.bB.',
  '.....aaaaaaaaaa..bB.',
  '......ppp..ppp......',
  '......ppp..ppp......',
  '......sss..sss......',
]);

// Second frame: the squeeze. The whole bottle dips a row and the wrist
// follows it, so a squirt reads as a pull of the trigger rather than a
// bottle held perfectly still.
const WAITER_SPRAY_B = buildSprite([
  ...WAITER_SPRAY.rows.slice(0, 11),
  '....ttaaaaaaaattkk..',
  '....ktaaaaaaaatk.bB.',
  '.....aaaaaaaaaa..bB.',
  '......ppp..ppp...bB.',
  ...WAITER_SPRAY.rows.slice(15),
]);

const SPRITES = {
  hunter: { idle: HUNTER_IDLE, walk: HUNTER_WALK, palette: HUNTER_PALETTE },
  doe: { idle: DOE_IDLE, walk: DOE_WALK, palette: DOE_PALETTE },
  customer: { idle: CUSTOMER_IDLE, walk: CUSTOMER_WALK, palette: null },
  ghost: { idle: GHOST_IDLE, walk: GHOST_IDLE, palette: GHOST_PALETTE },
  waiter: {
    idle: WAITER_IDLE, walk: WAITER_WALK,
    spray: WAITER_SPRAY, sprayB: WAITER_SPRAY_B,
    palette: WAITER_PALETTE,
  },
  nazim: {
    idle: NAZIM_IDLE, walk: NAZIM_IDLE, idleB: NAZIM_BLINK, talk: NAZIM_TALK,
    lean: NAZIM_LEAN, leanTalk: NAZIM_LEAN_TALK,
    slump: NAZIM_SLUMP, slumpTalk: NAZIM_SLUMP_TALK,
    palette: NAZIM_PALETTE,
  },
  sam: {
    idle: SAM_IDLE, walk: SAM_IDLE, idleB: SAM_IDLE_B, talk: SAM_TALK,
    palette: SAM_PALETTE,
  },
  gerald: {
    idle: GERALD_IDLE, walk: GERALD_IDLE, idleB: GERALD_IDLE_B, talk: GERALD_TALK,
    palette: GERALD_PALETTE,
  },
};
