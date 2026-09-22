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

// A Jameson from a grateful customer leaves the doe briefly untouchable, and
// the sprite says so: the same rows painted through a ring of whiskey-gold
// palettes, cycled a few times a second. They're prebuilt rather than mixed
// per frame because drawSprite caches one baked canvas per palette *object*,
// so three fixed objects cost three bakes for the whole run and a freshly
// mixed palette every frame would cost one bake every frame.
function doeTint(over) { return Object.assign({}, DOE_PALETTE, over); }
const DOE_JAMESON_PALETTES = [
  doeTint({ n: '#e0a850', f: '#f8e8b8', h: '#d8b058', k: '#f6cc96', e: '#6e4820', d: '#8a5a20', c: '#f0e0b0', s: '#3a2814' }),
  doeTint({ n: '#ffd870', f: '#fff4c8', h: '#f0c86a', k: '#ffd9a0', e: '#8a5c28', d: '#b8802c', c: '#fff0c0', s: '#4a3418' }),
  doeTint({ n: '#fff0b0', f: '#ffffff', h: '#ffe49a', k: '#ffe9c8', e: '#a8763a', d: '#e0a840', c: '#fffbe0', s: '#665028' }),
];

// The bladder losing its race against the clock: a single darkened palette
// (no cycling needed, it isn't a warning — it's already happened) staining
// the onesie and chest patch for a few seconds.
const DOE_WET_PALETTE = doeTint({ d: '#4a4234', c: '#a89870', s: '#1c1710' });

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
    i: '#16110c',
    w: '#f5efe0',
    b: '#2a1a10',
    x: '#2a1a10',
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
  // A pint of water: only ever ordered for Nazim, never by a walk-in.
  water: { sprite: detailSprite(buildSprite(MUG_ROWS)), palette: { '.': null, f: '#e4f4f8', o: '#2a1c10', L: '#9fd3e8' } },
};
// What walk-ins can roll. Water is Gerald's idea, not on the menu.
const ORDER_TYPES = Object.keys(ORDER_ICONS).filter(t => t !== 'water');
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

// --- Busboy: the one who comes to mop up after an accident. Dark hair, a
// goatee, no glasses or chain — reads as a different member of staff from
// the waiter at a glance even sharing the same silhouette. The mop is folded
// into the existing 14-wide frame rather than widened like the waiter's
// spray: just a couple of columns on his right side switch from apron/leg
// colors to the mop's, so the two poses read as a small side-to-side wipe
// without needing a second baked width.
const BUSBOY_PALETTE = {
  '.': null,
  h: '#241a12', // dark hair
  k: '#e2b78d', // skin
  e: '#201812', // eyes
  j: '#1c1410', // goatee
  t: '#4a5c48', // work shirt
  a: '#9b9284', // apron
  p: '#2c2620', // trousers
  s: '#1a1512', // shoes
  M: '#8a6a3c', // mop handle
  m: '#d8d2c0', // mop head
};

const BUSBOY_IDLE = buildSprite([
  '....hhhhhh....',
  '...hhhhhhhh...',
  '..hhhhhhhhhh..',
  '..hkkkkkkkkh..',
  '..kkkkkkkkkk..',
  '..k.ee..ee.k..',
  '...kkkkkkkk...',
  '....kjjjjk....',
  '.....kjjk.....',
  '..tttttttttt..',
  '.tttttttttttt.',
  '.ttaaaaaaaatt.',
  '.ktaaaaaaaatk.',
  '..aaaaaaaaaa..',
  '...ppp..ppp...',
  '...ppp..ppp...',
  '...sss..sss...',
]);

const BUSBOY_WALK = buildSprite([
  ...BUSBOY_IDLE.rows.slice(0, 14),
  '..ppp....ppp..',
  '.ppp......ppp.',
  'sss........sss',
]);

// Mopping: the same 14-wide frame, with the mop leaning down his right side
// from hand to floor. MOP_B nudges it one column over so alternating between
// the two reads as a short wipe rather than a held pose.
const BUSBOY_MOP = buildSprite([
  ...BUSBOY_IDLE.rows.slice(0, 12),
  '.ktaaaaaaaatM.',
  '..aaaaaaaaaaM.',
  '...ppp..ppp.m.',
  '...ppp..ppp.m.',
  '...sss..sss.m.',
]);

const BUSBOY_MOP_B = buildSprite([
  ...BUSBOY_IDLE.rows.slice(0, 12),
  '.ktaaaaaaaMk.',
  '..aaaaaaaaaM..',
  '...ppp..pppm..',
  '...ppp..pppm..',
  '...sss..sssm..',
]);

// --- Alex: a wandering regular who occasionally bursts in to drop into a full
// split in the middle of the floor, stopping traffic for whoever runs into
// him before picking himself back up. Drawn from a photo reference: dark
// swept hair, a short full beard, a wide grin — dressed down from the
// waiter's service look into a t-shirt and shorts, since he's here to
// stretch, not to work.
//
// idle/walk match the waiter/busboy's 14-wide convention (14 head/torso rows
// then 3 leg rows) so he reads as one more member of the cast at a glance.
// split is a separate, wider (22px) frame: the legs run out sideways along
// the floor instead of down, which is also what makeSplitCollider in game.js
// keys off to block the corridor he lands in.
const ALEX_PALETTE = {
  '.': null,
  h: '#2a1a10', // dark hair
  H: '#4a3018', // swept-back highlight
  k: '#e3ac7c', // skin
  g: '#1c1c22', // glasses frame
  w: '#8fa8bd', // lens catchlight
  e: '#201410', // eyes, behind the lens
  j: '#141110', // short beard — black, a shade cooler/darker than the hair so it still reads as its own shape
  m: '#f7f2e4', // grin
  t: '#2f6f6a', // t-shirt
  p: '#4a4a52', // shorts
  s: '#e8e4d8', // sneakers
};

const ALEX_IDLE = buildSprite([
  '....hhhhhh....',
  '...hHHhhhhh...',
  '..hhHHhhhhhh..',
  '..hkkkkkkkkh..',
  '..ggggkkgggg..',
  '..gwegkkgweg..',
  '...kkkkkkkk...',
  '...jkmmmmkj...',
  '....jjjjjj....',
  '..tttttttttt..',
  '.tttttttttttt.',
  '.tttttttttttt.',
  '...pppppppp...',
  '...pp....pp...',
  '...kk....kk...',
  '...ss....ss...',
  '...ss....ss...',
]);

const ALEX_WALK = buildSprite([
  ...ALEX_IDLE.rows.slice(0, 14),
  '..kk......kk..',
  '.kk........kk.',
  'ss..........ss',
]);

// The split: head and torso padded out to 22px so the arms have somewhere to
// go, legs run flat along the last row instead of down — shoes at the outer
// edges, a gap at the centre for the floor between them.
const ALEX_SPLIT = buildSprite([
  '....' + '....hhhhhh....' + '....',
  '....' + '...hHHhhhhh...' + '....',
  '....' + '..hhHHhhhhhh..' + '....',
  '....' + '..hkkkkkkkkh..' + '....',
  '....' + '..ggggkkgggg..' + '....',
  '....' + '..gwegkkgweg..' + '....',
  '....' + '...kkkkkkkk...' + '....',
  '....' + '...jkmmmmkj...' + '....',
  '....' + '....jjjjjj....' + '....',
  '..kk' + '..tttttttttt..' + 'kk..', // arms out for balance
  '....' + '.tttttttttttt.' + '....',
  '....' + '...pppppppp...' + '....',
  '....' + '...pppppppp...' + '....',
  'sskkkkkkkk..kkkkkkkkss',              // legs run flat, floor gap at centre
]);

// ---- High-density lead sheets --------------------------------------------
// The Doe and the hunter authored straight onto the 2x backing grid: 32x40
// backing pixels (16x20 on screen, same footprint and hitbox as before) with
// room for a face. Rows are literal strings so the picture is the source.
// Light comes from the top-left: `lightSprite` derives highlight/shade
// variants from that one direction, which is what keeps the figures from
// pillow-shading, and each material gets exactly three tones.

function lightSprite(rows, ramps, w, h) {
  const src = rows.map(r => {
    if (r.length !== w) throw new Error('sprite row width ' + r.length + ' != ' + w + ': ' + r);
    return r;
  });
  if (src.length !== h) throw new Error('sprite height ' + src.length + ' != ' + h);
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? '.' : src[y][x];
  const solid = ch => ch !== '.';
  const out = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      const key = src[y][x];
      const ramp = ramps[key];
      if (!ramp) { row += key; continue; }
      const litN = !solid(at(x, y - 1)) || at(x, y - 1) === 'i';
      const litW = !solid(at(x - 1, y)) || at(x - 1, y) === 'i';
      const shS = !solid(at(x, y + 1)) || at(x, y + 1) === 'i';
      const shE = !solid(at(x + 1, y)) || at(x + 1, y) === 'i';
      if (litN || litW) row += ramp[0];
      else if (shS || shE) row += ramp[1];
      else row += key;
    }
    out.push(row);
  }
  return { rows: out, w, h, pixelSize: 0.5 };
}

// Swap a run of characters in one row (x is the column of the first).
function patchRow(rows, y, x, text) {
  const r = rows[y];
  rows[y] = r.slice(0, x) + text + r.slice(x + text.length);
}

// ---- The Doe ----------------------------------------------------------------
const DOE_HD_PALETTE = {
  '.': null,
  i: '#1b120c',  // outline
  n: '#a9764f', N: '#d3a26b', M: '#7a5236',   // antler
  d: '#6b4a30', L: '#8a6242', D: '#49301f',   // onesie
  f: '#f2e8da',                                // ear fluff
  k: '#f0c090', J: '#f8d9b0', K: '#c9855e',   // skin
  h: '#c9a86a', H: '#936f3f',                  // hair
  g: '#141414', G: '#cfe6ee', w: '#f7f3ea', p: '#2a1a10',  // glasses, eyes
  e: '#5a4030', F: '#7a5a44', E: '#3f2b20',   // beard
  c: '#e8ddc0', C: '#c9b98f',                  // chest patch
  s: '#2a2018', S: '#4a3a2c',                  // hooves
  u: '#271913', q: '#fff0ca', b: '#d7902f', B: '#b0701e',  // the pint
};
const DOE_RAMPS = { d: ['L', 'D'], k: ['J', 'K'], e: ['F', 'E'], c: ['c', 'C'], n: ['N', 'M'], s: ['S', 's'], h: ['h', 'H'] };

const DOE_HD_IDLE_ROWS = [
  '........n.n..........n.n........',
  '........n.n..........n.n........',
  '........nnn..........nnn........',
  '.........n............n.........',
  '.........n............n.........',
  '.........iiiiiiiiiiiiii.........',
  '........idddddddddddddddi.......',
  '.......iddddddddddddddddi.......',
  '......iddddddddddddddddddi......',
  '..iiiiiddddddddddddddddddiiiii..',
  '.iffffiddddddddddddddddddiffffi.',
  '.iffffiddddddddddddddddddiffffi.',
  '..iiiiiddddddddddddddddddiiiii..',
  '.....iddihhhhhhhhhhhhhiddi......',
  '.....iddikkkkkkkkkkkkkiddi......',
  '.....iddikkkkkkkkkkkkkiddi......',
  '.....iddigggggkkkkgggggiddi.....',
  '.....iddigGwpgggggGwpgiddi......',
  '.....iddigGGGgkkkkgGGGgiddi.....',
  '.....iddikgggkkkkkkgggkiddi.....',
  '.....iddikkkkkkKKkkkkkkiddi.....',
  '.....iddikkeeeeeeeeeekkiddi.....',
  '.....iddikeeeeeeeeeeeekiddi.....',
  '.....iddikeeeeeiiiieeeekiddi....',
  '.....iddiieeeeeeeeeeeeiiddi.....',
  '...iddddddieeeeeeeeeeidddddddi..',
  '..iddddddddieeeeeeeeidddddddddi.',
  '.iddddddddddiieeeeiiddddddddddi.',
  '.idddddddddddcccccccdddddddddddi',
  '.iddiddddddddcccccccddddddddiddi',
  '.iddidddddddcccccccccdddddddiddi',
  '.iddidddddddcccccccccdddddddiddi',
  '.ikkiddddddddcccccccddddddddikki',
  '.ikkidddddddddddddddddddddddikki',
  '..iiiddddddddddddddddddddddiii..',
  '....idddddddddiiiidddddddddi....',
  '....iddddddddi....iddddddddi....',
  '....iddddddddi....iddddddddi....',
  '....isssssssssi..isssssssssi....',
  '.....iiiiiiiii....iiiiiiiii.....',
];
// A quirk in the rows above: several face rows drift one column, which is
// what a hand-drawn face does; the shader and outline absorb it.
function doeRows() { return DOE_HD_IDLE_ROWS.slice(); }

function doeWalkRows() {
  const r = doeRows();
  // Legs scissor: left leg forward and lifted, right leg back.
  patchRow(r, 35, 0, '...idddddddddiiiiiidddddddddi...');
  patchRow(r, 36, 0, '...iddddddddi......iddddddddi...');
  patchRow(r, 37, 0, '...isssssssssi.....iddddddddi...');
  patchRow(r, 38, 0, '....iiiiiiiii.....isssssssssi...');
  patchRow(r, 39, 0, '...................iiiiiiiii....');
  return r;
}

// Carrying: the right arm comes up and out holding a pint at shoulder
// height, the tray hand tucked. The sheet is 36 wide so the pint has room;
// anchorX keeps the feet where they were.
function doeCarryRows(base) {
  const r = base.map(row => row + '....');
  patchRow(r, 22, 26, 'iuuuui');
  patchRow(r, 23, 26, 'iqqqqi');
  patchRow(r, 24, 26, 'ibbbbiu');
  patchRow(r, 25, 26, 'ibbbbiu');
  patchRow(r, 26, 26, 'ibbbbi.');
  patchRow(r, 27, 26, 'iBBBBi.');
  patchRow(r, 28, 26, 'iuuuui.');
  // Arm: out from the shoulder to the glass.
  patchRow(r, 27, 21, 'idddd');
  patchRow(r, 28, 21, 'iddddd');
  patchRow(r, 29, 21, 'iddiiii');
  patchRow(r, 29, 27, 'kkk');
  patchRow(r, 30, 27, 'ikki');
  return r;
}

// ---- The hunter --------------------------------------------------------------
const HUNTER_HD_PALETTE = {
  '.': null,
  i: '#16110c',
  o: '#e8791c', O: '#ffa04a', r: '#b45a12',   // cap
  k: '#f0c090', J: '#f8d9b0', K: '#c9855e',   // skin
  g: '#141414', G: '#cfe6ee', w: '#f7f3ea', p: '#2a1a10',
  e: '#4a3222', F: '#6a4a34', E: '#2f1f16',   // beard
  P: '#9c2f2a', X: '#c44a3f', Q: '#4a1a18',   // plaid
  v: '#6b4a2a', W: '#8a6438', V: '#4a3220',   // vest
  t: '#5a5a34', U: '#74744a', T: '#3e3e24',   // trousers
  s: '#2a2018', S: '#4a3a2c',                  // boots
  m: '#6a6f72', z: '#3a3f42', y: '#7a4a28',   // shotgun
};
const HUNTER_RAMPS = { o: ['O', 'r'], k: ['J', 'K'], e: ['F', 'E'], P: ['X', 'Q'], v: ['W', 'V'], t: ['U', 'T'], s: ['S', 's'], m: ['m', 'z'] };

const HUNTER_HD_IDLE_ROWS = [
  '..........iiiiiiiiiiii..........',
  '.........ioooooooooooooi........',
  '........iooooooooooooooooi......',
  '........iooooooooooooooooi......',
  '.......iooooooooooooooooooi.....',
  '.......iooooooooooooooooooi.....',
  '.....iiiooooooooooooooooooiii...',
  '....iooooooooooooooooooooooooi..',
  '.....iiiiiiiiiiiiiiiiiiiiiiii...',
  '........ikkkkkkkkkkkkkkkki......',
  '........ikkkkkkkkkkkkkkkki......',
  '........igggggkkkkkkgggggi......',
  '........igGwpgggggggGwpgi.......',
  '........igGGGgkkkkkkgGGGgi......',
  '........ikgggkkkkkkkkgggki......',
  '........ikkkkkkkKKkkkkkkki......',
  '........ikkeeeeeeeeeeeekki......',
  '........ikeeeeeeeeeeeeeeki......',
  '........ikeeeeeiiiiieeeeki......',
  '.........ieeeeeeeeeeeeeei.......',
  '..........iieeeeeeeeeeii........',
  '....iiiivvvviieeeeiivvvviiii....',
  '...ivvvvvvvvvPPPPPPvvvvvvvvvi...',
  '..iPvvvvvvvvvPQPPQPvvvvvvvvvPi..',
  '..iPQPivvvvvvPPPPPPvvvvvviPQPi..',
  '..iPPPivvvvvvQPPQPPvvvvvviPPPi..',
  '..iQPQivvvvvvPPPPPPvvvvvviQPQi..',
  '..iPPPivvvvvvPPQPPQvvvvvviPPPi..',
  '..iPQPivvvvvvPPPPPPvvvvvviPQPi..',
  '..iPPPiivvvvvQPPQPPvvvvviiPPPi..',
  '..ikkkii.ivvvvPPPPPvvvvi.iikkki.',
  '..ikkki..ittttttttttttti..ikkki.',
  '...iii...itttttttttttti...iii...',
  '.........ittttttiitttttti.......',
  '.........itttttti.itttttti......',
  '.........itttttti.itttttti......',
  '.........itttttti.itttttti......',
  '........issssssssi.issssssssi...',
  '........issssssssi.issssssssi...',
  '.........iiiiiiii...iiiiiiii....',
];
function hunterRows() { return HUNTER_HD_IDLE_ROWS.slice(); }
function hunterWalkRows() {
  const r = hunterRows();
  patchRow(r, 33, 0, '........itttttttiiitttttttti....');
  patchRow(r, 34, 0, '........ittttttti..itttttttti...');
  patchRow(r, 35, 0, '........ittttttti...itttttttti..');
  patchRow(r, 36, 0, '.......isssssssssi..itttttttti..');
  patchRow(r, 37, 0, '.......isssssssssi.issssssssssi.');
  patchRow(r, 38, 0, '........iiiiiiiii..issssssssssi.');
  patchRow(r, 39, 0, '....................iiiiiiiiii..');
  return r;
}
// The shotgun rides on his right side, barrel up past the shoulder.
function withShotgun(rows) {
  const r = rows.map(row => row + '....');
  for (let y = 12; y < 30; y++) patchRow(r, y, 30, y < 26 ? 'im' : 'iy');
  patchRow(r, 11, 30, 'iz');
  patchRow(r, 29, 29, 'iyyi');
  patchRow(r, 30, 29, 'iyyi');
  patchRow(r, 31, 30, 'ii');
  return r;
}

function hdSheet(rows, ramps, palette, extra) {
  const w = rows[0].length;
  const sp = lightSprite(rows, ramps, w, rows.length);
  if (extra && extra.anchorX != null) sp.anchorX = extra.anchorX;
  return sp;
}

const DOE_HD = {
  idle: hdSheet(doeRows(), DOE_RAMPS),
  walk: hdSheet(doeWalkRows(), DOE_RAMPS),
  carry: hdSheet(doeCarryRows(doeRows()), DOE_RAMPS, null, { anchorX: 8 }),
  carryWalk: hdSheet(doeCarryRows(doeWalkRows()), DOE_RAMPS, null, { anchorX: 8 }),
  palette: DOE_HD_PALETTE,
};
const HUNTER_HD = {
  idle: hdSheet(withShotgun(hunterRows()), HUNTER_RAMPS, null, { anchorX: 8 }),
  walk: hdSheet(withShotgun(hunterWalkRows()), HUNTER_RAMPS, null, { anchorX: 8 }),
  palette: HUNTER_HD_PALETTE,
};


// ---- High-density cast sheets: the regulars and the walk-ins ----------------
// 28x32 backing pixels (14x16 on screen) for the seated regulars, 28x26 for
// walk-ins. Same authoring rules as the leads: literal rows, outline 'i',
// one light direction applied by lightSprite.

const NAZIM_HD_PALETTE = {
  '.': null,
  i: '#16110c',
  h: '#241a12', H: '#3a2c20',                  // hair
  k: '#c98d5c', J: '#dba46f', K: '#a8714a',   // skin
  r: '#c98d5c',                                // cheek — blush by stage
  w: '#f5efe0',                                // open eye — colour by stage
  v: '#6b4630',                                // heavy-lidded eye
  b: '#3a2a1c',                                // stubble / pupil / closed mouth
  o: '#1d0f0a',                                // open mouth
  m: '#4f6440', L: '#63795a', M: '#3a4b2e',   // hoodie
  p: '#2e3040', P: '#3c3e52',                  // legs
};
const NAZIM_RAMPS = { k: ['J', 'K'], m: ['L', 'M'], p: ['P', 'p'], h: ['H', 'h'] };
const NAZIM_HD_ROWS = [
  '.........hhhhhhhhhh.........',
  '.......hhhhhhhhhhhhhh.......',
  '......hhhhhhhhhhhhhhhh......',
  '.....ihhhhhhhhhhhhhhhhi.....',
  '.....ihhkkkkkkkkkkkkhhi.....',
  '.....ihkkkkkkkkkkkkkkhi.....',
  '.....ihkkkkkkkkkkkkkkhi.....',
  '.....ihkkkkkkkkkkkkkkhi.....',
  '.....ihkkkwbkkkkwbkkkhi.....',
  '.....ihkkkkkkkkkkkkkkhi.....',
  '.....ihkrrkkkkkkkkrrkhi.....',
  '.....ihkkkkkkbbkkkkkkhi.....',
  '.....ihkkkkbbbbbbkkkkhi.....',
  '......ikkkkkbbbbkkkkki......',
  '.......ikkkkkkkkkkkki.......',
  '....iiimmmmmmiiiimmmmmmiii..',
  '..immmmmmmmmmMMMMmmmmmmmmmmi',
  '.immmmmmmmmmmMMmmmmmmmmmmmi.',
  '.immmmmmmmmmmmmmmmmmmmmmmmi.',
  '.immimmmmmmmmmmmmmmmmmmimmi.',
  '.immimmmmmmmmmmmmmmmmmmimmi.',
  '.immimmmmmMMMMMMMMmmmmmimmi.',
  '.immimmmmmMmmmmmmMmmmmmimmi.',
  '.ikkimmmmmMmmmmmmMmmmmmikki.',
  '.ikkimmmmmMMMMMMMMmmmmmikki.',
  '..iimmmmmmmmmmmmmmmmmmmmii..',
  '....immmmmmmmmmmmmmmmmmi....',
  '....ippppppppppppppppppi....',
  '....ipppppppppiippppppppi...',
  '....ippppppppi..ippppppppi..',
  '....ippppppppi..ippppppppi..',
  '.....iiiiiiii....iiiiiiii...',
];

// Pose builders. Blink closes the eyes, talk opens the mouth, lean and slump
// drop the head onto the chest by two and four rows with heavier eyes.
const NAZIM_EYE_ROW = 8;
const NAZIM_MOUTH_ROW = 12;
function nazimPose(opts) {
  let r = NAZIM_HD_ROWS.slice();
  const eye = opts.eye || 'w';
  r[NAZIM_EYE_ROW] = r[NAZIM_EYE_ROW].split('w').join(eye === 'closed' ? 'b' : eye);
  if (opts.talk) r[NAZIM_MOUTH_ROW] = '.....ihkkkkboooobkkkkhi.....';
  if (opts.drop) {
    const head = r.slice(0, 13);
    const body = r.slice(15);
    const blank = '.'.repeat(28);
    r = Array(opts.drop).fill(blank).concat(head, body).slice(0, 32);
    // The dropped head overlaps the shoulders; keep the outline continuous.
    while (r.length < 32) r.push(blank);
  }
  return r;
}

const SAM_HD_PALETTE = {
  '.': null,
  i: '#16110c',
  c: '#2c3a58', C: '#1d2740',                  // cap
  H: '#a8814a',                                // hair under the cap
  k: '#e0ab7c', J: '#f0c290', K: '#b8875c',   // skin
  g: '#16161c', w: '#5d6b82',                  // glasses, lens
  b: '#5a3a24', o: '#1d0f0a',                  // mouth
  m: '#ddd4b8', M: '#8f3a38',                  // stripes
  p: '#3a3a46', P: '#4a4a58',
};
const SAM_RAMPS = { k: ['J', 'K'], c: ['c', 'C'], p: ['P', 'p'] };
const SAM_HD_ROWS = [
  '.......cccccccccccccc.......',
  '.....cccccccccccccccccc.....',
  '....icccccccccccccccccccci..',
  '...iCCCCCCCCCCCCCCCCCCCCCi..',
  '.....iHHkkkkkkkkkkkkHHi.....',
  '.....iHkkkkkkkkkkkkkkHi.....',
  '.....iHkkkkkkkkkkkkkkHi.....',
  '.....iHkgggggkkgggggkHi.....',
  '.....iHkgwwbggggwwbgkHi.....',
  '.....iHkgggggkkgggggkHi.....',
  '.....iHkkkkkkkkkkkkkkHi.....',
  '.....iHkkkkkkbbkkkkkkHi.....',
  '......ikkkkkkkkkbbbkki......',
  '.......ikkkkkkkkkkkki.......',
  '.....iiimmmmmmmmmmmmiii.....',
  '...immmmmmmmmmmmmmmmmmmmi...',
  '..iMMMMMMMMMMMMMMMMMMMMMMi..',
  '..immmimmmmmmmmmmmmmmimmmi..',
  '..iMMMiMMMMMMMMMMMMMMiMMMi..',
  '..immmimmmmmmmmmmmmmmimmmi..',
  '..iMMMiMMMMMMMMMMMMMMiMMMi..',
  '..immmimmmmmmmmmmmmmmimmmi..',
  '..ikkkiMMMMMMMMMMMMMMikkki..',
  '..ikkkimmmmmmmmmmmmmmikkki..',
  '...iiiMMMMMMMMMMMMMMMMiii...',
  '.....immmmmmmmmmmmmmmmi.....',
  '.....ippppppppppppppppi.....',
  '.....ippppppppiippppppppi...',
  '.....ipppppppi..ipppppppi...',
  '.....ipppppppi..ipppppppi...',
  '.....ipppppppi..ipppppppi...',
  '......iiiiiii....iiiiiii....',
];
function samPose(opts) {
  const r = SAM_HD_ROWS.slice();
  if (opts.blink) r[8] = '.....iHkgbbbggggbbbgkHi.....';
  if (opts.talk) r[12] = '......ikkkkkkkkooookki......';
  return r;
}

const GERALD_HD_PALETTE = {
  '.': null,
  i: '#16110c',
  k: '#d59a70', J: '#e6b087', K: '#b07a56',   // ruddy skin
  H: '#b9b5ac',                                // grey side hair
  G: '#6e6a62',                                // brows
  w: '#2a1c14', b: '#cfcac0', o: '#1d0f0a',   // eyes, moustache, mouth
  m: '#5c2431', L: '#733040', M: '#3f1720',   // cardigan
  p: '#2a2430', P: '#3a3444',
};
const GERALD_RAMPS = { k: ['J', 'K'], m: ['L', 'M'], p: ['P', 'p'] };
const GERALD_HD_ROWS = [
  '.........iiiiiiiiii.........',
  '.......iikkkkkkkkkkii.......',
  '......ikkkkkkkkkkkkkki......',
  '.....iHkkkkkkkkkkkkkkHi.....',
  '.....iHHkkkkkkkkkkkkHHi.....',
  '.....iHHkkkkkkkkkkkkHHi.....',
  '.....iHkkGGGkkkkGGGkkHi.....',
  '.....iHkkkwbkkkkkwbkkHi.....',
  '.....iHkkkkkkkkkkkkkkHi.....',
  '.....iHkkkkkkbbkkkkkkHi.....',
  '.....iHkkbbbbbbbbbbkkHi.....',
  '......ikkbbbbbbbbbbkki......',
  '......ikkkkkkkkkkkkkki......',
  '.......ikkkkkkkkkkkki.......',
  '.....iiimmmmmmmmmmmmiii.....',
  '...immmmmmmmmmmmmmmmmmmmi...',
  '..immmmmmmmmmmmmmmmmmmmmmi..',
  '..immmmmmmmmmmmmmmmmmmmmmi..',
  '..iMMMMMMMMMMMMMMMMMMMMMMi..',
  '..immmmmmmmmmmmmkkkmmmmmmi..',
  '..immmmmmkkkmmmmmmmmmmmmmi..',
  '..iMMMMMMMMMMMMMMMMMMMMMMi..',
  '..immmmmmmmmmmmmmmmmmmmmmi..',
  '..immmmmmmmmmmmmmmmmmmmmmi..',
  '...iiimmmmmmmmmmmmmmmmiii...',
  '.....immmmmmmmmmmmmmmmi.....',
  '.....ippppppppppppppppi.....',
  '.....ippppppppiippppppppi...',
  '.....ipppppppi..ipppppppi...',
  '.....ipppppppi..ipppppppi...',
  '.....ipppppppi..ipppppppi...',
  '......iiiiiii....iiiiiii....',
];
function geraldPose(opts) {
  const r = GERALD_HD_ROWS.slice();
  if (opts.blink) r[7] = '.....iHkkkbbkkkkkbbkkHi.....';
  if (opts.talk) r[12] = '......ikkkkkoooookkkki......';
  return r;
}

// Walk-ins share one silhouette; the palette (hair, skin, shirt, trousers)
// does the variety, as before.
const CUSTOMER_RAMPS = { h: ['q', 'h'], k: ['k', 'K'], m: ['l', 'v'], p: ['P', 'p'] };
const CUSTOMER_HD_ROWS = [
  '.........hhhhhhhhhh.........',
  '.......hhhhhhhhhhhhhh.......',
  '......ihhhhhhhhhhhhhhi......',
  '......ihhkkkkkkkkkkhhi......',
  '......ihkkkkkkkkkkkkhi......',
  '......ihkkkkkkkkkkkkhi......',
  '......ihkkwbkkkkwbkkhi......',
  '......ihkkkkkkkkkkkkhi......',
  '......ihkkkkkbbkkkkkhi......',
  '.......ikkkkbbbbkkkki.......',
  '........ikkkkkkkkkki........',
  '.....iiimmmmmmmmmmmmiii.....',
  '...immmmmmmmmmmmmmmmmmmmi...',
  '..immmmmmmmmmmmmmmmmmmmmmi..',
  '..immimmmmmmmmmmmmmmmmimmi..',
  '..immimmmmmmmmmmmmmmmmimmi..',
  '..immimmmmmmmmmmmmmmmmimmi..',
  '..ikkimmmmmmmmmmmmmmmmikki..',
  '..ikkimmmmmmmmmmmmmmmmikki..',
  '...iiimmmmmmmmmmmmmmmmiii...',
  '.....ippppppppppppppppi.....',
  '.....ippppppppiippppppppi...',
  '.....ipppppppi..ipppppppi...',
  '.....ipppppppi..ipppppppi...',
  '....issssssssi..issssssssi..',
  '.....iiiiiiii....iiiiiiii...',
];
function customerWalkRows() {
  const r = CUSTOMER_HD_ROWS.slice();
  r[21] = '....ipppppppppiiippppppppi..';
  r[22] = '....ipppppppi....ipppppppi..';
  r[23] = '...issssssssi....ipppppppi..';
  r[24] = '....iiiiiiii....issssssssi..';
  r[25] = '.................iiiiiiii...';
  return r;
}

function castSheet(rows, ramps) {
  return lightSprite(rows, ramps, rows[0].length, rows.length);
}

const NAZIM_HD = {
  idle: castSheet(nazimPose({}), NAZIM_RAMPS),
  walk: castSheet(nazimPose({}), NAZIM_RAMPS),
  idleB: castSheet(nazimPose({ eye: 'closed' }), NAZIM_RAMPS),
  talk: castSheet(nazimPose({ talk: true }), NAZIM_RAMPS),
  lean: castSheet(nazimPose({ drop: 2, eye: 'v' }), NAZIM_RAMPS),
  leanTalk: castSheet(nazimPose({ drop: 2, eye: 'v', talk: true }), NAZIM_RAMPS),
  slump: castSheet(nazimPose({ drop: 4, eye: 'v' }), NAZIM_RAMPS),
  slumpTalk: castSheet(nazimPose({ drop: 4, eye: 'v', talk: true }), NAZIM_RAMPS),
  palette: NAZIM_HD_PALETTE,
};
const SAM_HD = {
  idle: castSheet(samPose({}), SAM_RAMPS),
  walk: castSheet(samPose({}), SAM_RAMPS),
  idleB: castSheet(samPose({ blink: true }), SAM_RAMPS),
  talk: castSheet(samPose({ talk: true }), SAM_RAMPS),
  palette: SAM_HD_PALETTE,
};
const GERALD_HD = {
  idle: castSheet(geraldPose({}), GERALD_RAMPS),
  walk: castSheet(geraldPose({}), GERALD_RAMPS),
  idleB: castSheet(geraldPose({ blink: true }), GERALD_RAMPS),
  talk: castSheet(geraldPose({ talk: true }), GERALD_RAMPS),
  palette: GERALD_HD_PALETTE,
};
const CUSTOMER_HD = {
  idle: castSheet(CUSTOMER_HD_ROWS, CUSTOMER_RAMPS),
  walk: castSheet(customerWalkRows(), CUSTOMER_RAMPS),
  palette: null,
};


// ---- Overhead figures ---------------------------------------------------------
// The camera is high and near-orthographic (docs/overhaul/00-CAMERA-DIRECTION):
// a person is a head dome (hood, cap, hair, bald crown) over two shoulders,
// with a sliver of face only where that camera would see it, hands at the
// sides and two feet below. One generator paints every character from a
// spec so the projection, contour weight and light direction are identical
// across the cast; the spec carries the identity (antlers, cap brim, glasses,
// beard, cardigan...). Sheets are 40x44 backing pixels (20x22 world units),
// pixelSize 0.5, feet at the bottom; hitboxes are separate and unchanged.
//
// Directions are authored, not mirrored: 'left' mirrors the body and then
// re-attaches props on the anatomical side, so the pint stays in the Doe's
// left hand and the shotgun on the hunter's right shoulder.

const OH_W = 40;
const OH_H = 44;

function ohGrid() {
  return Array.from({ length: OH_H }, () => Array(OH_W).fill('.'));
}
function ohEllipse(g, cx, cy, rx, ry, ch) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (x < 0 || y < 0 || x >= OH_W || y >= OH_H) continue;
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) g[y][x] = ch;
    }
  }
}
function ohRect(g, x, y, w, h, ch) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    if (xx >= 0 && yy >= 0 && xx < OH_W && yy < OH_H) g[yy][xx] = ch;
  }
}
function ohPut(g, x, y, ch) { if (x >= 0 && y >= 0 && x < OH_W && y < OH_H) g[y][x] = ch; }

// Outline: every solid pixel bordering transparent gets 'i' pushed outward
// (keeps the fill), so silhouettes read on the darkest board.
function ohOutline(g) {
  const out = g.map(r => r.slice());
  for (let y = 0; y < OH_H; y++) for (let x = 0; x < OH_W; x++) {
    if (g[y][x] !== '.') continue;
    const n = (yy, xx) => yy >= 0 && xx >= 0 && yy < OH_H && xx < OH_W && g[yy][xx] !== '.' && g[yy][xx] !== 'i';
    if (n(y - 1, x) || n(y + 1, x) || n(y, x - 1) || n(y, x + 1)) out[y][x] = 'i';
  }
  return out;
}
function ohMirror(g) { return g.map(r => r.slice().reverse()); }

// Paints one figure. `dir` is down/up/right; left is derived by the caller.
// `f` is the walk phase: 0 idle, 1/2 the two step frames. `opts.carry`
// draws a held pint, `opts.gun` a shotgun across the back.
function ohFigure(spec, dir, f, opts) {
  const g = ohGrid();
  const cx = 20;
  const bob = f === 1 ? -1 : 0;
  const B = spec.body;   // { coat, hand, feet, chest? }
  const H = spec.head;   // { kind, color, seam?, brim?, flaps?, ears?, antlers?, hairSides? }
  const F = spec.face;   // { skin, glasses?, beard? }
  const side = dir === 'right';

  // Feet: two ovals; stepping frames offset them.
  const footY = 40 + bob;
  const stepA = f === 1 ? -2 : f === 2 ? 2 : 0;
  if (side) {
    ohEllipse(g, cx + 3 + stepA, footY, 4, 2.2, B.feet);
    ohEllipse(g, cx - 3 - stepA, footY + 1, 4, 2.2, B.feet);
  } else {
    ohEllipse(g, cx - 5, footY + stepA * 0.5, 3.2, 2.4, B.feet);
    ohEllipse(g, cx + 5, footY - stepA * 0.5, 3.2, 2.4, B.feet);
  }

  // Body: shoulders as a wide ellipse under the head, arms as lumps.
  const bodyY = 30 + bob;
  if (side) {
    ohEllipse(g, cx + 1, bodyY, 9, 7, B.coat);
    ohEllipse(g, cx - 7, bodyY + 1, 3.5, 5, B.coat);          // far arm
    ohEllipse(g, cx + 9, bodyY + 3, 3, 4.5, B.coat);          // near arm
    ohEllipse(g, cx + 9, bodyY + 7, 2.2, 2, B.hand);
    ohEllipse(g, cx - 7, bodyY + 6, 2, 1.8, B.hand);
  } else {
    ohEllipse(g, cx, bodyY, 12, 7.5, B.coat);
    ohEllipse(g, cx - 12, bodyY + 3, 3.5, 5, B.coat);         // arms
    ohEllipse(g, cx + 12, bodyY + 3, 3.5, 5, B.coat);
    ohEllipse(g, cx - 12.5, bodyY + 8, 2.4, 2, B.hand);
    ohEllipse(g, cx + 12.5, bodyY + 8, 2.4, 2, B.hand);
    if (dir === 'down' && B.chest) ohEllipse(g, cx, bodyY + 4, 4.5, 3, B.chest);
    if (dir === 'down' && B.vest) { ohRect(g, cx - 5, bodyY - 2, 10, 9, B.vest); }
    if (dir === 'up' && B.back) ohRect(g, cx - 1, bodyY - 5, 2, 10, B.back);
  }

  // Plaid: a checker over the coat before the head goes on.
  if (B.pattern) {
    for (let y = 0; y < OH_H; y++) for (let x = 0; x < OH_W; x++) {
      if (g[y][x] === B.coat && ((x >> 1) + (y >> 1)) % 2 === 0) g[y][x] = B.pattern;
    }
  }
  // Head dome. A lean/slump pushes the head toward what the figure faces.
  const lean = (opts && opts.lean) || 0;
  const headY = 20 + bob + (dir === 'down' ? lean * 3 : dir === 'up' ? -lean * 3 : lean);
  const hx = (side ? cx + 2 : cx) + (side ? lean * 3 : 0);
  const rx = side ? 11 : 13;
  const ry = 12;
  ohEllipse(g, hx, headY, rx, ry, H.color);
  if (H.kind === 'hood' && H.ears) {
    if (side) { ohEllipse(g, hx - 9, headY - 2, 3, 3.5, H.color); ohEllipse(g, hx - 9, headY - 2, 1.5, 2, H.ears); }
    else { ohEllipse(g, hx - 13, headY - 1, 3.5, 3.5, H.color); ohEllipse(g, hx + 13, headY - 1, 3.5, 3.5, H.color); ohEllipse(g, hx - 13, headY - 1, 1.8, 2, H.ears); ohEllipse(g, hx + 13, headY - 1, 1.8, 2, H.ears); }
  }
  if (H.kind === 'hood' && H.seam) {
    // Centre seam of the hood, visible from above; angled on the side view.
    for (let y = headY - ry + 2; y < headY + (dir === 'down' ? 3 : ry - 2); y++) ohPut(g, side ? hx - 2 : hx, y, H.seam);
  }
  if (H.kind === 'cap') {
    // A ball cap from above: crown with radial seams, a brim on the facing
    // side, and ear flaps hanging either side.
    const c = H.color;
    if (dir === 'down') { ohRect(g, hx - 10, headY + 8, 20, 4, c); ohRect(g, hx - 9, headY + 12, 18, 1, H.dark); }
    if (side) { ohRect(g, hx + 6, headY + 3, 8, 3, c); ohRect(g, hx + 7, headY + 6, 7, 1, H.dark); }
    for (let y = headY - ry + 1; y < headY + 6; y++) ohPut(g, hx, y, H.dark);
    for (let x = hx - rx + 1; x < hx + rx; x++) ohPut(g, x, headY - 1, H.dark);
    if (H.flaps) {
      if (side) ohEllipse(g, hx - 5, headY + 9, 3, 4, H.flaps);
      else { ohEllipse(g, hx - 12, headY + 6, 3, 4.5, H.flaps); ohEllipse(g, hx + 12, headY + 6, 3, 4.5, H.flaps); }
    }
    ohEllipse(g, hx, headY - 6, 1.5, 1.5, H.dark);              // button
  }
  if (H.kind === 'hair') {
    // A parting and a few strands so the crown reads as hair, not a helmet.
    for (let y = headY - ry + 2; y < headY + 4; y++) ohPut(g, hx + (side ? 3 : -3), y, H.dark);
    ohPut(g, hx + 4, headY - 6, H.dark); ohPut(g, hx - 6, headY - 4, H.dark); ohPut(g, hx + 6, headY + 1, H.dark);
  }
  if (H.kind === 'bald') {
    // Skin crown with grey sides.
    ohEllipse(g, hx, headY - 3, rx - 4, ry - 5, F.skin);
    if (side) ohEllipse(g, hx - 8, headY + 2, 3, 6, H.sides);
    else { ohEllipse(g, hx - 10, headY + 3, 3.5, 6, H.sides); ohEllipse(g, hx + 10, headY + 3, 3.5, 6, H.sides); }
  }
  if (H.kind === 'flatcap') {
    ohRect(g, hx - rx + 1, headY + 6, rx * 2 - 2, 3, H.color);   // the cap's overhang band
    if (dir === 'down') ohRect(g, hx - 8, headY + 9, 16, 3, H.dark);   // peak
    if (side) ohRect(g, hx + 7, headY + 5, 7, 3, H.dark);
    for (let x = hx - rx + 3; x < hx + rx - 2; x += 5) ohPut(g, x, headY - 4, H.dark);
  }

  // Face sliver: what the camera sees under the front edge of the head.
  if (dir === 'down') {
    ohEllipse(g, hx, headY + 10, 8, 3.5, F.skin);
    if (F.glasses) { ohRect(g, hx - 7, headY + 8, 6, 2, 'g'); ohRect(g, hx + 1, headY + 8, 6, 2, 'g'); ohRect(g, hx - 1, headY + 8, 2, 1, 'g'); ohPut(g, hx - 5, headY + 8, 'G'); ohPut(g, hx + 3, headY + 8, 'G'); }
    else { ohPut(g, hx - 4, headY + 8, 'x'); ohPut(g, hx + 3, headY + 8, 'x'); }
    if (F.beard) ohEllipse(g, hx, headY + 12, 7, 2.5, F.beard);
    if (F.moustache) ohRect(g, hx - 5, headY + 10, 10, 2, F.moustache);
    if (F.brows) { ohRect(g, hx - 7, headY + 7, 5, 1, F.brows); ohRect(g, hx + 2, headY + 7, 5, 1, F.brows); }
  } else if (side) {
    ohEllipse(g, hx + 7, headY + 6, 4, 5, F.skin);
    if (F.glasses) { ohRect(g, hx + 5, headY + 4, 6, 2, 'g'); ohPut(g, hx + 8, headY + 4, 'G'); }
    else ohPut(g, hx + 9, headY + 4, 'x');
    if (F.beard) ohEllipse(g, hx + 7, headY + 10, 3.5, 3, F.beard);
    if (F.moustache) ohRect(g, hx + 6, headY + 8, 5, 2, F.moustache);
  }

  // Antlers: two small tined branches rising above the hood.
  if (H.antlers) {
    const ax = side ? [hx - 4] : [hx - 8, hx + 8];
    for (const x of ax) {
      const baseY = headY - ry - 1;
      for (let y = baseY; y > baseY - 7; y--) ohPut(g, x, y, 'n');
      ohPut(g, x - 1, baseY - 3, 'n'); ohPut(g, x - 2, baseY - 4, 'n'); ohPut(g, x - 2, baseY - 5, 'n');
      ohPut(g, x + 1, baseY - 5, 'n'); ohPut(g, x + 2, baseY - 6, 'n');
      ohPut(g, x, baseY - 7, 'n');
    }
  }

  // Props.
  if (opts && opts.carry) {
    // The pint sits in the anatomical LEFT hand — screen right when facing
    // down, screen left when facing up, in front when facing right.
    const px = dir === 'down' ? cx + 14 : dir === 'up' ? cx - 14 : cx + 12;
    const py = dir === 'up' ? bodyY - 4 : bodyY + 4;
    ohRect(g, px - 2, py - 3, 5, 6, 'b');
    ohRect(g, px - 2, py - 4, 5, 1, 'q');
    ohRect(g, px + 3, py - 2, 1, 3, 'u');
    ohRect(g, px - 2, py - 3, 1, 5, 'B');
  }
  if (opts && opts.spray) {
    // Spray bottle held out ahead: nozzle at the far end, toward the counter.
    if (side) { ohRect(g, cx + 11, bodyY + 1, 6, 3, 'b'); ohRect(g, cx + 17, bodyY + 1, 1, 2, 'B'); ohRect(g, cx + 12, bodyY, 3, 1, 'B'); }
    else if (dir === 'down') { ohRect(g, cx + 13, bodyY + 6, 3, 6, 'b'); ohRect(g, cx + 13, bodyY + 12, 3, 1, 'B'); }
    else { ohRect(g, cx - 15, bodyY - 8, 3, 6, 'b'); ohRect(g, cx - 15, bodyY - 9, 3, 1, 'B'); }
  }
  if (opts && opts.gun) {
    // Barrel above the RIGHT shoulder (screen left facing down, screen right
    // facing up), stock across the back toward the left hip.
    if (dir === 'down') { ohRect(g, cx - 12, bodyY - 12, 2, 12, 'm'); ohRect(g, cx - 12, bodyY - 12, 2, 2, 'z'); }
    else if (dir === 'up') { ohRect(g, cx + 10, bodyY - 12, 2, 12, 'm'); for (let i = 0; i < 10; i++) ohPut(g, cx + 9 - i, bodyY - 1 + i, 'y'); }
    else { ohRect(g, cx - 6, bodyY - 14, 2, 12, 'm'); ohRect(g, cx - 6, bodyY - 14, 2, 2, 'z'); }
  }

  return ohOutline(g).map(r => r.join(''));
}

// A complete four-direction set for one spec. Left is a mirror of right with
// props re-attached by re-painting right without props, mirroring, then
// painting the props for 'left' explicitly.
function ohSheetSet(spec, ramps, palette, propKinds) {
  const set = { palette, dirs: true };
  const poses = { idle: 0, walk: 1, walkB: 2 };
  const variants = [{ key: '', opts: {} }];
  for (const p of propKinds || []) {
    if (p === 'lean') { variants.push({ key: 'lean', opts: { lean: 1 }, still: true }); variants.push({ key: 'slump', opts: { lean: 2 }, still: true }); }
    else variants.push({ key: p, opts: { [p]: true } });
  }
  for (const v of variants) {
    for (const pose in poses) {
      if (v.still && pose !== 'idle') continue;
      for (const dir of ['down', 'up', 'right', 'left']) {
        let rows;
        if (dir === 'left') {
          const bodyOnly = ohFigure(spec, 'right', poses[pose], v.opts.lean ? { lean: v.opts.lean } : {});
          const mirrored = ohMirror(bodyOnly.map(r => r.split('')));
          // Re-paint props for the mirrored view.
          if (v.opts.carry) {
            const cx = 20, bodyY = 30 + (poses[pose] === 1 ? -1 : 0);
            const px = cx - 12, py = bodyY + 4;
            ohRect(mirrored, px - 2, py - 3, 5, 6, 'b'); ohRect(mirrored, px - 2, py - 4, 5, 1, 'q');
            ohRect(mirrored, px - 3, py - 2, 1, 3, 'u'); ohRect(mirrored, px + 2, py - 3, 1, 5, 'B');
          }
          if (v.opts.gun) {
            const cx = 20, bodyY = 30 + (poses[pose] === 1 ? -1 : 0);
            ohRect(mirrored, cx + 4, bodyY - 14, 2, 12, 'm'); ohRect(mirrored, cx + 4, bodyY - 14, 2, 2, 'z');
          }
          if (v.opts.spray) {
            const cx = 20, bodyY = 30 + (poses[pose] === 1 ? -1 : 0);
            ohRect(mirrored, cx - 16, bodyY + 1, 6, 3, 'b'); ohRect(mirrored, cx - 17, bodyY + 1, 1, 2, 'B'); ohRect(mirrored, cx - 14, bodyY, 3, 1, 'B');
          }
          rows = ohOutline(mirrored).map(r => r.join(''));
        } else {
          rows = ohFigure(spec, dir, poses[pose], v.opts);
        }
        const name = (v.key ? v.key + (pose === 'idle' ? '' : pose === 'walk' ? 'Walk' : 'WalkB') : pose) + '.' + dir;
        set[name] = lightSprite(rows, ramps, OH_W, OH_H);
      }
    }
  }
  // Compatibility aliases so code that asks for `idle`/`walk` still works.
  set.idle = set['idle.down'];
  set.walk = set['walk.down'];
  if (set['carry.down']) { set.carry = set['carry.down']; set.carryWalk = set['carryWalk.down']; }
  return set;
}

// ---- The cast specs --------------------------------------------------------
const OH_DOE_PALETTE = Object.assign({}, DOE_HD_PALETTE, { x: '#2a1a10' });
const OH_DOE = ohSheetSet({
  head: { kind: 'hood', color: 'd', seam: 'D', ears: 'f', antlers: true },
  body: { coat: 'd', hand: 'k', feet: 's', chest: 'c' },
  face: { skin: 'k', glasses: true, beard: 'e' },
}, DOE_RAMPS, OH_DOE_PALETTE, ['carry']);

const OH_HUNTER = ohSheetSet({
  head: { kind: 'cap', color: 'o', dark: 'r', flaps: 'o' },
  body: { coat: 'P', pattern: 'Q', hand: 'k', feet: 's', vest: 'v', back: 'v' },
  face: { skin: 'k', glasses: true, beard: 'e' },
}, HUNTER_RAMPS, Object.assign({}, HUNTER_HD_PALETTE, { x: '#2a1a10' }), ['gun']);

const OH_NAZIM = ohSheetSet({
  head: { kind: 'hair', color: 'h', dark: 'H' },
  body: { coat: 'm', hand: 'k', feet: 'p' },
  face: { skin: 'k', beard: 'b' },
}, NAZIM_RAMPS, Object.assign({}, NAZIM_HD_PALETTE, { g: '#141414', G: '#cfe6ee', x: '#2a1a10' }), ['lean']);

const OH_SAM = ohSheetSet({
  head: { kind: 'flatcap', color: 'c', dark: 'C' },
  body: { coat: 'M', hand: 'k', feet: 'p' },
  face: { skin: 'k', glasses: true },
}, SAM_RAMPS, Object.assign({}, SAM_HD_PALETTE, { G: '#cfe6ee', x: '#2a1a10' }), []);

const OH_GERALD = ohSheetSet({
  head: { kind: 'bald', color: 'k', sides: 'H' },
  body: { coat: 'm', hand: 'k', feet: 'p' },
  face: { skin: 'k', moustache: 'b', brows: 'G' },
}, GERALD_RAMPS, Object.assign({}, GERALD_HD_PALETTE, { g: '#141414', x: '#2a1a10' }), []);

const OH_CUSTOMER = ohSheetSet({
  head: { kind: 'hair', color: 'h', dark: 'q' },
  body: { coat: 'm', hand: 'k', feet: 's' },
  face: { skin: 'k' },
}, CUSTOMER_RAMPS, null, []);

const OH_WAITER = ohSheetSet({
  head: { kind: 'hair', color: 'h', dark: 'H' },
  body: { coat: 't', hand: 'k', feet: 's', chest: 'a' },
  face: { skin: 'k', glasses: true },
}, { h: ['H', 'h'], t: ['t', 's'], a: ['m', 'a'] }, Object.assign({}, WAITER_PALETTE, { i: '#16110c', x: '#2a1a10', G: '#cfe6ee' }), ['spray']);

// Walk-ins come in three head shapes over the six palette looks: hair, a
// flat cap in the trouser colour, a round cap in the shirt's dark tone.
const OH_CUSTOMER_VARIANTS = [
  OH_CUSTOMER,
  ohSheetSet({ head: { kind: 'flatcap', color: 'p', dark: 's' }, body: { coat: 'm', hand: 'k', feet: 's' }, face: { skin: 'k' } }, CUSTOMER_RAMPS, null, []),
  ohSheetSet({ head: { kind: 'cap', color: 'v', dark: 's' }, body: { coat: 'm', hand: 'k', feet: 's' }, face: { skin: 'k' } }, CUSTOMER_RAMPS, null, []),
];
OH_CUSTOMER.variants = OH_CUSTOMER_VARIANTS;

// The ghost from above: a translucent oval with two dark eyes and a wispy
// trailing edge. Drawn at 1 unit per pixel with alpha, outside the palette
// policy on purpose.
const OH_GHOST = buildSprite([
  R('.', 3, 'g', 8, '.', 3),
  R('.', 1, 'g', 12, '.', 1),
  R('g', 14),
  R('g', 3, 'e', 2, 'g', 4, 'e', 2, 'g', 3),
  R('g', 3, 'e', 2, 'g', 4, 'e', 2, 'g', 3),
  R('g', 14),
  R('.', 1, 'g', 12, '.', 1),
  R('.', 2, 'g', 3, '.', 1, 'g', 3, '.', 1, 'g', 2, '.', 2),
  R('.', 3, 'g', 1, '.', 3, 'g', 1, '.', 3, 'g', 1, '.', 2),
]);


const SPRITES = {
  // The two leads use the high-density sheets above; the coarse DOE_*/HUNTER_*
  // rows are kept as the authored reference for their silhouettes.
  // Overhead sets (docs/overhaul/00-CAMERA-DIRECTION): four authored
  // directions per pose. The frontal HD sheets stay defined as references.
  hunter: OH_HUNTER,
  doe: OH_DOE,
  customer: OH_CUSTOMER,
  ghost: { idle: OH_GHOST, walk: OH_GHOST, palette: GHOST_PALETTE },
  waiter: OH_WAITER,
  nazim: OH_NAZIM,
  sam: OH_SAM,
  gerald: OH_GERALD,
  busboy: {
    idle: BUSBOY_IDLE, walk: BUSBOY_WALK,
    mop: BUSBOY_MOP, mopB: BUSBOY_MOP_B,
    palette: BUSBOY_PALETTE,
  },
  alex: {
    idle: ALEX_IDLE, walk: ALEX_WALK,
    split: ALEX_SPLIT,
    palette: ALEX_PALETTE,
  },
};
