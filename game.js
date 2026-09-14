// ============================================================================
// Waiter Chase — prototype
// Top-down 2D chase game. Pixelated 8-bit style rendering via a low internal
// resolution canvas scaled up with `image-rendering: pixelated` (see CSS).
// No build step / dependencies — plain canvas + JS.
// ============================================================================

// ---- Canvas setup ----------------------------------------------------------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const INTERNAL_W = canvas.width;   // 320
const INTERNAL_H = canvas.height;  // 180

// Splash image shown full-screen when the player is caught.
const caughtImage = new Image();
caughtImage.src = 'assets/caught.jpg';

// Splash image shown full-screen when a level is completed.
const levelDoneImage = new Image();
levelDoneImage.src = 'assets/LevelDone.png';

// Poster image shown behind the title screen.
const coverImage = new Image();
coverImage.src = 'assets/cover.png';

// ---- World ------------------------------------------------------------------
// Portrait map (narrower than tall) to match the intended floor plan: a small
// table up-left, a long many-seat table up-right, an L-shaped bar down the
// middle-left, a column of small 2-seat tables, and two wide tables below.
//
// SCALE doubles every spatial/motion constant below (world size, furniture
// layout, speeds, collision reach) in lockstep with the sprite pixel grid —
// since a sprite's pixel dimensions ARE its world-space hitbox (see
// makeEntity), redrawing sprites with more real detail means the whole world
// grid has to grow with them, not just the on-screen display size.
const SCALE = 2;
const WORLD_W = 200 * SCALE;
const WORLD_H = 360 * SCALE;
const TILE = 10 * SCALE;

// ---- Furniture: an L-shaped bar plus tables of varying size and seat count.
// Colliders block movement for both characters; visuals are z-sorted
// together with the characters below. ----------------------------------------
const TABLE_SIZE = 14 * SCALE; // default table size when a table doesn't specify w/h
const CHAIR_SIZE = 6 * SCALE;
const CHAIR_GAP = 2 * SCALE;

// A table can be any size and can put any number of chairs evenly spaced
// along each side (n/s/e/w), not just one — e.g. a long table with 4 seats
// down each long edge. `seats` counts default to 1 per side, 0 = no chairs
// on that side.
function makeTable(cx, cy, opts = {}) {
  const w = opts.w ?? TABLE_SIZE;
  const h = opts.h ?? TABLE_SIZE;
  const seats = { n: 1, s: 1, e: 1, w: 1, ...opts.seats };
  const type = opts.type ?? 'table';
  const seatStyle = opts.seatStyle ?? 'chairs';
  // A bare stool row (e.g. chairs at the bar) has no tabletop of its own to
  // block movement around — only the chairs drawn there should. A wall
  // bench (seatStyle 'bench') does draw a solid body matching its full w/h,
  // same as a table, so those still get the table-shaped collider below.
  const hasSolidBody = type !== 'bench' || seatStyle === 'bench';

  let collider;
  if (hasSolidBody) {
    // A side only needs room for a chair to stick out if it actually has
    // one — padding every side by the same chair-sized margin made the
    // walkable corridors around chairless sides feel needlessly tight.
    const CHAIR_PAD = CHAIR_GAP + CHAIR_SIZE;
    const padN = seats.n > 0 ? CHAIR_PAD : CHAIR_GAP;
    const padS = seats.s > 0 ? CHAIR_PAD : CHAIR_GAP;
    const padW = seats.w > 0 ? CHAIR_PAD : CHAIR_GAP;
    const padE = seats.e > 0 ? CHAIR_PAD : CHAIR_GAP;
    collider = {
      x: cx - (w / 2 + padW),
      y: cy - (h / 2 + padN),
      w: w + padW + padE,
      h: h + padN + padS,
    };
  } else {
    // Tight box around wherever the chairs actually land, instead of the
    // w/h footprint used only to space them out (which has no matching
    // visual and was blocking a much wider area than the chairs occupy).
    const seatPoints = getTableSeats({ x: cx, y: cy, w, h, seats });
    const half = CHAIR_SIZE / 2 + CHAIR_GAP;
    const xs = seatPoints.map(p => p.x);
    const ys = seatPoints.map(p => p.y);
    collider = {
      x: Math.min(...xs) - half,
      y: Math.min(...ys) - half,
      w: Math.max(...xs) - Math.min(...xs) + 2 * half,
      h: Math.max(...ys) - Math.min(...ys) + 2 * half,
    };
  }

  return {
    type,
    x: cx,
    y: cy,
    w,
    h,
    seats,
    seatStyle,
    // Sort by the table top's own front edge, not the wider chair footprint —
    // a customer seated south is standing at the table's edge and should
    // draw in front of it, not behind.
    sortY: cy + h / 2,
    collider,
  };
}

// Evenly spaced seats along one side of a table (used for both gameplay
// seat positions and where to draw the chair sprites, so they always match).
function getTableSeats(table) {
  const { x: cx, y: cy, w, h, seats } = table;
  const reachY = h / 2 + CHAIR_GAP + CHAIR_SIZE / 2;
  const reachX = w / 2 + CHAIR_GAP + CHAIR_SIZE / 2;
  function along(count, length) {
    const out = [];
    const step = length / (count + 1);
    for (let i = 1; i <= count; i++) out.push(-length / 2 + step * i);
    return out;
  }
  const out = [];
  for (const px of along(seats.n, w)) out.push({ x: cx + px, y: cy - reachY });
  for (const px of along(seats.s, w)) out.push({ x: cx + px, y: cy + reachY });
  for (const py of along(seats.w, h)) out.push({ x: cx - reachX, y: cy + py });
  for (const py of along(seats.e, h)) out.push({ x: cx + reachX, y: cy + py });
  return out;
}

// The bar as a small L: a short counter, a vertical stem, and a foot that
// meets it — three rectangular segments sharing the same visual treatment.
// Coordinates traced from assets/planFloor.png (the hand-drawn floor plan).
const BAR_SEGMENTS = [
  { x: 1, y: 67, w: 71, h: 22 },  // short counter, upper-left
  { x: 91, y: 109, w: 27, h: 90 }, // vertical stem
  { x: 1, y: 177, w: 87, h: 23 }, // foot, meets the stem, touches the wall
].map(r => ({
  type: 'bar',
  collider: { x: r.x * SCALE, y: r.y * SCALE, w: r.w * SCALE, h: r.h * SCALE },
  sortY: (r.y + r.h) * SCALE,
}));

const TABLES = [
  makeTable(44 * SCALE, 42 * SCALE, { w: 40 * SCALE, h: 26 * SCALE, seats: { n: 0, s: 0, w: 0, e: 2 } }),    // top-left
  makeTable(148 * SCALE, 58 * SCALE, { w: 40 * SCALE, h: 65 * SCALE, seats: { n: 0, s: 0, w: 4, e: 0 } }),   // top-right, long
  makeTable(180 * SCALE, 210 * SCALE, { w: 38 * SCALE, h: 32 * SCALE, seats: { n: 1, s: 1, e: 0, w: 0 } }),
  makeTable(180 * SCALE, 269 * SCALE, { w: 37 * SCALE, h: 33 * SCALE, seats: { n: 1, s: 1, e: 0, w: 0 } }),
  makeTable(58 * SCALE, 258 * SCALE, { w: 114 * SCALE, h: 29 * SCALE, seats: { n: 4, s: 4, e: 0, w: 0 } }),  // wide
  makeTable(58 * SCALE, 315 * SCALE, { w: 114 * SCALE, h: 29 * SCALE, seats: { n: 4, s: 4, e: 0, w: 0 } }),  // wide
];

// Wall-hugging benches: seating with no tabletop of its own. The four
// wall/corner benches draw as a single long bench shape (`seatStyle:
// 'bench'`) rather than a row of separate chairs; the two at the bar are
// individual stools (`seatStyle: 'chairs'`, the default), since that's how
// people actually sit at a bar. Reuses makeTable purely for its
// evenly-spaced-seats math and collider (for the "near their table" delivery
// check) — `type: 'bench'` tells the renderer to skip drawing a tabletop.
const BENCHES = [
  makeTable(39 * SCALE, 5 * SCALE, { w: 65 * SCALE, h: 10 * SCALE, seats: { n: 0, s: 3, e: 0, w: 0 }, type: 'bench', seatStyle: 'bench' }),   // top wall, left corner
  makeTable(6 * SCALE, 43 * SCALE, { w: 6 * SCALE, h: 55 * SCALE, seats: { n: 0, s: 0, e: 3, w: 0 }, type: 'bench', seatStyle: 'bench' }),   // left wall
  makeTable(164 * SCALE, 5 * SCALE, { w: 67 * SCALE, h: 10 * SCALE, seats: { n: 0, s: 3, e: 0, w: 0 }, type: 'bench', seatStyle: 'bench' }),  // top wall, right corner
  makeTable(192 * SCALE, 58 * SCALE, { w: 16 * SCALE, h: 71 * SCALE, seats: { n: 0, s: 0, e: 0, w: 4 }, type: 'bench', seatStyle: 'bench' }), // right wall, beside the long table
  makeTable(144 * SCALE, 151 * SCALE, { w: 16 * SCALE, h: 74 * SCALE, seats: { n: 0, s: 0, e: 0, w: 3 }, type: 'bench' }), // chairs at the bar (stem side)
  makeTable(51 * SCALE, 222 * SCALE, { w: 95 * SCALE, h: 14 * SCALE, seats: { n: 3, s: 0, e: 0, w: 0 }, type: 'bench' }), // chairs at the bar (foot side)
];

const FURNITURE = [...BAR_SEGMENTS, ...TABLES, ...BENCHES];

const SEATS = [...TABLES, ...BENCHES].flatMap(t => getTableSeats(t).map(seat => ({ ...seat, table: t, occupied: false })));

// Customers walk in from this point at the bottom wall.
const DOOR = { x: WORLD_W / 2, y: WORLD_H - 3 * SCALE };

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
  n: '#a9764f', // antler
  f: '#f2e8da', // hood ear fluff
  h: '#c9a86a', // hair
  j: '#a88a52', // hair part shadow
  k: '#f0c090', // skin
  g: '#141414', // glasses / brow
  e: '#5a4030', // beard
  d: '#6b4a30', // onesie
  c: '#e8ddc0', // chest patch
  s: '#2a2018', // feet / chest zipper seam
  o: '#4a3a2a', // sole highlight
};

// Redrawn at double resolution with real added detail (not a naive pixel
// upscale): a branching antler tine, a brow line above the glasses, a hair
// part, a zippered seam down the chest patch, and a two-tone shoe sole.
const DOE_IDLE = buildSprite([
  R('.', 11, 'n', 1, '.', 8, 'n', 1, '.', 11),                                    // antler tips, tapered
  R('.', 9, 'n', 1, '.', 1, 'n', 1, '.', 8, 'n', 1, '.', 1, 'n', 1, '.', 9),       // antler branch/tine
  R('.', 10, 'n', 2, '.', 8, 'n', 2, '.', 10),                                    // antler base, thicker
  R('.', 10, 'n', 2, '.', 8, 'n', 2, '.', 10),
  R('.', 6, 'f', 4, '.', 12, 'f', 4, '.', 6),                                     // ear fluff
  R('.', 7, 'f', 2, '.', 14, 'f', 2, '.', 7),                                     // fluff taper
  R('.', 8, 'h', 7, 'j', 2, 'h', 7, '.', 8),                                      // hairline part
  R('.', 8, 'h', 16, '.', 8),
  R('.', 6, 'h', 2, 'k', 16, 'h', 2, '.', 6),
  R('.', 6, 'h', 2, 'k', 2, 'g', 4, 'k', 4, 'g', 4, 'k', 2, 'h', 2, '.', 6),       // brow dashes
  R('.', 8, 'g', 6, 'k', 4, 'g', 6, '.', 8),                                      // round lenses + skin bridge
  R('.', 8, 'g', 6, 'k', 4, 'g', 6, '.', 8),
  R('.', 8, 'k', 16, '.', 8),
  R('.', 8, 'k', 16, '.', 8),
  R('.', 8, 'e', 16, '.', 8),
  R('.', 8, 'e', 16, '.', 8),
  R('.', 10, 'e', 12, '.', 10),
  R('.', 10, 'e', 12, '.', 10),
  R('.', 4, 'd', 8, 'c', 4, 's', 1, 'c', 3, 'd', 8, '.', 4),                      // chest patch, zipper seam
  R('.', 4, 'd', 8, 'c', 4, 's', 1, 'c', 3, 'd', 8, '.', 4),
  R('.', 2, 'd', 8, 'c', 6, 's', 1, 'c', 5, 'd', 8, '.', 2),
  R('.', 2, 'd', 8, 'c', 6, 's', 1, 'c', 5, 'd', 8, '.', 2),
  R('.', 2, 'd', 10, 'c', 4, 's', 1, 'c', 3, 'd', 10, '.', 2),
  R('.', 2, 'd', 10, 'c', 4, 's', 1, 'c', 3, 'd', 10, '.', 2),
  R('.', 4, 'd', 24, '.', 4),
  R('.', 4, 'd', 24, '.', 4),
  R('.', 6, 'd', 20, '.', 6),
  R('.', 6, 'd', 20, '.', 6),
  R('.', 8, 'd', 6, '.', 4, 'd', 6, '.', 8),
  R('.', 8, 'd', 6, '.', 4, 'd', 6, '.', 8),
  R('.', 8, 'd', 6, '.', 4, 'd', 6, '.', 8),
  R('.', 8, 'd', 6, '.', 4, 'd', 6, '.', 8),
  R('.', 8, 'd', 6, '.', 4, 'd', 6, '.', 8),
  R('.', 8, 'd', 6, '.', 4, 'd', 6, '.', 8),
  R('.', 6, 's', 6, '.', 4, 's', 6, '.', 6),
  R('.', 6, 's', 2, 'o', 2, 's', 2, '.', 4, 's', 2, 'o', 2, 's', 2, '.', 6),       // sole highlight
]);

const DOE_WALK = buildSprite([
  ...DOE_IDLE.rows.slice(0, 28),
  R('.', 8, 'd', 6, '.', 4, 'd', 6, '.', 8),
  R('.', 8, 'd', 6, '.', 4, 'd', 6, '.', 8),
  R('.', 6, 'd', 6, '.', 8, 'd', 6, '.', 6),
  R('.', 6, 'd', 6, '.', 8, 'd', 6, '.', 6),
  R('.', 4, 'd', 6, '.', 12, 'd', 6, '.', 4),
  R('.', 4, 'd', 6, '.', 12, 'd', 6, '.', 4),
  R('.', 2, 's', 4, 'o', 2, '.', 16, 's', 4, 'o', 2, '.', 2),
  R('.', 2, 's', 4, 'o', 2, '.', 16, 's', 4, 'o', 2, '.', 2),
]);

// --- Hunter: fedora, glasses, red/black flannel, olive pants, and a
// shotgun barrel jutting out at shoulder height. ---------------------------
const HUNTER_PALETTE = {
  '.': null,
  o: '#5c5a3e', // fedora crown
  r: '#454330', // fedora brim
  k: '#f0c090', // skin
  g: '#141414', // glasses / brow
  w: '#e8e4d8', // collar
  f: '#8a2020', // flannel red
  x: '#1c1c1c', // flannel black check / brim shadow / hat band
  p: '#4a4630', // pants
  s: '#1a1512', // shoes
  u: '#3a2f22', // shotgun barrel
  v: '#241a10', // shotgun stock (darker, two-tone gun)
  b: '#3a2f22', // boot sole highlight
};

// Redrawn at double resolution with real added detail: a brim shadow and a
// hat band on the fedora, a brow line, a finer woven checker plaid (small
// squares instead of big 2x2 blocks) with a two-tone shotgun, and a boot
// sole highlight.
const HUNTER_IDLE = buildSprite([
  R('.', 8, 'o', 16, '.', 8),
  R('.', 4, 'r', 24, '.', 4),
  R('.', 4, 'x', 24, '.', 4),                                                     // brim underside shadow
  R('.', 8, 'o', 5, 'x', 6, 'o', 5, '.', 8),                                      // hat band
  R('.', 8, 'o', 16, '.', 8),
  R('.', 8, 'k', 16, '.', 8),
  R('.', 8, 'k', 16, '.', 8),
  R('.', 6, 'k', 2, 'x', 4, 'k', 4, 'x', 4, 'k', 2, '.', 6),                       // brow dashes
  R('.', 8, 'g', 6, 'k', 4, 'g', 6, '.', 8),                                      // round lenses + skin bridge
  R('.', 8, 'g', 6, 'k', 4, 'g', 6, '.', 8),
  R('.', 8, 'k', 16, '.', 8),
  R('.', 8, 'k', 16, '.', 8),
  R('.', 8, 'w', 16, '.', 8),
  R('.', 8, 'w', 16, '.', 8),
  // Finer woven checker plaid (2px squares) instead of the old 4px blocks,
  // plus a two-tone shotgun (lighter barrel over a darker stock).
  R('.', 4, 'w', 4, 'f', 2, 'x', 2, 'f', 2, 'x', 2, 'f', 2, 'x', 2, 'f', 2, 'x', 2, 'w', 4, '.', 4, 'u', 10),
  R('.', 4, 'w', 4, 'x', 2, 'f', 2, 'x', 2, 'f', 2, 'x', 2, 'f', 2, 'x', 2, 'f', 2, 'w', 4, '.', 4, 'v', 10),
  R('.', 4, 'w', 4, 'f', 2, 'x', 2, 'f', 2, 'x', 2, 'f', 2, 'x', 2, 'f', 2, 'x', 2, 'w', 4, '.', 4),
  R('.', 4, 'w', 4, 'x', 2, 'f', 2, 'x', 2, 'f', 2, 'x', 2, 'f', 2, 'x', 2, 'f', 2, 'w', 4, '.', 4),
  R('.', 4, 'w', 4, 'f', 2, 'x', 2, 'f', 2, 'x', 2, 'f', 2, 'x', 2, 'f', 2, 'x', 2, 'w', 4, '.', 4),
  R('.', 4, 'w', 4, 'x', 2, 'f', 2, 'x', 2, 'f', 2, 'x', 2, 'f', 2, 'x', 2, 'f', 2, 'w', 4, '.', 4),
  R('.', 4, 'x', 20, '.', 4),
  R('.', 4, 'x', 20, '.', 4),
  R('.', 6, 'x', 20, '.', 6),
  R('.', 6, 'x', 20, '.', 6),
  R('.', 6, 'p', 20, '.', 6),
  R('.', 6, 'p', 20, '.', 6),
  R('.', 8, 'p', 16, '.', 8),
  R('.', 8, 'p', 16, '.', 8),
  R('.', 8, 'p', 4, '.', 4, 'p', 4, '.', 8),
  R('.', 8, 'p', 4, '.', 4, 'p', 4, '.', 8),
  R('.', 8, 'p', 4, '.', 4, 'p', 4, '.', 8),
  R('.', 8, 'p', 4, '.', 4, 'p', 4, '.', 8),
  R('.', 8, 'p', 4, '.', 4, 'p', 4, '.', 8),
  R('.', 8, 'p', 4, '.', 4, 'p', 4, '.', 8),
  R('.', 6, 's', 6, '.', 4, 's', 6, '.', 6),
  R('.', 6, 's', 4, 'b', 2, '.', 4, 's', 4, 'b', 2, '.', 6),                       // boot sole highlight
]);

const HUNTER_WALK = buildSprite([
  ...HUNTER_IDLE.rows.slice(0, 28),
  R('.', 8, 'p', 4, '.', 4, 'p', 4, '.', 8),
  R('.', 8, 'p', 4, '.', 4, 'p', 4, '.', 8),
  R('.', 6, 'p', 4, '.', 8, 'p', 4, '.', 6),
  R('.', 6, 'p', 4, '.', 8, 'p', 4, '.', 6),
  R('.', 4, 'p', 4, '.', 12, 'p', 4, '.', 4),
  R('.', 4, 'p', 4, '.', 12, 'p', 4, '.', 4),
  R('.', 2, 's', 4, 'b', 2, '.', 16, 's', 4, 'b', 2, '.', 2),
  R('.', 2, 's', 4, 'b', 2, '.', 16, 's', 4, 'b', 2, '.', 2),
]);

// --- Customer: plain pub patron. Geometry is shared; each customer gets
// its own palette instance so shirt color varies. Redrawn at double
// resolution with a hair part, a collar line, and a two-tone shoe — kept
// simpler than the doe/hunter leads per the "plain patron" intent above.
const CUSTOMER_IDLE = buildSprite([
  R('.', 10, 'h', 8, '.', 10),
  R('.', 8, 'h', 5, 'q', 2, 'h', 5, '.', 8),                                      // hair part
  R('.', 6, 'h', 2, 'k', 12, 'h', 2, '.', 6),
  R('.', 8, 'k', 12, '.', 8),
  R('.', 8, 'm', 4, 'l', 4, 'm', 4, '.', 8),                                      // collar line
  R('.', 6, 'm', 16, '.', 6),
  R('.', 4, 'm', 20, '.', 4),
  R('.', 4, 'm', 20, '.', 4),
  R('.', 6, 'm', 16, '.', 6),
  R('.', 6, 'p', 16, '.', 6),
  R('.', 8, 'p', 4, '.', 4, 'p', 4, '.', 8),
  R('.', 8, 'p', 4, '.', 4, 'p', 4, '.', 8),
  R('.', 6, 's', 4, 'h', 2, '.', 4, 's', 4, 'h', 2, '.', 6),                      // two-tone shoe
]);

const CUSTOMER_WALK = buildSprite([
  ...CUSTOMER_IDLE.rows.slice(0, 20),
  R('.', 6, 'p', 4, '.', 8, 'p', 4, '.', 6),
  R('.', 6, 'p', 4, '.', 8, 'p', 4, '.', 6),
  R('.', 4, 'p', 4, '.', 12, 'p', 4, '.', 4),
  R('.', 4, 'p', 4, '.', 12, 'p', 4, '.', 4),
  R('.', 2, 's', 4, 'h', 2, '.', 16, 's', 4, 'h', 2, '.', 2),
  R('.', 2, 's', 4, 'h', 2, '.', 16, 's', 4, 'h', 2, '.', 2),
]);

const CUSTOMER_SHIRT_COLORS = ['#4a6fa5', '#8a4a9e', '#4a9e6a', '#c9a227', '#c9622f', '#5a7d8a'];

// --- Ghost: a purely decorative apparition (see the state/update block near
// the customers below). Translucent fill baked into the palette itself (via
// rgba) so it reads as see-through even before the render pass's extra
// globalAlpha fade is applied. Single frame — it drifts, it doesn't walk.
const GHOST_PALETTE = {
  '.': null,
  g: 'rgba(225,235,255,0.75)',
  e: 'rgba(30,30,45,0.85)',
};
const GHOST_IDLE = buildSprite([
  R('.', 8, 'g', 8, '.', 8),
  R('.', 6, 'g', 12, '.', 6),
  R('.', 4, 'g', 16, '.', 4),
  R('.', 3, 'g', 18, '.', 3),
  R('.', 2, 'g', 20, '.', 2),
  R('g', 24),
  R('g', 24),
  R('g', 8, 'e', 3, 'g', 2, 'e', 3, 'g', 8),                                      // eyes
  R('g', 8, 'e', 3, 'g', 2, 'e', 3, 'g', 8),
  R('g', 24),
  R('g', 24),
  R('g', 24),
  R('g', 24),
  R('g', 24),
  R('g', 24),
  R('g', 24),
  R('.', 2, 'g', 4, '.', 2, 'g', 4, '.', 2, 'g', 4, '.', 2, 'g', 4),              // scalloped, wispy tail
]);

function makeCustomerPalette() {
  return {
    '.': null,
    h: '#3a2a1a',
    q: '#241a10', // hair part shadow
    k: '#f0c090',
    m: CUSTOMER_SHIRT_COLORS[Math.floor(Math.random() * CUSTOMER_SHIRT_COLORS.length)],
    l: '#2a2a2a', // collar trim
    p: '#2a2418',
    s: '#1a1512',
  };
}

// ---- Order icons: glyphs shown in a customer's speech bubble and above
// the player's head while carrying an order. Redrawn at roughly double
// resolution with real added detail: a mug handle, a proper wine glass
// bowl/stem/foot, a cocktail with a rim garnish, and a plate with distinct
// food + garnish. --------------------------------------------------------
const MUG_ROWS = [
  R('.', 2, 'f', 8, '.', 5),
  R('.', 2, 'f', 8, '.', 5),
  R('f', 12, '.', 3),
  R('f', 12, '.', 3),
  R('o', 2, 'L', 8, 'o', 5),
  R('o', 2, 'L', 8, 'o', 5),
  R('o', 2, 'L', 8, 'o', 2, '.', 2, 'o', 1),
  R('o', 2, 'L', 8, 'o', 2, '.', 2, 'o', 1),
  R('o', 2, 'L', 8, 'o', 2, '.', 2, 'o', 1),
  R('o', 2, 'L', 8, 'o', 2, '.', 2, 'o', 1),
  R('o', 2, 'L', 8, 'o', 2, '.', 2, 'o', 1),
  R('o', 2, 'L', 8, 'o', 2, '.', 2, 'o', 1),
  R('o', 2, 'L', 8, 'o', 5),
  R('o', 2, 'L', 8, 'o', 5),
  R('o', 12, '.', 3),
  R('o', 12, '.', 3),
];
const COCKTAIL_ROWS = [
  R('o', 5, 'G', 2, 'o', 5),
  R('.', 1, 'L', 10, '.', 1),
  R('.', 2, 'L', 8, '.', 2),
  R('.', 3, 'L', 6, '.', 3),
  R('.', 4, 'L', 4, '.', 4),
  R('.', 5, 'o', 2, '.', 5),
  R('.', 5, 'o', 2, '.', 5),
  R('.', 5, 'o', 2, '.', 5),
  R('.', 5, 'o', 2, '.', 5),
  R('.', 4, 'o', 4, '.', 4),
  R('.', 3, 'o', 6, '.', 3),
  R('.', 12),
  R('.', 12),
  R('.', 12),
  R('.', 12),
  R('.', 12),
];
const WINE_ROWS = [
  R('.', 3, 'o', 6, '.', 3),
  R('.', 1, 'o', 2, 'L', 6, 'o', 2, '.', 1),
  R('o', 1, 'L', 10, 'o', 1),
  R('o', 1, 'L', 10, 'o', 1),
  R('.', 1, 'o', 2, 'L', 6, 'o', 2, '.', 1),
  R('.', 3, 'o', 6, '.', 3),
  R('.', 5, 'o', 2, '.', 5),
  R('.', 5, 'o', 2, '.', 5),
  R('.', 5, 'o', 2, '.', 5),
  R('.', 5, 'o', 2, '.', 5),
  R('.', 4, 'o', 4, '.', 4),
  R('.', 2, 'o', 8, '.', 2),
  R('.', 12),
  R('.', 12),
  R('.', 12),
  R('.', 12),
];
const FOOD_ROWS = [
  R('.', 12),
  R('.', 2, 'p', 8, '.', 2),
  R('p', 12),
  R('p', 12),
  R('p', 1, 'M', 4, 'G', 2, 'M', 4, 'p', 1),
  R('p', 1, 'M', 10, 'p', 1),
  R('p', 1, 'M', 10, 'p', 1),
  R('p', 2, 'M', 8, 'p', 2),
  R('p', 12),
  R('.', 2, 'p', 8, '.', 2),
  R('.', 12),
  R('.', 12),
  R('.', 12),
  R('.', 12),
  R('.', 12),
  R('.', 12),
];

function beerPalette(liquid) {
  return { '.': null, f: '#f5f0e0', o: '#2a1c10', L: liquid };
}

const ORDER_ICONS = {
  'beer-dark': { sprite: buildSprite(MUG_ROWS), palette: beerPalette('#3a2414') },
  'beer-red': { sprite: buildSprite(MUG_ROWS), palette: beerPalette('#8a2418') },
  'beer-blond': { sprite: buildSprite(MUG_ROWS), palette: beerPalette('#e8b830') },
  cocktail: { sprite: buildSprite(COCKTAIL_ROWS), palette: { '.': null, o: '#2a1c10', L: '#d94f8c', G: '#5a8a3a' } },
  wine: { sprite: buildSprite(WINE_ROWS), palette: { '.': null, o: '#2a1c10', L: '#7a1428' } },
  food: { sprite: buildSprite(FOOD_ROWS), palette: { '.': null, p: '#d8d8d8', M: '#a9622f', G: '#5a8a3a' } },
};
const ORDER_TYPES = Object.keys(ORDER_ICONS);
function randomOrderType() { return ORDER_TYPES[Math.floor(Math.random() * ORDER_TYPES.length)]; }

const SPRITES = {
  hunter: { idle: HUNTER_IDLE, walk: HUNTER_WALK, palette: HUNTER_PALETTE },
  doe: { idle: DOE_IDLE, walk: DOE_WALK, palette: DOE_PALETTE },
  customer: { idle: CUSTOMER_IDLE, walk: CUSTOMER_WALK, palette: null },
  ghost: { idle: GHOST_IDLE, walk: GHOST_IDLE, palette: GHOST_PALETTE },
};

function drawSprite(sprite, palette, screenX, screenY, flipX) {
  const { rows, w } = sprite;
  for (let ry = 0; ry < rows.length; ry++) {
    const row = rows[ry];
    for (let rx = 0; rx < row.length; rx++) {
      const ch = row[rx];
      const color = palette[ch];
      if (!color) continue;
      const col = flipX ? (w - 1 - rx) : rx;
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(screenX + col), Math.round(screenY + ry), 1, 1);
    }
  }
}

// ---- Collision: furniture blocks movement for both characters. A small
// footprint box near the feet is tested against each furniture collider so
// characters can still visually overlap tall furniture like a real top-down
// game (sprite draws above its feet). -------------------------------------
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function getFootBox(e, x, y) {
  const w = e.w * 0.55;
  const h = 7 * SCALE;
  return { x: x - w / 2, y: y - h, w, h };
}

function collidesAt(e, x, y, exclude) {
  const box = getFootBox(e, x, y);
  for (const f of FURNITURE) {
    if (f === exclude) continue;
    if (rectsOverlap(box, f.collider)) return true;
  }
  return false;
}

// Moves an entity by (dx, dy), resolving each axis independently so it can
// slide along furniture/walls instead of stopping dead on diagonal moves.
function tryMove(e, dx, dy) {
  let x = e.x;
  let y = e.y;
  let blockedX = false;
  let blockedY = false;

  if (dx !== 0) {
    const nx = clamp(e.x + dx, e.w / 2, WORLD_W - e.w / 2);
    if (nx !== e.x && !collidesAt(e, nx, y)) x = nx;
    else blockedX = true;
  }
  if (dy !== 0) {
    const ny = clamp(e.y + dy, e.h / 2, WORLD_H - e.h / 2);
    if (ny !== e.y && !collidesAt(e, x, ny)) y = ny;
    else blockedY = true;
  }
  return { x, y, blockedX, blockedY };
}

// ---- Customer path routing: customers don't have real-time obstacle
// avoidance (see tryMove above, which is for the player/hunter), but the
// floor plan is static, so a route from the door to a seat can be worked
// out once, up front, with a coarse-grid search — cheap since it only runs
// when a customer starts entering/leaving, never per frame. A line-of-sight
// smoothing pass then collapses that grid path down to a handful of
// waypoints so movement still reads as a straight walk, not grid-snapping.
const PATH_CELL = 8 * SCALE;
const PATH_MARGIN = (SPRITES.customer.idle.w * 0.55) / 2;

function segmentHitsRect(p1, p2, rect, steps = 24) {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = p1.x + (p2.x - p1.x) * t;
    const y = p1.y + (p2.y - p1.y) * t;
    if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) return true;
  }
  return false;
}

function findBlockingObstacle(p1, p2, exclude) {
  for (const f of FURNITURE) {
    if (f === exclude) continue;
    const r = f.collider;
    // Inflate by the customer's footprint so a "clear" line leaves room for
    // their actual collision box, not just their center point.
    const inflated = { x: r.x - PATH_MARGIN, y: r.y - PATH_MARGIN, w: r.w + 2 * PATH_MARGIN, h: r.h + 2 * PATH_MARGIN };
    if (segmentHitsRect(p1, p2, inflated)) return f;
  }
  return null;
}

function pointBlocked(x, y, excludeTable) {
  // Mirrors getFootBox's feet-anchored shape (see collision section above)
  // so the grid agrees with the runtime collision check that walks it.
  const footH = 7 * SCALE;
  const box = { x: x - PATH_MARGIN, y: y - footH, w: PATH_MARGIN * 2, h: footH };
  for (const f of FURNITURE) {
    if (f === excludeTable) continue;
    if (rectsOverlap(box, f.collider)) return true;
  }
  return false;
}

function cellFromKey(k, cols) {
  return { cx: k % cols, cy: Math.floor(k / cols) };
}

// Same world clamp tryMove/updateCustomer apply to a customer's position —
// the grid must agree, or it can route through a corner (e.g. a world edge)
// the entity can never actually reach.
const CUSTOMER_HALF_W = SPRITES.customer.idle.w / 2;
const CUSTOMER_HALF_H = SPRITES.customer.idle.h / 2;
function cellCenter(cx, cy) {
  return {
    x: clamp(cx * PATH_CELL, CUSTOMER_HALF_W, WORLD_W - CUSTOMER_HALF_W),
    y: clamp(cy * PATH_CELL, CUSTOMER_HALF_H, WORLD_H - CUSTOMER_HALF_H),
  };
}

// Full path computation: grid search for a walkable route, then collapse it
// to the minimal set of waypoints a straight-line walk can follow without
// clipping anything (skip ahead to the farthest point still in clear sight).
function computeCustomerPath(from, to, excludeTable) {
  if (!findBlockingObstacle(from, to, excludeTable)) return [to];

  const cols = Math.ceil(WORLD_W / PATH_CELL);
  const rows = Math.ceil(WORLD_H / PATH_CELL);
  const toCell = p => ({
    cx: clamp(Math.round(p.x / PATH_CELL), 0, cols - 1),
    cy: clamp(Math.round(p.y / PATH_CELL), 0, rows - 1),
  });
  const key = (cx, cy) => cy * cols + cx;
  const start = toCell(from);
  const goal = toCell(to);

  const blocked = new Map();
  const isBlocked = (cx, cy) => {
    const k = key(cx, cy);
    if (!blocked.has(k)) {
      const c = cellCenter(cx, cy);
      blocked.set(k, pointBlocked(c.x, c.y, excludeTable));
    }
    return blocked.get(k);
  };

  const open = [{ cx: start.cx, cy: start.cy, g: 0, f: 0 }];
  const cameFrom = new Map();
  const gScore = new Map([[key(start.cx, start.cy), 0]]);
  const closed = new Set();
  const heuristic = (cx, cy) => Math.hypot(cx - goal.cx, cy - goal.cy);

  let reached = null;
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    const ck = key(cur.cx, cur.cy);
    if (closed.has(ck)) continue;
    closed.add(ck);
    if (cur.cx === goal.cx && cur.cy === goal.cy) { reached = ck; break; }
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cur.cx + dx, ny = cur.cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        if (isBlocked(nx, ny)) continue;
        if (dx !== 0 && dy !== 0 && (isBlocked(cur.cx + dx, cur.cy) || isBlocked(cur.cx, cur.cy + dy))) continue;
        const g = cur.g + Math.hypot(dx, dy);
        const nk = key(nx, ny);
        if (gScore.has(nk) && g >= gScore.get(nk)) continue;
        gScore.set(nk, g);
        cameFrom.set(nk, ck);
        open.push({ cx: nx, cy: ny, g, f: g + heuristic(nx, ny) });
      }
    }
  }

  if (reached === null) return [to]; // no walkable route found; fall back to a straight line

  const cellPoints = [];
  let k = reached;
  while (cameFrom.has(k)) {
    const { cx, cy } = cellFromKey(k, cols);
    cellPoints.unshift(cellCenter(cx, cy));
    k = cameFrom.get(k);
  }
  cellPoints.push(to);

  // String-pulling: from `from`, skip ahead to the farthest waypoint still
  // reachable in a straight line, repeat from there.
  const waypoints = [];
  let cursor = from;
  let i = 0;
  while (i < cellPoints.length) {
    let farthest = i;
    for (let j = i; j < cellPoints.length; j++) {
      if (!findBlockingObstacle(cursor, cellPoints[j], excludeTable)) farthest = j;
    }
    waypoints.push(cellPoints[farthest]);
    cursor = cellPoints[farthest];
    i = farthest + 1;
  }
  return waypoints;
}

// ---- Entities -----------------------------------------------------------
function makeEntity(kind, x, y) {
  const s = SPRITES[kind];
  return {
    kind,
    x, y,
    w: s.idle.w,
    h: s.idle.h,
    speed: (kind === 'doe' ? 62 : kind === 'customer' ? 38 : kind === 'ghost' ? 16 : 54) * SCALE,
    flip: false,
    legTimer: 0,
    legFrame: 0,
    moving: false,
    palette: null,
  };
}

const player = makeEntity('doe', WORLD_W / 2, WORLD_H / 2);
const hunter = makeEntity('hunter', WORLD_W / 2 + 60, WORLD_H / 2 - 90);

let hunterDir = { x: 0, y: 0 };
let hunterChangeTimer = 0;

let caught = false;
let score = 0;
const POINTS_PER_DELIVERY = 10;
const FORGOTTEN_PENALTY = 15;

// While true, the CAUGHT screen shows a name-entry prompt instead of the
// "press SPACE to restart" message — gameplay stays frozen (via `caught`)
// until the player confirms a name, so the run's score gets saved with one.
let enteringName = false;
let nameInput = '';
const NAME_MAX_LEN = 12;

// ---- Life: instead of an instant game-over, getting caught costs a third of
// a continuous life bar (1 = full). A brief invulnerability window after a hit
// stops the same touch from draining multiple thirds in one frame, and life
// slowly regenerates once a few seconds pass without being caught again.
// `caught` still means "game over" — it only flips true once life hits 0.
let life = 1;
const LIFE_MAX = 1;
const LIFE_HIT_FRACTION = 1 / 3;
const LIFE_HIT_INVULN = 1.5;
const LIFE_REGEN_DELAY = 3;
const LIFE_REGEN_DURATION = 20; // seconds for a fully-drained bar to refill
let hitInvulnTimer = 0;
let regenDelayTimer = 0;

// ---- Levels: every LEVEL_UP_SCORE points ramps up difficulty (more
// customers, a hungrier hunter). Level is derived from score rather than
// tracked separately, so a restart resets it for free. Scaling is capped at
// EFFECTIVE_LEVEL_CAP so the game plateaus instead of becoming impossible —
// the displayed level keeps climbing past that as a badge of endurance.
const LEVEL_UP_SCORE = 100;
const EFFECTIVE_LEVEL_CAP = 10;
function getLevel() { return Math.floor(score / LEVEL_UP_SCORE) + 1; }

// Level-done splash: shown briefly (gameplay frozen) whenever getLevel()
// ticks up. `lastLevel` tracks the previous frame's level so the crossing
// can be detected regardless of which score change (delivery, penalty)
// caused it. `splashLevel` is the level that was just completed, not the
// new one, so the text reads "Level 1 done" right as level 2 begins.
const LEVEL_SPLASH_DURATION = 2.5;
let lastLevel = 1;
let levelSplashTimer = 0;
let splashLevel = null;

// Small floating "+10"/"-15" texts that pop up at a point and drift/fade —
// gives the score/penalty feedback a place to happen visually.
const floatingTexts = [];
function addFloatingText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color, ttl: 1 });
}

// player.carrying: null, or { type, customer } while ferrying an order from
// the bar to the customer who ordered it.
player.carrying = null;

// ---- Customers: trickle in from the door, walk to a free seat, sit for a
// while, then leave. No movement collision with the chase, but once seated
// they order something (a speech-bubble icon) that the player has to fetch
// from the bar and deliver — a customer who gives up unserved costs points.
const customers = [];
const BASE_MAX_CUSTOMERS = 6;
let customerSpawnTimer = 3;

function spawnCustomer() {
  const freeSeat = SEATS.filter(s => !s.occupied);
  if (!freeSeat.length) return;
  const seat = freeSeat[Math.floor(Math.random() * freeSeat.length)];
  seat.occupied = true;
  const c = makeEntity('customer', DOOR.x, DOOR.y);
  c.palette = makeCustomerPalette();
  c.state = 'entering';
  c.seat = seat;
  c.path = computeCustomerPath(DOOR, seat, seat.table);
  c.pathIndex = 0;
  c.sitTimer = 0;
  c.orderType = null;
  c.orderTimer = 0;
  c.served = false;
  c.beingCarried = false;
  customers.push(c);
}

function updateCustomer(c, dt) {
  if (c.state === 'entering' || c.state === 'leaving') {
    const target = c.path[c.pathIndex];
    const dx = target.x - c.x;
    const dy = target.y - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1.5 * SCALE) {
      c.x = target.x;
      c.y = target.y;
      if (c.pathIndex < c.path.length - 1) {
        c.pathIndex++;
        return null;
      }
      c.moving = false;
      if (c.state === 'entering') {
        c.state = 'sitting';
        c.sitTimer = 30 + Math.random() * 20; // patient: 30-50s before giving up
        c.patienceDuration = c.sitTimer; // remembered so the patience bar can show a fraction
        c.orderTimer = 1 + Math.random() * 1.5;
      } else {
        return 'remove';
      }
    } else {
      const step = Math.min(dist, c.speed * dt);
      const stepX = (dx / dist) * step;
      const stepY = (dy / dist) * step;
      // Slide around other tables like the player does (the routed path
      // above avoids them, this is just a safety net), but never collide
      // with the customer's own table — its seats sit inside that table's
      // padded collider, so excluding it is what lets them reach the seat.
      const ownTable = c.seat.table;
      const nx = clamp(c.x + stepX, c.w / 2, WORLD_W - c.w / 2);
      if (!collidesAt(c, nx, c.y, ownTable)) c.x = nx;
      const ny = clamp(c.y + stepY, c.h / 2, WORLD_H - c.h / 2);
      if (!collidesAt(c, c.x, ny, ownTable)) c.y = ny;
      c.flip = dx < 0;
      c.moving = true;
    }
  } else if (c.state === 'sitting') {
    c.moving = false;
    if (c.orderType === null) {
      c.orderTimer -= dt;
      if (c.orderTimer <= 0) c.orderType = randomOrderType();
    }
    c.sitTimer -= dt;
    if (c.sitTimer <= 0) {
      c.seat.occupied = false;
      if (!c.served && c.orderType) {
        score = Math.max(0, score - FORGOTTEN_PENALTY);
        addFloatingText(c.x, c.y - c.h - 4, '-' + FORGOTTEN_PENALTY, '#e84c3d');
      }
      c.state = 'leaving';
      c.path = computeCustomerPath(c, DOOR, c.seat.table);
      c.pathIndex = 0;
    }
  }
  return null;
}

// ---- Ghost: a purely aesthetic apparition. Every few minutes it drifts in
// a straight line across the pub, through walls and furniture alike (no
// collision, no interaction with score/hunter/player), and vanishes off the
// far side. `ghost` is null whenever none is currently on screen.
let ghost = null;
const GHOST_INTERVAL_MIN = 90;
const GHOST_INTERVAL_MAX = 180;
let ghostSpawnTimer = GHOST_INTERVAL_MIN + Math.random() * (GHOST_INTERVAL_MAX - GHOST_INTERVAL_MIN);

function spawnGhost() {
  const y = 20 * SCALE + Math.random() * (WORLD_H - 40 * SCALE);
  const margin = 24 * SCALE;
  const fromLeft = Math.random() < 0.5;
  ghost = makeEntity('ghost', fromLeft ? -margin : WORLD_W + margin, y);
  ghost.targetX = fromLeft ? WORLD_W + margin : -margin;
  ghost.moving = true;
}

function updateGhost(dt) {
  ghostSpawnTimer -= dt;
  if (!ghost && ghostSpawnTimer <= 0) {
    spawnGhost();
    ghostSpawnTimer = GHOST_INTERVAL_MIN + Math.random() * (GHOST_INTERVAL_MAX - GHOST_INTERVAL_MIN);
  }
  if (ghost) {
    const dir = ghost.targetX > ghost.x ? 1 : -1;
    ghost.x += dir * ghost.speed * dt;
    ghost.flip = dir < 0;
    if ((dir > 0 && ghost.x >= ghost.targetX) || (dir < 0 && ghost.x <= ghost.targetX)) ghost = null;
  }
}

function pickClearSpawn(e) {
  for (let i = 0; i < 30; i++) {
    const x = clamp(WORLD_W / 2 + (Math.random() < 0.5 ? 1 : -1) * Math.random() * WORLD_W * 0.4, e.w / 2, WORLD_W - e.w / 2);
    const y = clamp(WORLD_H / 2 + (Math.random() < 0.5 ? 1 : -1) * Math.random() * WORLD_H * 0.4, e.h / 2, WORLD_H - e.h / 2);
    if (!collidesAt(e, x, y)) return { x, y };
  }
  return { x: 125 * SCALE, y: 150 * SCALE }; // fallback: open floor between the bar and the long table
}

function resetGame() {
  const playerSpawn = pickClearSpawn(player);
  player.x = playerSpawn.x;
  player.y = playerSpawn.y;
  const spawn = pickClearSpawn(hunter);
  hunter.x = spawn.x;
  hunter.y = spawn.y;
  hunterDir = { x: 0, y: 0 };
  hunterChangeTimer = 0;
  caught = false;
  enteringName = false;
  nameInput = '';
  life = LIFE_MAX;
  hitInvulnTimer = 0;
  regenDelayTimer = 0;
  lastLevel = 1;
  levelSplashTimer = 0;
  splashLevel = null;
  score = 0;
  customers.length = 0;
  for (const seat of SEATS) seat.occupied = false;
  customerSpawnTimer = 3;
  player.carrying = null;
  floatingTexts.length = 0;
  ghost = null;
  ghostSpawnTimer = GHOST_INTERVAL_MIN + Math.random() * (GHOST_INTERVAL_MAX - GHOST_INTERVAL_MIN);
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ---- High scores: kept in localStorage so they survive a page reload.
// Read/write are wrapped in try/catch since localStorage can throw (private
// browsing, disabled storage) — losing the high score list isn't worth a
// crash over.
const HIGH_SCORE_KEY = 'lepub_highscores';
const HIGH_SCORE_MAX = 5;

function loadHighScores() {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    const scores = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(scores)) return [];
    // Normalize old entries saved before names were tracked (plain numbers)
    // so a pre-existing list doesn't crash the high-score screen.
    return scores.map(s => (typeof s === 'number' ? { name: '???', score: s } : s));
  } catch {
    return [];
  }
}

function saveHighScore(name, value) {
  if (value <= 0) return;
  const scores = loadHighScores();
  scores.push({ name: name || '???', score: value });
  scores.sort((a, b) => b.score - a.score);
  scores.length = Math.min(scores.length, HIGH_SCORE_MAX);
  try {
    localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(scores));
  } catch {
    // ignore — storage unavailable
  }
}

// ---- App state: the title screen, its sub-menus, and the game itself are
// all one state machine so update()/render() know what to run each frame.
// 'playing' still uses `caught` internally for the in-game "you got caught"
// splash — appState only changes once the player backs all the way out.
let appState = 'title'; // 'title' | 'howto' | 'highscores' | 'playing'
const MENU_ITEMS = ['New Game', 'How to Play', 'High Scores'];
let menuIndex = 0;

function selectMenuItem(index) {
  const item = MENU_ITEMS[index];
  if (item === 'New Game') {
    resetGame();
    appState = 'playing';
  } else if (item === 'How to Play') {
    appState = 'howto';
  } else if (item === 'High Scores') {
    appState = 'highscores';
  }
}

// ---- Serving: 'E' grabs the oldest waiting order from the bar, or (while
// already carrying one) delivers it if standing next to its customer. ------
const INTERACT_RANGE = 14 * SCALE;

function nearRect(x, y, rect, margin) {
  return x > rect.x - margin && x < rect.x + rect.w + margin &&
    y > rect.y - margin && y < rect.y + rect.h + margin;
}

function handleInteract() {
  if (caught) return;

  if (player.carrying) {
    // player.carrying.customer is kept valid (or reassigned to someone else
    // waiting on the same drink) by the per-frame check in update(), which
    // drops the order entirely once nobody wants it — so target should
    // always be set here, but this is kept defensive just in case.
    const target = player.carrying.customer;
    // Delivery works either right next to the customer, or anywhere near the
    // table they're seated at — with several seats per side on the bigger
    // tables, walking all the way around to their exact chair isn't fair.
    const nearCustomer = target ? Math.hypot(player.x - target.x, player.y - target.y) < INTERACT_RANGE : false;
    const nearTheirTable = target && target.seat && target.seat.table &&
      nearRect(player.x, player.y, target.seat.table.collider, INTERACT_RANGE);
    if (target && (nearCustomer || nearTheirTable) && target.state === 'sitting' && !target.served) {
      target.served = true;
      target.beingCarried = false;
      target.sitTimer = Math.min(target.sitTimer, 3 + Math.random() * 3);
      player.carrying = null;
      score += POINTS_PER_DELIVERY;
      addFloatingText(target.x, target.y - target.h - 4, '+' + POINTS_PER_DELIVERY, '#3ddc61');
    }
    return;
  }

  if (BAR_SEGMENTS.some(seg => nearRect(player.x, player.y, seg.collider, INTERACT_RANGE))) {
    const pending = customers.find(c => c.state === 'sitting' && c.orderType && !c.served && !c.beingCarried);
    if (pending) {
      pending.beingCarried = true;
      player.carrying = { type: pending.orderType, customer: pending };
    }
  }
}

// ---- Input ----------------------------------------------------------------
const keys = new Set();
window.addEventListener('keydown', (e) => {
  keys.add(e.key.toLowerCase());
  const key = e.key.toLowerCase();

  if (appState === 'title') {
    if (!e.repeat) {
      if (key === 'arrowup' || key === 'w') menuIndex = (menuIndex - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
      else if (key === 'arrowdown' || key === 's') menuIndex = (menuIndex + 1) % MENU_ITEMS.length;
      else if (key === 'enter' || key === ' ') selectMenuItem(menuIndex);
    }
    return;
  }
  if (appState === 'howto' || appState === 'highscores') {
    if (!e.repeat && (key === 'escape' || key === 'enter' || key === ' ')) appState = 'title';
    return;
  }

  // appState === 'playing'
  if (caught) {
    if (enteringName) {
      if (key === 'enter') {
        saveHighScore(nameInput.trim() || 'Anonymous', score);
        enteringName = false;
      } else if (key === 'backspace') {
        nameInput = nameInput.slice(0, -1);
      } else if (key === 'escape') {
        // Bail out of naming without saving — the run's score is lost.
        enteringName = false;
        appState = 'title';
      } else if (e.key.length === 1 && nameInput.length < NAME_MAX_LEN && /[a-zA-Z0-9 '_-]/.test(e.key)) {
        nameInput += e.key;
      }
      return;
    }
    if (key === ' ') resetGame();
    else if (key === 'escape') appState = 'title';
    return;
  }
  if (key === 'escape') { appState = 'title'; return; }
  if (!e.repeat && key === 'e') handleInteract();
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

function getInputVector() {
  let dx = 0, dy = 0;
  if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
  if (keys.has('arrowright') || keys.has('d')) dx += 1;
  if (keys.has('arrowup') || keys.has('w')) dy -= 1;
  if (keys.has('arrowdown') || keys.has('s')) dy += 1;
  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.sqrt(2);
    dx *= inv; dy *= inv;
  }
  return { x: dx, y: dy };
}

// ---- Hunter AI: mostly pursues the player -----------------------------------
// Re-aims toward the player's current position on a short timer, with some
// angle jitter so it's not a perfect aimbot and rarely pauses to feel alive.
// Every level tightens the jitter, shortens the re-aim timer, and shrinks the
// pause chance, so the hunter tracks noticeably better as the score climbs.
function pickNewHunterDirection() {
  const lvl = Math.min(getLevel(), EFFECTIVE_LEVEL_CAP) - 1; // 0-based steps

  const pauseChance = Math.max(0.01, 0.05 - lvl * 0.004);
  if (Math.random() < pauseChance) {
    hunterDir = { x: 0, y: 0 };
  } else {
    const jitterMax = Math.max(Math.PI / 12, Math.PI / 3 - lvl * (Math.PI / 36)); // 60deg -> 15deg
    const baseAngle = Math.atan2(player.y - hunter.y, player.x - hunter.x);
    const jitter = (Math.random() - 0.5) * jitterMax;
    hunterDir = { x: Math.cos(baseAngle + jitter), y: Math.sin(baseAngle + jitter) };
  }

  const timerMin = Math.max(0.15, 0.3 - lvl * 0.015);
  const timerRange = Math.max(0.15, 0.4 - lvl * 0.02);
  hunterChangeTimer = timerMin + Math.random() * timerRange;
}

// Fully random short burst used only to break free when stuck in a corner —
// re-aiming straight at the player there would just wedge it in place again.
function pickEscapeDirection() {
  const angle = Math.random() * Math.PI * 2;
  hunterDir = { x: Math.cos(angle), y: Math.sin(angle) };
  hunterChangeTimer = 0.3 + Math.random() * 0.3;
}

// ---- Update -----------------------------------------------------------------
function update(dt) {
  if (caught) return;

  // Freeze gameplay for the level-done splash's duration; it counts itself
  // down and clears on its own, no key press needed.
  if (levelSplashTimer > 0) {
    levelSplashTimer -= dt;
    return;
  }

  // Player movement (slides along furniture/walls via per-axis collision).
  const input = getInputVector();
  player.moving = input.x !== 0 || input.y !== 0;
  if (input.x !== 0) player.flip = input.x < 0;
  const playerMove = tryMove(player, input.x * player.speed * dt, input.y * player.speed * dt);
  player.x = playerMove.x;
  player.y = playerMove.y;

  // Hunter: pursues the player, re-aiming on a short timer. Speed creeps up
  // with level too, capped just under the player's own speed (62) so a
  // straight-line escape is always possible, if barely at high levels.
  const hunterLvl = Math.min(getLevel(), EFFECTIVE_LEVEL_CAP) - 1;
  hunter.speed = Math.min(60 * SCALE, (40 + hunterLvl * 2.5) * SCALE);

  hunterChangeTimer -= dt;
  if (hunterChangeTimer <= 0) pickNewHunterDirection();

  hunter.moving = hunterDir.x !== 0 || hunterDir.y !== 0;
  if (hunterDir.x !== 0) hunter.flip = hunterDir.x < 0;

  const hunterMove = tryMove(hunter, hunterDir.x * hunter.speed * dt, hunterDir.y * hunter.speed * dt);
  hunter.x = hunterMove.x;
  hunter.y = hunterMove.y;
  if (hunterMove.blockedX && hunterMove.blockedY) {
    // Wedged in a corner — a chase-biased direction would just re-wedge it,
    // so bail out with a fully random burst, then resume pursuit.
    pickEscapeDirection();
  } else if (hunterMove.blockedX || hunterMove.blockedY) {
    // Only partially blocked: tryMove already slides it along the open axis,
    // just re-aim toward the player's (possibly new) position sooner.
    hunterChangeTimer = Math.min(hunterChangeTimer, 0.15);
  }

  // Customers: trickle in, sit at a free table, then leave. Both the seating
  // cap and how fast new customers arrive ramp up with level.
  const customerLvl = Math.min(getLevel(), EFFECTIVE_LEVEL_CAP) - 1;
  const maxCustomers = Math.min(BASE_MAX_CUSTOMERS + customerLvl, 14);
  customerSpawnTimer -= dt;
  if (customerSpawnTimer <= 0) {
    const spawnMin = Math.max(1, 2.5 - customerLvl * 0.15);
    const spawnRange = Math.max(1, 3 - customerLvl * 0.2);
    customerSpawnTimer = spawnMin + Math.random() * spawnRange;
    if (customers.length < maxCustomers) spawnCustomer();
  }
  for (let i = customers.length - 1; i >= 0; i--) {
    const c = customers[i];
    if (updateCustomer(c, dt) === 'remove') customers.splice(i, 1);
  }

  updateGhost(dt);

  // Keep a carried order's target valid: if the customer it was picked up
  // for has given up and left (or somehow got served another way), hand it
  // off to anyone else currently waiting on the same drink instead of
  // wasting the trip. If nobody else wants it either, drop the order
  // entirely rather than leaving the player stuck "carrying" a drink with
  // no possible delivery target, which would block grabbing a new one.
  if (player.carrying) {
    const target = player.carrying.customer;
    if (!target || target.state !== 'sitting' || target.served) {
      const replacement = customers.find(c =>
        c.state === 'sitting' && !c.served && !c.beingCarried && c.orderType === player.carrying.type
      );
      if (replacement) {
        player.carrying.customer = replacement;
        replacement.beingCarried = true;
      } else {
        player.carrying = null;
      }
    }
  }

  // Floating score/penalty texts: drift up and fade out.
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const t = floatingTexts[i];
    t.ttl -= dt;
    t.y -= 10 * dt;
    if (t.ttl <= 0) floatingTexts.splice(i, 1);
  }

  // Leg animation timers.
  for (const e of [player, hunter, ...customers]) {
    if (e.moving) {
      e.legTimer -= dt;
      if (e.legTimer <= 0) {
        e.legFrame = 1 - e.legFrame;
        e.legTimer = 0.14;
      }
    } else {
      e.legFrame = 0;
      e.legTimer = 0;
    }
  }

  // Life regen: only once a few hit-free seconds have passed, and never
  // while already fully caught (game over).
  if (hitInvulnTimer > 0) hitInvulnTimer -= dt;
  if (!caught) {
    if (regenDelayTimer > 0) {
      regenDelayTimer -= dt;
    } else if (life < LIFE_MAX) {
      life = Math.min(LIFE_MAX, life + dt / LIFE_REGEN_DURATION);
    }
  }

  // Catch detection: each touch costs a third of the life bar rather than
  // ending the game outright. A short invulnerability window (and a shove
  // away from the hunter) gives the player room to escape after a hit.
  const dx = player.x - hunter.x;
  const dy = player.y - hunter.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (!caught && hitInvulnTimer <= 0 && dist < (player.w + hunter.w) / 2.4) {
    life = Math.max(0, life - LIFE_HIT_FRACTION);
    hitInvulnTimer = LIFE_HIT_INVULN;
    regenDelayTimer = LIFE_REGEN_DELAY;
    if (life <= 1e-9) {
      caught = true;
      enteringName = score > 0;
      nameInput = '';
      if (!enteringName) saveHighScore(null, score);
    } else {
      const angle = dist > 0.001 ? Math.atan2(dy, dx) : Math.random() * Math.PI * 2;
      const shove = tryMove(player, Math.cos(angle) * 24 * SCALE, Math.sin(angle) * 24 * SCALE);
      player.x = shove.x;
      player.y = shove.y;
      addFloatingText(player.x, player.y - player.h - 4, '-LIFE', '#e8620c');
    }
  }

  // Level-done splash: fires once per level-up, checked last so it catches
  // every way score could have changed this frame (delivery, forgotten
  // penalty). Freezes gameplay on the next frame via the guard above.
  const level = getLevel();
  if (level > lastLevel) {
    splashLevel = lastLevel;
    levelSplashTimer = LEVEL_SPLASH_DURATION;
  }
  lastLevel = level;
}

// ---- Render -----------------------------------------------------------------
// Hardwood floor: narrow vertical planks PLANK_TILES tall, staggered
// brick-style every other column, each plank getting one of a few warm wood
// shades (stable per-plank, not per-tile, so a plank reads as a single
// board) plus a subtle seam line at each plank edge and a grain line running
// along its length for texture.
const PLANK_TILES = 3;
const WOOD_SHADES = ['#a9835a', '#a07a52', '#b0885f'];

function drawGround(camX, camY) {
  const startTileX = Math.floor(camX / TILE);
  const startTileY = Math.floor(camY / TILE);
  const tilesX = Math.ceil(INTERNAL_W / TILE) + 1;
  const tilesY = Math.ceil(INTERNAL_H / TILE) + 1;

  for (let ty = 0; ty <= tilesY; ty++) {
    for (let tx = 0; tx <= tilesX; tx++) {
      const worldTileX = startTileX + tx;
      const worldTileY = startTileY + ty;
      // Skip tiles outside the map so the floor doesn't render past the walls
      // (only matters once the world is small enough to see its edges).
      if (worldTileX < 0 || worldTileY < 0 || worldTileX * TILE >= WORLD_W || worldTileY * TILE >= WORLD_H) continue;

      const colShift = worldTileX % 2 === 0 ? 0 : Math.floor(PLANK_TILES / 2);
      const plankRow = worldTileY + colShift;
      const plankIndex = Math.floor(plankRow / PLANK_TILES);
      const shadeIdx = Math.abs((plankIndex * 928371 + worldTileX * 6151)) % WOOD_SHADES.length;

      const sx = worldTileX * TILE - camX;
      const sy = worldTileY * TILE - camY;
      ctx.fillStyle = WOOD_SHADES[shadeIdx];
      ctx.fillRect(Math.round(sx), Math.round(sy), TILE, TILE);

      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(Math.round(sx), Math.round(sy), 1, TILE); // grain line along the plank's length
      if (plankRow % PLANK_TILES === 0) ctx.fillRect(Math.round(sx), Math.round(sy), TILE, 1); // plank seam
    }
  }
}

// A bar segment is just a wood counter rect with a lighter top edge and a
// darker front trim — no fixed "behind" side, since segments can run in any
// direction to form an L, so every segment gets the same simple treatment.
// Vertical seam lines (echoing the floor's plank seams) break up what would
// otherwise be a flat color fill.
function drawBar(bar, camX, camY) {
  const c = bar.collider;
  const x = Math.round(c.x - camX);
  const y = Math.round(c.y - camY);
  ctx.fillStyle = '#7a4a2a';
  ctx.fillRect(x, y, c.w, c.h);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let sx = TILE; sx < c.w; sx += TILE) ctx.fillRect(x + sx, y, 1, c.h);
  ctx.fillStyle = '#9a6a3a';
  ctx.fillRect(x, y, c.w, 2);
  ctx.fillStyle = '#4a2c14';
  ctx.fillRect(x, y + c.h - 3, c.w, 3);
}

// A beveled highlight/shadow pair on both the tabletop and the chairs (same
// treatment on each, just smaller) so furniture reads with some depth
// instead of flat color fills, matching the level of finish the sprites got.
function drawChair(sx, sy) {
  ctx.fillStyle = '#4a3222';
  ctx.fillRect(Math.round(sx - CHAIR_SIZE / 2), Math.round(sy - CHAIR_SIZE / 2), CHAIR_SIZE, CHAIR_SIZE);
  ctx.fillStyle = '#6a4a30';
  ctx.fillRect(Math.round(sx - CHAIR_SIZE / 2 + 1), Math.round(sy - CHAIR_SIZE / 2 + 1), CHAIR_SIZE - 2, 1);
  ctx.fillStyle = '#2e1e12';
  ctx.fillRect(Math.round(sx - CHAIR_SIZE / 2 + 1), Math.round(sy + CHAIR_SIZE / 2 - 2), CHAIR_SIZE - 2, 1);
}

// A bench is just bare chairs against a wall — no tabletop, unlike drawTable.
function drawBench(bench, camX, camY) {
  if (bench.seatStyle === 'bench') {
    // A wall bench reads as one long seat, not a row of separate chairs.
    const x = Math.round(bench.x - bench.w / 2 - camX);
    const y = Math.round(bench.y - bench.h / 2 - camY);
    ctx.fillStyle = '#4a3222';
    ctx.fillRect(x, y, bench.w, bench.h);
    ctx.fillStyle = '#6a4a30';
    ctx.fillRect(x + 1, y + 1, bench.w - 2, 1);
    ctx.fillStyle = '#2e1e12';
    ctx.fillRect(x + 1, y + bench.h - 2, bench.w - 2, 1);
    return;
  }
  for (const seat of getTableSeats(bench)) {
    drawChair(seat.x - camX, seat.y - camY);
  }
}

function drawTable(table, camX, camY) {
  const sx = table.x - camX;
  const sy = table.y - camY;
  const halfW = table.w / 2;
  const halfH = table.h / 2;

  for (const seat of getTableSeats(table)) {
    drawChair(seat.x - camX, seat.y - camY);
  }

  const tx = Math.round(sx - halfW);
  const ty = Math.round(sy - halfH);
  ctx.fillStyle = '#5a3418';
  ctx.fillRect(tx, ty, table.w, table.h);
  ctx.fillStyle = '#8a5a34';
  ctx.fillRect(tx + 2, ty + 2, table.w - 4, table.h - 4);
  // Wood grain: a couple of subtle horizontal streaks plus a highlight along
  // the top edge and a shadow along the bottom, like the floor's plank seams.
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(tx + 2, ty + 2, table.w - 4, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(tx + 2, ty + table.h - 3, table.w - 4, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  for (let gy = ty + 6; gy < ty + table.h - 4; gy += 6) ctx.fillRect(tx + 2, gy, table.w - 4, 1);
}

function drawFurnitureItem(item, camX, camY) {
  if (item.type === 'bar') drawBar(item, camX, camY);
  else if (item.type === 'bench') drawBench(item, camX, camY);
  else drawTable(item, camX, camY);
}

// Cartoon-style speech bubble with an order icon inside, floating above a
// head. `highlighted` marks the order currently being carried to them.
// patienceFraction (0-1, or null/undefined to omit) draws a thin depleting
// bar above the bubble — green/yellow/red as the customer's patience runs
// down toward giving up.
function patienceBarColor(frac) {
  if (frac > 0.5) return '#3ddc61';
  if (frac > 0.2) return '#e8c547';
  return '#e84c3d';
}

function drawOrderBubble(worldX, headTopY, camX, camY, orderType, highlighted, patienceFraction) {
  const icon = ORDER_ICONS[orderType];
  const pad = 2;
  const bw = icon.sprite.w + pad * 2;
  const bh = icon.sprite.h + pad * 2;
  const sx = Math.round(worldX - camX - bw / 2);
  const sy = Math.round(headTopY - camY - bh - 4);
  const border = highlighted ? '#2e8b45' : '#141414';

  ctx.fillStyle = border;
  ctx.fillRect(sx, sy, bw, bh);
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(sx + 1, sy + 1, bw - 2, bh - 2);
  ctx.fillStyle = border;
  ctx.fillRect(sx + bw / 2 - 2, sy + bh, 4, 2);
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(sx + bw / 2 - 1, sy + bh, 2, 1);

  drawSprite(icon.sprite, icon.palette, sx + pad, sy + pad, false);

  if (patienceFraction != null) {
    const barY = sy - 3;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(sx, barY, bw, 2);
    ctx.fillStyle = patienceBarColor(patienceFraction);
    ctx.fillRect(sx, barY, Math.round(bw * clamp(patienceFraction, 0, 1)), 2);
  }
}

function drawMapBounds(camX, camY) {
  ctx.strokeStyle = '#1f1f1f';
  ctx.lineWidth = 2;
  ctx.strokeRect(
    Math.round(0 - camX) + 1,
    Math.round(0 - camY) + 1,
    WORLD_W - 2,
    WORLD_H - 2
  );
}

// Poster-backed title screen: the cover image cover-fit behind a menu with
// a keyboard cursor. Falls back to a flat panel if the image hasn't loaded
// (or was never provided) so the menu is always usable.
function renderTitleScreen() {
  ctx.clearRect(0, 0, INTERNAL_W, INTERNAL_H);
  if (coverImage.complete && coverImage.naturalWidth > 0) {
    const scale = Math.max(INTERNAL_W / coverImage.naturalWidth, INTERNAL_H / coverImage.naturalHeight);
    const dw = coverImage.naturalWidth * scale;
    const dh = coverImage.naturalHeight * scale;
    ctx.drawImage(coverImage, (INTERNAL_W - dw) / 2, (INTERNAL_H - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = '#0e0e12';
    ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);
  }

  // Dark panel behind the title/menu so text stays legible over any art.
  const panelH = 74;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, INTERNAL_H - panelH, INTERNAL_W, panelH);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8620c';
  ctx.font = '16px monospace';
  ctx.fillText('LE PUB: THE CHASE', INTERNAL_W / 2, INTERNAL_H - panelH + 16);

  ctx.font = '8px monospace';
  MENU_ITEMS.forEach((item, i) => {
    const y = INTERNAL_H - panelH + 34 + i * 13;
    const selected = i === menuIndex;
    ctx.fillStyle = selected ? '#f5f5f5' : '#9a9aa4';
    ctx.fillText((selected ? '> ' : '  ') + item, INTERNAL_W / 2, y);
  });
}

function renderHowToScreen() {
  ctx.clearRect(0, 0, INTERNAL_W, INTERNAL_H);
  ctx.fillStyle = '#0e0e12';
  ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8620c';
  ctx.font = '12px monospace';
  ctx.fillText('HOW TO PLAY', INTERNAL_W / 2, 26);

  ctx.fillStyle = '#f5f5f5';
  ctx.font = '8px monospace';
  const lines = [
    'Move: WASD / Arrow Keys',
    '',
    'Grab an order at the bar: E',
    'Deliver it to the customer: E',
    '',
    'Serve customers before their',
    'patience runs out',
    '',
    'Avoid the hunter chasing you',
    'or lose a third of your life',
    '',
    'Press ENTER / ESC to go back',
  ];
  lines.forEach((line, i) => ctx.fillText(line, INTERNAL_W / 2, 48 + i * 12));
}

function renderHighScoresScreen() {
  ctx.clearRect(0, 0, INTERNAL_W, INTERNAL_H);
  ctx.fillStyle = '#0e0e12';
  ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8620c';
  ctx.font = '12px monospace';
  ctx.fillText('HIGH SCORES', INTERNAL_W / 2, 26);

  ctx.fillStyle = '#f5f5f5';
  ctx.font = '8px monospace';
  const scores = loadHighScores();
  if (!scores.length) {
    ctx.fillText('No scores yet - go serve some drinks!', INTERNAL_W / 2, 54);
  } else {
    scores.forEach((s, i) => ctx.fillText((i + 1) + '. ' + s.name + ' - ' + s.score, INTERNAL_W / 2, 50 + i * 14));
  }
  ctx.fillText('Press ENTER / ESC to go back', INTERNAL_W / 2, INTERNAL_H - 14);
}

function render() {
  if (appState === 'title') return renderTitleScreen();
  if (appState === 'howto') return renderHowToScreen();
  if (appState === 'highscores') return renderHighScoresScreen();

  // Camera centered on player, clamped to world bounds.
  let camX = player.x - INTERNAL_W / 2;
  let camY = player.y - INTERNAL_H / 2;
  camX = clamp(camX, 0, Math.max(0, WORLD_W - INTERNAL_W));
  camY = clamp(camY, 0, Math.max(0, WORLD_H - INTERNAL_H));

  ctx.clearRect(0, 0, INTERNAL_W, INTERNAL_H);
  drawGround(camX, camY);
  drawMapBounds(camX, camY);

  // Draw order: furniture and characters are merged and sorted by their
  // "footprint" y so nearer (lower) things draw over farther (higher) ones.
  const drawables = [
    ...FURNITURE.map(f => ({ sortY: f.sortY, draw: () => drawFurnitureItem(f, camX, camY) })),
    ...[player, hunter, ...customers].map(e => ({
      sortY: e.y,
      draw: () => {
        const set = SPRITES[e.kind];
        const sprite = set[e.moving ? (e.legFrame === 1 ? 'walk' : 'idle') : 'idle'];
        const sx = e.x - camX - sprite.w / 2;
        const sy = e.y - camY - sprite.h;
        // A soft ground shadow at the feet grounds the character on the
        // floor instead of it looking like it's floating over it.
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(e.x - camX, e.y - camY, e.w * 0.32, e.w * 0.13, 0, 0, Math.PI * 2);
        ctx.fill();
        // Flicker the player while invulnerable right after being caught, so
        // the brief safety window after a hit is visible, not just felt.
        const flicker = e === player && hitInvulnTimer > 0 && Math.floor(hitInvulnTimer * 10) % 2 === 0;
        ctx.globalAlpha = flicker ? 0.4 : 1;
        drawSprite(sprite, e.palette || set.palette, sx, sy, e.flip);
        ctx.globalAlpha = 1;
      },
    })),
    // Ghost: floats above the floor with no ground shadow and no collision —
    // it's meant to read as passing through the scene, not standing in it.
    ...(ghost ? [{
      sortY: ghost.y,
      draw: () => {
        const sprite = SPRITES.ghost.idle;
        const sx = ghost.x - camX - sprite.w / 2;
        const sy = ghost.y - camY - sprite.h;
        ctx.globalAlpha = 0.7;
        drawSprite(sprite, SPRITES.ghost.palette, sx, sy, ghost.flip);
        ctx.globalAlpha = 1;
      },
    }] : []),
  ];
  drawables.sort((a, b) => a.sortY - b.sortY);
  for (const d of drawables) d.draw();

  // Speech bubbles float above everything else in the scene.
  for (const c of customers) {
    if (c.state === 'sitting' && c.orderType && !c.served) {
      const patience = clamp(c.sitTimer / c.patienceDuration, 0, 1);
      drawOrderBubble(c.x, c.y - c.h, camX, camY, c.orderType, c.beingCarried, patience);
    }
  }
  if (player.carrying) {
    const carriedFor = player.carrying.customer;
    const carriedPatience = carriedFor ? clamp(carriedFor.sitTimer / carriedFor.patienceDuration, 0, 1) : null;
    drawOrderBubble(player.x, player.y - player.h, camX, camY, player.carrying.type, false, carriedPatience);
  }

  // Floating score/penalty feedback, fading out as it drifts up.
  ctx.textAlign = 'center';
  ctx.font = '8px monospace';
  for (const t of floatingTexts) {
    const sx = Math.round(t.x - camX);
    const sy = Math.round(t.y - camY);
    ctx.globalAlpha = Math.max(0, Math.min(1, t.ttl));
    ctx.fillStyle = '#000';
    ctx.fillText(t.text, sx + 1, sy + 1);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, sx, sy);
  }
  ctx.globalAlpha = 1;

  // Score/level HUD, always visible in the top-left corner.
  ctx.textAlign = 'left';
  ctx.font = '8px monospace';
  const hudText = 'LEVEL ' + getLevel() + '   SCORE: ' + score;
  ctx.fillStyle = '#000';
  ctx.fillText(hudText, 5, 11);
  ctx.fillStyle = '#f5f5f5';
  ctx.fillText(hudText, 4, 10);

  // Life bar: three segments (thirds), each partially filling as life
  // regenerates rather than only ever being fully on/off.
  const LIFE_BAR_X = 5;
  const LIFE_BAR_Y = 15;
  const LIFE_SEG_W = 16;
  const LIFE_SEG_H = 4;
  const LIFE_SEG_GAP = 2;
  for (let i = 0; i < 3; i++) {
    const segX = LIFE_BAR_X + i * (LIFE_SEG_W + LIFE_SEG_GAP);
    ctx.fillStyle = '#000';
    ctx.fillRect(segX - 1, LIFE_BAR_Y - 1, LIFE_SEG_W + 2, LIFE_SEG_H + 2);
    ctx.fillStyle = '#3a2a20';
    ctx.fillRect(segX, LIFE_BAR_Y, LIFE_SEG_W, LIFE_SEG_H);
    const segFill = clamp(life * 3 - i, 0, 1);
    if (segFill > 0) {
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(segX, LIFE_BAR_Y, LIFE_SEG_W * segFill, LIFE_SEG_H);
    }
  }

  if (caught) {
    if (caughtImage.complete && caughtImage.naturalWidth > 0) {
      // Cover-fit the image into the internal resolution, cropping overflow.
      const scale = Math.max(INTERNAL_W / caughtImage.naturalWidth, INTERNAL_H / caughtImage.naturalHeight);
      const dw = caughtImage.naturalWidth * scale;
      const dh = caughtImage.naturalHeight * scale;
      ctx.drawImage(caughtImage, (INTERNAL_W - dw) / 2, (INTERNAL_H - dh) / 2, dw, dh);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);
    }
    ctx.fillStyle = '#e8620c';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CAUGHT!', INTERNAL_W / 2, INTERNAL_H / 2 - 6);
    ctx.fillStyle = '#f5f5f5';
    ctx.font = '8px monospace';
    if (enteringName) {
      // A blinking cursor after the typed name shows the field is live.
      const cursor = Math.floor(performance.now() / 400) % 2 === 0 ? '_' : ' ';
      ctx.fillText('NEW SCORE: ' + score + ' - ENTER YOUR NAME', INTERNAL_W / 2, INTERNAL_H / 2 + 10);
      ctx.fillText('> ' + nameInput + cursor, INTERNAL_W / 2, INTERNAL_H / 2 + 22);
      ctx.fillText('ENTER to confirm  /  ESC to skip', INTERNAL_W / 2, INTERNAL_H / 2 + 34);
    } else {
      ctx.fillText('SPACE to restart  /  ESC for menu', INTERNAL_W / 2, INTERNAL_H / 2 + 10);
    }
  } else if (levelSplashTimer > 0) {
    if (levelDoneImage.complete && levelDoneImage.naturalWidth > 0) {
      // Cover-fit the image into the internal resolution, cropping overflow.
      const scale = Math.max(INTERNAL_W / levelDoneImage.naturalWidth, INTERNAL_H / levelDoneImage.naturalHeight);
      const dw = levelDoneImage.naturalWidth * scale;
      const dh = levelDoneImage.naturalHeight * scale;
      ctx.drawImage(levelDoneImage, (INTERNAL_W - dw) / 2, (INTERNAL_H - dh) / 2, dw, dh);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);
    }
    ctx.fillStyle = '#f5f5f5';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL ' + splashLevel + ' DONE', INTERNAL_W / 2, INTERNAL_H / 2 - 6);
  }
}

// ---- Main loop ----------------------------------------------------------------
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (appState === 'playing') update(dt);
  render();
  requestAnimationFrame(loop);
}

resetGame();
requestAnimationFrame(loop);

window.__debug = {
  player, hunter, customers, SEATS, TABLES, BAR_SEGMENTS, BENCHES, FURNITURE, handleInteract, spawnCustomer, DOOR, update, updateCustomer, keys,
  computeCustomerPath, findBlockingObstacle, segmentHitsRect, pointBlocked, PATH_MARGIN, PATH_CELL,
  SPRITES, DOE_PALETTE, HUNTER_PALETTE, drawSprite, ctx, floatingTexts,
  getScore: () => score,
  getLevel,
  setScore: (v) => { score = v; },
  getLife: () => life,
  setLife: (v) => { life = v; },
  getLevelSplash: () => ({ timer: levelSplashTimer, level: splashLevel }),
  getAppState: () => appState,
  setAppState: (v) => { appState = v; },
  loadHighScores, saveHighScore,
};
