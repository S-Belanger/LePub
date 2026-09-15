// ============================================================================
// Le Pub: The Chase
// Top-down 2D serving/chase game. Pixelated rendering via a low internal
// resolution canvas scaled up with `image-rendering: pixelated` (see CSS).
// No build step / dependencies — plain canvas + JS.
// ============================================================================

// ---- Canvas setup ----------------------------------------------------------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// The simulation still runs in the original 200x360 logical world, but art is
// backed by two physical pixels per logical unit. Existing gameplay geometry
// therefore stays untouched while refined sprites and half-pixel material
// details get a real pixel of their own instead of being blurred away.
const ART_SCALE = 2;

// ---- Adaptive viewport ------------------------------------------------------
// The canvas fills the browser viewport rather than sitting at a fixed size.
// Two numbers are recomputed on every resize/orientation change:
//   * `pixelScale` — an INTEGER css-pixels-per-game-pixel factor, so art is
//     never resampled onto fractional pixels and stays crisp;
//   * `viewW`/`viewH` — the internal (game-pixel) resolution, sized so that
//     viewW*scale x viewH*scale covers as much of the viewport as it can.
// Because the world is portrait (200x360), a portrait viewport gets a portrait
// internal resolution rather than a squashed 16:9 letterbox. Both are clamped
// so an ultrawide monitor can't reveal empty space outside the pub.
// Everything downstream (camera, ground, HUD, overlays) reads `viewW`/`viewH`
// rather than baking the numbers in, so a resize mid-run just works.
const VIEW_BASE_LANDSCAPE = { w: 320, h: 180 };
const VIEW_BASE_PORTRAIT = { w: 180, h: 320 };
const VIEW_MIN = { w: 160, h: 144 };
const VIEW_MAX = { w: 320, h: 360 };

let viewW = VIEW_BASE_LANDSCAPE.w;
let viewH = VIEW_BASE_LANDSCAPE.h;
let pixelScale = 1;
let viewIsPortrait = false;

function applyViewport() {
  // Read layout once per resize, never per frame.
  const availW = Math.max(1, Math.floor(window.innerWidth));
  const availH = Math.max(1, Math.floor(window.innerHeight));
  const portrait = availH > availW;
  const base = portrait ? VIEW_BASE_PORTRAIT : VIEW_BASE_LANDSCAPE;
  const scale = Math.max(1, Math.floor(Math.min(availW / base.w, availH / base.h)));
  const w = clamp(Math.floor(availW / scale), VIEW_MIN.w, VIEW_MAX.w);
  const h = clamp(Math.floor(availH / scale), VIEW_MIN.h, VIEW_MAX.h);
  if (w === viewW && h === viewH && scale === pixelScale && portrait === viewIsPortrait) return;

  viewW = w;
  viewH = h;
  pixelScale = scale;
  viewIsPortrait = portrait;

  canvas.width = viewW * ART_SCALE;
  canvas.height = viewH * ART_SCALE;
  canvas.style.width = (viewW * pixelScale) + 'px';
  canvas.style.height = (viewH * pixelScale) + 'px';
  // Resizing the backing store resets 2D context state, so restore it.
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(ART_SCALE, 0, 0, ART_SCALE, 0, 0);
  dustReady = false;   // re-scatter the motes across the new canvas
}

// Resizes are coalesced into the next frame: mobile browsers fire a burst of
// them while the URL bar collapses or the device rotates.
let viewportDirty = true;
function invalidateViewport() { viewportDirty = true; }
window.addEventListener('resize', invalidateViewport);
window.addEventListener('orientationchange', invalidateViewport);
if (window.visualViewport) window.visualViewport.addEventListener('resize', invalidateViewport);

// Splash image shown full-screen when the player is caught.
const caughtImage = new Image();
caughtImage.src = 'assets/caught.jpg';

// Splash image shown full-screen when a level is completed.
const levelDoneImage = new Image();
levelDoneImage.src = 'assets/LevelDone.png';

// ---- World ------------------------------------------------------------------
// Portrait map (narrower than tall) to match the intended floor plan: a small
// table up-left, a long many-seat table up-right, an L-shaped bar down the
// middle-left, a column of small 2-seat tables, and two wide tables below.
const WORLD_W = 200;
const WORLD_H = 360;

// Collision boxes intentionally remain at the dimensions used by the
// accepted playable build. Sprite sheets can now gain resolution or alter
// their outer silhouette without silently widening routes or catch distance.
const ENTITY_HITBOXES = {
  doe: { w: 16, h: 18 },
  hunter: { w: 21, h: 18 },
  customer: { w: 14, h: 13 },
  ghost: { w: 12, h: 10 },
  waiter: { w: 14, h: 17 },
  nazim: { w: 14, h: 15 },
  sam: { w: 14, h: 15 },
  gerald: { w: 14, h: 15 },
};

// ---- Furniture: an L-shaped bar plus tables of varying size and seat count.
// Colliders block movement for both characters; visuals are z-sorted
// together with the characters below. ----------------------------------------
const TABLE_SIZE = 14; // default table size when a table doesn't specify w/h
const CHAIR_SIZE = 6;
const CHAIR_GAP = 2;

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
  for (const px of along(seats.n, w)) out.push({ x: cx + px, y: cy - reachY, side: 'n' });
  for (const px of along(seats.s, w)) out.push({ x: cx + px, y: cy + reachY, side: 's' });
  for (const py of along(seats.w, h)) out.push({ x: cx - reachX, y: cy + py, side: 'w' });
  for (const py of along(seats.e, h)) out.push({ x: cx + reachX, y: cy + py, side: 'e' });
  return out;
}

// The bar as a small L: a short counter, a vertical stem, and a foot that
// meets it — three rectangular segments sharing the same visual treatment.
// Coordinates traced from assets/planFloor.png (the hand-drawn floor plan).
//
// Each segment is also a *station*: the taps pour the beers, the shelf holds
// the wine and cocktails, the kitchen hatch does food. An order can only be
// picked up at the station that makes it, so every trip to the bar is a
// choice — which station is nearer, whose patience is reddest, is the hunter
// between me and the taps. Remapping a station is a one-word edit here.
const BAR_STATIONS = {
  taps: { label: 'TAPS', types: ['beer-dark', 'beer-red', 'beer-blond', 'water'] },
  shelf: { label: 'SHELF', types: ['wine', 'cocktail'] },
  hatch: { label: 'KITCHEN', types: ['food'] },
};
function stationForType(type) {
  for (const id in BAR_STATIONS) if (BAR_STATIONS[id].types.indexOf(type) !== -1) return id;
  return null;
}
const BAR_SEGMENTS = [
  { x: 1, y: 67, w: 71, h: 22, station: 'taps' },    // short counter, upper-left
  { x: 91, y: 109, w: 27, h: 90, station: 'shelf' }, // vertical stem
  { x: 1, y: 177, w: 87, h: 23, station: 'hatch' },  // foot, meets the stem, touches the wall
].map(r => ({
  type: 'bar',
  collider: { x: r.x, y: r.y, w: r.w, h: r.h },
  station: r.station,
  sortY: r.y + r.h,
}));

// TABLES[0] is the regulars' booth — the traced plan's top-left table, nudged
// right so it clears the left wall bench. It was two chairs down each long
// edge, which put the seats ~7px apart: fine for anonymous patrons, unreadable
// once three 14x15 named characters sit there. One chair per side spreads them
// out (Sam west, Gerald east, Nazim south facing the camera). The north side is
// left chairless because the wall bench above it is already within reach.
const TABLES = [
  makeTable(62, 40, { w: 40, h: 22, seats: { n: 0, s: 1, w: 1, e: 1 } }),   // regulars' booth
  makeTable(152, 68, { w: 22, h: 65, seats: { n: 0, s: 0, w: 4, e: 0 } }),  // top-right, long
  makeTable(180, 210, { w: 38, h: 32, seats: { n: 1, s: 1, e: 0, w: 0 } }),
  makeTable(180, 269, { w: 37, h: 33, seats: { n: 1, s: 1, e: 0, w: 0 } }),
  makeTable(58, 258, { w: 114, h: 29, seats: { n: 4, s: 4, e: 0, w: 0 } }), // wide
  makeTable(58, 315, { w: 114, h: 29, seats: { n: 4, s: 4, e: 0, w: 0 } }), // wide
];

// Wall-hugging benches: seating with no tabletop of its own. The three
// wall/corner benches draw as a single long bench shape (`seatStyle:
// 'bench'`) rather than a row of separate chairs, and sit just inside the
// decorative wall bands so they aren't painted over by them; the two at the
// bar are individual stools (`seatStyle: 'chairs'`, the default), since
// that's how people actually sit at a bar. Reuses makeTable purely for its
// evenly-spaced-seats math and collider (for the "near their table" delivery
// check) — `type: 'bench'` tells the renderer to skip drawing a tabletop.
const BENCHES = [
  makeTable(8, 43, { w: 6, h: 55, seats: { n: 0, s: 0, e: 3, w: 0 }, type: 'bench', seatStyle: 'bench' }),      // left wall
  makeTable(163, 13, { w: 60, h: 8, seats: { n: 0, s: 3, e: 0, w: 0 }, type: 'bench', seatStyle: 'bench' }),    // top wall, right corner
  makeTable(191, 68, { w: 6, h: 71, seats: { n: 0, s: 0, e: 0, w: 4 }, type: 'bench', seatStyle: 'bench' }),    // right wall, beside the long table
  makeTable(152, 151, { w: 16, h: 74, seats: { n: 0, s: 0, e: 0, w: 3 }, type: 'bench' }), // chairs at the bar (stem side)
  makeTable(51, 222, { w: 95, h: 14, seats: { n: 3, s: 0, e: 0, w: 0 }, type: 'bench' }),  // chairs at the bar (foot side)
];

const FURNITURE = [...BAR_SEGMENTS, ...TABLES, ...BENCHES];

// `reserved` is set once at load for the regulars' chairs and never cleared —
// generic customers must never be seated there, restart included.
const SEATS = [...TABLES, ...BENCHES].flatMap(t => getTableSeats(t).map(seat => ({
  ...seat, table: t, occupied: false, reserved: false, regularId: null,
})));

const REGULARS_TABLE = TABLES[0];
for (const cfg of REGULARS) {
  const seat = SEATS.find(s => s.table === REGULARS_TABLE && s.side === cfg.seatSide);
  if (!seat) throw new Error('No ' + cfg.seatSide + ' chair at the regulars table for ' + cfg.name);
  seat.reserved = true;
  seat.regularId = cfg.id;
}

// Customers walk in from this point at the bottom wall.
const DOOR = { x: WORLD_W / 2, y: WORLD_H - 3 };

// ---- Sprite rendering -------------------------------------------------------
// Sprite geometry and palettes live in src/sprites.js; this is the single
// generic renderer for that rows+palette format.
//
// The rows are painted a pixel at a time exactly once per (sprite, palette,
// facing) combination and cached as an offscreen canvas; every frame after
// that is a single drawImage. With twenty-odd characters on screen the naive
// version was issuing several thousand fillRect calls a frame for art that
// never changes. The cache is keyed by object identity through WeakMaps, so a
// customer's one-off palette is collected along with the customer.
const spriteCache = new WeakMap();

function bakeSprite(sprite, palette, flipX) {
  const { rows, w, h } = sprite;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d');
  for (let ry = 0; ry < rows.length; ry++) {
    const row = rows[ry];
    for (let rx = 0; rx < row.length; rx++) {
      const color = palette[row[rx]];
      if (!color) continue;
      g.fillStyle = color;
      g.fillRect(flipX ? (w - 1 - rx) : rx, ry, 1, 1);
    }
  }
  return cv;
}

function bakedSprite(sprite, palette, flipX) {
  let byPalette = spriteCache.get(sprite);
  if (!byPalette) { byPalette = new WeakMap(); spriteCache.set(sprite, byPalette); }
  let pair = byPalette.get(palette);
  if (!pair) { pair = { n: null, f: null }; byPalette.set(palette, pair); }
  const key = flipX ? 'f' : 'n';
  if (!pair[key]) pair[key] = bakeSprite(sprite, palette, flipX);
  return pair[key];
}

function drawSprite(sprite, palette, screenX, screenY, flipX) {
  const pixelSize = sprite.pixelSize || 1;
  const x = Math.round(screenX * ART_SCALE) / ART_SCALE;
  const y = Math.round(screenY * ART_SCALE) / ART_SCALE;
  ctx.drawImage(
    bakedSprite(sprite, palette, !!flipX),
    x,
    y,
    sprite.w * pixelSize,
    sprite.h * pixelSize,
  );
}

function spriteVisualW(sprite) { return sprite.w * (sprite.pixelSize || 1); }
function spriteVisualH(sprite) { return sprite.h * (sprite.pixelSize || 1); }
function spriteAnchorX(sprite, flipX) {
  const width = spriteVisualW(sprite);
  const anchor = sprite.anchorX == null ? width / 2 : sprite.anchorX;
  return flipX ? width - anchor : anchor;
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
  const h = 7;
  return { x: x - w / 2, y: y - h, w, h };
}

// Bodies that block movement for a while without being furniture: Nazim on
// his feet, staggering about the booth lane. Routes ignore them (they are
// computed once, and he isn't there for long); per-step collision slides
// everyone else around him.
const dynamicBlockers = [];

function collidesAt(e, x, y, exclude) {
  const box = getFootBox(e, x, y);
  for (const f of FURNITURE) {
    if (f === exclude) continue;
    if (rectsOverlap(box, f.collider)) return true;
  }
  for (const b of dynamicBlockers) {
    if (b === e) continue;
    if (rectsOverlap(box, getFootBox(b, b.x, b.y))) return true;
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
const PATH_CELL = 8;
const PATH_MARGIN = (ENTITY_HITBOXES.customer.w * 0.55) / 2;
const PATH_FOOT_H = 7;

// The search is body-size aware: a footprint carries the half-width of the
// foot box (what furniture blocks) and the half extents of the hitbox (what
// the world edge clamps). Customers are the default; the hunter's is wider,
// which is exactly why some corridors a customer strolls through are walls
// to him.
function footprintFor(kind, cell) {
  const hb = ENTITY_HITBOXES[kind];
  return { margin: (hb.w * 0.55) / 2, halfW: hb.w / 2, halfH: hb.h / 2, cell: cell || PATH_CELL };
}
const CUSTOMER_FOOTPRINT = footprintFor('customer');
// A wide body on an 8px grid finds no clear cell centre in a corridor it
// physically fits through (the 15px lane beside the bar stem, for one), so
// the hunter searches a 4px grid: four times the cells, still cheap for a
// route recomputed every second or so.
const HUNTER_FOOTPRINT = footprintFor('hunter', 4);

// Exact line-segment/AABB test. Sampling a fixed number of points can skip a
// thin chair collider on a long diagonal, which made the smoothing pass turn
// an otherwise valid grid route into a path through furniture.
function segmentHitsRect(p1, p2, rect) {
  let tMin = 0;
  let tMax = 1;
  for (const [axis, size] of [['x', 'w'], ['y', 'h']]) {
    const start = p1[axis];
    const delta = p2[axis] - start;
    const min = rect[axis];
    const max = min + rect[size];
    if (Math.abs(delta) < 1e-9) {
      if (start < min || start > max) return false;
      continue;
    }
    let near = (min - start) / delta;
    let far = (max - start) / delta;
    if (near > far) [near, far] = [far, near];
    tMin = Math.max(tMin, near);
    tMax = Math.min(tMax, far);
    if (tMin > tMax) return false;
  }
  return true;
}

function findBlockingObstacle(p1, p2, exclude, fp) {
  const margin = fp ? fp.margin : PATH_MARGIN;
  for (const f of FURNITURE) {
    if (f === exclude) continue;
    const r = f.collider;
    // Convert the furniture collider into the region a feet anchor cannot
    // enter. The footprint is centered horizontally but extends upward from
    // the anchor, so the vertical padding is deliberately asymmetric.
    const inflated = {
      x: r.x - margin,
      y: r.y,
      w: r.w + 2 * margin,
      h: r.h + PATH_FOOT_H,
    };
    if (segmentHitsRect(p1, p2, inflated)) return f;
  }
  return null;
}

function pointBlocked(x, y, excludeTable, fp) {
  // Mirrors getFootBox's feet-anchored shape (see collision section above)
  // so the grid agrees with the runtime collision check that walks it.
  const margin = fp ? fp.margin : PATH_MARGIN;
  const box = { x: x - margin, y: y - PATH_FOOT_H, w: margin * 2, h: PATH_FOOT_H };
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
const CUSTOMER_HALF_W = ENTITY_HITBOXES.customer.w / 2;
const CUSTOMER_HALF_H = ENTITY_HITBOXES.customer.h / 2;
function cellCenter(cx, cy, fp) {
  const halfW = fp ? fp.halfW : CUSTOMER_HALF_W;
  const halfH = fp ? fp.halfH : CUSTOMER_HALF_H;
  const cell = fp ? fp.cell : PATH_CELL;
  return {
    x: clamp(cx * cell, halfW, WORLD_W - halfW),
    y: clamp(cy * cell, halfH, WORLD_H - halfH),
  };
}

// DOOR sits at the very bottom of the world, below the lowest y a body can
// actually stand at — movement is clamped to half a sprite in from every
// world edge. Walking somebody straight at it leaves them stranded a few
// pixels short of their last waypoint, close but never "arrived", which is
// how leaving customers used to pile up invisibly at the bottom wall and eat
// the spawn cap. Route to the nearest point they can actually occupy instead.
function reachablePoint(e, p) {
  return {
    x: clamp(p.x, e.w / 2, WORLD_W - e.w / 2),
    y: clamp(p.y, e.h / 2, WORLD_H - e.h / 2),
  };
}

// Full path computation: grid search for a walkable route, then collapse it
// to the minimal set of waypoints a straight-line walk can follow without
// clipping anything (skip ahead to the farthest point still in clear sight).
function computeCustomerPath(from, to, excludeTable, fp) {
  if (!findBlockingObstacle(from, to, excludeTable, fp)) return [to];

  const cell = fp ? fp.cell : PATH_CELL;
  const cols = Math.ceil(WORLD_W / cell);
  const rows = Math.ceil(WORLD_H / cell);
  const toCell = p => ({
    cx: clamp(Math.round(p.x / cell), 0, cols - 1),
    cy: clamp(Math.round(p.y / cell), 0, rows - 1),
  });
  const key = (cx, cy) => cy * cols + cx;

  const blocked = new Map();
  const isBlocked = (cx, cy) => {
    const k = key(cx, cy);
    if (!blocked.has(k)) {
      const c = cellCenter(cx, cy, fp);
      blocked.set(k, pointBlocked(c.x, c.y, excludeTable, fp));
    }
    return blocked.get(k);
  };

  // The entity usually starts between grid centers. Rounding that position
  // can put the nominal start cell on the far side of a furniture corner,
  // even though both the real start and the cell center are individually
  // clear. Anchor each endpoint to the nearest grid center it can actually
  // see so the first and last short hops are valid too.
  const nearestVisibleCell = point => {
    const origin = toCell(point);
    const maxRadius = Math.max(cols, rows);
    for (let radius = 0; radius < maxRadius; radius++) {
      const candidates = [];
      const minX = Math.max(0, origin.cx - radius);
      const maxX = Math.min(cols - 1, origin.cx + radius);
      const minY = Math.max(0, origin.cy - radius);
      const maxY = Math.min(rows - 1, origin.cy + radius);
      for (let cy = minY; cy <= maxY; cy++) {
        for (let cx = minX; cx <= maxX; cx++) {
          if (Math.max(Math.abs(cx - origin.cx), Math.abs(cy - origin.cy)) !== radius) continue;
          const center = cellCenter(cx, cy, fp);
          candidates.push({
            cx,
            cy,
            center,
            distance: (center.x - point.x) ** 2 + (center.y - point.y) ** 2,
          });
        }
      }
      candidates.sort((a, b) => a.distance - b.distance);
      for (const candidate of candidates) {
        if (isBlocked(candidate.cx, candidate.cy)) continue;
        if (!findBlockingObstacle(point, candidate.center, excludeTable, fp)) {
          return { cx: candidate.cx, cy: candidate.cy };
        }
      }
    }
    return origin;
  };

  const start = nearestVisibleCell(from);
  const goal = nearestVisibleCell(to);

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
        // Endpoint occupancy alone can miss a narrow collider between two
        // neighboring centers. Keep every A* edge collision-free so the
        // unsmoothed path is always a valid fallback for string-pulling.
        if (findBlockingObstacle(cellCenter(cur.cx, cur.cy, fp), cellCenter(nx, ny, fp), excludeTable, fp)) continue;
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
  while (true) {
    const { cx, cy } = cellFromKey(k, cols);
    cellPoints.unshift(cellCenter(cx, cy, fp));
    if (!cameFrom.has(k)) break;
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
      if (!findBlockingObstacle(cursor, cellPoints[j], excludeTable, fp)) farthest = j;
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
  const hitbox = ENTITY_HITBOXES[kind] || { w: spriteVisualW(s.idle), h: spriteVisualH(s.idle) };
  return {
    kind,
    x, y,
    w: hitbox.w,
    h: hitbox.h,
    speed: kind === 'doe' ? 62 : kind === 'customer' ? 38 : kind === 'ghost' ? 16 : kind === 'waiter' ? 46 : 54,
    flip: false,
    legTimer: 0,
    legFrame: 0,
    moving: false,
    palette: null,
  };
}

// Walk cycle: flip between the idle and walk frames while moving, and stand
// on the idle one when stopped.
function tickLegs(e, dt) {
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

const player = makeEntity('doe', WORLD_W / 2, WORLD_H / 2);
const hunter = makeEntity('hunter', WORLD_W / 2 + 60, WORLD_H / 2 - 90);
// The hunter is a patron too. Every so often he wants a pint; hand it to him
// and he sits it out for a while. He shares the order shape with everyone
// else so pickup, tickets, and patience bars need no special path.
hunter.isHunter = true;
hunter.orderType = null;
hunter.orderPlacedAt = 0;
hunter.orderAppearAt = 0;
hunter.orderExit = null;
hunter.sitTimer = 0;
hunter.patienceDuration = 1;
hunter.served = false;
hunter.beingCarried = false;

let hunterDir = { x: 0, y: 0 };
let hunterChangeTimer = 0;

let caught = false;
let score = 0;
// Seconds of un-paused play since the last restart. Used for order age and
// for animation phases, so nothing has to reach for wall-clock time.
let gameTime = 0;
const POINTS_PER_DELIVERY = 10;
const FORGOTTEN_PENALTY = 15;
// Tips scale with how fresh the order still is: a full second helping of the
// base for an instant delivery, nothing extra for one that scraped in, and a
// flat bonus for rescuing an order in its last fifth. The patience bar is a
// score meter, not just a fail timer.
const CLUTCH_FRACTION = 0.2;
const CLUTCH_BONUS = 5;

function deliveryTip(target) {
  const frac = clamp(target.sitTimer / target.patienceDuration, 0, 1);
  const clutch = frac < CLUTCH_FRACTION;
  const tip = POINTS_PER_DELIVERY + Math.round(POINTS_PER_DELIVERY * frac) + (clutch ? CLUTCH_BONUS : 0);
  return { tip, clutch };
}

// ---- Life: instead of an instant game-over, getting caught costs a third of
// a continuous life bar (1 = full). A brief invulnerability window after a hit
// stops the same touch from draining multiple thirds in one frame, and life
// slowly regenerates once a few seconds pass without being caught again.
// `caught` still means "game over" — it only flips true once life hits 0.
let life = 1;
const LIFE_MAX = 1;
// A hit lands with a beat: the whole floor holds for a few frames and the
// pint that just went shakes on the sign.
const HIT_STOP = 0.08;
const PINT_KNOCK_TIME = 0.5;
let hitStopTimer = 0;
let pintKnockTimer = 0;
let pintKnockIndex = -1;
const LIFE_HIT_FRACTION = 1 / 3;
const LIFE_HIT_INVULN = 1.5;
const LIFE_REGEN_DELAY = 3;
const LIFE_REGEN_DURATION = 20; // seconds for a fully-drained bar to refill
let hitInvulnTimer = 0;
let regenDelayTimer = 0;

// ---- Shifts: the run is a sequence of shifts, and difficulty (more
// customers, a hungrier hunter) follows the shift number rather than the
// score, so losing tips never makes the room easier. A shift ends when its
// tips target is met or, for the first SHIFT_TIMED_COUNT shifts, when its
// clock runs out — with a last-call rush in the final seconds. Every shift
// closes on a tally board that waits for a press, which is the run's natural
// stopping point. Scaling is capped at EFFECTIVE_LEVEL_CAP so the game
// plateaus instead of becoming impossible; the shift number keeps climbing
// past that as a badge of endurance.
const EFFECTIVE_LEVEL_CAP = 10;
const SHIFT_LENGTH = 180;          // seconds, timed shifts only
const SHIFT_TIMED_COUNT = 5;       // after this, shifts end on the target alone
const LAST_CALL_TIME = 15;         // final seconds of a timed shift
const LAST_CALL_PATIENCE = 1.5;    // patience drains this much faster at last call
function shiftTarget(n) { return 100 + (n - 1) * 40; }

let shift = 1;
let shiftClock = 0;
let shiftTips = 0;
let lastCallArmed = false;
let shiftTally = null;              // the closed shift's numbers while the board is up
let bestShiftTips = 0;
const shiftStats = { deliveries: 0, forgotten: 0, clutch: 0, doubles: 0, rounds: 0, hits: 0 };

function getLevel() { return shift; }
function shiftIsTimed() { return shift <= SHIFT_TIMED_COUNT; }
function shiftTimeLeft() { return shiftIsTimed() ? Math.max(0, SHIFT_LENGTH - shiftClock) : Infinity; }
function isLastCall() { return shiftIsTimed() && shiftTimeLeft() <= LAST_CALL_TIME; }
function patienceRate() { return isLastCall() ? LAST_CALL_PATIENCE : 1; }

function resetShiftStats() {
  for (const k in shiftStats) shiftStats[k] = 0;
}

// Every tip earned or lost goes through here so the shift ledger stays true.
function earnTips(n) {
  score += n;
  shiftTips += n;
}
function loseTips(n) {
  score = Math.max(0, score - n);
  shiftTips = Math.max(0, shiftTips - n);
  shiftStats.forgotten++;
}

function endShift() {
  shiftTally = {
    shift,
    tips: shiftTips,
    total: score,
    target: shiftTarget(shift),
    madeTarget: shiftTips >= shiftTarget(shift),
    stats: Object.assign({}, shiftStats),
  };
  bestShiftTips = Math.max(bestShiftTips, shiftTips);
  Sound.play('levelUp');
  clearHeldInputs();
}

function startNextShift() {
  if (!shiftTally) return;
  shiftTally = null;
  shift++;
  shiftClock = 0;
  shiftTips = 0;
  lastCallArmed = false;
  resetShiftStats();
  lastTime = performance.now();
}

function updateShift(dt) {
  shiftClock += dt;
  if (shiftIsTimed() && !lastCallArmed && isLastCall()) {
    lastCallArmed = true;
    Sound.play('bell');
    Dialogue.trigger('lastCall', null);
  }
  if (shiftTips >= shiftTarget(shift) || (shiftIsTimed() && shiftTimeLeft() <= 0)) endShift();
}

// ---- Order-bubble lifecycle -------------------------------------------------
// An order bubble grows in when it appears and shrinks out when it's dealt
// with, in a few discrete pixel steps rather than a smooth ease. Both
// populations share these three helpers so the two never drift apart.
const BUBBLE_APPEAR_TIME = 0.18;
const BUBBLE_EXIT_TIME = 0.14;

function noteOrderPlaced(e) {
  e.orderAppearAt = gameTime;
  e.orderExit = null;
}

// Called before the order itself is cleared, so the outgoing bubble still
// knows which icon to shrink.
function noteOrderCleared(e) {
  if (e.orderType) e.orderExit = { type: e.orderType, ttl: BUBBLE_EXIT_TIME };
}

function tickOrderExit(e, dt) {
  if (!e.orderExit) return;
  e.orderExit.ttl -= dt;
  if (e.orderExit.ttl <= 0) e.orderExit = null;
}

// Small floating "+10"/"-15" texts that pop up at a point and drift/fade —
// gives the score/penalty feedback a place to happen visually.
const floatingTexts = [];
function addFloatingText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color, ttl: 1 });
}

// player.tray: up to TRAY_MAX { type, customer } items while ferrying orders from
// the bar to the customers who ordered them.
player.tray = [];
// A second order on the tray slows the Doe under the hunter's top speed, so
// carrying two is a real bet. Landing both without taking a hit pays out.
const PLAYER_SPEED = 62;
const TRAY_MAX = 2;
const TRAY_SPEED = 54;
const DOUBLE_BONUS = 10;
let doubleArmed = false;    // the tray was full at some point this trip
let doubleHitFree = true;   // ...and nobody has been hit since

// ---- Customers: trickle in from the door, walk to a free seat, sit for a
// while, then leave. No movement collision with the chase, but once seated
// they order something (a speech-bubble icon) that the player has to fetch
// from the bar and deliver — a customer who gives up unserved costs points.
const customers = [];
const BASE_MAX_CUSTOMERS = 6;
let customerSpawnTimer = 3;

function spawnCustomer() {
  const freeSeat = SEATS.filter(s => !s.occupied && !s.reserved);
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
  c.orderPlacedAt = 0;
  c.orderAppearAt = 0;
  c.orderExit = null;
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
    if (dist < 1.5) {
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
      if (c.orderTimer <= 0) {
        c.orderType = randomOrderType();
        c.orderPlacedAt = gameTime;
        noteOrderPlaced(c);
        Sound.play('order');
      }
    }
    c.sitTimer -= dt * patienceRate();
    if (c.sitTimer <= 0) {
      c.seat.occupied = false;
      if (!c.served && c.orderType) {
        loseTips(FORGOTTEN_PENALTY);
        addFloatingText(c.x, c.y - c.h - 4, '-' + FORGOTTEN_PENALTY, '#e84c3d');
        noteOrderCleared(c);
        Sound.play('penalty');
        Dialogue.trigger('abandoned', null);
      }
      c.state = 'leaving';
      c.path = computeCustomerPath(c, reachablePoint(c, DOOR), c.seat.table);
      c.pathIndex = 0;
    }
  }
  return null;
}

// ---- Spills: a pint Nazim knocked over. A wet patch on the boards that slows
// whoever walks through it — player and hunter alike — until it dries. -------
const spills = [];
const SPILL_TTL = 25;
const SPILL_RADIUS = 9;
const SPILL_SLOW = 0.6;

function addSpill(x, y) {
  spills.push({ x, y, ttl: SPILL_TTL, seed: Math.random() * 1000 });
  Sound.play('spill');
}

function spillSlowAt(x, y) {
  for (const sp of spills) {
    if (Math.hypot(sp.x - x, sp.y - y) < SPILL_RADIUS) return SPILL_SLOW;
  }
  return 1;
}

function updateSpills(dt) {
  for (let i = spills.length - 1; i >= 0; i--) {
    spills[i].ttl -= dt;
    if (spills[i].ttl <= 0) spills.splice(i, 1);
  }
}

// ---- Ghost: a purely aesthetic apparition. Every few minutes it drifts in
// a straight line across the pub, through walls and furniture alike (no
// collision, no interaction with score/hunter/player), and vanishes off the
// far side. `ghost` is null whenever none is currently on screen.
let ghost = null;
const GHOST_INTERVAL_MIN = 35;
const GHOST_INTERVAL_MAX = 80;
let ghostSpawnTimer = GHOST_INTERVAL_MIN + Math.random() * (GHOST_INTERVAL_MAX - GHOST_INTERVAL_MIN);

function spawnGhost() {
  const y = 20 + Math.random() * (WORLD_H - 40);
  const margin = 24;
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
    // Drifting through the hunter gives him a turn: he stops dead for a
    // second, which is the one thing the ghost does to the chase. Once per
    // apparition, so it can't be farmed by standing him in its path.
    if (!ghost.spooked && (hunterState === 'chase' || hunterState === 'scanning') &&
      Math.hypot(ghost.x - hunter.x, ghost.y - hunter.y) < 14) {
      ghost.spooked = true;
      setHunterState('lost', 1.2);
      showHunterAlert('?!', 1.2);
      Sound.play('lost');
      Dialogue.trigger('hunterSpooked', null);
    }
    if ((dir > 0 && ghost.x >= ghost.targetX) || (dir < 0 && ghost.x <= ghost.targetX)) ghost = null;
  }
}

// ---- Waiter: an occasional walk-on with exactly one job. Every minute or so
// he comes in the door, walks round into the pocket the bar's L wraps around,
// gives the counter a few squirts of water, and leaves the way he came.
//
// Like the ghost he is pure scenery: no orders, no seat, no score, no effect
// on the chase. Unlike the ghost he is actually standing on the floor, so he
// walks a routed path and respects furniture like everybody else. `waiter` is
// null whenever nobody is on shift, which is most of the time.
let waiter = null;
// He owes each level exactly one visit, taken at a random moment inside it
// rather than the instant the level ticks over — a shift, not a cutscene.
// `waiterLevel` is the highest level he has already shown up for, so losing
// points and re-crossing a threshold doesn't send him round again.
const WAITER_DELAY_MIN = 15;
const WAITER_DELAY_MAX = 55;
let waiterLevel = 0;
let waiterDelay = WAITER_DELAY_MIN + Math.random() * (WAITER_DELAY_MAX - WAITER_DELAY_MIN);
const WAITER_SPRAY_TIME = 7;        // seconds spent working the counter
const WAITER_SQUIRT_INTERVAL = 0.7; // one pull of the trigger
const WAITER_SQUEEZE_TIME = 0.22;   // how long the squeeze frame is held
const WAITER_SQUIRT_DROPS = 34;     // droplets per pull — a proper soaking
const WAITER_MIST_COLOR = '#bfe4f2';
// Sparks off the counter where the jet lands. Nobody has ever established
// what is live under that bar top, and the waiter has stopped asking.
const WAITER_SPARK_DELAY = 0.16;    // water's flight time before it arrives
const WAITER_SPARK_COUNT = 18;
// White-hot cores first: the bar top is already a row of amber glassware, and
// a yellow spark sitting on it reads as one more bottle.
const WAITER_SPARK_COLORS = ['#ffffff', '#fff6c2', '#ffd24a', '#ff8a24'];
// Nozzle offset from his feet, in the spray pose: the bottle sits in the
// sprite's outer columns, so the mist has to start out there too. Mirrored
// with him when he faces the other way.
const WAITER_NOZZLE_DX = 8.5;
const WAITER_NOZZLE_DY = -6;

// Where he works: the staff side of the upper-left counter. Feet clear the
// counter's collider by a foot box's height, so he stands against the bar
// rather than inside it, and far enough in from the ends to have counter to
// spray in both directions.
const WAITER_COUNTER = BAR_SEGMENTS[0].collider;
function pickWaiterStation() {
  const span = Math.max(1, WAITER_COUNTER.w - 32);
  return {
    x: WAITER_COUNTER.x + 16 + Math.random() * span,
    y: WAITER_COUNTER.y + WAITER_COUNTER.h + 9,
  };
}

function spawnWaiter() {
  waiter = makeEntity('waiter', DOOR.x, DOOR.y);
  waiter.state = 'entering';
  waiter.station = pickWaiterStation();
  waiter.path = computeCustomerPath(DOOR, waiter.station, null);
  waiter.pathIndex = 0;
  waiter.sprayTimer = 0;
  waiter.squirtTimer = 0;
  waiter.squeezeTimer = 0;
  waiter.sparkTimer = 0;
  waiter.flash = null;
  waiter.mist = [];
  waiter.sparks = [];
  return waiter;
}

// Same walk as a customer's routed stroll, minus the own-table exclusion (he
// isn't headed for a seat). Returns true on the frame he reaches the end of
// his path.
function waiterFollowPath(dt) {
  const target = waiter.path[waiter.pathIndex];
  const dx = target.x - waiter.x;
  const dy = target.y - waiter.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1.5) {
    waiter.x = target.x;
    waiter.y = target.y;
    if (waiter.pathIndex < waiter.path.length - 1) { waiter.pathIndex++; return false; }
    waiter.moving = false;
    return true;
  }
  const step = Math.min(dist, waiter.speed * dt);
  const nx = clamp(waiter.x + (dx / dist) * step, waiter.w / 2, WORLD_W - waiter.w / 2);
  if (!collidesAt(waiter, nx, waiter.y)) waiter.x = nx;
  const ny = clamp(waiter.y + (dy / dist) * step, waiter.h / 2, WORLD_H - waiter.h / 2);
  if (!collidesAt(waiter, waiter.x, ny)) waiter.y = ny;
  waiter.flip = dx < 0;
  waiter.moving = true;
  return false;
}

// One pull of the trigger: a puff of droplets out of the nozzle, arcing down
// onto the counter, plus the squeeze frame.
function waiterSquirt() {
  const dir = waiter.flip ? -1 : 1;
  const ox = waiter.x + dir * WAITER_NOZZLE_DX;
  const oy = waiter.y + WAITER_NOZZLE_DY;
  for (let i = 0; i < WAITER_SQUIRT_DROPS; i++) {
    // Fan the jet out: most droplets fly flat and fast, a few loft and hang,
    // so a pull reads as a spray rather than a line of pixels.
    const spread = Math.random();
    const ttl = 0.6 + Math.random() * 0.7;
    waiter.mist.push({
      x: ox + dir * Math.random() * 2,
      y: oy - 1 + Math.random() * 2,
      vx: dir * (10 + spread * 26),
      vy: -4 - Math.random() * 16,
      size: Math.random() < 0.35 ? 2 : 1,
      ttl, maxTtl: ttl,
    });
  }
  waiter.squeezeTimer = WAITER_SQUEEZE_TIME;
  waiter.sparkTimer = WAITER_SPARK_DELAY;
}

// ...and a moment later it lands. Sparks come off the counter top itself, out
// along the jet, so the burst reads as a consequence of the water rather than
// something happening at the nozzle.
function waiterSparkBurst() {
  const dir = waiter.flip ? -1 : 1;
  const ix = waiter.x + dir * (13 + Math.random() * 7);
  const iy = WAITER_COUNTER.y + WAITER_COUNTER.h - 1;
  waiter.flash = { x: ix, y: iy, ttl: 0.1 };
  for (let i = 0; i < WAITER_SPARK_COUNT; i++) {
    const ttl = 0.25 + Math.random() * 0.45;
    waiter.sparks.push({
      x: ix, y: iy,
      vx: dir * 10 + (Math.random() - 0.5) * 78,
      vy: -34 - Math.random() * 56, // arc clear of the counter so they're seen against the wall
      size: Math.random() < 0.3 ? 2 : 1,
      // Weighted toward the hot end of the list: mostly white and near-white,
      // with the odd ember.
      color: WAITER_SPARK_COLORS[Math.floor(Math.random() ** 2 * WAITER_SPARK_COLORS.length)],
      ttl, maxTtl: ttl,
    });
  }
}

function updateWaiter(dt) {
  if (!waiter && getLevel() > waiterLevel) {
    waiterDelay -= dt;
    if (waiterDelay <= 0) {
      spawnWaiter();
      waiterLevel = getLevel();
      waiterDelay = WAITER_DELAY_MIN + Math.random() * (WAITER_DELAY_MAX - WAITER_DELAY_MIN);
    }
  }
  if (!waiter) return;

  if (waiter.state === 'entering') {
    if (waiterFollowPath(dt)) {
      waiter.state = 'spraying';
      waiter.sprayTimer = WAITER_SPRAY_TIME;
      waiter.squirtTimer = 0.4;
      // Face back along the counter toward its middle, so the spray lands on
      // the bar instead of off the end of it.
      waiter.flip = waiter.x > WAITER_COUNTER.x + WAITER_COUNTER.w / 2;
    }
  } else if (waiter.state === 'spraying') {
    waiter.moving = false;
    waiter.squeezeTimer = Math.max(0, waiter.squeezeTimer - dt);
    waiter.pose = waiter.squeezeTimer > 0 ? 'sprayB' : 'spray';
    waiter.squirtTimer -= dt;
    if (waiter.squirtTimer <= 0) {
      waiterSquirt();
      waiter.squirtTimer = WAITER_SQUIRT_INTERVAL;
    }
    if (waiter.sparkTimer > 0) {
      waiter.sparkTimer -= dt;
      if (waiter.sparkTimer <= 0) waiterSparkBurst();
    }
    waiter.sprayTimer -= dt;
    if (waiter.sprayTimer <= 0) {
      waiter.state = 'leaving';
      waiter.pose = null; // back to the walk cycle
      waiter.path = computeCustomerPath(waiter, reachablePoint(waiter, DOOR), null);
      waiter.pathIndex = 0;
    }
  } else if (waiter.state === 'leaving' && waiterFollowPath(dt)) {
    waiter = null;
    return;
  }

  for (let i = waiter.mist.length - 1; i >= 0; i--) {
    const m = waiter.mist[i];
    m.ttl -= dt;
    if (m.ttl <= 0) { waiter.mist.splice(i, 1); continue; }
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.vy += 26 * dt;
  }
  if (waiter.flash) {
    waiter.flash.ttl -= dt;
    if (waiter.flash.ttl <= 0) waiter.flash = null;
  }
  // Sparks are lighter and livelier than the water: they fly further, fall
  // harder and are gone faster.
  for (let i = waiter.sparks.length - 1; i >= 0; i--) {
    const k = waiter.sparks[i];
    k.ttl -= dt;
    if (k.ttl <= 0) { waiter.sparks.splice(i, 1); continue; }
    k.x += k.vx * dt;
    k.y += k.vy * dt;
    k.vy += 150 * dt;
  }
}

// ---- Named regulars ---------------------------------------------------------
// Nazim, Sam and Gerald are permanent fixtures of the corner booth. They are
// NOT generic customers: no entering/sitting/leaving lifecycle, no seat
// competition, and they stay for the whole run. What they *do* share is the
// order shape (`orderType`, `sitTimer`, `patienceDuration`, `served`,
// `beingCarried`, `seat`), so pickup, carrying, target highlighting, delivery
// range and scoring all reuse the existing serving code unchanged — the only
// branch is what happens *after* a successful delivery.
//
// Config lives in src/regulars.js; this is the runtime instance.
const regulars = [];
const regularById = new Map();

// Nazim's face changes with drink, so his five palettes are built once at load
// rather than per frame. Everything else about the progression is in
// NAZIM_STAGE_VISUALS.
const NAZIM_STAGE_PALETTES = {};
for (const stageId in NAZIM_STAGE_VISUALS) {
  const vis = NAZIM_STAGE_VISUALS[stageId];
  NAZIM_STAGE_PALETTES[stageId] = Object.assign({}, SPRITES.nazim.palette, {
    r: vis.blush || SPRITES.nazim.palette.k,
    w: vis.eye,
  });
}

const prefersReducedMotion = window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

function makeRegular(cfg) {
  const seat = SEATS.find(sx => sx.reserved && sx.regularId === cfg.id);
  const r = makeEntity(cfg.spriteKey, seat.x, seat.y);
  r.isRegular = true;
  r.cfg = cfg;
  r.id = cfg.id;
  r.name = cfg.name;
  r.seat = seat;
  r.state = 'sitting';   // they are always seated; the field exists so the
                         // shared delivery code doesn't need a special case
  r.moving = false;
  resetRegular(r);
  return r;
}

// Everything mutable about a regular, in one place — called both when they are
// created and on every restart, so a new run never inherits last run's orders,
// mood, dialogue history or Nazim's bar tab.
function resetRegular(r) {
  r.x = r.seat.x;
  r.y = r.seat.y;
  r.orderType = null;
  r.orderPlacedAt = 0;
  r.orderAppearAt = 0;
  r.orderExit = null;
  r.sitTimer = 0;
  r.patienceDuration = 1;
  r.served = false;
  r.beingCarried = false;
  r.orderCooldown = randomInRange(r.cfg.firstOrderDelay);
  r.drinks = 0;
  r.stage = INTOX_STAGES[0];
  r.mood = MOOD_BASELINE[r.id];
  r.talkTimer = 0;
  r.blinkTimer = randomInRange([1, 4]);
  r.blinking = false;
  r.swayPhase = Math.random() * Math.PI * 2;
  r.swayOffset = 0;
  r.pose = 'idle';
  r.dialogueCooldown = 0;
  r.recentLines = [];
  // Nazim only: a water Gerald has ordered for him, and his time on his feet.
  r.waterOwed = false;
  r.wander = null;          // { path, index, pauseTimer, returning } while up
  r.wanderTimer = randomInRange(NAZIM_WANDER_INTERVAL);
  r.moving = false;
  r.palette = r.id === 'nazim' ? NAZIM_STAGE_PALETTES.sober : null;
}

function buildRegulars() {
  regulars.length = 0;
  regularById.clear();
  for (const cfg of REGULARS) {
    const r = makeRegular(cfg);
    regulars.push(r);
    regularById.set(cfg.id, r);
  }
}

// Nazim only. Recomputed after a completed alcoholic delivery; returns true
// when the stage actually changed so callers can react to the transition.
function recalcIntoxication(r) {
  const next = intoxStageForDrinks(r.drinks);
  if (next.id === r.stage.id) return false;
  r.stage = next;
  r.palette = NAZIM_STAGE_PALETTES[next.id];
  return true;
}

// What Nazim's night costs and pays. Drunk and gone he orders faster and
// tips double; gone he knocks pints over and Gerald orders him a water.
const NAZIM_FAST_ORDER = 0.6;
const NAZIM_TIP_MULT = 2;
const NAZIM_SPILL_CHANCE = 0.5;
const NAZIM_WATER_SOBERS = 2;    // drinks taken off by a water
const NAZIM_WANDER_INTERVAL = [12, 20];
const NAZIM_WANDER_SPEED = 14;

function nazimIsFarGone(r) { return r.id === 'nazim' && (r.stage.id === 'drunk' || r.stage.id === 'gone'); }

function regularPlaceOrder(r) {
  if (r.id === 'nazim' && r.waterOwed) {
    // Gerald's doing. It is still Nazim's order to receive.
    r.waterOwed = false;
    r.orderType = 'water';
  } else {
    r.orderType = pickWeightedOrderType(r.cfg.orderWeights);
  }
  r.orderPlacedAt = gameTime;
  r.sitTimer = randomInRange(r.cfg.patience);
  r.patienceDuration = r.sitTimer;
  r.served = false;
  r.beingCarried = false;
  noteOrderPlaced(r);
  Sound.play('regularOrder');
  onRegularOrdered(r);
}

// Their order lapsed unserved. Same penalty a walk-in costs, plus a mood hit —
// they don't leave, they just remember.
function regularGiveUp(r) {
  loseTips(FORGOTTEN_PENALTY);
  addFloatingText(r.x, r.y - r.h - 4, '-' + FORGOTTEN_PENALTY, '#e84c3d');
  r.mood = clampMood(r.mood - 0.45);
  const lapsed = r.orderType;
  clearRegularOrder(r);
  Sound.play('penalty');
  onRegularGaveUp(r, lapsed);
}

function clearRegularOrder(r) {
  // If the player is mid-trip with this order it becomes stranded, and the
  // per-frame retarget in update() hands it to a generic customer instead.
  noteOrderCleared(r);
  r.orderType = null;
  r.beingCarried = false;
  r.served = false;
  r.sitTimer = 0;
  r.orderCooldown = randomInRange(r.cfg.orderDelay) * (nazimIsFarGone(r) ? NAZIM_FAST_ORDER : 1);
}

// Gone, Nazim gets up. He staggers to a spot near the booth, stands there a
// moment, and staggers back — a moving blocker in the lane for as long as
// he's up. No walk frames exist for him, so the lean pose plus his seated
// sway does the staggering.
function startNazimWander(r) {
  let target = null;
  for (let i = 0; i < 12 && !target; i++) {
    const cand = {
      x: r.seat.x + (Math.random() - 0.5) * 70,
      y: r.seat.y + 14 + Math.random() * 36,
    };
    const p = reachablePoint(r, cand);
    if (!collidesAt(r, p.x, p.y, r.seat.table) && Math.hypot(p.x - r.seat.x, p.y - r.seat.y) > 16) target = p;
  }
  if (!target) return;
  r.wander = {
    path: computeCustomerPath(r, target, r.seat.table),
    index: 0,
    pauseTimer: 0,
    returning: false,
  };
  dynamicBlockers.push(r);
  Dialogue.trigger('nazimUp', null);
}

function updateNazimWander(r, dt) {
  const w = r.wander;
  if (w.pauseTimer > 0) {
    w.pauseTimer -= dt;
    r.moving = false;
    if (w.pauseTimer <= 0 && !w.returning) {
      w.returning = true;
      w.path = computeCustomerPath(r, { x: r.seat.x, y: r.seat.y }, r.seat.table);
      w.index = 0;
    }
    return;
  }
  const target = w.path[w.index];
  const dx = target.x - r.x;
  const dy = target.y - r.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1.5) {
    r.x = target.x;
    r.y = target.y;
    if (w.index < w.path.length - 1) { w.index++; return; }
    if (!w.returning) { w.pauseTimer = 1.5 + Math.random() * 1.5; return; }
    // Home.
    r.x = r.seat.x;
    r.y = r.seat.y;
    r.wander = null;
    r.moving = false;
    r.wanderTimer = randomInRange(NAZIM_WANDER_INTERVAL);
    const at = dynamicBlockers.indexOf(r);
    if (at >= 0) dynamicBlockers.splice(at, 1);
    return;
  }
  const step = Math.min(dist, NAZIM_WANDER_SPEED * dt);
  const nx = r.x + (dx / dist) * step;
  const ny = r.y + (dy / dist) * step;
  if (!collidesAt(r, nx, r.y, r.seat.table)) r.x = nx;
  if (!collidesAt(r, r.x, ny, r.seat.table)) r.y = ny;
  r.flip = dx < 0;
  r.moving = true;
}

function updateRegulars(dt) {
  for (const r of regulars) {
    if (r.id === 'nazim') {
      if (r.wander) updateNazimWander(r, dt);
      else if (r.stage.id === 'gone') {
        r.wanderTimer -= dt;
        if (r.wanderTimer <= 0) startNazimWander(r);
      }
    }
    // Ordering / patience.
    if (r.orderType === null) {
      r.orderCooldown -= dt;
      if (r.orderCooldown <= 0) regularPlaceOrder(r);
    } else if (!r.served) {
      r.sitTimer -= dt * patienceRate();
      if (r.sitTimer <= 0) regularGiveUp(r);
    }

    // Mood drifts back toward each character's own baseline, not toward zero:
    // Gerald recovering means returning to grumpy.
    const base = MOOD_BASELINE[r.id];
    if (r.mood !== base) {
      const step = MOOD_RECOVERY * dt;
      r.mood = r.mood > base ? Math.max(base, r.mood - step) : Math.min(base, r.mood + step);
    }

    tickOrderExit(r, dt);
    if (r.talkTimer > 0) r.talkTimer -= dt;
    if (r.dialogueCooldown > 0) r.dialogueCooldown -= dt;

    // Idle life: a blink, plus a seated sway once Nazim is far enough gone.
    const vis = r.id === 'nazim' ? NAZIM_STAGE_VISUALS[r.stage.id] : null;
    const blinkRange = vis ? vis.blink : [3, 6];
    r.blinkTimer -= dt;
    if (r.blinkTimer <= 0) {
      r.blinking = !r.blinking;
      r.blinkTimer = r.blinking ? 0.12 : randomInRange(blinkRange);
    }

    if (vis && vis.sway > 0 && !prefersReducedMotion) {
      r.swayPhase += vis.swaySpeed * dt;
      r.swayOffset = Math.round(Math.sin(r.swayPhase) * vis.sway);
    } else {
      r.swayOffset = 0;
    }

    r.pose = regularPose(r, vis);
  }
}

// Pose priority: talking beats blinking beats the stage's resting pose.
function regularPose(r, vis) {
  const set = SPRITES[r.cfg.spriteKey];
  const base = r.wander ? 'lean' : (vis ? vis.pose : 'idle');
  if (r.talkTimer > 0) {
    const talkKey = base === 'idle' ? 'talk' : base + 'Talk';
    if (set[talkKey]) return talkKey;
    if (set.talk) return 'talk';
  }
  if (r.blinking && set.idleB && base === 'idle') return 'idleB';
  return set[base] ? base : 'idle';
}

// Opens a regular's mouth for a moment. The dialogue layer drives this; a
// delivery reaction uses it directly.
function setRegularTalking(r, seconds) {
  r.talkTimer = Math.max(r.talkTimer, seconds);
}

// ---- Dialogue wiring --------------------------------------------------------
// The dialogue layer only ever reads state and schedules bubbles; it can't
// pause the chase or block input. Triggers are fired from the moments they
// describe rather than polled, except for the few genuinely time-based ones
// (idle, carrying too long) tracked in update().
Dialogue.bind({
  getRegular: (id) => regularById.get(id) || null,
  getNazimStageId: () => {
    const n = regularById.get('nazim');
    return n ? n.stage.id : 'sober';
  },
  // Nazim's answers arrive later the drunker he is; everyone else is prompt.
  getReactionDelay: (id) => {
    if (id !== 'nazim') return 0;
    const n = regularById.get('nazim');
    return n ? NAZIM_STAGE_VISUALS[n.stage.id].reactionDelay : 0;
  },
  // A speaking regular opens their mouth for as long as the bubble runs,
  // capped so the talking pose doesn't outstay a long line.
  onSpeak: (speaker, life) => setRegularTalking(speaker, Math.min(life, 1.6)),
});

function onRegularOrdered(r) {
  setRegularTalking(r, 0.6);
  if (r.id === 'nazim' && r.orderType === 'water') Dialogue.trigger('waterOrdered', null);
  else if (r.id === 'nazim' && r.orderType === 'food') Dialogue.trigger('nazimFood', { who: 'nazim' });
  else Dialogue.trigger('ordered', { who: r.id });
}

function onRegularGaveUp(r, lapsedType) {
  setRegularTalking(r, 0.8);
  Dialogue.trigger('lateOrder', { who: r.id });
}

function onRegularServed(r, type, stageChanged) {
  setRegularTalking(r, 1.0);
  // A stage change is the bigger news, and outranks the thank-you.
  if (stageChanged) Dialogue.trigger('stageChanged', null);
  else Dialogue.trigger('served', { who: r.id });
}

// ---- The round: now and then the three of them order together, and landing
// all three inside the window pays a bonus on top of the tips. --------------
const ROUND_INTERVAL = [90, 150];
const ROUND_WINDOW = 20;
const ROUND_BONUS = 25;
const ROUND_PATIENCE = 32;
let roundTimer = 0;
let round = null;   // { deadline, served }

function tryCallRound() {
  for (const r of regulars) if (r.orderType || r.wander) return false;
  for (const r of regulars) {
    r.orderCooldown = 0;
    regularPlaceOrder(r);
    r.sitTimer = ROUND_PATIENCE;
    r.patienceDuration = ROUND_PATIENCE;
  }
  round = { deadline: gameTime + ROUND_WINDOW, served: 0 };
  Dialogue.trigger('roundCalled', null);
  return true;
}

function noteRoundDelivery(r) {
  if (!round || !r.isRegular) return;
  round.served++;
  if (round.served >= regulars.length) {
    earnTips(ROUND_BONUS);
    shiftStats.rounds++;
    addFloatingText(REGULARS_TABLE.x, REGULARS_TABLE.y - 16, 'ROUND +' + ROUND_BONUS, PUB.amber);
    Sound.play('levelUp');
    Dialogue.trigger('roundDone', null);
    round = null;
    roundTimer = randomInRange(ROUND_INTERVAL);
  }
}

function updateRound(dt) {
  if (round) {
    if (gameTime > round.deadline) {
      round = null;
      roundTimer = randomInRange(ROUND_INTERVAL);
      Dialogue.trigger('roundMissed', null);
    }
    return;
  }
  roundTimer -= dt;
  if (roundTimer <= 0) {
    if (!tryCallRound()) roundTimer = 8;   // somebody's mid-order; try again shortly
  }
}

// Edge/timing state for the triggers that aren't a single moment. All of it is
// cleared by resetGame().
let lastLevelSeen = 1;
let idleTimer = 0;
let whiffCount = 0;
let whiffDecay = 0;
let carryTimer = 0;
let hunterNearArmed = true;
let nearMissCooldown = 0;
let twoWaitingCooldown = 0;
let hasPlayedBefore = false;

function resetDialogueTriggers() {
  lastLevelSeen = getLevel();
  idleTimer = 0;
  whiffCount = 0;
  whiffDecay = 0;
  carryTimer = 0;
  hunterNearArmed = true;
  nearMissCooldown = 0;
  twoWaitingCooldown = 0;
}

// Everything in update() that watches for a dialogue-worthy situation, kept
// together so the simulation above stays readable.
function updateDialogueTriggers(dt, input) {
  const lvl = getLevel();
  if (lvl > lastLevelSeen) {
    lastLevelSeen = lvl;
    Sound.play('levelUp');
    Dialogue.trigger('levelUp', null);
  }

  // The hunter sweeping past the booth. Re-arms only once he's well clear, so
  // one pass is one remark.
  const boothDist = Math.hypot(hunter.x - REGULARS_TABLE.x, hunter.y - REGULARS_TABLE.y);
  if (boothDist < 46 && hunterNearArmed) {
    hunterNearArmed = false;
    Dialogue.trigger('hunterNear', null);
  } else if (boothDist > 72) {
    hunterNearArmed = true;
  }

  // A near miss: inside about twice the catch radius but not caught.
  if (nearMissCooldown > 0) nearMissCooldown -= dt;
  const catchDist = (player.w + hunter.w) / 2.4;
  const hunterDist = Math.hypot(player.x - hunter.x, player.y - hunter.y);
  if (hunterState === 'chase' && hunterDist < catchDist * 2.3 && nearMissCooldown <= 0) {
    nearMissCooldown = 14;
    Dialogue.trigger('nearMiss', null);
  }

  // Standing still while somebody is waiting.
  if (input.x !== 0 || input.y !== 0) {
    idleTimer = 0;
  } else if (findOldestPendingOrder()) {
    idleTimer += dt;
    if (idleTimer > 9) {
      idleTimer = -12;
      Dialogue.trigger('idle', null);
    }
  }

  // Ferrying one drink around the entire pub.
  if (player.tray.length) {
    carryTimer += dt;
    if (carryTimer > 20) {
      carryTimer = -18;
      Dialogue.trigger('carryingLong', null);
    }
  } else {
    carryTimer = 0;
  }

  // Two named regulars waiting at once.
  if (twoWaitingCooldown > 0) twoWaitingCooldown -= dt;
  let waiting = 0;
  for (const r of regulars) if (r.orderType && !r.served) waiting++;
  if (waiting >= 2 && twoWaitingCooldown <= 0) {
    twoWaitingCooldown = 22;
    Dialogue.trigger('twoWaiting', null);
  }

  // Interacting with nothing, repeatedly.
  if (whiffCount > 0) {
    whiffDecay -= dt;
    if (whiffDecay <= 0) whiffCount = 0;
  }
}

function pickClearSpawn(e) {
  for (let i = 0; i < 30; i++) {
    const x = clamp(WORLD_W / 2 + (Math.random() < 0.5 ? 1 : -1) * Math.random() * WORLD_W * 0.4, e.w / 2, WORLD_W - e.w / 2);
    const y = clamp(WORLD_H / 2 + (Math.random() < 0.5 ? 1 : -1) * Math.random() * WORLD_H * 0.4, e.h / 2, WORLD_H - e.h / 2);
    if (!collidesAt(e, x, y)) return { x, y };
  }
  return { x: 125, y: 150 }; // fallback: open floor between the bar and the long table
}

// ---- High scores ------------------------------------------------------------
// Kept in localStorage so a table survives a page reload. Every read and
// write is wrapped, because localStorage can throw outright (private
// browsing, storage disabled) — losing the list isn't worth a crash over.
const HIGH_SCORE_KEY = 'lepub_highscores';
const HIGH_SCORE_MAX = 5;

function loadHighScores() {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    const scores = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(scores)) return [];
    // Normalize entries saved before names were tracked (plain numbers) so an
    // older list can't break the table.
    return scores
      .map(s => (typeof s === 'number' ? { name: '???', score: s } : s))
      .filter(s => s && typeof s.score === 'number');
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

// While true, the caught screen asks for a name instead of offering the
// restart prompt. Gameplay is already frozen by `caught`, so this just borrows
// the keyboard until the run's score has been filed under something.
let enteringName = false;
let nameInput = '';
const NAME_MAX_LEN = 12;

// Typing a name needs a keyboard. On a touch device there isn't one to borrow,
// so the score is filed unnamed rather than showing a field nobody can fill.
function canTypeName() { return !document.body.classList.contains('touch'); }

function beginNameEntry() {
  nameInput = '';
  enteringName = score > 0 && canTypeName();
  if (!enteringName) saveHighScore(null, score);
}

function finishNameEntry(save) {
  if (save) saveHighScore(nameInput.trim() || 'ANONYMOUS', score);
  enteringName = false;
  syncCaughtDom();
}

function resetGame() {
  gameTime = 0;
  const playerSpawn = pickClearSpawn(player);
  player.x = playerSpawn.x;
  player.y = playerSpawn.y;
  // He starts outside: at the door, unseen, until his arrival timer runs out.
  const doorSpot = reachablePoint(hunter, DOOR);
  hunter.x = doorSpot.x;
  hunter.y = doorSpot.y;
  hunterDir = { x: 0, y: 0 };
  hunterChangeTimer = 0;
  hunterRubTimer = 0;
  hunterSlide = null;
  hunterFacing = { x: 1, y: 0 };
  hunterAlert = null;
  hunterLastSeenTimer = 0;
  hunterScanLookTimer = 0;
  hunterOrderTimer = randomInRange(HUNTER_ORDER_INTERVAL);
  hunter.orderType = null;
  hunter.orderExit = null;
  hunter.served = false;
  hunter.beingCarried = false;
  setHunterState('arriving', hasPlayedBefore ? HUNTER_ARRIVAL_RETRY : HUNTER_ARRIVAL_FIRST);
  caught = false;
  enteringName = false;
  nameInput = '';
  life = LIFE_MAX;
  hitInvulnTimer = 0;
  regenDelayTimer = 0;
  hitStopTimer = 0;
  pintKnockTimer = 0;
  pintKnockIndex = -1;
  shift = 1;
  shiftClock = 0;
  shiftTips = 0;
  lastCallArmed = false;
  shiftTally = null;
  bestShiftTips = 0;
  resetShiftStats();
  score = 0;
  customers.length = 0;
  for (const seat of SEATS) seat.occupied = false;
  customerSpawnTimer = 3;
  player.tray.length = 0;
  doubleArmed = false;
  doubleHitFree = true;
  floatingTexts.length = 0;
  ghost = null;
  ghostSpawnTimer = GHOST_INTERVAL_MIN + Math.random() * (GHOST_INTERVAL_MAX - GHOST_INTERVAL_MIN);
  waiter = null;
  waiterLevel = 0;
  waiterDelay = WAITER_DELAY_MIN + Math.random() * (WAITER_DELAY_MAX - WAITER_DELAY_MIN);
  // The regulars persist across restarts as characters, but every scrap of
  // their run state — orders, patience, mood, dialogue history and Nazim's
  // drink count — is wiped.
  if (!regulars.length) buildRegulars();
  else for (const r of regulars) resetRegular(r);
  dynamicBlockers.length = 0;
  spills.length = 0;
  round = null;
  roundTimer = randomInRange(ROUND_INTERVAL);
  Dialogue.reset();
  resetDialogueTriggers();
  if (hasPlayedBefore) {
    Sound.play('start');
    Dialogue.trigger('restart', null);
  }
  clearHeldInputs();
  syncCaughtDom();
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ---- Serving: 'E' grabs the oldest waiting order from the bar, or (while
// already carrying one) delivers it if standing next to its customer. ------
const INTERACT_RANGE = 14;

function nearRect(x, y, rect, margin) {
  return x > rect.x - margin && x < rect.x + rect.w + margin &&
    y > rect.y - margin && y < rect.y + rect.h + margin;
}

// The oldest unclaimed order across both walk-ins and regulars. Ordering by
// age rather than by array position keeps the queue fair now that two
// populations feed it, and makes "who does this drink belong to" deterministic
// even when several people want the same thing.
// `types`, when given, restricts the search to what one station can make.
function findOldestPendingOrder(types) {
  let best = null;
  const wants = t => !types || types.indexOf(t) !== -1;
  for (const c of customers) {
    if (c.state !== 'sitting' || !c.orderType || c.served || c.beingCarried || !wants(c.orderType)) continue;
    if (!best || c.orderPlacedAt < best.orderPlacedAt) best = c;
  }
  for (const r of regulars) {
    if (!r.orderType || r.served || r.beingCarried || !wants(r.orderType)) continue;
    if (!best || r.orderPlacedAt < best.orderPlacedAt) best = r;
  }
  if (hunter.orderType && !hunter.served && !hunter.beingCarried && wants(hunter.orderType)) {
    if (!best || hunter.orderPlacedAt < best.orderPlacedAt) best = hunter;
  }
  return best;
}

// Whether `target` still wants an order of `type`. A walk-in has to be in
// their seat; a regular's order can lapse while they stay put; the hunter is
// wherever he is.
function stillWantsOrder(target, type) {
  if (!target || target.served || target.orderType !== type) return false;
  return target === hunter || target.state === 'sitting';
}

function removeFromTray(target) {
  for (let i = player.tray.length - 1; i >= 0; i--) {
    if (player.tray[i].customer === target) player.tray.splice(i, 1);
  }
}

// A delivery that actually landed. Everything a completed order awards happens
// here and nowhere else — notably Nazim's drink count, so mashing the interact
// button can never advance his night without a trip to the bar.
function completeDelivery(target) {
  target.served = true;
  target.beingCarried = false;
  removeFromTray(target);
  const { tip, clutch } = deliveryTip(target);
  earnTips(tip);
  shiftStats.deliveries++;
  if (clutch) shiftStats.clutch++;
  Sound.play('deliver');
  addFloatingText(target.x, target.y - target.h - 4, '+' + tip + (clutch ? ' CLUTCH' : ''), clutch ? PUB.amber : '#3ddc61');
  // Both tray orders landed with no hit in between: the tray bet paid off.
  if (doubleArmed && player.tray.length === 0) {
    if (doubleHitFree) {
      earnTips(DOUBLE_BONUS);
      shiftStats.doubles++;
      addFloatingText(player.x, player.y - player.h - 12, 'DOUBLE +' + DOUBLE_BONUS, PUB.amber);
    }
    doubleArmed = false;
  }

  if (target === hunter) {
    hunterServed();
    return;
  }
  if (!target.isRegular) {
    noteOrderCleared(target);
    target.sitTimer = Math.min(target.sitTimer, 3 + Math.random() * 3);
    return;
  }

  const type = target.orderType;
  target.mood = clampMood(target.mood + 0.35);
  let stageChanged = false;
  let sobered = false;
  if (target.id === 'nazim') {
    if (isAlcoholicOrder(type)) {
      // Drunk money: he over-tips, and once he's gone the pint may not make
      // it to the table.
      if (nazimIsFarGone(target)) {
        const extra = tip * (NAZIM_TIP_MULT - 1);
        earnTips(extra);
        addFloatingText(target.x, target.y - target.h - 12, 'X' + NAZIM_TIP_MULT + ' +' + extra, PUB.amber);
      }
      if (target.stage.id === 'gone' && Math.random() < NAZIM_SPILL_CHANCE) {
        addSpill(target.x + (Math.random() - 0.5) * 8, target.y + 12);
        Dialogue.trigger('spill', null);
      }
      target.drinks += 1;
      stageChanged = recalcIntoxication(target);
      if (stageChanged && target.stage.id === 'gone') target.waterOwed = true;
    } else if (type === 'water') {
      target.drinks = Math.max(0, target.drinks - NAZIM_WATER_SOBERS);
      stageChanged = recalcIntoxication(target);
      sobered = true;
    }
  }
  noteRoundDelivery(target);
  clearRegularOrder(target);   // they'll want the next one after a cooldown
  if (sobered) {
    setRegularTalking(target, 1.0);
    Dialogue.trigger('sobered', null);
  } else {
    onRegularServed(target, type, stageChanged);
  }
}

// Counts an interact press that accomplished nothing, and lets the regulars
// notice once it's clearly a pattern rather than one mistimed tap.
function registerWhiff() {
  Sound.play('whiff');
  whiffCount++;
  whiffDecay = 6;
  if (whiffCount >= 3) {
    whiffCount = 0;
    Dialogue.trigger('whiffed', null);
  }
}

// Delivery works either right next to the customer, or anywhere near the
// table they're seated at — with several seats per side on the bigger tables,
// walking all the way around to their exact chair isn't fair.
function canDeliverTo(target) {
  if (!target || target.served) return false;
  // The hunter is handed his pint at arm's length: the catch radius is about
  // 15px, so an ordinary interact range would mean getting hit to serve him.
  if (target === hunter) return Math.hypot(player.x - hunter.x, player.y - hunter.y) < HUNTER_SERVE_RANGE;
  if (target.state !== 'sitting') return false;
  const nearCustomer = Math.hypot(player.x - target.x, player.y - target.y) < INTERACT_RANGE;
  const nearTheirTable = target.seat && target.seat.table &&
    nearRect(player.x, player.y, target.seat.table.collider, INTERACT_RANGE);
  return nearCustomer || nearTheirTable;
}

// The segment the player is standing at, or null. Where the foot meets the
// stem a spot can be in reach of both, so the closer counter wins rather
// than whichever is listed first.
function nearestBarSegment() {
  let best = null;
  let bestDist = Infinity;
  for (const b of BAR_SEGMENTS) {
    if (!nearRect(player.x, player.y, b.collider, INTERACT_RANGE)) continue;
    const r = b.collider;
    const dx = Math.max(r.x - player.x, 0, player.x - (r.x + r.w));
    const dy = Math.max(r.y - player.y, 0, player.y - (r.y + r.h));
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; best = b; }
  }
  return best;
}

function handleInteract() {
  if (caught) return;

  // Deliver first: whichever tray order belongs to someone in reach. Each
  // item's customer is kept valid (or reassigned) by the per-frame check in
  // update(), which drops an order entirely once nobody wants it.
  for (const item of player.tray) {
    if (canDeliverTo(item.customer)) {
      completeDelivery(item.customer);
      return;
    }
  }

  const seg = nearestBarSegment();
  if (seg) {
    if (player.tray.length >= TRAY_MAX) {
      addFloatingText(player.x, player.y - player.h - 4, 'TRAY FULL', PUB.creamDim);
      registerWhiff();
      return;
    }
    const pending = findOldestPendingOrder(BAR_STATIONS[seg.station].types);
    if (pending) {
      pending.beingCarried = true;
      player.tray.push({ type: pending.orderType, customer: pending });
      if (player.tray.length === TRAY_MAX) {
        doubleArmed = true;
        doubleHitFree = true;
      }
      Sound.play('pickup');
      return;
    }
    // Nothing this station makes is wanted. Point at the one that has the
    // oldest order, so a wrong-counter press teaches the map instead of
    // just buzzing.
    const elsewhere = findOldestPendingOrder();
    if (elsewhere) {
      const station = BAR_STATIONS[stationForType(elsewhere.orderType)];
      if (station) addFloatingText(player.x, player.y - player.h - 4, station.label + ' >', PUB.amber);
      Sound.play('whiff');
      return;
    }
  }
  registerWhiff();
}

// ---- Input ----------------------------------------------------------------
const keys = new Set();

// Any real gesture may be the browser's one opportunity to start Web Audio.
// The explicit start/action sounds also call through this path, but these two
// listeners cover keyboard movement and closing the help panel with Escape.
window.addEventListener('pointerdown', Sound.unlock, { once: true, passive: true, capture: true });
window.addEventListener('keydown', Sound.unlock, { once: true, capture: true });

// Anything that can strand a held key/pointer (restart, tab switch, losing
// focus, entering fullscreen) funnels through here, so the player never walks
// off on their own after an interrupted input.
function clearHeldInputs() {
  keys.clear();
  releaseStick();
}

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  keys.add(k);
  // Name entry owns the keyboard outright while it is up: every other
  // shortcut would otherwise either eat a letter or drop the score.
  if (enteringName) {
    if (k === 'enter') finishNameEntry(true);
    else if (k === 'backspace') nameInput = nameInput.slice(0, -1);
    else if (k === 'escape') finishNameEntry(false);     // bail out; the score is lost
    else if (e.key.length === 1 && nameInput.length < NAME_MAX_LEN && /[a-zA-Z0-9 '_-]/.test(e.key)) {
      nameInput += e.key;
    }
    if (e.key === ' ') e.preventDefault();
    return;
  }
  if (k === 'escape') { toggleOverlay(); return; }
  if (!e.repeat && k === 'm') { toggleSound(); return; }
  if (caught && e.key === ' ') { resetGame(); return; }
  if (paused) return;
  if (shiftTally) {
    if (!e.repeat && (k === 'e' || e.key === ' ')) startNextShift();
    if (e.key === ' ') e.preventDefault();
    return;
  }
  // E is the primary interact key; Space is the same action (and stays the
  // restart key on the caught screen) so a one-handed grip works too.
  if (!e.repeat && (k === 'e' || e.key === ' ')) handleInteract();
  if (e.key === ' ') e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', clearHeldInputs);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearHeldInputs();
  else lastTime = performance.now(); // don't bank a huge dt while hidden
});

// Touch stick output, in the same normalized form the keyboard produces.
const touchMove = { x: 0, y: 0 };

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
  // The stick wins when it's being held; otherwise the keyboard does, so a
  // hybrid laptop/tablet can use either without them fighting.
  if (touchMove.x !== 0 || touchMove.y !== 0) return { x: touchMove.x, y: touchMove.y };
  return { x: dx, y: dy };
}

// ---- Page shell: overlay, fullscreen, caught-screen buttons -----------------
// The DOM around the canvas is a thin control layer. It is only written on
// state transitions (never per frame), so it costs no layout work in the loop.
const el = {
  overlay: document.getElementById('overlay'),
  start: document.getElementById('btn-start'),
  help: document.getElementById('btn-help'),
  sound: document.getElementById('btn-sound'),
  fullscreen: document.getElementById('btn-fullscreen'),
  caughtActions: document.getElementById('caught-actions'),
  restart: document.getElementById('btn-restart'),
};

let paused = true; // the start overlay is up until the player begins

function setOverlay(open) {
  paused = open;
  el.overlay.classList.toggle('hidden', !open);
  el.start.textContent = overlaySeen ? 'RESUME' : 'START SHIFT';
  if (!open) {
    clearHeldInputs();
    overlaySeen = true;
    lastTime = performance.now();
  }
}
let overlaySeen = false;
function toggleOverlay() { setOverlay(!paused); }

function syncSoundButton() {
  const muted = Sound.isMuted();
  el.sound.classList.toggle('muted', muted);
  el.sound.setAttribute('aria-pressed', muted ? 'true' : 'false');
  el.sound.setAttribute('aria-label', muted ? 'Enable sound effects' : 'Mute sound effects');
}

function toggleSound() {
  const wasMuted = Sound.isMuted();
  Sound.setMuted(!wasMuted);
  syncSoundButton();
  if (wasMuted) Sound.play('start');
}

syncSoundButton();
if (!Sound.supported) el.sound.classList.add('hidden');

el.start.addEventListener('click', () => {
  el.start.blur();
  Sound.unlock();
  Sound.play('start');
  setOverlay(false);
});
el.help.addEventListener('click', () => { el.help.blur(); toggleOverlay(); });
el.sound.addEventListener('click', () => { el.sound.blur(); toggleSound(); });

// Fullscreen is a nicety, not a requirement: if the API is missing the button
// simply isn't offered and everything else still works.
const fullscreenSupported = !!(document.fullscreenEnabled || document.documentElement.webkitRequestFullscreen);
function fullscreenElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
function toggleFullscreen() {
  const root = document.documentElement;
  try {
    if (fullscreenElement()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
    }
  } catch (err) {
    /* Rejected (user gesture rules, iOS Safari) — stay windowed. */
  }
}
if (!fullscreenSupported) el.fullscreen.classList.add('hidden');
el.fullscreen.addEventListener('click', () => { el.fullscreen.blur(); toggleFullscreen(); });
document.addEventListener('fullscreenchange', () => {
  el.fullscreen.classList.toggle('active', !!fullscreenElement());
  invalidateViewport();
  clearHeldInputs();
});

el.restart.addEventListener('click', () => { el.restart.blur(); resetGame(); });

// Mirrors the caught state into the DOM exactly once per transition. The
// restart button stays hidden while a name is being typed, so a click can't
// throw the run away mid-entry.
let caughtShown = false;
function syncCaughtDom() {
  const show = caught && !enteringName;
  if (show === caughtShown) return;
  caughtShown = show;
  el.caughtActions.classList.toggle('hidden', !show);
}

// ---- Touch controls ---------------------------------------------------------
// A DOM overlay rather than canvas-painted buttons: real hit targets, real
// focus/ARIA, and no cost inside the render loop. Pointer Events give one
// unified path for touch, pen and mouse, and each widget captures its own
// pointer so the stick and the action button work at the same time.
const touchEl = {
  root: document.getElementById('touch'),
  stick: document.getElementById('stick'),
  knob: document.querySelector('#stick .stick-knob'),
  action: document.getElementById('btn-action'),
};

const STICK_RADIUS = 46;   // px of travel before the stick reads as full tilt
const STICK_DEADZONE = 8;  // px of slop so a resting thumb doesn't drift

let stickPointerId = null;
let stickOrigin = null; // cached on pointerdown; no layout reads while dragging

function releaseStick() {
  stickPointerId = null;
  stickOrigin = null;
  touchMove.x = 0;
  touchMove.y = 0;
  if (touchEl.knob) touchEl.knob.style.transform = '';
  if (touchEl.stick) touchEl.stick.classList.remove('active');
  if (touchEl.action) touchEl.action.classList.remove('active');
}

function updateStick(clientX, clientY) {
  if (!stickOrigin) return;
  let dx = clientX - stickOrigin.x;
  let dy = clientY - stickOrigin.y;
  const dist = Math.hypot(dx, dy);
  if (dist < STICK_DEADZONE) {
    touchMove.x = 0;
    touchMove.y = 0;
    touchEl.knob.style.transform = 'translate(' + Math.round(dx) + 'px,' + Math.round(dy) + 'px)';
    return;
  }
  // Constrain the knob to the ring, then hand movement a unit vector scaled by
  // how far into the ring the thumb is (so small tilts walk slowly).
  const clamped = Math.min(dist, STICK_RADIUS);
  const nx = dx / dist;
  const ny = dy / dist;
  const strength = clamped / STICK_RADIUS;
  touchMove.x = nx * strength;
  touchMove.y = ny * strength;
  touchEl.knob.style.transform =
    'translate(' + Math.round(nx * clamped) + 'px,' + Math.round(ny * clamped) + 'px)';
}

if (touchEl.stick) {
  touchEl.stick.addEventListener('pointerdown', (e) => {
    if (stickPointerId !== null) return;
    stickPointerId = e.pointerId;
    const r = touchEl.stick.getBoundingClientRect();
    stickOrigin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    touchEl.stick.classList.add('active');
    touchEl.stick.setPointerCapture(e.pointerId);
    updateStick(e.clientX, e.clientY);
    e.preventDefault();
  });
  touchEl.stick.addEventListener('pointermove', (e) => {
    if (e.pointerId !== stickPointerId) return;
    updateStick(e.clientX, e.clientY);
    e.preventDefault();
  });
  const endStick = (e) => {
    if (e.pointerId !== stickPointerId) return;
    releaseStick();
  };
  touchEl.stick.addEventListener('pointerup', endStick);
  touchEl.stick.addEventListener('pointercancel', endStick);
  touchEl.stick.addEventListener('lostpointercapture', endStick);
}

if (touchEl.action) {
  // Fires on pointerdown (not click) so the action feels immediate, and is
  // the same single-shot entry point the E key uses.
  touchEl.action.addEventListener('pointerdown', (e) => {
    touchEl.action.classList.add('active');
    if (caught) resetGame();
    else if (shiftTally) startNextShift();
    else if (!paused) handleInteract();
    e.preventDefault();
  });
  const endAction = () => touchEl.action.classList.remove('active');
  touchEl.action.addEventListener('pointerup', endAction);
  touchEl.action.addEventListener('pointercancel', endAction);
  touchEl.action.addEventListener('pointerleave', endAction);
}

// Only reveal the touch UI where it makes sense: a coarse pointer or a real
// touchscreen. Hybrid laptops get it the first time a finger lands.
function enableTouchUi() {
  if (document.body.classList.contains('touch')) return;
  document.body.classList.add('touch');
  touchEl.root.classList.remove('hidden');
}
if (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0) enableTouchUi();
window.addEventListener('touchstart', enableTouchUi, { once: true, passive: true });

// Belt and braces against page-level gestures on the game surface: the CSS
// `touch-action: none` covers the common cases, this covers multi-touch
// pinch/zoom attempts that some browsers still route to the document.
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault());

// ---- Hunter AI ----------------------------------------------------------------
// The hunter has a rhythm rather than a constant bead on the player:
//
//   arriving — off-screen at the door for the first stretch of a run, so a
//              new player learns the bar before the chase starts;
//   scanning — a slow prowl between random spots, looking around; he only
//              notices the Doe inside a cone in front of him with a clear
//              line of sight, or right at his elbow;
//   chase    — the pursuit: an A* route to the player, recomputed on a short
//              timer, with the old angle jitter layered on top so it is not
//              an aimbot; loses the trail after a while out of sight;
//   lost     — stands scratching his head for a moment, then prowls again;
//   drinking — bought a pint, sat out for a bit.
//
// Every level widens his sight, shortens the repath timer and lengthens how
// long he keeps the trail, so the pressure still ramps.
let hunterState = 'scanning';
let hunterStateTimer = 0;        // time left in a timed state (arriving/lost/drinking)
let hunterPath = null;           // waypoints for scanning/chase
let hunterPathIndex = 0;
let hunterRepathTimer = 0;
let hunterLastSeenTimer = 0;     // seconds since the player was last in sight
let hunterFacing = { x: 1, y: 0 };
let hunterAlert = null;          // { text, timer } placard over his head
let hunterOrderTimer = 0;        // until his next pint craving
let hunterScanLookTimer = 0;     // scanning: pause-and-look cadence
let hunterStepTimer = 0;         // chase: footstep cue cadence
const HUNTER_ARRIVAL_FIRST = 20; // seconds before he walks in on a first run
const HUNTER_ARRIVAL_RETRY = 8;  // ...and on a restart
const HUNTER_LOST_TIME = 3;
const HUNTER_DRINK_TIME = 8;
const HUNTER_SERVE_RANGE = 26;
const HUNTER_SERVE_BONUS = 20;
const HUNTER_ORDER_INTERVAL = [45, 75];
const HUNTER_ORDER_PATIENCE = 25;
const HUNTER_HEAR_RANGE = 24;
const HUNTER_SCAN_SPEED = 0.5;   // fraction of chase speed while prowling
const HUNTER_CONE_COS = Math.cos(Math.PI / 3); // ±60° in front of him

function hunterLevelSteps() { return Math.min(getLevel(), EFFECTIVE_LEVEL_CAP) - 1; }
function hunterSightRange() { return 70 + hunterLevelSteps() * 4; }
function hunterLoseTime() { return 4 + hunterLevelSteps() * 0.5; }
function hunterRepathInterval() { return Math.max(0.8, 1.5 - hunterLevelSteps() * 0.07); }

function setHunterState(next, seconds) {
  hunterState = next;
  hunterStateTimer = seconds || 0;
  hunterPath = null;
  hunterPathIndex = 0;
  hunterRepathTimer = 0;
  hunterSlide = null;
  hunterRubTimer = 0;
  if (next !== 'chase') hunterDir = { x: 0, y: 0 };
}

function showHunterAlert(text, seconds) {
  hunterAlert = { text, timer: seconds };
}

function hunterRouteTo(point) {
  hunterPath = computeCustomerPath(hunter, reachablePoint(hunter, point), null, HUNTER_FOOTPRINT);
  hunterPathIndex = 0;
}

// Can he see the Doe from where he stands? Distance, then the cone in front
// of him, then a clear line through the furniture. Standing at his elbow
// counts regardless — he can hear a deer breathing.
function hunterCanSeePlayer(range) {
  const dx = player.x - hunter.x;
  const dy = player.y - hunter.y;
  const dist = Math.hypot(dx, dy);
  if (dist < HUNTER_HEAR_RANGE) return true;
  if (dist > range) return false;
  const dot = (dx * hunterFacing.x + dy * hunterFacing.y) / dist;
  if (dot < HUNTER_CONE_COS) return false;
  return !findBlockingObstacle(hunter, player, null, HUNTER_FOOTPRINT);
}

function hunterNoticesPlayer() {
  setHunterState('chase');
  hunterLastSeenTimer = 0;
  showHunterAlert('!', 0.9);
  Sound.play('whistle');
  Dialogue.trigger('hunterSpotted', null);
}

// Walks the current path; returns true while there is somewhere to go.
function hunterFollowPath(speedScale) {
  if (!hunterPath || hunterPathIndex >= hunterPath.length) return false;
  const target = hunterPath[hunterPathIndex];
  const dx = target.x - hunter.x;
  const dy = target.y - hunter.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 3) {
    hunterPathIndex++;
    return hunterPathIndex < hunterPath.length;
  }
  hunterDir = { x: dx / dist, y: dy / dist };
  hunterFacing = hunterDir;
  const step = tryMove(hunter, hunterDir.x * hunter.speed * speedScale * dt_, hunterDir.y * hunter.speed * speedScale * dt_);
  hunter.x = step.x;
  hunter.y = step.y;
  hunter.moving = true;
  // A prowl route can be the straight-line fallback; if that scrapes for a
  // while, the caller picks somewhere else to go.
  hunterRubTimer = step.blockedX || step.blockedY ? hunterRubTimer + dt_ : 0;
  if (hunterDir.x !== 0) hunter.flip = hunterDir.x < 0;
  return true;
}
let dt_ = 0; // frame dt for the helpers above; set at the top of updateHunter

// Chase aim: toward the next waypoint of a fresh route, with the level-scaled
// jitter and pause chance the old pursuit had, so he still reads as a man
// running rather than a homing missile.
function pickNewHunterDirection() {
  const lvl = hunterLevelSteps();
  const pauseChance = Math.max(0.01, 0.05 - lvl * 0.004);
  let aimAt = player;
  if (hunterPath && hunterPathIndex < hunterPath.length) {
    const wp = hunterPath[hunterPathIndex];
    if (Math.hypot(wp.x - hunter.x, wp.y - hunter.y) < 3) hunterPathIndex++;
    if (hunterPathIndex < hunterPath.length) aimAt = hunterPath[hunterPathIndex];
  }
  if (Math.random() < pauseChance) {
    hunterDir = { x: 0, y: 0 };
  } else {
    // Half the old jitter when following a route: the waypoints already
    // carry the "not quite straight" feel, and too much slop walks him into
    // the very corner the route was going round.
    const jitterMax = Math.max(Math.PI / 24, Math.PI / 6 - lvl * (Math.PI / 72));
    const baseAngle = Math.atan2(aimAt.y - hunter.y, aimAt.x - hunter.x);
    const jitter = (Math.random() - 0.5) * jitterMax;
    hunterDir = { x: Math.cos(baseAngle + jitter), y: Math.sin(baseAngle + jitter) };
    hunterFacing = hunterDir;
  }
  const timerMin = Math.max(0.15, 0.3 - lvl * 0.015);
  const timerRange = Math.max(0.15, 0.4 - lvl * 0.02);
  hunterChangeTimer = timerMin + Math.random() * timerRange;
}

function hunterWantsPint() {
  hunter.orderType = 'beer-blond';
  hunter.orderPlacedAt = gameTime;
  hunter.sitTimer = HUNTER_ORDER_PATIENCE;
  hunter.patienceDuration = HUNTER_ORDER_PATIENCE;
  hunter.served = false;
  hunter.beingCarried = false;
  noteOrderPlaced(hunter);
  Sound.play('regularOrder');
  Dialogue.trigger('hunterOrdered', null);
}

function clearHunterOrder() {
  noteOrderCleared(hunter);
  hunter.orderType = null;
  hunter.beingCarried = false;
  hunter.served = false;
  hunterOrderTimer = randomInRange(HUNTER_ORDER_INTERVAL);
}

// Bought him a pint. He sits it out, and the room notices.
function hunterServed() {
  earnTips(HUNTER_SERVE_BONUS);
  addFloatingText(hunter.x, hunter.y - hunter.h - 12, 'ON THE HOUSE +' + HUNTER_SERVE_BONUS, PUB.amber);
  clearHunterOrder();
  setHunterState('drinking', HUNTER_DRINK_TIME);
  showHunterAlert('...', 1.2);
  Dialogue.trigger('hunterServed', null);
}

function updateHunter(dt) {
  dt_ = dt;
  hunter.moving = false;
  if (hunterAlert) {
    hunterAlert.timer -= dt;
    if (hunterAlert.timer <= 0) hunterAlert = null;
  }

  // His pint craving runs whenever he's on the floor.
  if (hunterState !== 'arriving' && hunterState !== 'drinking') {
    if (hunter.orderType === null) {
      hunterOrderTimer -= dt;
      if (hunterOrderTimer <= 0) hunterWantsPint();
    } else if (!hunter.served) {
      hunter.sitTimer -= dt;
      if (hunter.sitTimer <= 0) clearHunterOrder();   // no penalty: he isn't paying
    }
  }
  tickOrderExit(hunter, dt);

  const lvl = hunterLevelSteps();
  hunter.speed = Math.min(60, 40 + lvl * 2.5) * spillSlowAt(hunter.x, hunter.y);

  switch (hunterState) {
    case 'arriving': {
      hunterStateTimer -= dt;
      if (hunterStateTimer <= 0) {
        setHunterState('scanning');
        hunterRouteTo({ x: WORLD_W / 2, y: WORLD_H - 60 });
        Dialogue.trigger('hunterArrives', null);
      }
      return;
    }
    case 'drinking': {
      hunterStateTimer -= dt;
      if (hunterStateTimer <= 0) setHunterState('scanning');
      return;
    }
    case 'lost': {
      hunterStateTimer -= dt;
      // Looks left and right while he wonders.
      hunter.flip = Math.floor(hunterStateTimer * 2) % 2 === 0;
      if (hunterStateTimer <= 0) setHunterState('scanning');
      return;
    }
    case 'scanning': {
      if (hunterCanSeePlayer(hunterSightRange())) { hunterNoticesPlayer(); return; }
      hunterScanLookTimer -= dt;
      if (hunterScanLookTimer > 0 && hunterScanLookTimer < 0.8) {
        // The pause-and-look: turn on the spot.
        hunter.flip = Math.floor(hunterScanLookTimer * 4) % 2 === 0;
        hunterFacing = { x: hunter.flip ? -1 : 1, y: 0 };
        return;
      }
      if (!hunterFollowPath(HUNTER_SCAN_SPEED) || hunterRubTimer > 1) {
        hunterRubTimer = 0;
        hunterRouteTo(pickClearSpawn(hunter));
        hunterScanLookTimer = 2.5 + Math.random() * 3;
      }
      return;
    }
    case 'chase': {
      // Keep or lose the trail.
      if (hunterCanSeePlayer(hunterSightRange() * 1.5)) hunterLastSeenTimer = 0;
      else hunterLastSeenTimer += dt;
      if (hunterLastSeenTimer > hunterLoseTime()) {
        setHunterState('lost', HUNTER_LOST_TIME);
        showHunterAlert('?', HUNTER_LOST_TIME);
        Sound.play('lost');
        Dialogue.trigger('hunterLost', null);
        return;
      }
      // Footsteps you can hear when he's close, quicker the closer he is.
      hunterStepTimer -= dt;
      const stepDist = Math.hypot(player.x - hunter.x, player.y - hunter.y);
      if (hunterStepTimer <= 0 && stepDist < DANGER_RANGE * 1.3 && hunter.moving) {
        Sound.play('step');
        hunterStepTimer = 0.28 + 0.3 * (stepDist / (DANGER_RANGE * 1.3));
      }
      hunterRepathTimer -= dt;
      if (hunterRepathTimer <= 0 || !hunterPath) {
        hunterRepathTimer = hunterRepathInterval();
        hunterRouteTo(player);
      }
      hunterChangeTimer -= dt;
      if (hunterSlide) {
        hunterSlide.timer -= dt;
        // Held one way this long without getting clear: try round the other end.
        if (hunterSlide.timer <= 0) {
          hunterSlide.sign *= -1;
          hunterSlide.timer = HUNTER_SLIDE_TIME;
        }
        hunterDir = hunterSlideVector();
      } else if (hunterChangeTimer <= 0) {
        pickNewHunterDirection();
      }

      hunter.moving = hunterDir.x !== 0 || hunterDir.y !== 0;
      if (hunterDir.x !== 0) hunter.flip = hunterDir.x < 0;

      const hunterMove = tryMove(hunter, hunterDir.x * hunter.speed * dt, hunterDir.y * hunter.speed * dt);
      hunter.x = hunterMove.x;
      hunter.y = hunterMove.y;
      if (hunterMove.blockedX && hunterMove.blockedY) {
        // Wedged in a corner — a chase-biased direction would just re-wedge it,
        // so bail out with a fully random burst, then resume pursuit.
        hunterRubTimer = 0;
        hunterSlide = null;
        pickEscapeDirection();
      } else if (hunterMove.blockedX || hunterMove.blockedY) {
        // Scraping along something. tryMove already slid it down the open axis;
        // re-aim sooner at first, and commit to one side if it keeps happening.
        hunterRubTimer += dt;
        if (!hunterSlide) {
          if (hunterRubTimer >= HUNTER_RUB_TIME) startHunterSlide(hunterMove.blockedX ? 'y' : 'x');
          else hunterChangeTimer = Math.min(hunterChangeTimer, 0.15);
        }
      } else {
        // Clear of everything — whatever it was going round is behind it now.
        hunterRubTimer = 0;
        hunterSlide = null;
      }
      return;
    }
  }
}

// Fully random short burst used only to break free when stuck in a corner —
// re-aiming straight at the player there would just wedge it in place again.
function pickEscapeDirection() {
  const angle = Math.random() * Math.PI * 2;
  hunterDir = { x: Math.cos(angle), y: Math.sin(angle) };
  hunterChangeTimer = 0.3 + Math.random() * 0.3;
}

// Rounding a long obstacle needs more than pursuit. Pressed against the side
// of the bar, every re-aim re-rolls the sideways component, so the hunter
// random-walks up and down the same wall forever and the player is safe just
// by standing on the other side of it. After a moment of scraping it commits
// to one direction along the open axis and holds it — plain wall following —
// while still leaning into the wall, so the slide ends by itself the instant
// the obstacle runs out.
const HUNTER_RUB_TIME = 0.7;    // scraping tolerated before committing to a side
const HUNTER_SLIDE_TIME = 1.8;  // how long to hold one side before trying the other
let hunterRubTimer = 0;
let hunterSlide = null;         // { axis: 'x' | 'y', sign: 1 | -1, timer }

function startHunterSlide(openAxis) {
  // Prefer whichever way along the open axis heads toward the player; with the
  // player level with the hunter there's nothing to go on, so pick a side.
  const toward = openAxis === 'y' ? player.y - hunter.y : player.x - hunter.x;
  const sign = Math.abs(toward) > 1 ? Math.sign(toward) : (Math.random() < 0.5 ? 1 : -1);
  hunterSlide = { axis: openAxis, sign, timer: HUNTER_SLIDE_TIME };
}

function hunterSlideVector() {
  const inv = 1 / Math.SQRT2;
  const towardX = Math.sign(player.x - hunter.x) || 1;
  const towardY = Math.sign(player.y - hunter.y) || 1;
  return hunterSlide.axis === 'y'
    ? { x: towardX * inv, y: hunterSlide.sign * inv }
    : { x: hunterSlide.sign * inv, y: towardY * inv };
}

// ---- Update -----------------------------------------------------------------
function update(dt) {
  // Bubbles keep resolving after a catch — nothing else simulates — so the
  // caught screen can show the room's reaction.
  Dialogue.update(dt);
  if (caught) return;
  gameTime += dt;

  // The tally board freezes the floor until the player starts the next shift.
  if (shiftTally) return;
  // Hit-stop: a few frames of nothing so a hit reads as an impact.
  if (hitStopTimer > 0) { hitStopTimer -= dt; return; }
  if (pintKnockTimer > 0) pintKnockTimer -= dt;

  // Player movement (slides along furniture/walls via per-axis collision).
  const input = getInputVector();
  player.speed = (player.tray.length >= TRAY_MAX ? TRAY_SPEED : PLAYER_SPEED) * spillSlowAt(player.x, player.y);
  player.moving = input.x !== 0 || input.y !== 0;
  if (input.x !== 0) player.flip = input.x < 0;
  const playerMove = tryMove(player, input.x * player.speed * dt, input.y * player.speed * dt);
  player.x = playerMove.x;
  player.y = playerMove.y;

  // Hunter: state machine in updateHunter (arriving / scanning / chase / lost /
  // drinking). Speed creeps up with level, capped just under the player's own
  // 62 so a straight-line escape is always possible, if barely at high levels.
  updateHunter(dt);

  // Customers: trickle in, sit at a free table, then leave. Both the seating
  // cap and how fast new customers arrive ramp up with level.
  const customerLvl = Math.min(getLevel(), EFFECTIVE_LEVEL_CAP) - 1;
  const maxCustomers = Math.min(BASE_MAX_CUSTOMERS + customerLvl, 14);
  customerSpawnTimer -= dt;
  if (customerSpawnTimer <= 0) {
    const spawnMin = Math.max(1, 2.5 - customerLvl * 0.15);
    const spawnRange = Math.max(1, 3 - customerLvl * 0.2);
    customerSpawnTimer = spawnMin + Math.random() * spawnRange;
    if (customers.length < maxCustomers && !isLastCall()) spawnCustomer();
  }
  for (let i = customers.length - 1; i >= 0; i--) {
    const c = customers[i];
    tickOrderExit(c, dt);
    if (updateCustomer(c, dt) === 'remove') customers.splice(i, 1);
  }

  updateRegulars(dt);
  updateRound(dt);
  updateSpills(dt);
  updateGhost(dt);
  updateWaiter(dt);
  updateDialogueTriggers(dt, input);
  updateAmbient(dt);

  // Keep a carried order's target valid: if the customer it was picked up
  // for has given up and left (or somehow got served another way), hand it
  // off to anyone else currently waiting on the same drink instead of
  // wasting the trip. If nobody else wants it either, drop the order
  // entirely rather than leaving the player stuck "carrying" a drink with
  // no possible delivery target, which would block grabbing a new one.
  for (let i = player.tray.length - 1; i >= 0; i--) {
    const item = player.tray[i];
    const target = item.customer;
    // `orderType` is also checked because a regular's order can lapse while
    // they stay in their seat — for a walk-in, leaving is the only way out.
    if (!stillWantsOrder(target, item.type)) {
      // Deliberately only walk-ins: silently re-pointing a drink at a
      // different *named* regular would make "whose pint is this" ambiguous,
      // and Gerald being handed Nazim's beer is a bug, not a feature. A
      // regular's order always has to be picked up for them on purpose.
      const replacement = customers.find(c =>
        c.state === 'sitting' && !c.served && !c.beingCarried && c.orderType === item.type
      );
      if (replacement) {
        item.customer = replacement;
        replacement.beingCarried = true;
      } else {
        player.tray.splice(i, 1);
        doubleArmed = false;   // one of the pair evaporated; no double for a single
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
  for (const e of [player, hunter, ...customers]) tickLegs(e, dt);
  if (waiter) tickLegs(waiter, dt);

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
  const hunterCanCatch = hunterState !== 'arriving' && hunterState !== 'drinking';
  if (hunterCanCatch && hitInvulnTimer <= 0 && dist < (player.w + hunter.w) / 2.4) {
    if (hunterState !== 'chase') hunterNoticesPlayer();   // walked into him: that counts
    life = Math.max(0, life - LIFE_HIT_FRACTION);
    hitInvulnTimer = LIFE_HIT_INVULN;
    regenDelayTimer = LIFE_REGEN_DELAY;
    doubleHitFree = false;
    shiftStats.hits++;
    hitStopTimer = HIT_STOP;
    pintKnockTimer = PINT_KNOCK_TIME;
    pintKnockIndex = Math.min(LIFE_SEGMENT_COUNT - 1, Math.floor(life * LIFE_SEGMENT_COUNT + 1e-6));

    if (life <= 1e-9) {
      caught = true;
      hasPlayedBefore = true;
      beginNameEntry();
      Sound.play('caught');
      Dialogue.trigger('caught', null);
    } else {
      // Push the player clear so one collision reads as one hit and there is
      // room to use the invulnerability window to escape.
      const angle = dist > 0.001 ? Math.atan2(dy, dx) : Math.random() * Math.PI * 2;
      const shove = tryMove(player, Math.cos(angle) * 24, Math.sin(angle) * 24);
      player.x = shove.x;
      player.y = shove.y;
      addFloatingText(player.x, player.y - player.h - 4, '-LIFE', '#e8620c');
      Sound.play('penalty');
    }
  }

  // Shift clock and target, checked last so it catches every way tips could
  // have changed this frame. Freezes gameplay on the next frame via the guard
  // above.
  updateShift(dt);
}

// ---- Render -----------------------------------------------------------------
// Layered passes, farthest first:
//   1. backdrop     — the dark outside, wherever the viewport exceeds the world
//   2. ground       — plank floor, dithered grain, static stains
//   3. architecture — walls, wainscot, windows, the door
//   4. back decor   — posters and the dartboard on the rear wall
//   5. floor light  — warm lamp pools and cool window/door spill
//   6. y-sorted     — furniture and every character, nearest last
//   7. foreground   — hanging lamp fixtures, dust
//   8. grade        — night tint and vignette
//   9. bubbles      — orders, then dialogue
//  10. floating score feedback
//  11. HUD
//  12. caught / completed-level overlay
//
// Everything static (clutter, bottles, stains, light textures) is built once at
// load. The frame loop only blits and fills.

const WALL_TOP_H = 16;      // decorative wall band along the top of the world
const WALL_BOTTOM_H = 12;
const WALL_SIDE_W = 7;

// ---- Static scenery ---------------------------------------------------------
// Seeded so the clutter is in the same place on every load: a bar whose
// coasters move when you refresh reads as a bug, not as atmosphere.
const DECOR = buildDecor();

function buildDecor() {
  const rnd = makeSeededRandom(0x5eed1e);

  // Wear on the floor: small dark smudges, denser on the walking routes.
  const stains = [];
  for (let i = 0; i < 30; i++) {
    stains.push({
      x: Math.round(WALL_SIDE_W + 2 + rnd() * (WORLD_W - WALL_SIDE_W * 2 - 8)),
      y: Math.round(WALL_TOP_H + 4 + rnd() * (WORLD_H - WALL_TOP_H - WALL_BOTTOM_H - 10)),
      w: 2 + Math.floor(rnd() * 5),
      h: 1 + Math.floor(rnd() * 3),
    });
  }

  // Patterned rugs give each seating cluster a visual home without changing
  // its collider. Their borders stay under chairs and tables, so the player
  // still reads the furniture footprint before the decoration.
  const rugs = [
    { x: 27, y: 17, w: 70, h: 50, base: PUB.rugRed, accent: PUB.rugGold, motif: 0 },
    { x: 126, y: 25, w: 53, h: 88, base: PUB.rugGreen, accent: PUB.rugGold, motif: 1 },
    { x: 157, y: 183, w: 42, h: 113, base: PUB.rugRed, accent: PUB.paper, motif: 2 },
    { x: 4, y: 234, w: 111, h: 47, base: PUB.rugGreen, accent: PUB.rugGold, motif: 1 },
    { x: 4, y: 291, w: 111, h: 48, base: PUB.rugRed, accent: PUB.rugGold, motif: 0 },
  ];

  // Table clutter, stored as offsets from the table centre so it can never
  // drift away from the table it belongs to.
  const clutter = new Map();
  for (const t of TABLES) {
    const items = [{
      ox: Math.round((rnd() - 0.5) * Math.max(2, t.w * 0.34)),
      oy: Math.round((rnd() - 0.5) * Math.max(2, t.h * 0.28)),
      kind: 'candle',
    }];
    const count = Math.min(8, 3 + Math.floor((t.w * t.h) / 750));
    for (let i = 1; i < count; i++) {
      const roll = rnd();
      items.push({
        ox: Math.round((rnd() - 0.5) * Math.max(2, t.w - 9)),
        oy: Math.round((rnd() - 0.5) * Math.max(2, t.h - 9)),
        kind: roll < 0.16 ? 'coaster'
          : roll < 0.34 ? 'glass'
            : roll < 0.52 ? 'mug'
              : roll < 0.66 ? 'candle'
                : roll < 0.79 ? 'bottle'
                  : roll < 0.9 ? 'plate'
                    : 'menu',
      });
    }
    clutter.set(t, items);
  }

  // Glassware and bottles along the counters, spaced out down each segment's
  // long axis and set back from the customer edge.
  const barProps = [];
  for (const seg of BAR_SEGMENTS) {
    const c = seg.collider;
    const horizontal = c.w >= c.h;
    const length = horizontal ? c.w : c.h;
    let p = 4;
    while (p < length - 4) {
      const roll = rnd();
      const kind = roll < 0.42 ? 'bottle' : roll < 0.72 ? 'glass' : 'tap';
      barProps.push({
        x: horizontal ? c.x + p : c.x + 3 + ((p >> 2) & 1) * 3,
        y: horizontal ? c.y + 3 + ((p >> 2) & 1) * 3 : c.y + p,
        kind,
        seg,
      });
      p += 4 + Math.floor(rnd() * 5);
    }
  }

  // Hand-placed so they sit over the room rather than over the furniture.
  // (x, y) is where the pool lands on the floor; the shade hangs LAMP_DROP
  // above it in screen space, with a visible cone between.
  const lamps = [
    { x: 40, y: 44, r: 46, phase: 0.0 },
    { x: 150, y: 96, r: 48, phase: 1.7 },
    { x: 42, y: 150, r: 44, phase: 3.1 },
    { x: 78, y: 128, r: 40, phase: 2.2 },    // over the pocket behind the bar
    { x: 150, y: 236, r: 44, phase: 4.4 },
    { x: 60, y: 296, r: 50, phase: 5.6 },
    { x: 150, y: 322, r: 40, phase: 0.9 },
  ];

  // Cool light sources: two windows in the rear wall, and the door.
  const windows = [
    { x: 22, w: 31 },
    { x: 128, w: 35 },
  ];

  const posters = [
    { x: 68, w: 14, h: 6, ink: PUB.cream, paper: PUB.tomato },
    { x: 96, w: 10, h: 7, ink: PUB.amber, paper: PUB.wallDark },
    { x: 172, w: 12, h: 6, ink: PUB.coolPale, paper: PUB.green },
  ];

  // Small hanging plants keep the greenery on the wall plane, where it can
  // add the reference image's lived-in density without becoming fake,
  // non-colliding furniture on the playable floor.
  const wallPlants = [
    { x: 15, y: 3, drop: 12 },
    { x: 119, y: 2, drop: 15 },
    { x: 190, y: 4, drop: 18 },
  ];

  return { stains, rugs, clutter, barProps, lamps, windows, posters, wallPlants };
}

// Prebaked lighting. One canvas per lamp radius, plus the cool spills.
const GLOW_CACHE = new Map();
function glowFor(radius, rgb, alpha) {
  const key = radius + ':' + rgb.join(',');
  let g = GLOW_CACHE.get(key);
  if (!g) {
    g = makeGlowCanvas(radius, rgb, alpha, 5);
    GLOW_CACHE.set(key, g);
  }
  return g;
}

const WARM_RGB = [255, 190, 92];
const HOT_RGB = [255, 226, 160];
const FIRE_RGB = [255, 150, 60];
const COOL_RGB = [91, 166, 201];
const LAMP_DROP = 26;   // screen px between a pendant shade and its floor pool

// Rebuilt only when the viewport changes size.
let vignetteCanvas = null;
function ensureVignette() {
  if (vignetteCanvas && vignetteCanvas.width === viewW && vignetteCanvas.height === viewH) return;
  vignetteCanvas = makeVignetteCanvas(viewW, viewH, 0.55);
}

function drawGlow(glow, worldX, worldY, alpha, camX, camY) {
  const r = glow.width / 2;
  const sx = Math.round(worldX - camX - r);
  const sy = Math.round(worldY - camY - r);
  if (sx >= viewW || sy >= viewH || sx + glow.width <= 0 || sy + glow.height <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(glow, sx, sy);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

// ---- Ambient animation ------------------------------------------------------
// A fixed pool of motes drifting in screen space, and per-lamp flicker phases.
// Both are skipped entirely under prefers-reduced-motion.
const DUST = [];
for (let i = 0; i < 14; i++) {
  DUST.push({ x: Math.random(), y: Math.random(), vx: 0, vy: 0, a: 0 });
}
let dustReady = false;

function updateAmbient(dt) {
  if (prefersReducedMotion) return;
  if (!dustReady) {
    for (const d of DUST) {
      d.x = Math.random() * viewW;
      d.y = Math.random() * viewH;
      d.vx = (Math.random() - 0.5) * 3;
      d.vy = -2 - Math.random() * 4;
      d.a = 0.10 + Math.random() * 0.16;
    }
    dustReady = true;
  }
  for (const d of DUST) {
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    if (d.y < -2) { d.y = viewH + 2; d.x = Math.random() * viewW; }
    if (d.x < -2) d.x = viewW + 2;
    if (d.x > viewW + 2) d.x = -2;
  }
}

// How bright each lamp is this frame. Irregular by design: two sine terms of
// unrelated periods so it never settles into a visible loop.
function lampIntensity(lamp) {
  if (prefersReducedMotion) return 1;
  const t = gameTime;
  const wobble = Math.sin(t * 2.3 + lamp.phase) * 0.035 + Math.sin(t * 7.1 + lamp.phase * 2.7) * 0.02;
  return 1 + wobble;
}

// ---- Pass 1: backdrop -------------------------------------------------------
function drawBackdrop() {
  ctx.fillStyle = '#071512';
  ctx.fillRect(0, 0, viewW, viewH);
}

// ---- Pass 2: ground ---------------------------------------------------------
// Staggered planks as before, but on a four-step tobacco ramp with a dithered
// grain pass and the static wear marks on top.
// Painted once into the room canvas in world coordinates, so it walks the
// whole map rather than the camera's slice. The `ctx` parameter deliberately
// shadows the screen context: these two functions are only ever called against
// the offscreen room canvas.
function drawRug(ctx, rug) {
  const { x, y, w, h } = rug;
  ctx.fillStyle = PUB.tableShadow;
  ctx.fillRect(x + 1.5, y + 2, w, h);
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = rug.accent;
  ctx.fillRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = rug.base;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(x + 2.5, y + 2.5, w - 5, 0.5);
  ctx.fillRect(x + 2.5, y + h - 3, w - 5, 0.5);
  ctx.fillRect(x + 2.5, y + 2.5, 0.5, h - 5);
  ctx.fillRect(x + w - 3, y + 2.5, 0.5, h - 5);

  // Dense kilim borders and small woven medallions: the half-unit strokes are
  // single backing pixels, so this detail reads as textile rather than the
  // old row of large square dots.
  ctx.fillStyle = rug.accent;
  for (let px = x + 4; px < x + w - 4; px += 4) {
    ctx.fillRect(px, y + 3.5, 1.5, 0.5);
    ctx.fillRect(px + 1, y + 4, 1.5, 0.5);
    ctx.fillRect(px, y + h - 4, 1.5, 0.5);
    ctx.fillRect(px + 1, y + h - 4.5, 1.5, 0.5);
  }
  for (let py = y + 6; py < y + h - 5; py += 5) {
    ctx.fillRect(x + 3.5, py, 0.5, 2);
    ctx.fillRect(x + 4, py + 1, 0.5, 2);
    ctx.fillRect(x + w - 4, py, 0.5, 2);
    ctx.fillRect(x + w - 4.5, py + 1, 0.5, 2);
  }

  const stepX = rug.motif === 2 ? 10 : 12;
  const stepY = rug.motif === 1 ? 10 : 12;
  for (let py = y + 9; py < y + h - 7; py += stepY) {
    for (let px = x + 9; px < x + w - 7; px += stepX) {
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = rug.accent;
      ctx.fillRect(px, py - 1.5, 1, 1);
      ctx.fillRect(px - 1.5, py, 4, 1);
      ctx.fillRect(px, py + 1, 1, 1);
      ctx.fillStyle = PUB.creamDim;
      ctx.fillRect(px + 0.5, py, 0.5, 0.5);
    }
  }
  ctx.globalAlpha = 1;

  // Fine uneven fringe on the ends.
  ctx.fillStyle = PUB.creamDim;
  for (let px = x + 2; px < x + w - 1; px += 2) {
    const fringe = ((px + rug.motif) & 2) ? 1 : 0.5;
    ctx.fillRect(px, y - fringe, 0.5, fringe);
    ctx.fillRect(px + 0.5, y + h, 0.5, fringe);
  }
}

function floorHash(x, y) {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return (n ^ (n >>> 16)) >>> 0;
}

function drawGround(ctx) {
  const plankH = 6;
  ctx.fillStyle = PUB.floor[0];
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  for (let row = 0, sy = 0; sy < WORLD_H; row++, sy += plankH) {
    let plank = 0;
    let sx = -(row % 3) * 11;
    while (sx < WORLD_W) {
      const hash = floorHash(plank + row * 17, row);
      const length = 23 + (hash % 24);
      ctx.fillStyle = PUB.floor[hash % PUB.floor.length];
      ctx.fillRect(sx + 0.5, sy + 0.5, length - 0.5, plankH - 0.5);

      ctx.fillStyle = PUB.floorEdge;
      ctx.globalAlpha = 0.28;
      ctx.fillRect(sx + 1, sy + 0.5, Math.max(1, length - 2), 0.5);
      ctx.globalAlpha = 1;

      // Fine grain, scratches and the occasional knot. At ART_SCALE 2 each
      // 0.5 unit stroke is one true pixel in the backing store.
      ctx.fillStyle = PUB.floorGrain;
      const grainCount = 2 + (hash & 3);
      for (let g = 0; g < grainCount; g++) {
        const gx = sx + 3 + ((hash >>> (g * 4)) % Math.max(4, length - 7));
        const gy = sy + 1.5 + ((hash >>> (g * 3 + 2)) % 7) * 0.5;
        const gw = 2 + ((hash >>> (g + 11)) % 7);
        ctx.fillRect(gx, gy, Math.min(gw, sx + length - gx - 1), 0.5);
      }
      if ((hash & 15) === 3) {
        const kx = sx + length * 0.62;
        ctx.fillStyle = PUB.floorSeam;
        ctx.fillRect(kx - 1, sy + 2.5, 2.5, 1);
        ctx.fillStyle = PUB.floorEdge;
        ctx.fillRect(kx - 0.5, sy + 2.5, 1, 0.5);
      }

      ctx.fillStyle = PUB.floorSeam;
      ctx.fillRect(sx, sy, 0.5, plankH);
      sx += length;
      plank++;
    }
    ctx.fillStyle = PUB.floorSeam;
    ctx.fillRect(0, sy, WORLD_W, 0.5);
  }

  for (const rug of DECOR.rugs) drawRug(ctx, rug);

  ctx.fillStyle = PUB.floorStain;
  for (const s of DECOR.stains) {
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillRect(s.x + 1, s.y - 1, Math.max(1, s.w - 2), 1);
  }
}

// ---- Pass 3: architecture ---------------------------------------------------
// Wall bands at the world edges. They are decoration, not collision — the
// existing world clamp already keeps everyone inside — so characters can
// overlap the lowest pixels of the rear wall exactly as they would in life.
// Also drawn into the room canvas; see the note on drawGround.
function drawArchitecture(ctx) {
  const left = 0;
  const top = 0;

  // Rear wall: deep raised timber panels, crown rail and a projected
  // wainscot. Half-unit lines are the fine carved edges that were impossible
  // in the old 1x backing store.
  ctx.fillStyle = PUB.wallDark;
  ctx.fillRect(left, top, WORLD_W, WALL_TOP_H);
  ctx.fillStyle = PUB.wall;
  ctx.fillRect(left + 0.5, top + 0.5, WORLD_W - 1, WALL_TOP_H - 3);
  ctx.fillStyle = PUB.wallLit;
  ctx.fillRect(left, top + 0.5, WORLD_W, 1);
  ctx.fillStyle = PUB.wainscotLit;
  ctx.fillRect(left, top + 2, WORLD_W, 0.5);
  for (let x = 8; x < WORLD_W; x += 16) {
    ctx.fillStyle = PUB.wallDark;
    ctx.fillRect(x, top + 2.5, 1, WALL_TOP_H - 5);
    ctx.fillStyle = PUB.wainscotLit;
    ctx.fillRect(x + 1, top + 3, 0.5, WALL_TOP_H - 6);
  }
  ctx.fillStyle = PUB.wainscotLit;
  ctx.fillRect(left, top + WALL_TOP_H - 4, WORLD_W, 1);
  ctx.fillStyle = PUB.wainscot;
  ctx.fillRect(left, top + WALL_TOP_H - 3, WORLD_W, 2);
  for (let x = 1; x < WORLD_W; x += 4) {
    ctx.fillStyle = (x & 4) ? PUB.wallLit : PUB.wall;
    ctx.fillRect(x, top + WALL_TOP_H - 2.5, 2, 0.5);
  }
  ctx.fillStyle = PUB.baseboard;
  ctx.fillRect(left, top + WALL_TOP_H - 1, WORLD_W, 1);
  ctx.fillStyle = PUB.barTopHi;
  ctx.globalAlpha = 0.42;
  ctx.fillRect(left + 1, top + WALL_TOP_H - 1.5, WORLD_W - 2, 0.5);
  ctx.globalAlpha = 1;

  // Windows: cooler light than anything else in the room.
  for (const w of DECOR.windows) {
    const wx = left + w.x;
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(wx - 1.5, top + 0.5, w.w + 3, 13);
    ctx.fillStyle = PUB.wainscotLit;
    ctx.fillRect(wx - 1, top + 1, w.w + 2, 11.5);
    ctx.fillStyle = PUB.midnight;
    ctx.fillRect(wx, top + 1.5, w.w, 10);
    // Tiny skyline blocks and warm windows beyond rain-streaked glass.
    ctx.fillStyle = PUB.cool;
    for (let x = 1; x < w.w - 1; x += 3) {
      const buildingH = 3 + ((x + w.x) % 5);
      ctx.fillRect(wx + x, top + 11 - buildingH, 2.5, buildingH);
      ctx.fillStyle = ((x + w.x) & 1) ? PUB.amber : PUB.coolPale;
      ctx.fillRect(wx + x + 0.5, top + 10 - (buildingH & 1), 0.5, 0.5);
      if (buildingH > 5) ctx.fillRect(wx + x + 1.5, top + 7, 0.5, 0.5);
      ctx.fillStyle = PUB.cool;
    }
    ctx.fillStyle = PUB.coolPale;
    ctx.globalAlpha = 0.72;
    ctx.fillRect(wx + Math.floor(w.w / 2), top + 1.5, 0.5, 10);
    ctx.fillRect(wx, top + 6, w.w, 0.5);
    for (let x = 2; x < w.w; x += 5) {
      ctx.fillRect(wx + x, top + 2, 0.5, 3 + ((x + w.x) & 2));
      ctx.fillRect(wx + x + 0.5, top + 8.5, 0.5, 1.5);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = PUB.barTopHi;
    ctx.fillRect(wx - 1, top + 12, w.w + 2, 0.5);
  }

  for (const p of DECOR.posters) {
    const px = left + p.x;
    const py = top + 2;
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(px - 1, py - 1, p.w + 2, p.h + 2);
    ctx.fillStyle = p.paper;
    ctx.fillRect(px, py, p.w, p.h);
    ctx.fillStyle = p.ink;
    ctx.fillRect(px + 2, py + 2, p.w - 4, 1);
    ctx.fillRect(px + 2, py + 4, Math.max(1, p.w - 6), 1);
  }

  for (const plant of DECOR.wallPlants) {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(plant.x - 2.5, plant.y, 5.5, 2.5);
    ctx.fillStyle = PUB.barTop;
    ctx.fillRect(plant.x - 2, plant.y + 0.5, 4.5, 1.5);
    ctx.fillStyle = PUB.barTopHi;
    ctx.fillRect(plant.x - 1.5, plant.y + 0.5, 3, 0.5);
    ctx.fillStyle = PUB.green;
    ctx.fillRect(plant.x, plant.y + 2, 0.5, plant.drop);
    for (let py = plant.y + 2.5; py < plant.y + plant.drop; py += 2) {
      const side = ((Math.round(py * 2) + plant.x) & 2) ? -1 : 1;
      ctx.fillRect(plant.x + side * 0.5, py, side * 2, 1);
      ctx.fillRect(plant.x + side * 1.5, py + 0.5, side * 1.5, 1);
      ctx.fillStyle = PUB.greenLit;
      ctx.fillRect(plant.x + side * 1.5, py, 0.5, 0.5);
      ctx.fillStyle = PUB.green;
    }
    ctx.fillStyle = PUB.greenLit;
    ctx.fillRect(plant.x - 1, plant.y + 3, 2.5, 1);
  }

  // Side walls.
  ctx.fillStyle = PUB.wainscot;
  ctx.fillRect(left, top, WALL_SIDE_W, WORLD_H);
  ctx.fillRect(left + WORLD_W - WALL_SIDE_W, top, WALL_SIDE_W, WORLD_H);
  ctx.fillStyle = PUB.wainscotLit;
  ctx.fillRect(left + 0.5, top, 0.5, WORLD_H);
  ctx.fillRect(left + WORLD_W - 1, top, 0.5, WORLD_H);
  ctx.fillStyle = PUB.baseboard;
  ctx.fillRect(left + WALL_SIDE_W - 1, top, 1, WORLD_H);
  ctx.fillRect(left + WORLD_W - WALL_SIDE_W, top, 1, WORLD_H);
  for (let y = WALL_TOP_H + 8; y < WORLD_H - WALL_BOTTOM_H; y += 22) {
    ctx.fillStyle = PUB.wallDark;
    ctx.fillRect(left + 1.5, y, WALL_SIDE_W - 3, 0.5);
    ctx.fillRect(left + WORLD_W - WALL_SIDE_W + 1.5, y, WALL_SIDE_W - 3, 0.5);
    ctx.fillStyle = PUB.wallLit;
    ctx.fillRect(left + 2, y + 1, WALL_SIDE_W - 4, 0.5);
    ctx.fillRect(left + WORLD_W - WALL_SIDE_W + 2, y + 1, WALL_SIDE_W - 4, 0.5);
  }

  // Tiny framed portraits and brass sconces layer the otherwise empty side
  // walls. They stay inside the wall plane and never create fake collision.
  for (const side of [0, 1]) {
    const wallX = side ? WORLD_W - WALL_SIDE_W : 0;
    for (const py of [118, 238]) {
      ctx.fillStyle = PUB.ink;
      ctx.fillRect(wallX + 1, py, WALL_SIDE_W - 2, 8);
      ctx.fillStyle = PUB.barTop;
      ctx.fillRect(wallX + 1.5, py + 0.5, WALL_SIDE_W - 3, 7);
      ctx.fillStyle = side ? PUB.cool : PUB.burgundy;
      ctx.fillRect(wallX + 2, py + 1.5, WALL_SIDE_W - 4, 4.5);
      ctx.fillStyle = PUB.creamDim;
      ctx.fillRect(wallX + 2.5, py + 2, 1, 1);
    }
    for (const sy of [92, 185, 315]) {
      ctx.fillStyle = PUB.brass;
      ctx.fillRect(wallX + 2.5, sy, 2, 1.5);
      ctx.fillRect(wallX + 3, sy + 1.5, 1, 2);
      ctx.fillStyle = PUB.cream;
      ctx.fillRect(wallX + 2, sy + 3, 3, 1.5);
      ctx.fillStyle = PUB.amber;
      ctx.fillRect(wallX + 2.5, sy + 3.5, 2, 1);
    }
  }

  // Front wall and the door everyone arrives through.
  const bottom = top + WORLD_H - WALL_BOTTOM_H;
  ctx.fillStyle = PUB.wallDark;
  ctx.fillRect(left, bottom, WORLD_W, WALL_BOTTOM_H);
  ctx.fillStyle = PUB.wall;
  ctx.fillRect(left, bottom + 1, WORLD_W, WALL_BOTTOM_H - 1);
  ctx.fillStyle = PUB.wainscotLit;
  for (let x = 8; x < WORLD_W; x += 16) ctx.fillRect(x, bottom + 2, 0.5, WALL_BOTTOM_H - 3);
  ctx.fillStyle = PUB.baseboard;
  ctx.fillRect(left, bottom, WORLD_W, 1);

  const doorW = 22;
  const dx = Math.round(left + DOOR.x - doorW / 2);
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(dx - 1.5, bottom, doorW + 3, WALL_BOTTOM_H);
  ctx.fillStyle = PUB.barTop;
  ctx.fillRect(dx - 1, bottom + 0.5, doorW + 2, WALL_BOTTOM_H - 0.5);
  ctx.fillStyle = PUB.midnight;
  ctx.fillRect(dx, bottom + 2, doorW, WALL_BOTTOM_H - 2);
  ctx.fillStyle = PUB.wainscotLit;
  ctx.fillRect(dx, bottom + 2, 0.5, WALL_BOTTOM_H - 2);
  ctx.fillRect(dx + doorW - 0.5, bottom + 2, 0.5, WALL_BOTTOM_H - 2);
  ctx.fillStyle = PUB.cool;
  ctx.fillRect(dx + 3, bottom + 3, doorW - 6, 0.5);
  ctx.fillRect(dx + doorW / 2, bottom + 2, 0.5, WALL_BOTTOM_H - 3);
  ctx.fillStyle = PUB.brass;
  ctx.fillRect(dx + doorW - 4, bottom + 6, 1, 1);

  drawWallProps(ctx);
}

// The pub's stories live on its walls: a stone fireplace in the pocket
// behind the bar, a mounted stag over the rear wall, a string of bulbs along
// the crown rail, a coat stand and a barrel in the front corners, palms on
// the side walls. All of it sits on the wall bands or in dead corners, so no
// collider moves and the lanes stay clean.
const FIREPLACE = { x: 0, y: 116, w: 14, h: 34 };
function drawWallProps(ctx) {
  // Fireplace: rough stone surround, black hearth, embers, a mantel with a
  // bottle and a candle.
  const f = FIREPLACE;
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(f.x, f.y, f.w + 1, f.h);
  const stones = ['#5a5652', '#6b6660', '#4a4642', '#767069'];
  let si = 0;
  for (let y = f.y + 1; y < f.y + f.h - 1; y += 4) {
    for (let x = f.x + ((y >> 2) & 1) * 2; x < f.x + f.w; x += 4, si++) {
      ctx.fillStyle = stones[si % stones.length];
      ctx.fillRect(x + 0.5, y + 0.5, 3, 3);
    }
  }
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(f.x + 2, f.y + 10, f.w - 3, 18);           // hearth opening
  ctx.fillStyle = '#2a1008';
  ctx.fillRect(f.x + 3, f.y + 11, f.w - 5, 16);
  ctx.fillStyle = '#c8501a';                               // logs and embers
  ctx.fillRect(f.x + 4, f.y + 22, f.w - 7, 3);
  ctx.fillStyle = '#ff9a2a';
  ctx.fillRect(f.x + 5, f.y + 19, 3, 3);
  ctx.fillRect(f.x + 9, f.y + 20, 2, 2);
  ctx.fillStyle = '#ffd86a';
  ctx.fillRect(f.x + 6, f.y + 17, 1.5, 2);
  ctx.fillRect(f.x + 9.5, f.y + 18, 1, 1.5);
  ctx.fillStyle = '#fff2b0';
  ctx.fillRect(f.x + 6.5, f.y + 16, 0.5, 1);
  ctx.fillStyle = PUB.barTop;                              // mantel
  ctx.fillRect(f.x, f.y + 7, f.w + 2, 2.5);
  ctx.fillStyle = PUB.barTopHi;
  ctx.fillRect(f.x, f.y + 7, f.w + 2, 0.5);
  ctx.fillStyle = PUB.bottleGreen;                         // bottle on the mantel
  ctx.fillRect(f.x + 3, f.y + 3, 2, 4);
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(f.x + 3.5, f.y + 2, 1, 1.5);
  ctx.fillStyle = PUB.cream;                               // candle
  ctx.fillRect(f.x + 9, f.y + 4, 1.5, 3);
  ctx.fillStyle = PUB.amber;
  ctx.fillRect(f.x + 9.5, f.y + 3, 0.5, 1);
  ctx.fillStyle = PUB.brass;                               // fender
  ctx.fillRect(f.x + 1, f.y + f.h - 2, f.w - 1, 1);

  // The stag over the rear wall: walnut shield, brown head, tan antlers.
  const sx = 116, sy = 2;
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(sx - 4, sy + 4, 9, 9);
  ctx.fillStyle = PUB.barFront;
  ctx.fillRect(sx - 3.5, sy + 4.5, 8, 8);
  ctx.fillStyle = PUB.barTopHi;
  ctx.fillRect(sx - 3, sy + 5, 7, 0.5);
  ctx.fillStyle = '#6b4a30';
  ctx.fillRect(sx - 2, sy + 6, 5, 5);                      // head
  ctx.fillRect(sx - 1, sy + 11, 3, 1.5);                   // muzzle
  ctx.fillStyle = '#4a3020';
  ctx.fillRect(sx - 0.5, sy + 11.5, 2, 1);
  ctx.fillStyle = '#e8ddc0';
  ctx.fillRect(sx - 3, sy + 7, 1, 1.5);                    // ears
  ctx.fillRect(sx + 3, sy + 7, 1, 1.5);
  ctx.fillStyle = '#141414';
  ctx.fillRect(sx - 1, sy + 8, 0.5, 0.5);                  // eyes
  ctx.fillRect(sx + 1.5, sy + 8, 0.5, 0.5);
  ctx.fillStyle = '#d3a26b';                               // antlers
  ctx.fillRect(sx - 3.5, sy + 1, 0.5, 5);
  ctx.fillRect(sx + 4, sy + 1, 0.5, 5);
  ctx.fillRect(sx - 5, sy + 2, 2, 0.5);
  ctx.fillRect(sx + 4, sy + 2, 2, 0.5);
  ctx.fillRect(sx - 4.5, sy, 0.5, 2);
  ctx.fillRect(sx + 5, sy, 0.5, 2);
  ctx.fillRect(sx - 3, sy + 3, 1, 0.5);
  ctx.fillRect(sx + 3, sy + 3, 1, 0.5);

  // String lights along the crown rail: a sagging wire, a warm bulb every
  // seven pixels.
  for (let x = 4; x < WORLD_W - 4; x += 7) {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x, 3.5, 7, 0.5);
    ctx.fillRect(x + 3, 4, 1, 1);
    ctx.fillStyle = (x / 7) % 3 === 0 ? '#ffd27a' : (x / 7) % 3 === 1 ? '#ff9a5a' : '#fff0b8';
    ctx.fillRect(x + 2.5, 5, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 3, 5, 0.5, 0.5);
  }

  // Coat stand in the front-left corner: a pole, hooks, two coats, a hat.
  const cx = 12, cy = 336;
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(cx - 0.5, cy, 2, 22);
  ctx.fillRect(cx - 4, cy + 20, 9, 1.5);                   // foot
  ctx.fillStyle = PUB.brass;
  ctx.fillRect(cx - 3, cy + 1, 7, 0.5);                    // hooks
  ctx.fillRect(cx - 3, cy + 1, 0.5, 1.5);
  ctx.fillRect(cx + 3.5, cy + 1, 0.5, 1.5);
  ctx.fillStyle = '#4a3a2c';                               // coat, brown
  ctx.fillRect(cx - 5, cy + 3, 4, 12);
  ctx.fillStyle = '#5c4a38';
  ctx.fillRect(cx - 4.5, cy + 3.5, 1, 11);
  ctx.fillStyle = '#2f4a3a';                               // coat, green
  ctx.fillRect(cx + 2, cy + 3, 4, 11);
  ctx.fillStyle = '#3f5c48';
  ctx.fillRect(cx + 2.5, cy + 3.5, 1, 10);
  ctx.fillStyle = '#8d342f';                               // hat on top
  ctx.fillRect(cx - 2, cy - 2, 5, 2.5);
  ctx.fillRect(cx - 1, cy - 3.5, 3, 1.5);

  // A barrel in the front-right corner: staves and brass hoops.
  const bx = 186, by = 334;
  ctx.fillStyle = PUB.tableShadow;
  ctx.fillRect(bx + 1, by + 22, 12, 2.5);
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(bx, by, 12, 23);
  ctx.fillStyle = PUB.barFront;
  ctx.fillRect(bx + 0.5, by + 0.5, 11, 22);
  ctx.fillStyle = PUB.barFrontLit;
  ctx.fillRect(bx + 1, by + 1, 2, 21);
  ctx.fillStyle = PUB.barFrontDark;
  for (let px = bx + 3.5; px < bx + 11; px += 2.5) ctx.fillRect(px, by + 1, 0.5, 21);
  ctx.fillStyle = PUB.brass;
  ctx.fillRect(bx + 0.5, by + 4, 11, 1);
  ctx.fillRect(bx + 0.5, by + 17, 11, 1);
  ctx.fillStyle = PUB.barTop;
  ctx.fillRect(bx + 1, by + 0.5, 10, 1.5);                 // lid

  // Palms on the side walls, half in the wall plane.
  for (const [px, py] of [[194, 150], [194, 300], [5, 220]]) {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(px - 3, py + 8, 6, 5);                     // pot
    ctx.fillStyle = '#7a3a2a';
    ctx.fillRect(px - 2.5, py + 8.5, 5, 4);
    ctx.fillStyle = '#9a4a34';
    ctx.fillRect(px - 2.5, py + 8.5, 5, 1);
    ctx.fillStyle = PUB.green;                              // fronds
    ctx.fillRect(px - 0.5, py, 1, 8);
    ctx.fillRect(px - 5, py + 1, 4.5, 1.5);
    ctx.fillRect(px + 0.5, py + 2, 4.5, 1.5);
    ctx.fillRect(px - 6, py + 4, 5.5, 1.5);
    ctx.fillRect(px + 0.5, py + 5, 5.5, 1.5);
    ctx.fillRect(px - 2, py - 2, 4, 2);
    ctx.fillStyle = PUB.greenLit;
    ctx.fillRect(px - 4.5, py + 1, 2, 0.5);
    ctx.fillRect(px + 1, py + 2, 2, 0.5);
    ctx.fillRect(px - 5.5, py + 4, 2.5, 0.5);
    ctx.fillRect(px - 1, py - 2, 2, 0.5);
  }
}

// One world-sized canvas holding passes 2-4. Built at load; the frame loop
// only copies the camera's rectangle out of it.
const roomCanvas = buildRoomCanvas();

function buildRoomCanvas() {
  const cv = document.createElement('canvas');
  cv.width = WORLD_W * ART_SCALE;
  cv.height = WORLD_H * ART_SCALE;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.setTransform(ART_SCALE, 0, 0, ART_SCALE, 0, 0);
  drawGround(g);
  drawArchitecture(g);
  return cv;
}

function drawRoom(camX, camY) {
  // Source rect clipped to the world, destination offset by whatever the
  // camera is showing outside it.
  const sx = Math.max(0, camX);
  const sy = Math.max(0, camY);
  const dx = Math.round(sx - camX);
  const dy = Math.round(sy - camY);
  const w = Math.min(WORLD_W - sx, viewW - dx);
  const h = Math.min(WORLD_H - sy, viewH - dy);
  if (w <= 0 || h <= 0) return;
  ctx.drawImage(
    roomCanvas,
    sx * ART_SCALE,
    sy * ART_SCALE,
    w * ART_SCALE,
    h * ART_SCALE,
    dx,
    dy,
    w,
    h,
  );
}

// ---- Pass 5: floor lighting -------------------------------------------------
// Warm pools under the lamps, cool spill under the windows and the door. Drawn
// before the characters so people are lit by the room, not tinted through it.
function drawFloorLight(camX, camY) {
  for (const lamp of DECOR.lamps) {
    const k = lampIntensity(lamp);
    // A wide soft pool, then a hot core: the reference's lamps have a bright
    // disc directly under the shade and a long soft skirt.
    drawGlow(glowFor(lamp.r, WARM_RGB, 0.55), lamp.x, lamp.y, k, camX, camY);
    drawGlow(glowFor(Math.round(lamp.r * 0.45), HOT_RGB, 0.5), lamp.x, lamp.y - 2, k, camX, camY);
    // Varnish reflection: a long broken streak straight under the bulb, the
    // way the boards throw a lamp back in the reference.
    const sx = Math.round((lamp.x - camX) * 2) / 2;
    const sy = Math.round((lamp.y - camY) * 2) / 2;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const ry = sy + 2 + i * 3;
      const rw = Math.max(0.5, 3 - i * 0.28);
      ctx.globalAlpha = (0.42 - i * 0.04) * k;
      ctx.fillStyle = i < 3 ? '#fff4d6' : PUB.amber;
      ctx.fillRect(sx - rw / 2 + ((i & 1) ? 0.5 : 0), ry, rw, i < 3 ? 1 : 1.5);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  // The bar is its own light source: bottles and the gantry lamp lay a warm
  // strip along every counter top.
  for (const seg of BAR_SEGMENTS) {
    const c = seg.collider;
    const horizontal = c.w >= c.h;
    const length = horizontal ? c.w : c.h;
    for (let p = 10; p < length - 4; p += 20) {
      const gx = horizontal ? c.x + p : c.x + c.w / 2 - 2;
      const gy = horizontal ? c.y + c.h / 2 - 4 : c.y + p;
      drawGlow(glowFor(18, HOT_RGB, 0.16), gx, gy, 0.8, camX, camY);
    }
  }
  for (const table of TABLES) {
    const items = DECOR.clutter.get(table) || [];
    for (const item of items) {
      if (item.kind !== 'candle') continue;
      drawGlow(glowFor(13, HOT_RGB, 0.5), table.x + item.ox, table.y + item.oy, 0.9, camX, camY);
    }
  }
  for (const w of DECOR.windows) {
    drawGlow(glowFor(26, COOL_RGB, 0.22), w.x + w.w / 2, 8, 1, camX, camY);
  }
  // The fire: an orange pool that breathes, plus a hotter core in the hearth.
  const fire = prefersReducedMotion ? 1 : 0.86 + Math.sin(gameTime * 9.3) * 0.08 + Math.sin(gameTime * 23.7) * 0.06;
  drawGlow(glowFor(34, FIRE_RGB, 0.5), FIREPLACE.x + 8, FIREPLACE.y + 24, fire, camX, camY);
  drawGlow(glowFor(12, HOT_RGB, 0.5), FIREPLACE.x + 7, FIREPLACE.y + 21, fire, camX, camY);
  // Readability halos on the two leads, dim enough to be separation rather
  // than a spotlight, so they read even when a route runs between pools.
  drawGlow(glowFor(22, WARM_RGB, 0.3), player.x, player.y - 4, 1, camX, camY);
  if (hunterState !== 'arriving') drawGlow(glowFor(20, WARM_RGB, 0.22), hunter.x, hunter.y - 4, 1, camX, camY);
  // The door brightens while someone is coming in or going out.
  let doorBusy = 0;
  for (const c of customers) {
    if (c.state === 'sitting') continue;
    const d = Math.hypot(c.x - DOOR.x, c.y - DOOR.y);
    if (d < 40) doorBusy = Math.max(doorBusy, 1 - d / 40);
  }
  drawGlow(glowFor(26, COOL_RGB, 0.2), DOOR.x, WORLD_H - 8, 0.55 + doorBusy * 0.8, camX, camY);
}

// A soft additive rectangle (stepped edges, no gradient) for counter tops.
function drawGlowRect(x, y, w, h, alpha) {
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = alpha * (0.5 + i * 0.25);
    ctx.fillStyle = 'rgb(255,190,92)';
    ctx.fillRect(Math.round(x + i * 3), Math.round(y + i * 3), Math.max(0, w - i * 6), Math.max(0, h - i * 6));
  }
  ctx.globalAlpha = 1;
}

// The room is dark first, then lit. A single multiply over everything drawn
// so far (floor, furniture, people) drops the scene to a night base; the
// additive pools above bring back the honey wherever a lamp hangs. This is
// what makes the lamps the brightest thing on screen rather than the floor.
// Two steps, both a touch cool so the warm pools sit forward: the floor is
// multiplied twice (once alone, once with everything else) and ends up near
// black between lamps, while furniture and people take only the second,
// lighter step and stay readable in the dark.
const DARK_FLOOR = '#6a6066';
const DARK_SCENE = '#a49a9e';
function drawDarkness(colour) {
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.globalCompositeOperation = 'source-over';
}

// ---- Furniture --------------------------------------------------------------
// A counter: dark front panel with vertical slats, a lit top surface with a
// highlight along its back edge, and the glassware standing on it.
function drawBar(bar, camX, camY) {
  const c = bar.collider;
  const x = Math.round(c.x - camX);
  const y = Math.round(c.y - camY);
  const horizontal = c.w >= c.h;
  // Three-quarter view: the south edge of every counter is a tall front
  // face; the long east side of the stem is a thinner side face.
  const front = 9;
  const side = horizontal ? 0 : 4;

  ctx.fillStyle = PUB.tableShadow;
  ctx.fillRect(x + 2, y + c.h + 1, c.w, 4);

  ctx.fillStyle = PUB.ink;
  ctx.fillRect(x + 1, y, c.w - 2, c.h + 1);
  ctx.fillRect(x, y + 1, c.w, c.h - 1);

  // Worktop.
  const topH = c.h - front;
  const topW = c.w - side;
  ctx.fillStyle = PUB.tableEdge;
  ctx.fillRect(x, y, topW + 1, topH + 1);
  ctx.fillStyle = PUB.barTop;
  ctx.fillRect(x + 1, y + 1, topW - 1, topH - 1);
  ctx.fillStyle = PUB.barTopLit;
  ctx.fillRect(x + 1, y + 1, topW - 1, 1.5);
  ctx.fillRect(x + 1, y + 1, 1, topH - 1);
  ctx.fillStyle = PUB.barTopHi;
  ctx.fillRect(x + 2, y + 1, topW - 3, 0.5);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = PUB.tableTopHi;
  for (let py = y + 4; py < y + topH - 2; py += 3) {
    for (let px = x + 3 + ((py * 3) % 7); px < x + topW - 4; px += 11) {
      ctx.fillRect(px, py, Math.min(5, x + topW - px - 3), 0.5);
    }
  }
  ctx.globalAlpha = 1;

  // Front face: panelled walnut with a lit top lip and a dark base.
  const fy = y + topH;
  ctx.fillStyle = PUB.barFront;
  ctx.fillRect(x + 1, fy, c.w - 2, front);
  ctx.fillStyle = PUB.barFrontLit;
  ctx.fillRect(x + 1, fy, c.w - 2, 1);
  ctx.fillStyle = PUB.barFrontDark;
  for (let px = x + 4; px < x + c.w - 3; px += 8) {
    ctx.fillRect(px, fy + 2, 0.5, front - 4);
    ctx.fillRect(px + 5, fy + 2, 0.5, front - 4);
    ctx.fillRect(px, fy + 2, 5.5, 0.5);
    ctx.fillRect(px, fy + front - 2.5, 5.5, 0.5);
  }
  ctx.fillRect(x + 1, fy + front - 1.5, c.w - 2, 1.5);
  // Brass foot rail on little brackets.
  ctx.fillStyle = PUB.brassDark || '#7d521a';
  ctx.fillRect(x + 2, fy + front - 2.5, c.w - 4, 1);
  ctx.fillStyle = PUB.brass;
  ctx.fillRect(x + 2, fy + front - 3, c.w - 4, 1);
  for (let px = x + 5; px < x + c.w - 3; px += 10) ctx.fillRect(px, fy + front - 2, 1, 1.5);

  // Side face on the stem.
  if (side) {
    ctx.fillStyle = PUB.barFrontDark;
    ctx.fillRect(x + topW, y + 1, side, c.h - 1);
    ctx.fillStyle = PUB.barFront;
    ctx.fillRect(x + topW, y + 1, 1, topH);
  }

  for (const prop of DECOR.barProps) {
    if (prop.seg !== bar) continue;
    drawBarProp(prop, camX, camY);
  }
  if (bar.station === 'taps') drawTapRow(x, y, topW);
  if (bar.station === 'shelf') drawBottleGantry(x, y, topW, topH);
  if (bar.station === 'hatch') drawKitchenHatch(x, y, topW);
  if (horizontal && c.w > 60) drawCounterPlant(x + topW - 8, y + 4);
  drawStationTag(bar, x, y, horizontal);
}

// A row of brass tap handles along the back edge of the taps counter.
function drawTapRow(x, y, topW) {
  for (let px = x + 10; px < x + topW - 12; px += 9) {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(px - 1.5, y + 1, 4, 3);          // font base
    ctx.fillStyle = PUB.brassDark || '#7d521a';
    ctx.fillRect(px - 1, y - 4, 3, 5.5);           // font body
    ctx.fillStyle = PUB.brass;
    ctx.fillRect(px - 1, y - 4, 1.5, 5);
    ctx.fillRect(px - 0.5, y - 7, 2, 3.5);         // handle
    ctx.fillStyle = PUB.cream;
    ctx.fillRect(px - 0.5, y - 7, 1, 1);
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(px + 1.5, y - 2, 1, 1.5);         // spout
  }
}

// The back-bar as an island gantry down the middle of the stem: two shelves
// of lit bottles under a brass rail, hanging glasses along the top. This is
// the reference's glowing bottle wall, moved onto the counter so the bar
// stays free-standing.
function drawBottleGantry(x, y, topW, topH) {
  const gx = x + Math.round(topW / 2) - 4;
  const gy = y + 6;
  const gh = topH - 12;
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(gx - 1, gy - 6, 10, gh + 7);
  ctx.fillStyle = PUB.barFrontDark;
  ctx.fillRect(gx, gy - 5, 8, gh + 5);
  ctx.fillStyle = PUB.brass;
  ctx.fillRect(gx - 1, gy - 6, 10, 1);                 // top rail
  // Hanging glasses under the rail.
  ctx.fillStyle = PUB.glass;
  for (let py = gy - 4; py < gy + gh - 2; py += 6) {
    ctx.fillRect(gx + 0.5, py, 1, 1.5);
    ctx.fillRect(gx + 6.5, py, 1, 1.5);
  }
  // Shelves and bottles. Bottle colours from the room palette, each with a
  // lit shoulder so the shelf reads as backlit.
  const colours = [PUB.bottleAmber, PUB.bottleGreen, PUB.tomato, PUB.bottleClear, PUB.amber, PUB.burgundy];
  let i = 0;
  for (let py = gy - 1; py < gy + gh - 4; py += 5) {
    ctx.fillStyle = PUB.barFront;
    ctx.fillRect(gx, py + 4, 8, 1);                    // shelf
    ctx.fillStyle = PUB.brassDark || '#7d521a';
    ctx.fillRect(gx, py + 4, 8, 0.5);
    for (let px = gx + 1.5; px < gx + 7; px += 2, i++) {
      const col = colours[(i * 7 + (py | 0)) % colours.length];
      ctx.fillStyle = col;
      ctx.fillRect(px, py + 0.5, 1.5, 3.5);
      ctx.fillStyle = '#fff2c8';
      ctx.fillRect(px, py + 0.5, 0.5, 1);
      ctx.fillStyle = PUB.ink;
      ctx.fillRect(px + 0.5, py - 0.5, 0.5, 1);          // neck
    }
  }
  // A small lamp on the gantry throws light down the bottles.
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = 'rgb(255,200,110)';
  ctx.fillRect(gx - 4, gy - 6, 16, gh + 8);
  ctx.globalAlpha = 0.18;
  ctx.fillRect(gx - 1, gy - 4, 10, gh + 4);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

// The kitchen hatch: a warm serving window with plates under a heat lamp.
function drawKitchenHatch(x, y, topW) {
  const hx = x + Math.round(topW / 2) - 12;
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(hx - 1, y - 9, 26, 11);
  ctx.fillStyle = '#5a2e1c';
  ctx.fillRect(hx, y - 8, 24, 9);
  ctx.fillStyle = '#7a4a2a';
  ctx.fillRect(hx + 1, y - 7, 22, 6);
  ctx.fillStyle = PUB.brass;
  ctx.fillRect(hx + 2, y - 8, 20, 1);                   // heat lamp bar
  ctx.fillStyle = '#ffd27a';
  for (let px = hx + 4; px < hx + 22; px += 6) ctx.fillRect(px, y - 7, 2, 1);
  for (let px = hx + 3; px < hx + 21; px += 6) {
    ctx.fillStyle = '#e9e2d0';
    ctx.fillRect(px, y - 3, 4, 1.5);                    // plate
    ctx.fillStyle = PUB.bottleAmber;
    ctx.fillRect(px + 1, y - 4, 2, 1);                  // food
  }
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = 'rgb(255,200,110)';
  ctx.fillRect(hx - 3, y - 9, 30, 14);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

// A small parchment tag on the counter naming the station, so the player can
// read the bar's map from across the room.
function drawStationTag(bar, x, y, horizontal) {
  const station = BAR_STATIONS[bar.station];
  if (!station) return;
  const c = bar.collider;
  const tw = fontTextWidth(station.label) + 4;
  const th = FONT_H + 3;
  const tx = horizontal ? x + Math.round(c.w / 2 - tw / 2) : x + Math.round(c.w / 2 - tw / 2);
  const ty = horizontal ? y + 3 : y + Math.round(c.h / 2 - th / 2);
  drawParchmentPlate(tx, ty, tw, th, UI.brassDark);
  fontDrawText(ctx, station.label, tx + 2, ty + 2, UI.ink);
}

function drawCounterPlant(x, y) {
  ctx.fillStyle = PUB.tableShadow;
  ctx.fillRect(x - 2, y + 1, 5, 2);
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(x - 2, y - 1, 5, 3);
  ctx.fillStyle = PUB.barTop;
  ctx.fillRect(x - 1.5, y - 0.5, 4, 2);
  ctx.fillStyle = PUB.green;
  ctx.fillRect(x, y - 6, 0.5, 5.5);
  ctx.fillRect(x - 3, y - 5, 3, 1.5);
  ctx.fillRect(x + 0.5, y - 4.5, 3, 1.5);
  ctx.fillRect(x - 2, y - 7, 2.5, 2);
  ctx.fillRect(x + 0.5, y - 7.5, 2.5, 2);
  ctx.fillStyle = PUB.greenLit;
  ctx.fillRect(x - 2.5, y - 5, 1, 0.5);
  ctx.fillRect(x + 1, y - 7, 1, 0.5);
}

function drawBarProp(prop, camX, camY) {
  const x = Math.round(prop.x - camX);
  const y = Math.round(prop.y - camY);
  if (prop.kind === 'bottle') {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x - 0.5, y - 6.5, 3, 6.5);
    ctx.fillStyle = (prop.x & 1) ? PUB.bottleGreen : PUB.bottleAmber;
    ctx.fillRect(x, y - 5.5, 2, 5);
    ctx.fillStyle = PUB.glass;
    ctx.globalAlpha = 0.75;
    ctx.fillRect(x, y - 5, 0.5, 3);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PUB.paper;
    ctx.fillRect(x, y - 3.5, 2, 1);
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x + 0.5, y - 7.5, 1, 2);
  } else if (prop.kind === 'glass') {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x - 0.5, y - 4.5, 3, 4.5);
    ctx.fillStyle = PUB.bottleClear;
    ctx.fillRect(x, y - 4, 2, 3.5);
    ctx.fillStyle = PUB.amber;
    ctx.fillRect(x, y - 2, 2, 1.5);
    ctx.fillStyle = PUB.cream;
    ctx.fillRect(x, y - 4, 0.5, 2);
  } else {
    ctx.fillStyle = PUB.brass;
    ctx.fillRect(x, y - 5, 1.5, 5);
    ctx.fillRect(x + 1.5, y - 5, 2.5, 0.5);
    ctx.fillStyle = PUB.barTopHi;
    ctx.fillRect(x + 0.5, y - 5, 0.5, 3.5);
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x - 0.5, y - 1, 2.5, 1);
  }
}

// One chair per seat point, so the chairs can never drift away from where
// getTableSeats actually puts people. Shared by tables and stool benches.
function drawSeatChairs(table, camX, camY) {
  const seats = getTableSeats(table);
  for (let i = 0; i < seats.length; i++) {
    const seat = seats[i];
    const centerX = Math.round((seat.x - camX) * 2) / 2;
    const centerY = Math.round((seat.y - camY) * 2) / 2;
    const alternate = (Math.round(table.x + table.y) + i * 3) % 7 < 2;
    const base = alternate ? PUB.chairAlt : PUB.chair;
    const lit = alternate ? PUB.chairAltLit : PUB.chairLit;
    const w = 8;
    const cx = centerX - w / 2;
    const seatY = centerY - 2;          // cushion
    // Shadow and legs.
    ctx.fillStyle = PUB.tableShadow;
    ctx.fillRect(cx + 1, seatY + 4, w, 2.5);
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(cx + 0.5, seatY + 3, 1, 3.5);
    ctx.fillRect(cx + w - 1.5, seatY + 3, 1, 3.5);
    // Back rail: away from the table. North chairs show it behind the
    // cushion, south chairs in front (it will sit over the sitter's legs, as
    // it should), side chairs to the outside.
    const backOnTop = seat.side === 'n';
    const backBottom = seat.side === 's';
    if (backOnTop) {
      ctx.fillStyle = PUB.ink;
      ctx.fillRect(cx, seatY - 6, w, 6.5);
      ctx.fillStyle = PUB.tableEdge;
      ctx.fillRect(cx + 0.5, seatY - 5.5, w - 1, 5.5);
      ctx.fillStyle = PUB.barTopLit;
      ctx.fillRect(cx + 1, seatY - 5.5, w - 2, 0.5);
      ctx.fillStyle = PUB.barFrontDark;
      for (let px = cx + 2; px < cx + w - 1; px += 2) ctx.fillRect(px, seatY - 4.5, 0.5, 3.5);
    }
    // Cushion with a lit top edge and tufting.
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(cx, seatY - 0.5, w, 5);
    ctx.fillStyle = base;
    ctx.fillRect(cx + 0.5, seatY, w - 1, 4);
    ctx.fillStyle = lit;
    ctx.fillRect(cx + 1, seatY, w - 2, 1);
    ctx.fillRect(cx + 2.5, seatY + 2, 0.5, 0.5);
    ctx.fillRect(cx + 5, seatY + 2, 0.5, 0.5);
    ctx.fillStyle = PUB.barFrontDark;
    ctx.fillRect(cx + 0.5, seatY + 3.5, w - 1, 0.5);
    if (backBottom) {
      ctx.fillStyle = PUB.ink;
      ctx.fillRect(cx, seatY + 3.5, w, 4);
      ctx.fillStyle = PUB.tableEdge;
      ctx.fillRect(cx + 0.5, seatY + 4, w - 1, 3);
      ctx.fillStyle = PUB.barTopLit;
      ctx.fillRect(cx + 1, seatY + 4, w - 2, 0.5);
      ctx.fillStyle = PUB.barFrontDark;
      for (let px = cx + 2; px < cx + w - 1; px += 2) ctx.fillRect(px, seatY + 5, 0.5, 1.5);
    } else if (seat.side === 'w' || seat.side === 'e') {
      const bx = seat.side === 'e' ? cx + w - 1.5 : cx;
      ctx.fillStyle = PUB.ink;
      ctx.fillRect(bx - 0.5, seatY - 5, 2.5, 9.5);
      ctx.fillStyle = PUB.tableEdge;
      ctx.fillRect(bx, seatY - 4.5, 1.5, 8.5);
      ctx.fillStyle = PUB.barTopLit;
      ctx.fillRect(bx, seatY - 4.5, 1.5, 0.5);
    }
  }
}

// A bench is seating with no tabletop, unlike drawTable: either one long
// wall seat, or a row of bare stools at the bar.
function drawBench(bench, camX, camY) {
  if (bench.seatStyle !== 'bench') {
    drawSeatChairs(bench, camX, camY);
    return;
  }
  // A wall bench reads as one long seat, not a row of separate chairs.
  const x = Math.round(bench.x - bench.w / 2 - camX);
  const y = Math.round(bench.y - bench.h / 2 - camY);
  ctx.fillStyle = PUB.tableShadow;
  ctx.fillRect(x + 1.5, y + bench.h, bench.w, 2.5);
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(x + 0.5, y, bench.w - 1, bench.h);
  ctx.fillRect(x, y + 0.5, bench.w, bench.h - 1);
  ctx.fillStyle = PUB.chair;
  ctx.fillRect(x + 1, y + 1, bench.w - 2, bench.h - 2);
  ctx.fillStyle = PUB.chairLit;
  ctx.fillRect(x + 1.5, y + 1, bench.w - 3, 0.5);
  ctx.fillRect(x + 1, y + 1.5, 0.5, bench.h - 3);
  // A padded back along the wall side, buttoned, so it reads as a booth.
  if (bench.w > bench.h) {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x, y - 4, bench.w, 5);
    ctx.fillStyle = PUB.chair;
    ctx.fillRect(x + 0.5, y - 3.5, bench.w - 1, 4);
    ctx.fillStyle = PUB.chairLit;
    ctx.fillRect(x + 1, y - 3.5, bench.w - 2, 0.5);
    ctx.fillStyle = PUB.tableEdge;
    for (let px = x + 4; px < x + bench.w - 3; px += 6) ctx.fillRect(px, y - 1.5, 1, 1);
  }
  ctx.fillStyle = PUB.tableEdge;
  ctx.fillRect(x + 1, y + bench.h - 2, bench.w - 2, 1.5);
  for (let px = x + 4; px < x + bench.w - 3; px += 8) {
    ctx.fillRect(px, y + Math.floor(bench.h / 2), 1, 1);
    ctx.fillStyle = PUB.chairLit;
    ctx.fillRect(px + 0.5, y + Math.floor(bench.h / 2), 0.5, 0.5);
    ctx.fillStyle = PUB.tableEdge;
  }
  ctx.fillStyle = PUB.barFrontDark;
  for (let px = x + 7; px < x + bench.w - 4; px += 12) {
    ctx.fillRect(px, y + 1, 0.5, bench.h - 3);
  }
}

// A table: contact shadow, dark edge, lit top, a highlight along the back
// edge, and whatever was left on it.
function drawTable(table, camX, camY) {
  const sx = Math.round(table.x - camX);
  const sy = Math.round(table.y - camY);
  const halfW = Math.round(table.w / 2);
  const halfH = Math.round(table.h / 2);

  drawSeatChairs(table, camX, camY);

  ctx.fillStyle = PUB.tableShadow;
  ctx.fillRect(sx - halfW + 2, sy + halfH + 1, table.w, 3);

  const x = sx - halfW;
  const y = sy - halfH;
  // Three-quarter view: a real front face under the top, and legs.
  const front = Math.min(8, Math.max(5, Math.round(table.h * 0.28)));
  ctx.fillStyle = PUB.tableEdge;
  ctx.fillRect(x + 1, y, table.w - 2, table.h);
  ctx.fillRect(x, y + 1, table.w, table.h - 2);
  ctx.fillStyle = PUB.barFront;
  ctx.fillRect(x + 1, y + table.h - front, table.w - 2, front - 1);
  ctx.fillStyle = PUB.barFrontLit;
  ctx.fillRect(x + 1, y + table.h - front, table.w - 2, 1);
  ctx.fillStyle = PUB.barFrontDark;
  ctx.fillRect(x + 1, y + table.h - 1.5, table.w - 2, 1.5);
  for (let px = x + 5; px < x + table.w - 4; px += 7) ctx.fillRect(px, y + table.h - front + 2, 0.5, front - 4);
  // Legs, with the ink outline broken so they read as turned wood.
  ctx.fillStyle = PUB.ink;
  const legIn = Math.min(5, Math.round(table.w * 0.12));
  ctx.fillRect(x + legIn, y + table.h - 1, 2.5, 3);
  ctx.fillRect(x + table.w - legIn - 2.5, y + table.h - 1, 2.5, 3);
  ctx.fillStyle = PUB.barFront;
  ctx.fillRect(x + legIn + 0.5, y + table.h - 1, 1, 2.5);
  ctx.fillRect(x + table.w - legIn - 2, y + table.h - 1, 1, 2.5);

  ctx.fillStyle = PUB.tableTop;
  ctx.fillRect(x + 1, y + 1, table.w - 2, table.h - front - 1);
  ctx.fillStyle = PUB.tableTopLit;
  ctx.fillRect(x + 1.5, y + 1.5, table.w - 3, table.h - front - 2);
  ctx.fillStyle = PUB.tableTopHi;
  ctx.fillRect(x + 2, y + 1.5, table.w - 4, 0.5);
  ctx.fillRect(x + 1.5, y + 2, 0.5, table.h - front - 3);
  // Narrow boards and fine grain across the tabletop.
  for (let gy = y + 5; gy < y + table.h - front - 1; gy += 4.5) {
    ctx.fillStyle = PUB.tableTop;
    ctx.fillRect(x + 2, gy, table.w - 4, 0.5);
    ctx.fillStyle = PUB.tableTopHi;
    ctx.globalAlpha = 0.34;
    for (let gx = x + 5 + ((gy * 2) & 3); gx < x + table.w - 4; gx += 13) {
      ctx.fillRect(gx, gy + 1, Math.min(6, x + table.w - gx - 3), 0.5);
    }
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = PUB.barTopHi;
  ctx.fillRect(x + 2, y + table.h - front - 0.5, table.w - 4, 0.5);

  const items = DECOR.clutter.get(table);
  if (items) for (const it of items) drawTableProp(it, sx, sy, camX, camY);
}

function drawTableProp(item, tableSX, tableSY, camX, camY) {
  const x = tableSX + item.ox;
  const y = tableSY + item.oy;
  if (item.kind === 'coaster') {
    ctx.fillStyle = PUB.tableShadow;
    ctx.fillRect(x - 1.5, y + 0.5, 3.5, 1.5);
    ctx.fillStyle = (item.ox & 1) ? PUB.rugRed : PUB.creamDim;
    ctx.fillRect(x - 1.5, y, 3, 1.5);
    ctx.fillStyle = PUB.cream;
    ctx.fillRect(x - 0.5, y, 1, 0.5);
  } else if (item.kind === 'glass') {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x - 1.5, y - 3.5, 3, 4);
    ctx.fillStyle = PUB.bottleClear;
    ctx.fillRect(x - 1, y - 3, 2, 3);
    ctx.fillStyle = PUB.amber;
    ctx.fillRect(x - 1, y - 1.5, 2, 1);
    ctx.fillStyle = PUB.cream;
    ctx.fillRect(x - 1, y - 3, 0.5, 1.5);
  } else if (item.kind === 'mug') {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x - 2, y - 3.5, 3.5, 4);
    ctx.fillRect(x + 1.5, y - 2.5, 1.5, 2.5);
    ctx.fillStyle = PUB.bottleAmber;
    ctx.fillRect(x - 1.5, y - 2.5, 2.5, 2.5);
    ctx.fillStyle = PUB.cream;
    ctx.fillRect(x - 1.5, y - 3, 2.5, 0.5);
    ctx.fillRect(x - 1, y - 2.5, 0.5, 1.5);
  } else if (item.kind === 'candle') {
    ctx.fillStyle = PUB.tableShadow;
    ctx.fillRect(x - 2, y, 4, 1);
    ctx.fillStyle = PUB.creamDim;
    ctx.fillRect(x - 0.5, y - 3, 1.5, 3);
    ctx.fillStyle = PUB.cream;
    ctx.fillRect(x - 0.5, y - 3, 0.5, 2.5);
    ctx.fillStyle = PUB.tomato;
    ctx.fillRect(x, y - 4, 0.5, 1);
    ctx.fillStyle = PUB.amber;
    ctx.fillRect(x - 0.5, y - 4.5, 1.5, 1);
    ctx.fillStyle = PUB.cream;
    ctx.fillRect(x, y - 4.5, 0.5, 0.5);
  } else if (item.kind === 'bottle') {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x - 1, y - 5, 2.5, 5.5);
    ctx.fillStyle = (item.oy & 1) ? PUB.bottleGreen : PUB.bottleAmber;
    ctx.fillRect(x - 0.5, y - 4, 1.5, 4);
    ctx.fillStyle = PUB.glass;
    ctx.fillRect(x - 0.5, y - 3.5, 0.5, 2);
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x, y - 6, 0.5, 1.5);
  } else if (item.kind === 'plate') {
    ctx.fillStyle = PUB.tableShadow;
    ctx.fillRect(x - 2.5, y, 5.5, 2);
    ctx.fillStyle = PUB.creamDim;
    ctx.fillRect(x - 2.5, y - 0.5, 5, 1.5);
    ctx.fillStyle = PUB.cream;
    ctx.fillRect(x - 1.5, y - 0.5, 3, 0.5);
    ctx.fillStyle = PUB.greenLit;
    ctx.fillRect(x - 0.5, y, 1, 0.5);
  } else {
    ctx.fillStyle = PUB.tableShadow;
    ctx.fillRect(x - 1.5, y, 5, 3);
    ctx.fillStyle = PUB.paper;
    ctx.fillRect(x - 2, y - 1.5, 5, 3);
    ctx.fillStyle = PUB.cream;
    ctx.fillRect(x - 1.5, y - 1, 4, 0.5);
    ctx.fillStyle = PUB.tomato;
    ctx.fillRect(x - 1, y, 3, 0.5);
  }
}

function drawFurnitureItem(item, camX, camY) {
  if (item.type === 'bar') drawBar(item, camX, camY);
  else if (item.type === 'bench') drawBench(item, camX, camY);
  else drawTable(item, camX, camY);
}

// ---- Pass 7: foreground -----------------------------------------------------
// The lamp fixtures themselves hang above the room, so they draw over
// everything in the scene; dust drifts in front of all of it.
function drawForeground(camX, camY) {
  for (const lamp of DECOR.lamps) {
    const x = Math.round(lamp.x - camX);
    const fy = Math.round(lamp.y - camY);
    const y = fy - LAMP_DROP;
    if (x < -30 || fy < -30 || x > viewW + 30 || y > viewH + 30) continue;
    const glow = lampIntensity(lamp);
    // Light cone from the shade to the pool: three stepped trapezoids, additive.
    ctx.globalCompositeOperation = 'lighter';
    for (let band = 0; band < 3; band++) {
      ctx.globalAlpha = 0.045 * glow;
      ctx.fillStyle = 'rgb(255,200,110)';
      const steps = 7;
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const halfW = 4 + t * (lamp.r * 0.55 - band * 4);
        const yy = y + 3 + t * (LAMP_DROP - 4);
        ctx.fillRect(Math.round(x - halfW), Math.round(yy), Math.round(halfW * 2), Math.ceil((LAMP_DROP - 4) / (steps - 1)) + 1);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // The fixture: cord, a green enamel dome shade with a brass rim and the
    // bulb showing under it. Bigger than before because it now hangs in the
    // room rather than sitting on the floor plan.
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x - 0.5, y - 40, 1, 34);          // cord runs off the top
    ctx.fillRect(x - 2, y - 7, 4, 1.5);            // cap
    ctx.fillStyle = '#1d3a2c';
    ctx.fillRect(x - 3.5, y - 5.5, 7, 1.5);
    ctx.fillRect(x - 5.5, y - 4, 11, 1.5);
    ctx.fillRect(x - 7, y - 2.5, 14, 1.5);
    ctx.fillStyle = '#2f5a42';
    ctx.fillRect(x - 3, y - 5.5, 3, 1);
    ctx.fillRect(x - 5, y - 4, 4, 1);
    ctx.fillRect(x - 6.5, y - 2.5, 5, 1);
    ctx.fillStyle = PUB.brass;
    ctx.fillRect(x - 7.5, y - 1, 15, 1);            // rim
    ctx.fillStyle = PUB.brassLit || '#f6d688';
    ctx.fillRect(x - 6, y - 1, 5, 0.5);
    ctx.fillStyle = glow > 1 ? '#fff8e0' : '#ffe9b0';
    ctx.fillRect(x - 2.5, y, 5, 2);                 // bulb
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 1, y, 2, 1);
    ctx.fillStyle = PUB.amberDim;
    ctx.fillRect(x - 1.5, y + 2, 3, 0.5);
  }

  if (prefersReducedMotion) return;
  for (const d of DUST) {
    ctx.globalAlpha = d.a;
    ctx.fillStyle = '#ffe6bd';
    ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 1);
  }
  ctx.globalAlpha = 1;
}

// ---- Pass 8: grade ----------------------------------------------------------
// The room gets colder and heavier as the night wears on. Level-derived, so it
// resets for free along with the score.
function drawGrade() {
  const lvl = Math.min(getLevel(), EFFECTIVE_LEVEL_CAP);
  const nightAlpha = Math.min(0.16, 0.03 + (lvl - 1) * 0.014);
  ctx.globalAlpha = nightAlpha;
  ctx.fillStyle = PUB.midnight;
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.globalAlpha = 1;

  ensureVignette();
  ctx.drawImage(vignetteCanvas, 0, 0);
  drawDangerEdge();
}

// A red pulse creeping in from the edge the hunter is on while he's close
// and chasing — strongest when he's off camera, which is when you need it.
const DANGER_RANGE = 80;
function drawDangerEdge() {
  if (hunterState !== 'chase' || caught) return;
  const dx = hunter.x - player.x;
  const dy = hunter.y - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist > DANGER_RANGE) return;
  const cam = getCamera();
  const onScreen = hunter.x - cam.x > -8 && hunter.x - cam.x < viewW + 8 && hunter.y - cam.y > -8 && hunter.y - cam.y < viewH + 8;
  const pulse = 0.65 + 0.35 * Math.sin(gameTime * 9);
  const strength = (1 - dist / DANGER_RANGE) * (onScreen ? 0.22 : 0.42) * pulse;
  if (strength <= 0.01) return;
  // Three stepped bands rather than a gradient, weighted toward his side.
  const wx = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0;
  const wy = wx === 0 ? Math.sign(dy) : 0;
  for (let band = 0; band < 3; band++) {
    ctx.fillStyle = 'rgba(189,73,56,' + (strength * (1 - band * 0.3)).toFixed(3) + ')';
    const t = 2 + band * 2;
    if (wx <= 0) ctx.fillRect(0, 0, t, viewH);                 // left
    if (wx >= 0) ctx.fillRect(viewW - t, 0, t, viewH);         // right
    if (wy <= 0) ctx.fillRect(0, 0, viewW, t);                 // top
    if (wy >= 0) ctx.fillRect(0, viewH - t, viewW, t);         // bottom
  }
}

// ---- Y-sorted pass ----------------------------------------------------------
// Entries are pooled and reused, so a frame with 14 customers on screen still
// allocates nothing.
const drawList = [];
const drawPool = [];
let drawPoolIdx = 0;

function pushDrawable(sortY, type, ref) {
  let e = drawPool[drawPoolIdx];
  if (!e) { e = { sortY: 0, type: '', ref: null }; drawPool.push(e); }
  drawPoolIdx++;
  e.sortY = sortY;
  e.type = type;
  e.ref = ref;
  drawList.push(e);
}

function spriteForEntity(e) {
  const set = SPRITES[e.kind];
  if (e === player && e.tray.length) {
    return set[e.moving && e.legFrame === 1 ? 'carryWalk' : 'carry'] || set.idle;
  }
  // Seated regulars pick a named pose; movers use the walk cycle.
  return e.pose
    ? (set[e.pose] || set.idle)
    : set[e.moving ? (e.legFrame === 1 ? 'walk' : 'idle') : 'idle'];
}

function entityHeadTop(e) {
  return e.y - spriteVisualH(spriteForEntity(e));
}

function drawEntity(e, camX, camY) {
  const set = SPRITES[e.kind];
  const sprite = spriteForEntity(e);
  const stepLift = e.moving && e.legFrame === 1 ? -0.5 : 0;
  const sx = e.x - camX - spriteAnchorX(sprite, e.flip) + (e.swayOffset || 0);
  const sy = e.y - camY - spriteVisualH(sprite) + stepLift;
  const footX = Math.round(e.x - camX);
  const footY = Math.round(e.y - camY);
  // Tiny broken rings make the two gameplay roles instantly readable in a
  // crowded room without turning the pub into a neon arena. They sit under
  // the feet, preserve the authored silhouette, and survive the night grade.
  if (e === player || e === hunter) {
    ctx.globalAlpha = e === player ? 0.92 : 0.72;
    ctx.fillStyle = e === player ? PUB.amber : PUB.tomato;
    ctx.fillRect(footX - 6, footY, 4, 1);
    ctx.fillRect(footX + 3, footY, 4, 1);
    ctx.fillRect(footX - 7, footY - 2, 1, 2);
    ctx.fillRect(footX + 7, footY - 2, 1, 2);
    ctx.globalAlpha = 1;
  }
  // Layered cast/contact shadow: a soft offset mass plus the crisp foot lock.
  ctx.globalAlpha = 0.46;
  ctx.fillStyle = PUB.tableShadow;
  ctx.fillRect(footX - 4.5, footY + 0.5, 10, 1.5);
  ctx.fillRect(footX - 2.5, footY + 2, 7, 0.5);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PUB.tableShadow;
  ctx.fillRect(footX - 3.5, footY - 0.5, 7, 1);
  // Flicker the player after a hit so the temporary invulnerability is visible
  // as well as mechanical. Whole-frame stepping keeps the pixel-art feel.
  const flicker = e === player && hitInvulnTimer > 0 && Math.floor(hitInvulnTimer * 10) % 2 === 0;
  ctx.globalAlpha = flicker ? 0.4 : 1;
  drawSprite(sprite, e.palette || set.palette, sx, sy, e.flip);
  ctx.globalAlpha = 1;
}

// No contact shadow and no flicker handling — the ghost isn't standing on the
// floor and can't be hit, so drawEntity's extras would only anchor it.
function drawGhost(g, camX, camY) {
  const sprite = SPRITES.ghost.idle;
  ctx.globalAlpha = 0.7;
  drawSprite(
    sprite,
    SPRITES.ghost.palette,
    g.x - camX - spriteAnchorX(sprite, g.flip),
    g.y - camY - spriteVisualH(sprite),
    g.flip,
  );
  ctx.globalAlpha = 1;
}

// The waiter is an ordinary floor-standing character, plus the mist: drawn
// after his sprite so the droplets read as leaving the nozzle rather than
// being painted under his hand.
function drawWaiter(w, camX, camY) {
  drawEntity(w, camX, camY);
  ctx.fillStyle = WAITER_MIST_COLOR;
  for (const m of w.mist) {
    ctx.globalAlpha = clamp(m.ttl / m.maxTtl, 0, 1) * 0.85;
    ctx.fillRect(Math.round(m.x - camX), Math.round(m.y - camY), m.size, m.size);
  }
  // Sparks last, and additively: they're the brightest thing in the room for
  // the fifth of a second they exist.
  ctx.globalCompositeOperation = 'lighter';
  if (w.flash) {
    // A plus-shaped pop at the point of contact, so the sparks have a source.
    ctx.globalAlpha = clamp(w.flash.ttl / 0.1, 0, 1) * 0.9;
    ctx.fillStyle = '#ffffff';
    const fx = Math.round(w.flash.x - camX);
    const fy = Math.round(w.flash.y - camY);
    ctx.fillRect(fx - 2, fy, 5, 1);
    ctx.fillRect(fx, fy - 2, 1, 5);
  }
  for (const k of w.sparks) {
    ctx.globalAlpha = clamp(k.ttl / k.maxTtl, 0, 1);
    ctx.fillStyle = k.color;
    ctx.fillRect(Math.round(k.x - camX), Math.round(k.y - camY), k.size, k.size);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

function sortByY(a, b) { return a.sortY - b.sortY; }


// Cartoon-style speech bubble with an order icon inside, floating above a
// head. `highlighted` marks the order currently being carried to them.
// patienceFraction (0-1, or null/undefined to omit) draws a thin depleting
// bar above the bubble — green/yellow/red as the customer's patience runs
// down toward giving up.
function patienceBarColor(frac) {
  if (frac > 0.5) return PUB.greenLit;
  if (frac > 0.2) return PUB.amber;
  return PUB.tomato;
}

// ---- Pub UI material kit -----------------------------------------------------
// Every piece of interface — the hanging HUD sign, order tickets, dialogue
// placards and the end-of-shift boards — is built from the same three
// materials as the room: walnut boards, brass fittings and parchment. One
// palette and two plate painters keep them reading as things the pub owns
// rather than a layer floated on top of it. The DOM shell (style.css) uses the
// same hexes so the start overlay and touch controls match.
const UI = {
  walnut: '#3b2219',
  walnutLit: '#5c3626',
  walnutDark: '#22130f',
  walnutGrain: 'rgba(12,6,4,0.28)',
  brass: PUB.brass,
  brassLit: '#f6d688',
  brassDark: '#7d521a',
  parchment: PUB.paper,
  parchmentLit: '#f5e3b9',
  parchmentDark: '#c8a66c',
  ink: PUB.ink,
  shadow: PUB.tableShadow,
};

// A filled rectangle with its four corner pixels knocked off. Clipped corners
// are what keep the plates reading as cut boards and card rather than as
// generic rounded UI.
function fillClipped(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillRect(x, y + 1, w, h - 2);
}

function drawRivet(x, y) {
  ctx.fillStyle = UI.brassDark;
  ctx.fillRect(x, y, 2, 2);
  ctx.fillStyle = UI.brass;
  ctx.fillRect(x, y, 1.5, 1.5);
  ctx.fillStyle = UI.brassLit;
  ctx.fillRect(x, y, 0.5, 0.5);
}

// A walnut board: ink outline, lit top-left bevel, dark bottom-right bevel,
// faint horizontal grain, and a brass rivet in each corner. `rail` adds brass
// strips along the top and bottom edges — the trim the wide end-of-shift
// boards get — and `chains` hangs the board from the top of the frame on two
// brass chains, which is how the HUD sign is mounted.
function drawWalnutPlate(x, y, w, h, opts) {
  const rail = !!(opts && opts.rail);
  const chains = opts ? opts.chains | 0 : 0;
  if (chains > 0) {
    for (const cx of [x + 5, x + w - 6]) {
      for (let cy = y - chains; cy < y; cy++) {
        ctx.fillStyle = (cy - y) % 2 === 0 ? UI.brass : UI.brassDark;
        ctx.fillRect(cx, cy, 1, 1);
      }
    }
  }
  ctx.fillStyle = UI.shadow;
  ctx.fillRect(x + 1, y + 2, w, h);
  fillClipped(x, y, w, h, UI.ink);
  fillClipped(x + 1, y + 1, w - 2, h - 2, UI.walnut);
  // Grain: half-pixel dark lines, staggered so they don't read as ruled paper.
  ctx.fillStyle = UI.walnutGrain;
  for (let gy = y + 4; gy < y + h - 3; gy += 3) {
    const inset = 3 + ((gy - y) % 2) * 3;
    ctx.fillRect(x + inset, gy, w - inset * 2, 0.5);
  }
  ctx.fillStyle = UI.walnutLit;
  ctx.fillRect(x + 2, y + 1, w - 4, 1);
  ctx.fillRect(x + 1, y + 2, 1, h - 4);
  ctx.fillStyle = UI.walnutDark;
  ctx.fillRect(x + 2, y + h - 2, w - 4, 1);
  ctx.fillRect(x + w - 2, y + 2, 1, h - 4);
  if (rail) {
    ctx.fillStyle = UI.brass;
    ctx.fillRect(x + 2, y + 1, w - 4, 1);
    ctx.fillRect(x + 2, y + h - 2, w - 4, 1);
    ctx.fillStyle = UI.brassLit;
    ctx.fillRect(x + 3, y + 1, w - 6, 0.5);
    ctx.fillRect(x + 3, y + h - 2, w - 6, 0.5);
  }
  drawRivet(x + 2, y + 2);
  drawRivet(x + w - 4, y + 2);
  drawRivet(x + 2, y + h - 4);
  drawRivet(x + w - 4, y + h - 4);
}

// A parchment card with a coloured stitched frame: order tickets and dialogue
// placards. The accent is semantic (whose order, who's talking, what you're
// carrying), so it is a parameter rather than a material.
function drawParchmentPlate(x, y, w, h, accent, stitch) {
  ctx.fillStyle = UI.shadow;
  ctx.fillRect(x + 1, y + 2, w, h);
  fillClipped(x, y, w, h, accent);
  fillClipped(x + 1, y + 1, w - 2, h - 2, UI.parchment);
  if (h < 7 || w < 7) return;
  // Aged bottom/right edge, lit top/left edge, then a stitch of dots along
  // the top so the card reads as a torn ticket rather than a flat fill.
  ctx.fillStyle = UI.parchmentDark;
  ctx.fillRect(x + 2, y + h - 2, w - 4, 0.5);
  ctx.fillRect(x + w - 2, y + 2, 0.5, h - 4);
  ctx.fillStyle = UI.parchmentLit;
  ctx.fillRect(x + 1, y + 2, 0.5, h - 4);
  ctx.fillStyle = stitch || UI.parchmentLit;
  ctx.fillRect(x + 3, y + 1, w - 6, 1);
  ctx.fillStyle = accent;
  for (let px = x + 4; px < x + w - 4; px += 2) ctx.fillRect(px, y + 1, 0.5, 0.5);
}

// The little pointer from a placard back to whoever it belongs to. `y` is the
// plate edge the tail grows from.
function drawPlateTail(tailX, y, accent, pointingDown) {
  ctx.fillStyle = accent;
  if (pointingDown) {
    ctx.fillRect(tailX, y, 3, 2);
    ctx.fillRect(tailX + 1, y + 2, 1, 1);
    ctx.fillStyle = UI.parchment;
    ctx.fillRect(tailX + 1, y, 1, 1);
  } else {
    ctx.fillRect(tailX, y - 2, 3, 2);
    ctx.fillRect(tailX + 1, y - 3, 1, 1);
    ctx.fillStyle = UI.parchment;
    ctx.fillRect(tailX + 1, y - 1, 1, 1);
  }
}

// A short brass rule with a dark underline; the divider used on the boards.
function drawBrassRule(x, y, w) {
  ctx.fillStyle = UI.brassDark;
  ctx.fillRect(x, y + 1, w, 0.5);
  ctx.fillStyle = UI.brass;
  ctx.fillRect(x, y, w, 1);
  ctx.fillStyle = UI.brassLit;
  ctx.fillRect(x + 1, y, w - 2, 0.5);
}

const BUBBLE_FRAME_DEFAULT = PUB.ink;
const BUBBLE_FRAME_REGULAR = PUB.amberDim; // a named regular is waiting
const BUBBLE_FRAME_CARRIED = PUB.greenLit; // this is the order you're carrying
const BUBBLE_FRAME_HUNTER = PUB.tomato;    // the hunter wants a pint

// "!" when he spots you, "?" while he's lost the trail, "..." over a pint.
function drawHunterAlert(camX, camY) {
  if (!hunterAlert || hunterState === 'arriving') return;
  const scale = hunterAlert.text.length === 1 ? 2 : 1;
  const tw = fontTextWidth(hunterAlert.text) * scale;
  const bw = tw + 6;
  const bh = FONT_H * scale + 4;
  const bx = clamp(Math.round(hunter.x - camX - bw / 2), 2, Math.max(2, viewW - bw - 2));
  const by = clamp(Math.round(entityHeadTop(hunter) - camY - bh - 3), 2, Math.max(2, viewH - bh - 2));
  const accent = hunterAlert.text === '!' ? PUB.tomato : UI.brassDark;
  drawParchmentPlate(bx, by, bw, bh, accent);
  fontDrawText(ctx, hunterAlert.text, bx + 3, by + 2, hunterAlert.text === '!' ? PUB.tomato : UI.ink, scale);
}
const placedOrderBubbles = [];

function orderBubbleSpotFree(rect) {
  if (rect.x < 2 || rect.y < 2 || rect.x + rect.w > viewW - 2 || rect.y + rect.h > viewH - 2) return false;
  for (const other of placedOrderBubbles) {
    if (rectsTouch(rect, other)) return false;
  }
  return true;
}

// `grow` (0-1) drives a three-step pop: a stub, a short frame, then the full
// bubble with its icon and patience bar. Stepping it keeps the animation on
// whole pixels instead of easing through fractional sizes.
function drawOrderBubble(worldX, headTopY, camX, camY, orderType, highlighted, patienceFraction, frameColor, grow) {
  const icon = ORDER_ICONS[orderType];
  // A ticket is compact while nobody is in a hurry; it grows to the full
  // card once patience drops under 40% or it is yours, so the room's lamps
  // stay the brightest thing on screen most of the time.
  const urgent = patienceFraction != null && patienceFraction < 0.4;
  const pad = highlighted || urgent || patienceFraction == null ? 3 : 1;
  const bw = spriteVisualW(icon.sprite) + pad * 2;
  const full = spriteVisualH(icon.sprite) + pad * 2;
  const step = grow == null || grow >= 1 ? 3 : Math.max(1, Math.ceil(grow * 3));
  const bh = step === 3 ? full : (step === 2 ? Math.max(3, full - 4) : 3);
  const reserveTop = patienceFraction != null && step === 3 ? 3 : 0;
  let bx = clamp(Math.round(worldX - camX - bw / 2), 2, Math.max(2, viewW - bw - 2));
  let by = clamp(
    Math.round(headTopY - camY - bh - 4) - reserveTop,
    2,
    Math.max(2, viewH - (reserveTop + bh + 3) - 2),
  );
  const bounds = { x: bx, y: by, w: bw + 1, h: reserveTop + bh + 3 };

  // Orders at the rear booth used to disappear behind the top edge or the
  // score plate. Keep them camera-safe and try the open side of an occupied
  // bubble before dropping down over a character.
  if (!orderBubbleSpotFree(bounds)) {
    const candidates = [];
    for (const other of placedOrderBubbles) {
      candidates.push(
        { x: other.x + other.w + 2, y: by },
        { x: other.x - bounds.w - 2, y: by },
        { x: bx, y: other.y + other.h + 2 },
        { x: bx, y: other.y - bounds.h - 2 },
      );
    }
    for (const candidate of candidates) {
      const test = { x: candidate.x, y: candidate.y, w: bounds.w, h: bounds.h };
      if (!orderBubbleSpotFree(test)) continue;
      bounds.x = test.x;
      bounds.y = test.y;
      break;
    }
  }
  placedOrderBubbles.push(bounds);
  bx = bounds.x;
  by = bounds.y;
  const sx = bx;
  const sy = by + reserveTop;
  const border = highlighted ? BUBBLE_FRAME_CARRIED : (frameColor || BUBBLE_FRAME_DEFAULT);

  // A parchment order ticket in the shared material kit; the stitch turns
  // green on the one you're carrying so it reads apart from the queue.
  drawParchmentPlate(sx, sy, bw, bh, border, highlighted ? PUB.greenLit : null);
  const tailX = clamp(Math.round(worldX - camX) - 1, sx + 2, sx + bw - 4);
  drawPlateTail(tailX, sy + bh, border, true);

  if (step < 3) return;   // mid-pop: frame only, no icon and no patience bar
  drawSprite(icon.sprite, icon.palette, sx + pad, sy + pad, false);

  if (patienceFraction != null) {
    // Patience is a brass-capped gauge sitting on the ticket's top edge.
    const barY = sy - 3;
    const fillW = Math.round((bw - 2) * clamp(patienceFraction, 0, 1));
    ctx.fillStyle = UI.ink;
    ctx.fillRect(sx, barY - 0.5, bw, 2.5);
    ctx.fillStyle = UI.walnutDark;
    ctx.fillRect(sx + 1, barY, bw - 2, 1);
    ctx.fillStyle = patienceBarColor(patienceFraction);
    ctx.fillRect(sx + 1, barY, fillW, 1.5);
    ctx.fillStyle = UI.brass;
    ctx.fillRect(sx, barY - 0.5, 0.5, 2.5);
    ctx.fillRect(sx + bw - 0.5, barY - 0.5, 0.5, 2.5);
  }
}

// Draws whichever bubble a person currently warrants: the live order growing
// in, or the one just dealt with shrinking out. Walk-ins and regulars differ
// only in which frame colour they get, and in that a walk-in has to be seated
// to show one at all.
function drawOrderBubbleFor(e, camX, camY, frameColor) {
  if (e.orderType && !e.served && (e.isRegular || e.isHunter || e.state === 'sitting')) {
    const patience = clamp(e.sitTimer / e.patienceDuration, 0, 1);
    const grow = (gameTime - e.orderAppearAt) / BUBBLE_APPEAR_TIME;
    drawOrderBubble(e.x, entityHeadTop(e), camX, camY, e.orderType, e.beingCarried, patience, frameColor, grow);
  } else if (e.orderExit) {
    drawOrderBubble(e.x, entityHeadTop(e), camX, camY, e.orderExit.type, false, null, frameColor,
      e.orderExit.ttl / BUBBLE_EXIT_TIME);
  }
}

// A knocked-over pint: a dark wet patch with a couple of lamp glints, drying
// (shrinking) over its last seconds.
function drawSpills(camX, camY) {
  for (const sp of spills) {
    const life = clamp(sp.ttl / SPILL_TTL, 0, 1);
    const r = Math.round(SPILL_RADIUS * (0.6 + 0.4 * life));
    const x = Math.round(sp.x - camX);
    const y = Math.round(sp.y - camY);
    ctx.fillStyle = 'rgba(20,10,6,0.45)';
    ctx.fillRect(x - r, y - Math.round(r * 0.5), r * 2, r);
    ctx.fillRect(x - r + 2, y - Math.round(r * 0.5) - 1, r * 2 - 4, r + 2);
    ctx.fillStyle = 'rgba(232,161,58,0.28)';
    ctx.fillRect(x - r + 3, y - 1, r, 1);
    ctx.fillStyle = 'rgba(245,225,170,0.35)';
    ctx.fillRect(x + Math.round(sp.seed % 5) - 2, y + 1, 2, 0.5);
    ctx.fillRect(x - Math.round(sp.seed % 3), y - 2, 1.5, 0.5);
  }
}

// ---- Dialogue bubbles -------------------------------------------------------
// Drawn after the order bubbles, above the scene. Three rules shape the
// layout: stay inside the camera, don't cover the speaker's own order bubble,
// and don't cover another bubble already placed this frame.
const DIALOGUE_MAX_W = 92;
const DIALOGUE_PAD = 2;
const DIALOGUE_LINE_GAP = 1;
const DIALOGUE_INK = PUB.ink;

// Reused across frames so the bubble pass allocates nothing per frame.
const placedBubbles = [];

function rectsTouch(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Reused; the HUD's footprint (chains included) is fed to the bubble layout
// as an obstacle.
const hudRect = { x: 3, y: 0, w: 0, h: 0 };
const HUD_CHAIN_H = 3;   // brass chain between the top of the frame and the sign
const HUD_PAD_X = 6;     // clears the corner rivets
// Life is three pints on the sign. Each is PINT_W × PINT_H and drains from the
// top as that third of the bar goes, so a hit reads as a pint knocked over
// and regeneration as the glass filling back up.
const LIFE_SEGMENT_COUNT = 3;
const PINT_W = 5;
const PINT_H = 7;
const PINT_GAP = 3;
const PINT_FILL_ROWS = PINT_H - 2; // rows between the foam line and the base

function lifeBarWidth() {
  return LIFE_SEGMENT_COUNT * PINT_W + (LIFE_SEGMENT_COUNT - 1) * PINT_GAP;
}

function hudLabels() {
  const left = shiftTimeLeft();
  const clock = left === Infinity ? null
    : Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0');
  return {
    shift: 'SHIFT ' + getLevel(),
    tips: 'TIPS ' + shiftTips + '/' + shiftTarget(shift),
    total: 'TOTAL ' + score,
    clock,
  };
}

function measureHud() {
  const labels = hudLabels();
  const textW = fontTextWidth(labels.shift) + 6 + fontTextWidth(labels.tips);
  const rowTwoW = lifeBarWidth() + 6 + fontTextWidth(labels.total) + (labels.clock ? 6 + fontTextWidth(labels.clock) : 0);
  hudRect.w = Math.max(textW, rowTwoW) + HUD_PAD_X * 2;
  hudRect.h = HUD_CHAIN_H + 4 + FONT_H + 3 + PINT_H + 4;
  return hudRect;
}

function drawPint(x, y, fill) {
  const rows = Math.ceil(PINT_FILL_ROWS * clamp(fill, 0, 1));
  // Glass: light rim on the outer columns, dark inside.
  ctx.fillStyle = UI.walnutDark;
  ctx.fillRect(x + 1, y + 1, PINT_W - 2, PINT_H - 2);
  ctx.fillStyle = PUB.bottleClear;
  ctx.fillRect(x, y + 1, 1, PINT_H - 2);
  ctx.fillRect(x + PINT_W - 1, y + 1, 1, PINT_H - 2);
  ctx.fillRect(x + 1, y + PINT_H - 1, PINT_W - 2, 1);
  ctx.fillRect(x + 1, y, PINT_W - 2, 0.5);
  if (rows > 0) {
    const top = y + PINT_H - 1 - rows;
    ctx.fillStyle = PUB.amberDim;
    ctx.fillRect(x + 1, top, PINT_W - 2, rows);
    ctx.fillStyle = PUB.amber;
    ctx.fillRect(x + 1, top, PINT_W - 3, rows);
    ctx.fillStyle = PUB.cream;
    ctx.fillRect(x + 1, top, PINT_W - 2, fill >= 0.999 ? 1 : 0.5);
  }
  // Highlight down the left of the glass reads as the lamp on it.
  ctx.fillStyle = PUB.glass;
  ctx.fillRect(x, y + 1, 0.5, PINT_H - 3);
}

function drawDialogueBubbles(camX, camY) {
  const lines = Dialogue.getActive();
  if (!lines.length) return;
  placedBubbles.length = 0;
  placedBubbles.push(measureHud());
  for (const bubble of placedOrderBubbles) placedBubbles.push(bubble);

  for (const item of lines) {
    const r = regularById.get(item.who);
    if (!r) continue;

    const maxW = Math.min(DIALOGUE_MAX_W, viewW - 8);
    const rows = fontWrapText(item.text, maxW - DIALOGUE_PAD * 2);
    let textW = 0;
    for (const row of rows) textW = Math.max(textW, fontTextWidth(row));
    const bw = textW + DIALOGUE_PAD * 2;
    const bh = rows.length * FONT_H + (rows.length - 1) * DIALOGUE_LINE_GAP + DIALOGUE_PAD * 2;

    const headTop = entityHeadTop(r) - camY;
    // Three placements, in descending order of preference. The regulars' booth
    // sits close to the top wall, so on a short viewport there genuinely isn't
    // room for the ideal one and the fallbacks matter.
    //   1. clear above their order bubble (icon box + patience bar, ~22px)
    //   2. straight above their head, accepting that it covers that bubble
    //   3. under them, if even that would leave the camera
    const hasOrder = !!(r.orderType && !r.served);
    let bx = Math.round(r.x - camX - bw / 2);
    bx = clamp(bx, 2, Math.max(2, viewW - bw - 2));

    let by = Math.round(headTop - (hasOrder ? 22 : 6) - bh);
    let below = false;
    if (by < 2) by = Math.round(headTop - 6 - bh);
    if (by < 2) {
      // Pin it to the top of the camera instead. The rear wall behind it is
      // decoration, so this costs nothing; dropping the bubble below them
      // would cover the speaker and whoever is sitting in front of them.
      by = 2;
      if (by + bh > headTop + 2) {
        // Genuinely no room over their head. Hang it off the shoulder facing
        // away from the booth, so it lands on open floor instead of on top of
        // whoever they're sitting with.
        by = Math.round(r.y - camY + 5);
        below = true;
        bx = r.x >= REGULARS_TABLE.x
          ? Math.round(r.x - camX + 5)
          : Math.round(r.x - camX - bw - 5);
        bx = clamp(bx, 2, Math.max(2, viewW - bw - 2));
      }
    }

    // Nudge clear of any bubble already drawn this frame. Sideways first: the
    // three regulars sit within about 30px of each other, so moving a bubble
    // vertically tends to drop it straight onto one of them, while there is
    // usually room to sit two bubbles side by side.
    const rect = { x: bx, y: by, w: bw, h: bh };
    for (const other of placedBubbles) {
      if (!rectsTouch(rect, other)) continue;
      const right = other.x + other.w + 2;
      const left = other.x - bw - 2;
      if (right + bw <= viewW - 2) { rect.x = right; continue; }
      if (left >= 2) { rect.x = left; continue; }
      const up = other.y - bh - 3;
      const down = other.y + other.h + 3;
      if (up >= 2) { rect.y = up; below = false; }
      else if (down + bh <= viewH - 2) { rect.y = down; below = true; }
    }
    if (rect.y + bh > viewH - 2) rect.y = viewH - 2 - bh;
    if (rect.y < 2) rect.y = 2;
    placedBubbles.push(rect);

    // A parchment placard in the speaker's accent, with a tail pointing back
    // at whoever is talking. The offset dark plate keeps text readable over
    // the patterned rugs without resorting to a modern rounded card.
    const accent = r.cfg.accent || '#141414';
    drawParchmentPlate(rect.x, rect.y, bw, bh, accent);
    const tailX = clamp(Math.round(r.x - camX) - 1, rect.x + 2, rect.x + bw - 4);
    if (below) drawPlateTail(tailX, rect.y, accent, false);
    else drawPlateTail(tailX, rect.y + bh, accent, true);

    for (let i = 0; i < rows.length; i++) {
      fontDrawText(ctx, rows[i], rect.x + DIALOGUE_PAD, rect.y + DIALOGUE_PAD + i * (FONT_H + DIALOGUE_LINE_GAP), DIALOGUE_INK);
    }
  }
}

// Camera: centered on the player and clamped to the world. When the viewport
// is *wider* (or taller) than the world, clamping would pin the world to the
// top-left corner, so the axis is centered instead and the leftover margin is
// painted as the room's surroundings.
function getCamera() {
  const camX = viewW >= WORLD_W
    ? (WORLD_W - viewW) / 2
    : clamp(player.x - viewW / 2, 0, WORLD_W - viewW);
  const camY = viewH >= WORLD_H
    ? (WORLD_H - viewH) / 2
    : clamp(player.y - viewH / 2, 0, WORLD_H - viewH);
  return { x: Math.round(camX), y: Math.round(camY) };
}

// The HUD is a walnut pub sign hung on two brass chains from the top of the
// frame: shift and tips on the top line, the three pints of life below.
// Compact, high contrast, and nothing the player doesn't need mid-chase.
// Nazim's state deliberately isn't here — it's readable from how he looks and
// what he says, which is the point of him.
function drawHud() {
  const hud = measureHud();
  const labels = hudLabels();
  const boardY = hud.y + HUD_CHAIN_H;
  const boardH = hud.h - HUD_CHAIN_H;
  drawWalnutPlate(hud.x, boardY, hud.w, boardH, { chains: HUD_CHAIN_H });

  const textY = boardY + 4;
  let tx = hud.x + HUD_PAD_X;
  fontDrawTextShadow(ctx, 'SHIFT', tx, textY, PUB.creamDim, UI.walnutDark);
  fontDrawTextShadow(ctx, String(getLevel()), tx + fontTextWidth('SHIFT ') , textY, PUB.cream, UI.walnutDark);
  tx += fontTextWidth(labels.shift) + 6;
  fontDrawTextShadow(ctx, 'TIPS', tx, textY, PUB.creamDim, UI.walnutDark);
  fontDrawTextShadow(ctx, labels.tips.slice(5), tx + fontTextWidth('TIPS '), textY, PUB.amber, UI.walnutDark);

  const pintY = textY + FONT_H + 3;
  for (let i = 0; i < LIFE_SEGMENT_COUNT; i++) {
    let x = hud.x + HUD_PAD_X + i * (PINT_W + PINT_GAP);
    // The pint that just went rocks on the rail and throws a splash.
    const knocked = pintKnockTimer > 0 && i === pintKnockIndex;
    if (knocked) {
      x += Math.round(Math.sin(pintKnockTimer * 40)) ;
      ctx.fillStyle = PUB.amber;
      ctx.fillRect(x + PINT_W + 1, pintY + PINT_H - 2 - Math.round(pintKnockTimer * 6), 1, 1);
      ctx.fillRect(x - 2, pintY + PINT_H - 1 - Math.round(pintKnockTimer * 4), 1, 1);
    }
    drawPint(x, pintY, clamp(life * LIFE_SEGMENT_COUNT - i, 0, 1));
  }
  // Brass coaster rail under the pints so they sit on something.
  drawBrassRule(hud.x + HUD_PAD_X - 1, pintY + PINT_H, lifeBarWidth() + 2);
  // Running total beside the pints, and the shift clock — red once it's
  // last call, blinking through the final five seconds.
  let rx = hud.x + HUD_PAD_X + lifeBarWidth() + 6;
  fontDrawTextShadow(ctx, labels.total, rx, pintY + 1, PUB.creamDim, UI.walnutDark);
  if (labels.clock) {
    rx += fontTextWidth(labels.total) + 6;
    const left = shiftTimeLeft();
    const blink = left <= 5 && Math.floor(gameTime * 4) % 2 === 0;
    if (!blink) fontDrawTextShadow(ctx, labels.clock, rx, pintY + 1, isLastCall() ? PUB.tomato : PUB.cream, UI.walnutDark);
  }
}

// Cover-fits a splash image into the internal resolution and drops a tint
// over it so the board on top stays the brightest thing on screen.
function drawSplashImage(img, tint) {
  if (img.complete && img.naturalWidth > 0) {
    const scale = Math.max(viewW / img.naturalWidth, viewH / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, (viewW - dw) / 2, (viewH - dh) / 2, dw, dh);
    ctx.fillStyle = tint;
  } else {
    ctx.fillStyle = 'rgba(10,6,4,0.8)';
  }
  ctx.fillRect(0, 0, viewW, viewH);
}

function drawCenteredText(text, y, color, scale, shadow) {
  const s = scale || 1;
  fontDrawTextShadow(ctx, text, Math.round((viewW - fontTextWidth(text) * s) / 2), y, color, shadow || UI.ink, s);
}

const BOARD_ROW_H = 8;
const BOARD_TITLE_SCALE = 3;

function drawCaughtOverlay() {
  drawSplashImage(caughtImage, 'rgba(12,6,4,0.5)');

  // The newest line, not the oldest: the reaction to being caught is the one
  // worth showing, even if an earlier bubble is still on its way out. It goes
  // on a parchment note pinned under the ledger.
  const active = Dialogue.getActive();
  const reaction = active.length ? active[active.length - 1] : null;
  const speaker = reaction ? regularById.get(reaction.who) : null;
  const boardW = clamp(Math.min(viewW - 8, 210), 120, viewW - 8);
  const innerW = boardW - 12;
  const quipRows = reaction
    ? fontWrapText((speaker ? speaker.name + ': ' : '') + reaction.text.toUpperCase(), innerW - 6)
    : null;

  // Below the score line the board shows one of two things: the name field
  // while a score is being filed, or the ledger it was filed into. Both are
  // built as rows first so the board can be sized to fit them.
  const rows = [];
  if (enteringName) {
    const cursor = Math.floor(performance.now() / 400) % 2 === 0 ? '_' : ' ';
    rows.push({ text: 'NEW BEST - SIGN THE LEDGER', color: PUB.amber });
    rows.push({ text: nameInput.toUpperCase() + cursor, color: UI.ink, field: true });
    rows.push({ text: 'ENTER TO CONFIRM   ESC TO SKIP', color: PUB.creamDim });
  } else {
    rows.push({ text: canTypeName() ? 'PRESS SPACE FOR ANOTHER SHIFT' : 'TAP RESTART FOR ANOTHER SHIFT', color: PUB.amber });
    const highScores = loadHighScores();
    if (highScores.length) {
      rows.push({ text: 'BEST TIPS', color: PUB.creamDim, rule: true });
      for (let i = 0; i < highScores.length; i++) {
        rows.push({
          text: (i + 1) + '. ' + String(highScores[i].name).toUpperCase() + '  ' + highScores[i].score,
          color: PUB.cream,
        });
      }
    }
  }

  const titleH = FONT_H * BOARD_TITLE_SCALE;
  const quipH = quipRows ? quipRows.length * (FONT_H + 2) + 4 + 4 : 0;
  const boardH = 6 + titleH + 4 + 2 + 4 + FONT_H + 5 + rows.length * BOARD_ROW_H + quipH + 4;
  const bx = Math.round((viewW - boardW) / 2);
  const by = Math.round(clamp(viewH / 2 - boardH / 2, 2, Math.max(2, viewH - boardH - 2)));
  drawWalnutPlate(bx, by, boardW, boardH, { rail: true });

  let y = by + 6;
  drawCenteredText('CAUGHT!', y, PUB.tomato, BOARD_TITLE_SCALE);
  y += titleH + 4;
  drawBrassRule(bx + 6, y, boardW - 12);
  y += 2 + 4;
  drawCenteredText('SHIFT ' + getLevel() + '   TIPS ' + score, y, PUB.cream);
  y += FONT_H + 5;

  for (const row of rows) {
    if (row.field) {
      // The name field is a parchment strip on the board; ink on paper reads
      // as writing in the ledger rather than typing into a form.
      const fw = Math.min(innerW, Math.max(fontTextWidth(row.text) + 12, 70));
      const fx = Math.round((viewW - fw) / 2);
      drawParchmentPlate(fx, y - 2, fw, FONT_H + 4, UI.brassDark);
      fontDrawText(ctx, row.text, Math.round((viewW - fontTextWidth(row.text)) / 2), y, row.color);
    } else {
      if (row.rule) {
        const tw = fontTextWidth(row.text);
        const rx = Math.round((viewW - tw) / 2);
        const flank = Math.max(0, Math.floor((innerW - tw - 8) / 2));
        if (flank > 3) {
          drawBrassRule(rx - 4 - flank, y + 2, flank);
          drawBrassRule(rx + tw + 4, y + 2, flank);
        }
      }
      drawCenteredText(row.text, y, row.color);
    }
    y += BOARD_ROW_H;
  }

  if (quipRows) {
    const qw = innerW;
    const qx = Math.round((viewW - qw) / 2);
    const qh = quipRows.length * (FONT_H + 2) + 4;
    drawParchmentPlate(qx, y + 2, qw, qh, speaker ? speaker.cfg.accent : UI.brassDark);
    for (let k = 0; k < quipRows.length; k++) {
      fontDrawText(ctx, quipRows[k], Math.round((viewW - fontTextWidth(quipRows[k])) / 2),
        y + 2 + 2 + k * (FONT_H + 2), UI.ink);
    }
  }
}

// The end-of-shift tally: what the shift paid, what it cost, and a prompt
// for the next one. This is the run's natural pause, so it waits for a press.
function drawShiftTallyOverlay() {
  drawSplashImage(levelDoneImage, 'rgba(7,12,18,0.34)');
  const t = shiftTally;
  const st = t.stats;
  const title = 'SHIFT ' + t.shift + (t.madeTarget ? ' DONE' : ' OVER');
  const rows = [
    { text: 'TIPS ' + t.tips + ' OF ' + t.target + '   TOTAL ' + t.total, color: PUB.amber },
    { text: 'SERVED ' + st.deliveries + '   FORGOTTEN ' + st.forgotten, color: PUB.cream },
    { text: 'CLUTCH ' + st.clutch + '   DOUBLES ' + st.doubles + '   ROUNDS ' + st.rounds, color: PUB.cream },
    { text: 'HITS TAKEN ' + st.hits + '   BEST SHIFT ' + bestShiftTips, color: PUB.creamDim },
    { text: canTypeName() ? 'SPACE FOR SHIFT ' + (t.shift + 1) : 'TAP FOR SHIFT ' + (t.shift + 1), color: PUB.amber, gap: 3 },
  ];
  const titleScale = 2;
  let boardW = fontTextWidth(title) * titleScale;
  for (const row of rows) boardW = Math.max(boardW, fontTextWidth(row.text));
  boardW = clamp(boardW + 20, 100, viewW - 8);
  let boardH = 6 + FONT_H * titleScale + 4 + 2 + 4 + 6;
  for (const row of rows) boardH += BOARD_ROW_H + (row.gap || 0);
  const bx = Math.round((viewW - boardW) / 2);
  const by = Math.round(clamp(viewH / 2 - boardH / 2, 2, Math.max(2, viewH - boardH - 2)));
  drawWalnutPlate(bx, by, boardW, boardH, { rail: true });
  let y = by + 6;
  drawCenteredText(title, y, t.madeTarget ? PUB.cream : PUB.tomato, titleScale);
  y += FONT_H * titleScale + 4;
  drawBrassRule(bx + 6, y, boardW - 12);
  y += 2 + 4;
  for (const row of rows) {
    y += row.gap || 0;
    drawCenteredText(row.text, y, row.color);
    y += BOARD_ROW_H;
  }
}

function render() {
  const cam = getCamera();
  const camX = cam.x;
  const camY = cam.y;

  drawBackdrop();
  drawRoom(camX, camY);
  drawDarkness(DARK_FLOOR);
  drawSpills(camX, camY);

  // Furniture and characters share one y-sorted pass so nearer (lower) things
  // draw over farther ones. Table sortY is still the table top's own front
  // edge, not the chair-inclusive footprint, so a customer on the south chair
  // draws in front of their table (see makeTable).
  drawList.length = 0;
  drawPoolIdx = 0;
  for (const f of FURNITURE) pushDrawable(f.sortY, 'furniture', f);
  pushDrawable(player.y, 'entity', player);
  if (hunterState !== 'arriving') pushDrawable(hunter.y, 'entity', hunter);
  for (const c of customers) pushDrawable(c.y, 'entity', c);
  for (const r of regulars) pushDrawable(r.y, 'entity', r);
  // Floats above the floor with no ground shadow and no collision — it should
  // read as passing through the scene, not standing in it.
  if (ghost) pushDrawable(ghost.y, 'ghost', ghost);
  // The waiter, by contrast, is on the floor like anyone else — his own pass
  // exists only so the mist can be painted over his sprite.
  if (waiter) pushDrawable(waiter.y, 'waiter', waiter);
  drawList.sort(sortByY);
  for (const d of drawList) {
    if (d.type === 'furniture') drawFurnitureItem(d.ref, camX, camY);
    else if (d.type === 'ghost') drawGhost(d.ref, camX, camY);
    else if (d.type === 'waiter') drawWaiter(d.ref, camX, camY);
    else drawEntity(d.ref, camX, camY);
  }

  // Night base over everything drawn so far, then the lamps paint the room
  // back in — people included, so a character between pools is genuinely in
  // the dark and one under a lamp is genuinely lit.
  drawDarkness(DARK_SCENE);
  drawFloorLight(camX, camY);
  drawForeground(camX, camY);
  drawGrade();

  // Order bubbles float above the scene and above the grade, so a patience bar
  // is never dimmed by the lighting.
  placedOrderBubbles.length = 0;
  const measuredHud = measureHud();
  placedOrderBubbles.push({ x: measuredHud.x, y: measuredHud.y, w: measuredHud.w, h: measuredHud.h });
  for (const c of customers) drawOrderBubbleFor(c, camX, camY, null);
  for (const r of regulars) drawOrderBubbleFor(r, camX, camY, BUBBLE_FRAME_REGULAR);
  if (hunterState !== 'arriving') drawOrderBubbleFor(hunter, camX, camY, BUBBLE_FRAME_HUNTER);
  drawHunterAlert(camX, camY);
  for (const item of player.tray) {
    const carriedFor = item.customer;
    const carriedPatience = carriedFor ? clamp(carriedFor.sitTimer / carriedFor.patienceDuration, 0, 1) : null;
    drawOrderBubble(player.x, entityHeadTop(player), camX, camY, item.type, false, carriedPatience);
  }

  drawDialogueBubbles(camX, camY);

  // Floating score/penalty feedback, fading out as it drifts up.
  for (const t of floatingTexts) {
    const tw = fontTextWidth(t.text);
    ctx.globalAlpha = clamp(t.ttl, 0, 1);
    fontDrawTextShadow(ctx, t.text, Math.round(t.x - camX - tw / 2), Math.round(t.y - camY), t.color);
  }
  ctx.globalAlpha = 1;

  drawHud();

  if (caught) drawCaughtOverlay();
  else if (shiftTally) drawShiftTallyOverlay();
}

// ---- Main loop ----------------------------------------------------------------
// dt is clamped so coming back to a backgrounded tab never teleports anyone.
let lastTime = performance.now();
function loop(now) {
  // Resetting `lastTime` from a click can race an already-queued animation
  // frame whose timestamp is a few milliseconds older. Clamp both ends so
  // that frame cannot run the simulation backwards or extend a splash timer.
  const dt = clamp((now - lastTime) / 1000, 0, 0.05);
  lastTime = now;

  if (viewportDirty) {
    viewportDirty = false;
    applyViewport();
  }

  // A hidden document still gets the occasional frame in some browsers; skip
  // both simulation and painting rather than burning work nobody can see.
  if (!document.hidden) {
    if (!paused) update(dt);
    syncCaughtDom();
    render();
  }
  requestAnimationFrame(loop);
}

applyViewport();
resetGame();
requestAnimationFrame(loop);

// ---- Development scaffolding ------------------------------------------------
// Disposable: this is a console handle for manual validation, not an API.
// Nothing in the game reads it, and it can be deleted wholesale.
window.__debug = {
  player, hunter, customers, regulars, regularById, SEATS, TABLES, BAR_SEGMENTS,
  BENCHES, FURNITURE,
  handleInteract, spawnCustomer, DOOR, update, updateCustomer, keys, touchMove,
  computeCustomerPath, findBlockingObstacle, segmentHitsRect, pointBlocked, PATH_MARGIN, PATH_CELL,
  getGhost: () => ghost,
  spawnGhost,
  getWaiter: () => waiter,
  spawnWaiter,
  waiterSchedule: () => ({ visitedThrough: waiterLevel, level: getLevel(), dueIn: +waiterDelay.toFixed(1) }),
  loadHighScores, saveHighScore,
  clearHighScores: () => { try { localStorage.removeItem(HIGH_SCORE_KEY); } catch {} },
  getNameEntry: () => ({ entering: enteringName, name: nameInput }),
  SPRITES, DOE_PALETTE, HUNTER_PALETTE, drawSprite, ctx, floatingTexts,
  getScore: () => score,
  getLevel,
  setScore: (v) => { score = v; },
  setShift: (n) => { shift = Math.max(1, n | 0); },
  getLife: () => life,
  setLife: (v) => { life = clamp(v, 0, LIFE_MAX); },
  getShift: () => ({ shift, clock: +shiftClock.toFixed(1), tips: shiftTips, target: shiftTarget(shift), lastCall: isLastCall(), tally: shiftTally, stats: Object.assign({}, shiftStats) }),
  setShiftClock: (t) => { shiftClock = t; },
  endShift,
  startNextShift,
  getHunterState: () => ({ state: hunterState, timer: +hunterStateTimer.toFixed(2), order: hunter.orderType, path: hunterPath, alert: hunterAlert }),
  setHunterState,
  hunterCanSeePlayer: () => hunterCanSeePlayer(hunterSightRange()),
  hunterWantsPint,
  getSpills: () => spills,
  getRound: () => round,
  callRound: tryCallRound,
  startNazimWander: () => startNazimWander(regularById.get('nazim')),
  getViewport: () => ({ viewW, viewH, pixelScale, portrait: viewIsPortrait }),
  getCamera,
  reservedSeats: () => SEATS.filter(s => s.reserved).map(s => ({ who: s.regularId, side: s.side, x: s.x, y: s.y })),
  freeGenericSeats: () => SEATS.filter(s => !s.reserved && !s.occupied).length,
  forceRegularOrder: (id, type) => {
    const r = regularById.get(id);
    if (!r) return null;
    clearRegularOrder(r);
    regularPlaceOrder(r);
    if (type) r.orderType = type;
    return r.orderType;
  },
  setNazimDrinks: (n) => {
    const r = regularById.get('nazim');
    r.drinks = Math.max(0, n | 0);
    const changed = recalcIntoxication(r);
    return { drinks: r.drinks, stage: r.stage.id, changed };
  },
  regularState: () => regulars.map(r => ({
    id: r.id, order: r.orderType, patience: +(r.sitTimer).toFixed(1),
    mood: +r.mood.toFixed(2), drinks: r.drinks, stage: r.stage.id, pose: r.pose,
  })),
  forceCaught: () => {
    life = 0;
    caught = true;
    hasPlayedBefore = true;
    beginNameEntry();
    Sound.play('caught');
    Dialogue.trigger('caught', null);
  },
  triggerDialogue: (category, who) => Dialogue.trigger(category, who ? { who } : null),
  clearDialogueCooldowns: () => {
    Dialogue.clearCooldowns();
    for (const r of regulars) { r.dialogueCooldown = 0; r.recentLines.length = 0; }
  },
  render,                                       // for frame-cost measurement
  dialogueStats: Dialogue.stats,
  activeDialogue: () => Dialogue.getActive().map(a => a.who + ': ' + a.text),
  DIALOGUE_LINES, DIALOGUE_EXCHANGES,
  resetGame,
};
