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

function composeSprite(base, width, offsetX, additions) {
  const rows = Array.from({ length: base.h }, (_, y) => {
    const row = Array(width).fill('.');
    const source = base.rows[y] || '';
    for (let x = 0; x < source.length; x++) row[offsetX + x] = source[x];
    return row;
  });
  for (const addition of additions) {
    for (let y = 0; y < addition.rows.length; y++) {
      const patch = addition.rows[y];
      const target = rows[addition.y + y];
      if (!target) continue;
      for (let x = 0; x < patch.length; x++) {
        if (patch[x] !== '.' && addition.x + x < width) target[addition.x + x] = patch[x];
      }
    }
  }
  return { rows: rows.map(row => row.join('')), w: width, h: base.h, anchorX: offsetX + base.w / 2 };
}

// Refine a coarse authored silhouette onto a 2x denser pixel grid while it
// keeps the same logical on-screen footprint. Edge corners become true
// one-backing-pixel diagonals and material ramps add tiny highlights/shadows
// inside each original pixel. This is not a CSS scale: the returned sheet has
// genuinely different pixels, rendered at half a logical unit per pixel by
// game.js's 2x art backing store.
function detailSprite(sprite, ramps = {}) {
  const source = sprite.rows.map(row => row.padEnd(sprite.w, '.'));
  const out = Array.from({ length: sprite.h * 2 }, () => Array(sprite.w * 2).fill('.'));
  const at = (x, y) => x < 0 || y < 0 || x >= sprite.w || y >= sprite.h ? '.' : source[y][x];

  for (let y = 0; y < sprite.h; y++) {
    for (let x = 0; x < sprite.w; x++) {
      const key = at(x, y);
      if (key === '.') continue;
      const ramp = ramps[key] || [key, key];
      const hi = ramp[0] || key;
      const lo = ramp[1] || key;
      const block = [[key, key], [key, key]];
      const openN = at(x, y - 1) === '.';
      const openS = at(x, y + 1) === '.';
      const openW = at(x - 1, y) === '.';
      const openE = at(x + 1, y) === '.';

      if (openN) { block[0][0] = hi; block[0][1] = hi; }
      if (openW) block[1][0] = hi;
      if (openS) { block[1][0] = lo; block[1][1] = lo; }
      if (openE) block[1][1] = lo;

      // Trim only fully exposed corners. This replaces square stairsteps with
      // a finer diagonal without eroding single-pixel facial details.
      if (openN && openW && at(x - 1, y - 1) === '.') block[0][0] = '.';
      if (openN && openE && at(x + 1, y - 1) === '.') block[0][1] = '.';
      if (openS && openW && at(x - 1, y + 1) === '.') block[1][0] = '.';
      if (openS && openE && at(x + 1, y + 1) === '.') block[1][1] = '.';

      // A restrained alternating weave inside broad cloth/hair regions.
      if (!openN && !openS && !openW && !openE && ramps[key] && ((x + y) & 1) === 0) {
        block[0][0] = hi;
        block[1][1] = lo;
      }

      out[y * 2][x * 2] = block[0][0];
      out[y * 2][x * 2 + 1] = block[0][1];
      out[y * 2 + 1][x * 2] = block[1][0];
      out[y * 2 + 1][x * 2 + 1] = block[1][1];
    }
  }

  return {
    rows: out.map(row => row.join('')),
    w: sprite.w * 2,
    h: sprite.h * 2,
    pixelSize: 0.5,
    anchorX: sprite.anchorX,
  };
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
  u: '#271913', // carried mug outline
  q: '#fff0ca', // carried mug foam
  b: '#d7902f', // carried beer
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

// Carry pose: a real outstretched arm and foaming pint, echoing the supplied
// hero reference instead of representing the drink only as a UI bubble. The
// custom anchor keeps the body on the physics position while the mug extends
// to either side when the sheet flips.
const DOE_CARRY = composeSprite(DOE_IDLE, 26, 2, [
  { x: 16, y: 9, rows: ['dddkkk', 'dddkkk', '..dkk.'] },
  { x: 20, y: 7, rows: ['.uuu..', 'uqqqu.', 'ubbbuu', 'ubbbuu', 'ubbbuu', 'uuuuu.'] },
]);
const DOE_CARRY_WALK = composeSprite(DOE_WALK, 26, 2, [
  { x: 16, y: 9, rows: ['dddkkk', 'dddkkk', '..dkk.'] },
  { x: 20, y: 7, rows: ['.uuu..', 'uqqqu.', 'ubbbuu', 'ubbbuu', 'ubbbuu', 'uuuuu.'] },
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

const CUSTOMER_LOOKS = [
  { shirt: ['#47728e', '#6f9cb4', '#31566e'], hair: ['#3a2418', '#81512d'], skin: ['#efbd8e', '#c47f58'], pants: ['#292532', '#4c4457'] },
  { shirt: ['#8e3733', '#c05748', '#632725'], hair: ['#1f1816', '#4d3328'], skin: ['#d59a70', '#a96c4f'], pants: ['#252b2d', '#465054'] },
  { shirt: ['#315f48', '#5b896c', '#214535'], hair: ['#8a5a2c', '#c18445'], skin: ['#f1c59c', '#ca8d68'], pants: ['#32291f', '#5b4933'] },
  { shirt: ['#b87524', '#dda248', '#805019'], hair: ['#201917', '#554038'], skin: ['#8f5d45', '#67402f'], pants: ['#262537', '#46465c'] },
  { shirt: ['#c94f3d', '#e9785e', '#8e342b'], hair: ['#602c22', '#9b4a35'], skin: ['#b97955', '#87513d'], pants: ['#242821', '#454d3b'] },
  { shirt: ['#4c6868', '#769393', '#344c4c'], hair: ['#b7a07a', '#ddd0a8'], skin: ['#e3aa78', '#b77852'], pants: ['#2c2521', '#524239'] },
];

function makeCustomerPalette() {
  const look = CUSTOMER_LOOKS[Math.floor(Math.random() * CUSTOMER_LOOKS.length)];
  return {
    '.': null,
    h: look.hair[0],
    q: look.hair[1],
    k: look.skin[0],
    K: look.skin[1],
    l: look.shirt[1],
    m: look.shirt[0],
    v: look.shirt[2],
    p: look.pants[0],
    P: look.pants[1],
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
  'beer-dark': { sprite: detailSprite(buildSprite(MUG_ROWS)), palette: beerPalette('#3a2414') },
  'beer-red': { sprite: detailSprite(buildSprite(MUG_ROWS)), palette: beerPalette('#8a2418') },
  'beer-blond': { sprite: detailSprite(buildSprite(MUG_ROWS)), palette: beerPalette('#e8b830') },
  cocktail: { sprite: detailSprite(buildSprite(COCKTAIL_ROWS)), palette: { '.': null, o: '#2a1c10', L: '#d94f8c' } },
  wine: { sprite: detailSprite(buildSprite(WINE_ROWS)), palette: { '.': null, o: '#2a1c10', L: '#7a1428' } },
  food: { sprite: detailSprite(buildSprite(FOOD_ROWS)), palette: { '.': null, p: '#d8d8d8', M: '#a9622f', G: '#5a8a3a' } },
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
  hunter: {
    idle: detailSprite(HUNTER_IDLE, { o: ['O', 'r'], k: ['k', 'K'], f: ['F', 'f'], p: ['P', 'p'], u: ['U', 'u'] }),
    walk: detailSprite(HUNTER_WALK, { o: ['O', 'r'], k: ['k', 'K'], f: ['F', 'f'], p: ['P', 'p'], u: ['U', 'u'] }),
    palette: HUNTER_PALETTE,
  },
  doe: {
    idle: detailSprite(DOE_IDLE, { n: ['N', 'n'], h: ['h', 'H'], k: ['k', 'K'], d: ['d', 'D'], c: ['c', 'C'] }),
    walk: detailSprite(DOE_WALK, { n: ['N', 'n'], h: ['h', 'H'], k: ['k', 'K'], d: ['d', 'D'], c: ['c', 'C'] }),
    carry: detailSprite(DOE_CARRY, { n: ['N', 'n'], h: ['h', 'H'], k: ['k', 'K'], d: ['d', 'D'], c: ['c', 'C'], b: ['b', 'u'] }),
    carryWalk: detailSprite(DOE_CARRY_WALK, { n: ['N', 'n'], h: ['h', 'H'], k: ['k', 'K'], d: ['d', 'D'], c: ['c', 'C'], b: ['b', 'u'] }),
    palette: DOE_PALETTE,
  },
  customer: {
    idle: detailSprite(CUSTOMER_IDLE, { h: ['q', 'h'], k: ['k', 'K'], m: ['l', 'v'], p: ['P', 'p'] }),
    walk: detailSprite(CUSTOMER_WALK, { h: ['q', 'h'], k: ['k', 'K'], m: ['l', 'v'], p: ['P', 'p'] }),
    palette: null,
  },
  ghost: { idle: GHOST_IDLE, walk: GHOST_IDLE, palette: GHOST_PALETTE },
  waiter: {
    idle: detailSprite(WAITER_IDLE, { h: ['H', 'h'], b: ['b', 'B'] }),
    walk: detailSprite(WAITER_WALK, { h: ['H', 'h'], b: ['b', 'B'] }),
    spray: detailSprite(WAITER_SPRAY, { h: ['H', 'h'], b: ['b', 'B'] }),
    sprayB: detailSprite(WAITER_SPRAY_B, { h: ['H', 'h'], b: ['b', 'B'] }),
    palette: WAITER_PALETTE,
  },
  nazim: {
    idle: detailSprite(NAZIM_IDLE, { m: ['m', 'M'] }),
    walk: detailSprite(NAZIM_IDLE, { m: ['m', 'M'] }),
    idleB: detailSprite(NAZIM_BLINK, { m: ['m', 'M'] }),
    talk: detailSprite(NAZIM_TALK, { m: ['m', 'M'] }),
    lean: detailSprite(NAZIM_LEAN, { m: ['m', 'M'] }),
    leanTalk: detailSprite(NAZIM_LEAN_TALK, { m: ['m', 'M'] }),
    slump: detailSprite(NAZIM_SLUMP, { m: ['m', 'M'] }),
    slumpTalk: detailSprite(NAZIM_SLUMP_TALK, { m: ['m', 'M'] }),
    palette: NAZIM_PALETTE,
  },
  sam: {
    idle: detailSprite(SAM_IDLE, { c: ['c', 'C'], m: ['m', 'M'] }),
    walk: detailSprite(SAM_IDLE, { c: ['c', 'C'], m: ['m', 'M'] }),
    idleB: detailSprite(SAM_IDLE_B, { c: ['c', 'C'], m: ['m', 'M'] }),
    talk: detailSprite(SAM_TALK, { c: ['c', 'C'], m: ['m', 'M'] }),
    palette: SAM_PALETTE,
  },
  gerald: {
    idle: detailSprite(GERALD_IDLE, { m: ['m', 'M'] }),
    walk: detailSprite(GERALD_IDLE, { m: ['m', 'M'] }),
    idleB: detailSprite(GERALD_IDLE_B, { m: ['m', 'M'] }),
    talk: detailSprite(GERALD_TALK, { m: ['m', 'M'] }),
    palette: GERALD_PALETTE,
  },
};
