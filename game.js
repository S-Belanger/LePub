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

  canvas.width = viewW;
  canvas.height = viewH;
  canvas.style.width = (viewW * pixelScale) + 'px';
  canvas.style.height = (viewH * pixelScale) + 'px';
  // Resizing the backing store resets 2D context state, so restore it.
  ctx.imageSmoothingEnabled = false;
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
const TILE = 16;

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
const BAR_SEGMENTS = [
  { x: 1, y: 67, w: 71, h: 22 },   // short counter, upper-left
  { x: 91, y: 109, w: 27, h: 90 }, // vertical stem
  { x: 1, y: 177, w: 87, h: 23 },  // foot, meets the stem, touches the wall
].map(r => ({
  type: 'bar',
  collider: r,
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
  ctx.drawImage(bakedSprite(sprite, palette, !!flipX), Math.round(screenX), Math.round(screenY));
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
const PATH_CELL = 8;
const PATH_MARGIN = (SPRITES.customer.idle.w * 0.55) / 2;
const PATH_FOOT_H = 7;

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

function findBlockingObstacle(p1, p2, exclude) {
  for (const f of FURNITURE) {
    if (f === exclude) continue;
    const r = f.collider;
    // Convert the furniture collider into the region a feet anchor cannot
    // enter. The footprint is centered horizontally but extends upward from
    // the anchor, so the vertical padding is deliberately asymmetric.
    const inflated = {
      x: r.x - PATH_MARGIN,
      y: r.y,
      w: r.w + 2 * PATH_MARGIN,
      h: r.h + PATH_FOOT_H,
    };
    if (segmentHitsRect(p1, p2, inflated)) return f;
  }
  return null;
}

function pointBlocked(x, y, excludeTable) {
  // Mirrors getFootBox's feet-anchored shape (see collision section above)
  // so the grid agrees with the runtime collision check that walks it.
  const box = { x: x - PATH_MARGIN, y: y - PATH_FOOT_H, w: PATH_MARGIN * 2, h: PATH_FOOT_H };
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
function computeCustomerPath(from, to, excludeTable) {
  if (!findBlockingObstacle(from, to, excludeTable)) return [to];

  const cols = Math.ceil(WORLD_W / PATH_CELL);
  const rows = Math.ceil(WORLD_H / PATH_CELL);
  const toCell = p => ({
    cx: clamp(Math.round(p.x / PATH_CELL), 0, cols - 1),
    cy: clamp(Math.round(p.y / PATH_CELL), 0, rows - 1),
  });
  const key = (cx, cy) => cy * cols + cx;

  const blocked = new Map();
  const isBlocked = (cx, cy) => {
    const k = key(cx, cy);
    if (!blocked.has(k)) {
      const c = cellCenter(cx, cy);
      blocked.set(k, pointBlocked(c.x, c.y, excludeTable));
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
          const center = cellCenter(cx, cy);
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
        if (!findBlockingObstacle(point, candidate.center, excludeTable)) {
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
        if (findBlockingObstacle(cellCenter(cur.cx, cur.cy), cellCenter(nx, ny), excludeTable)) continue;
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
    cellPoints.unshift(cellCenter(cx, cy));
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

let hunterDir = { x: 0, y: 0 };
let hunterChangeTimer = 0;

let caught = false;
let score = 0;
// Seconds of un-paused play since the last restart. Used for order age and
// for animation phases, so nothing has to reach for wall-clock time.
let gameTime = 0;
const POINTS_PER_DELIVERY = 10;
const FORGOTTEN_PENALTY = 15;

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

// Completing a level earns a short full-screen breather. The simulation is
// frozen while the splash counts down, but the frame loop keeps rendering so
// the transition remains responsive through a resize or orientation change.
const LEVEL_SPLASH_DURATION = 2.5;
let highestLevelReached = 1;
let levelSplashTimer = 0;
let splashLevel = null;

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
    c.sitTimer -= dt;
    if (c.sitTimer <= 0) {
      c.seat.occupied = false;
      if (!c.served && c.orderType) {
        score = Math.max(0, score - FORGOTTEN_PENALTY);
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

function regularPlaceOrder(r) {
  r.orderType = pickWeightedOrderType(r.cfg.orderWeights);
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
  score = Math.max(0, score - FORGOTTEN_PENALTY);
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
  r.orderCooldown = randomInRange(r.cfg.orderDelay);
}

function updateRegulars(dt) {
  for (const r of regulars) {
    // Ordering / patience.
    if (r.orderType === null) {
      r.orderCooldown -= dt;
      if (r.orderCooldown <= 0) regularPlaceOrder(r);
    } else if (!r.served) {
      r.sitTimer -= dt;
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
  const base = vis ? vis.pose : 'idle';
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
  if (r.id === 'nazim' && r.orderType === 'food') Dialogue.trigger('nazimFood', { who: 'nazim' });
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
  if (hunterDist < catchDist * 2.3 && nearMissCooldown <= 0) {
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
  if (player.carrying) {
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
  const spawn = pickClearSpawn(hunter);
  hunter.x = spawn.x;
  hunter.y = spawn.y;
  hunterDir = { x: 0, y: 0 };
  hunterChangeTimer = 0;
  hunterRubTimer = 0;
  hunterSlide = null;
  caught = false;
  enteringName = false;
  nameInput = '';
  life = LIFE_MAX;
  hitInvulnTimer = 0;
  regenDelayTimer = 0;
  highestLevelReached = 1;
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
  waiter = null;
  waiterLevel = 0;
  waiterDelay = WAITER_DELAY_MIN + Math.random() * (WAITER_DELAY_MAX - WAITER_DELAY_MIN);
  // The regulars persist across restarts as characters, but every scrap of
  // their run state — orders, patience, mood, dialogue history and Nazim's
  // drink count — is wiped.
  if (!regulars.length) buildRegulars();
  else for (const r of regulars) resetRegular(r);
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
function findOldestPendingOrder() {
  let best = null;
  for (const c of customers) {
    if (c.state !== 'sitting' || !c.orderType || c.served || c.beingCarried) continue;
    if (!best || c.orderPlacedAt < best.orderPlacedAt) best = c;
  }
  for (const r of regulars) {
    if (!r.orderType || r.served || r.beingCarried) continue;
    if (!best || r.orderPlacedAt < best.orderPlacedAt) best = r;
  }
  return best;
}

// A delivery that actually landed. Everything a completed order awards happens
// here and nowhere else — notably Nazim's drink count, so mashing the interact
// button can never advance his night without a trip to the bar.
function completeDelivery(target) {
  target.served = true;
  target.beingCarried = false;
  player.carrying = null;
  score += POINTS_PER_DELIVERY;
  Sound.play('deliver');
  addFloatingText(target.x, target.y - target.h - 4, '+' + POINTS_PER_DELIVERY, '#3ddc61');

  if (!target.isRegular) {
    noteOrderCleared(target);
    target.sitTimer = Math.min(target.sitTimer, 3 + Math.random() * 3);
    return;
  }

  const type = target.orderType;
  target.mood = clampMood(target.mood + 0.35);
  let stageChanged = false;
  if (target.id === 'nazim' && isAlcoholicOrder(type)) {
    target.drinks += 1;
    stageChanged = recalcIntoxication(target);
  }
  clearRegularOrder(target);   // they'll want the next one after a cooldown
  onRegularServed(target, type, stageChanged);
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
      completeDelivery(target);
    } else {
      registerWhiff();
    }
    return;
  }

  if (BAR_SEGMENTS.some(seg => nearRect(player.x, player.y, seg.collider, INTERACT_RANGE))) {
    const pending = findOldestPendingOrder();
    if (pending) {
      pending.beingCarried = true;
      player.carrying = { type: pending.orderType, customer: pending };
      Sound.play('pickup');
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
  hunter.speed = Math.min(60, 40 + hunterLvl * 2.5);

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
    tickOrderExit(c, dt);
    if (updateCustomer(c, dt) === 'remove') customers.splice(i, 1);
  }

  updateRegulars(dt);
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
  if (player.carrying) {
    const target = player.carrying.customer;
    // `orderType` is also checked because a regular's order can lapse while
    // they stay in their seat — for a walk-in, leaving is the only way out.
    const stillWanted = target && target.state === 'sitting' && !target.served &&
      target.orderType === player.carrying.type;
    if (!stillWanted) {
      // Deliberately only walk-ins: silently re-pointing a drink at a
      // different *named* regular would make "whose pint is this" ambiguous,
      // and Gerald being handed Nazim's beer is a bug, not a feature. A
      // regular's order always has to be picked up for them on purpose.
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
  if (hitInvulnTimer <= 0 && dist < (player.w + hunter.w) / 2.4) {
    life = Math.max(0, life - LIFE_HIT_FRACTION);
    hitInvulnTimer = LIFE_HIT_INVULN;
    regenDelayTimer = LIFE_REGEN_DELAY;

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

  // Level-done splash: fires once per level-up, checked last so it catches
  // every way score could have changed this frame (delivery, forgotten
  // penalty). Freezes gameplay on the next frame via the guard above.
  const level = getLevel();
  if (level > highestLevelReached) {
    splashLevel = level - 1;
    levelSplashTimer = LEVEL_SPLASH_DURATION;
    highestLevelReached = level;
  }
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

const PLANK_TILES = 4;
const WALL_TOP_H = 10;      // decorative wall band along the top of the world
const WALL_BOTTOM_H = 10;
const WALL_SIDE_W = 5;

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
    const items = [];
    const count = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < count; i++) {
      const roll = rnd();
      items.push({
        ox: Math.round((rnd() - 0.5) * Math.max(2, t.w - 7)),
        oy: Math.round((rnd() - 0.5) * Math.max(2, t.h - 7)),
        kind: roll < 0.4 ? 'coaster' : roll < 0.78 ? 'glass' : 'menu',
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
    let p = 5;
    while (p < length - 5) {
      const roll = rnd();
      const kind = roll < 0.42 ? 'bottle' : roll < 0.72 ? 'glass' : 'tap';
      barProps.push({
        x: horizontal ? c.x + p : c.x + 3,
        y: horizontal ? c.y + 4 : c.y + p,
        kind,
        seg,
      });
      p += 6 + Math.floor(rnd() * 7);
    }
  }

  // Hand-placed so they sit over the room rather than over the furniture.
  const lamps = [
    { x: 40, y: 40, r: 34, phase: 0.0 },
    { x: 150, y: 92, r: 38, phase: 1.7 },
    { x: 40, y: 150, r: 32, phase: 3.1 },
    { x: 150, y: 232, r: 32, phase: 4.4 },
    { x: 85, y: 296, r: 40, phase: 5.6 },
  ];

  // Cool light sources: two windows in the rear wall, and the door.
  const windows = [
    { x: 26, w: 26 },
    { x: 132, w: 30 },
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
const COOL_RGB = [91, 166, 201];

// Rebuilt only when the viewport changes size.
let vignetteCanvas = null;
function ensureVignette() {
  if (vignetteCanvas && vignetteCanvas.width === viewW && vignetteCanvas.height === viewH) return;
  vignetteCanvas = makeVignetteCanvas(viewW, viewH, 0.34);
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
  ctx.fillRect(x + 1, y + 2, w, h);
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = rug.accent;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = rug.base;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

  // A restrained kilim-like border: enough pattern to feel authored while
  // leaving the rug centre calm behind moving silhouettes.
  ctx.fillStyle = rug.accent;
  for (let px = x + 4; px < x + w - 3; px += 6) {
    ctx.fillRect(px, y + 3, 2, 1);
    ctx.fillRect(px + 2, y + h - 4, 2, 1);
  }
  for (let py = y + 6; py < y + h - 5; py += 7) {
    ctx.fillRect(x + 3, py, 1, 2);
    ctx.fillRect(x + w - 4, py + 1, 1, 2);
  }

  const cx = Math.round(x + w / 2);
  const cy = Math.round(y + h / 2);
  if (rug.motif === 0) {
    ctx.fillRect(cx - 5, cy, 11, 1);
    ctx.fillRect(cx, cy - 4, 1, 9);
    ctx.fillRect(cx - 3, cy - 2, 7, 5);
    ctx.fillStyle = rug.base;
    ctx.fillRect(cx - 2, cy - 1, 5, 3);
  } else if (rug.motif === 1) {
    ctx.fillRect(cx - 6, cy - 1, 13, 3);
    ctx.fillStyle = rug.base;
    ctx.fillRect(cx - 4, cy, 9, 1);
  } else {
    for (let py = y + 8; py < y + h - 7; py += 10) {
      ctx.fillRect(cx - 4, py, 9, 1);
      ctx.fillRect(cx, py - 2, 1, 5);
    }
  }

  // Short fringe on the ends, kept inside the rug footprint.
  ctx.fillStyle = PUB.creamDim;
  for (let px = x + 3; px < x + w - 2; px += 4) {
    ctx.fillRect(px, y, 1, 1);
    ctx.fillRect(px + 1, y + h - 1, 1, 1);
  }
}

function drawGround(ctx) {
  const tilesX = Math.ceil(WORLD_W / TILE);
  const tilesY = Math.ceil(WORLD_H / TILE);

  for (let worldTileY = 0; worldTileY <= tilesY; worldTileY++) {
    for (let worldTileX = 0; worldTileX <= tilesX; worldTileX++) {
      if (worldTileX * TILE >= WORLD_W || worldTileY * TILE >= WORLD_H) continue;

      const rowShift = worldTileY % 2 === 0 ? 0 : Math.floor(PLANK_TILES / 2);
      const plankCol = worldTileX + rowShift;
      const plankIndex = Math.floor(plankCol / PLANK_TILES);
      const shadeIdx = Math.abs((plankIndex * 928371 + worldTileY * 6151)) % PUB.floor.length;

      const sx = worldTileX * TILE;
      const sy = worldTileY * TILE;
      ctx.fillStyle = PUB.floor[shadeIdx];
      ctx.fillRect(sx, sy, TILE, TILE);

      // Grain: one sparse dithered line inside the board. Enough to read as
      // wood, far short of a texture that competes with the characters.
      ctx.fillStyle = PUB.floorGrain;
      const grainRow = 5 + ((worldTileX * 7 + worldTileY * 13) & 5);
      for (let gx = 1; gx < TILE - 1; gx += 3) {
        if (((worldTileX * 5 + worldTileY * 11 + gx) & 3) === 0) continue;
        ctx.fillRect(sx + gx, sy + grainRow, 1, 1);
      }

      ctx.fillStyle = PUB.floorSeam;
      ctx.fillRect(sx, sy, TILE, 1);
      if (plankCol % PLANK_TILES === 0) ctx.fillRect(sx, sy, 1, TILE);
    }
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

  // Rear wall.
  ctx.fillStyle = PUB.wall;
  ctx.fillRect(left, top, WORLD_W, WALL_TOP_H);
  ctx.fillStyle = PUB.wallLit;
  ctx.fillRect(left, top, WORLD_W, 2);
  // Narrow timber panels suggest the raised wall face seen from overhead.
  ctx.fillStyle = PUB.wallDark;
  for (let x = 9; x < WORLD_W; x += 17) ctx.fillRect(x, top + 2, 1, WALL_TOP_H - 4);
  ctx.fillStyle = PUB.wainscotLit;
  ctx.fillRect(left, top + 2, WORLD_W, 1);
  // Dithered falloff down the wall face.
  ctx.fillStyle = PUB.wallDark;
  for (let x = 0; x < WORLD_W; x++) {
    if ((x & 1) === 0) ctx.fillRect(left + x, top + WALL_TOP_H - 4, 1, 1);
    ctx.fillRect(left + x, top + WALL_TOP_H - 3, 1, 1);
  }
  ctx.fillStyle = PUB.wainscot;
  ctx.fillRect(left, top + WALL_TOP_H - 3, WORLD_W, 2);
  ctx.fillStyle = PUB.baseboard;
  ctx.fillRect(left, top + WALL_TOP_H - 1, WORLD_W, 1);

  // Windows: cooler light than anything else in the room.
  for (const w of DECOR.windows) {
    const wx = left + w.x;
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(wx - 1, top, w.w + 2, 7);
    ctx.fillStyle = PUB.midnight;
    ctx.fillRect(wx, top, w.w, 6);
    // Tiny skyline blocks and warm windows beyond rain-streaked glass.
    ctx.fillStyle = PUB.cool;
    for (let x = 1; x < w.w - 1; x += 4) {
      const buildingH = 2 + ((x + w.x) % 3);
      ctx.fillRect(wx + x, top + 6 - buildingH, 3, buildingH);
      ctx.fillStyle = ((x + w.x) & 1) ? PUB.amber : PUB.coolPale;
      ctx.fillRect(wx + x + 1, top + 5 - (buildingH & 1), 1, 1);
      ctx.fillStyle = PUB.cool;
    }
    ctx.fillStyle = PUB.coolPale;
    ctx.fillRect(wx + Math.floor(w.w / 2), top, 1, 6);
    ctx.fillRect(wx, top + 3, w.w, 1);
    for (let x = 3; x < w.w; x += 7) ctx.fillRect(wx + x, top, 1, 2 + ((x + w.x) & 1));
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
    ctx.fillStyle = PUB.paper;
    ctx.fillRect(plant.x - 2, plant.y, 5, 2);
    ctx.fillStyle = PUB.green;
    ctx.fillRect(plant.x, plant.y + 2, 1, plant.drop);
    for (let py = plant.y + 3; py < plant.y + plant.drop; py += 3) {
      const side = ((py + plant.x) & 1) ? -1 : 1;
      ctx.fillRect(plant.x + side, py, 2, 2);
      ctx.fillStyle = PUB.greenLit;
      ctx.fillRect(plant.x + side, py, 1, 1);
      ctx.fillStyle = PUB.green;
    }
  }

  // Side walls.
  ctx.fillStyle = PUB.wainscot;
  ctx.fillRect(left, top, WALL_SIDE_W, WORLD_H);
  ctx.fillRect(left + WORLD_W - WALL_SIDE_W, top, WALL_SIDE_W, WORLD_H);
  ctx.fillStyle = PUB.wainscotLit;
  ctx.fillRect(left, top, 1, WORLD_H);
  ctx.fillRect(left + WORLD_W - 1, top, 1, WORLD_H);
  ctx.fillStyle = PUB.baseboard;
  ctx.fillRect(left + WALL_SIDE_W - 1, top, 1, WORLD_H);
  ctx.fillRect(left + WORLD_W - WALL_SIDE_W, top, 1, WORLD_H);

  // Front wall and the door everyone arrives through.
  const bottom = top + WORLD_H - WALL_BOTTOM_H;
  ctx.fillStyle = PUB.wall;
  ctx.fillRect(left, bottom, WORLD_W, WALL_BOTTOM_H);
  ctx.fillStyle = PUB.baseboard;
  ctx.fillRect(left, bottom, WORLD_W, 1);

  const doorW = 22;
  const dx = Math.round(left + DOOR.x - doorW / 2);
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(dx - 1, bottom + 1, doorW + 2, WALL_BOTTOM_H - 1);
  ctx.fillStyle = PUB.midnight;
  ctx.fillRect(dx, bottom + 2, doorW, WALL_BOTTOM_H - 2);
  ctx.fillStyle = PUB.wainscotLit;
  ctx.fillRect(dx, bottom + 2, 1, WALL_BOTTOM_H - 2);
  ctx.fillRect(dx + doorW - 1, bottom + 2, 1, WALL_BOTTOM_H - 2);
  ctx.fillStyle = PUB.brass;
  ctx.fillRect(dx + doorW - 4, bottom + 5, 1, 2);
}

// One world-sized canvas holding passes 2-4. Built at load; the frame loop
// only copies the camera's rectangle out of it.
const roomCanvas = buildRoomCanvas();

function buildRoomCanvas() {
  const cv = document.createElement('canvas');
  cv.width = WORLD_W;
  cv.height = WORLD_H;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
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
  ctx.drawImage(roomCanvas, sx, sy, w, h, dx, dy, w, h);
}

// ---- Pass 5: floor lighting -------------------------------------------------
// Warm pools under the lamps, cool spill under the windows and the door. Drawn
// before the characters so people are lit by the room, not tinted through it.
function drawFloorLight(camX, camY) {
  for (const lamp of DECOR.lamps) {
    drawGlow(glowFor(lamp.r, WARM_RGB, 0.30), lamp.x, lamp.y, lampIntensity(lamp), camX, camY);
  }
  for (const w of DECOR.windows) {
    drawGlow(glowFor(22, COOL_RGB, 0.16), w.x + w.w / 2, 8, 1, camX, camY);
  }
  // A low, warm readability halo follows the player. It is deliberately much
  // dimmer than a lamp pool: visible as separation, never as a spotlight.
  drawGlow(glowFor(18, WARM_RGB, 0.11), player.x, player.y - 2, 0.75, camX, camY);
  // The door brightens while someone is coming in or going out.
  let doorBusy = 0;
  for (const c of customers) {
    if (c.state === 'sitting') continue;
    const d = Math.hypot(c.x - DOOR.x, c.y - DOOR.y);
    if (d < 40) doorBusy = Math.max(doorBusy, 1 - d / 40);
  }
  drawGlow(glowFor(24, COOL_RGB, 0.18), DOOR.x, WORLD_H - 8, 0.55 + doorBusy * 0.8, camX, camY);
}

// ---- Furniture --------------------------------------------------------------
// A counter: dark front panel with vertical slats, a lit top surface with a
// highlight along its back edge, and the glassware standing on it.
function drawBar(bar, camX, camY) {
  const c = bar.collider;
  const x = Math.round(c.x - camX);
  const y = Math.round(c.y - camY);

  ctx.fillStyle = PUB.tableShadow;
  ctx.fillRect(x + 1, y + c.h, c.w, 2);

  ctx.fillStyle = PUB.ink;
  ctx.fillRect(x, y, c.w, c.h);
  ctx.fillStyle = PUB.barFront;
  ctx.fillRect(x + 1, y + 1, c.w - 2, c.h - 2);
  ctx.fillStyle = PUB.barTop;
  ctx.fillRect(x, y, c.w, Math.min(c.h, Math.max(4, Math.round(c.h * 0.42))));
  ctx.fillStyle = PUB.barTopLit;
  ctx.fillRect(x + 1, y + 1, c.w - 2, 2);
  ctx.fillStyle = PUB.barTopHi;
  ctx.fillRect(x + 2, y + 1, c.w - 4, 1);

  // Slats down the customer-facing panel.
  ctx.fillStyle = PUB.barFrontDark;
  for (let sx = 3; sx < c.w - 2; sx += 5) ctx.fillRect(x + sx, y + c.h - 5, 1, 4);
  ctx.fillRect(x, y + c.h - 1, c.w, 1);
  // Short grain marks stop the broad counter from reading as one flat slab.
  for (let sx = 5; sx < c.w - 4; sx += 11) {
    ctx.fillRect(x + sx, y + 4, Math.min(5, c.w - sx - 2), 1);
  }
  ctx.fillStyle = PUB.barFrontLit;
  ctx.fillRect(x, y + c.h - 6, c.w, 1);
  ctx.fillStyle = PUB.brass;
  for (let rx = 1; rx < c.w - 1; rx += 2) ctx.fillRect(x + rx, y + c.h - 3, 1, 1);

  for (const prop of DECOR.barProps) {
    if (prop.seg !== bar) continue;
    drawBarProp(prop, camX, camY);
  }
}

function drawBarProp(prop, camX, camY) {
  const x = Math.round(prop.x - camX);
  const y = Math.round(prop.y - camY);
  if (prop.kind === 'bottle') {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x, y - 6, 3, 6);
    ctx.fillStyle = (prop.x & 1) ? PUB.bottleGreen : PUB.bottleAmber;
    ctx.fillRect(x, y - 5, 3, 5);
    ctx.fillStyle = PUB.glass;
    ctx.fillRect(x, y - 4, 1, 3);
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x + 1, y - 7, 1, 2);
  } else if (prop.kind === 'glass') {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x, y - 4, 3, 4);
    ctx.fillStyle = PUB.bottleClear;
    ctx.fillRect(x, y - 3, 3, 3);
    ctx.fillStyle = PUB.cream;
    ctx.fillRect(x, y - 3, 1, 2);
  } else {
    ctx.fillStyle = PUB.brass;
    ctx.fillRect(x, y - 5, 2, 5);
    ctx.fillRect(x + 2, y - 5, 2, 1);
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x, y - 1, 2, 1);
  }
}

// One chair per seat point, so the chairs can never drift away from where
// getTableSeats actually puts people. Shared by tables and stool benches.
function drawSeatChairs(table, camX, camY) {
  const seats = getTableSeats(table);
  for (let i = 0; i < seats.length; i++) {
    const seat = seats[i];
    const cx = Math.round(seat.x - camX - CHAIR_SIZE / 2);
    const cy = Math.round(seat.y - camY - CHAIR_SIZE / 2);
    const alternate = (Math.round(table.x + table.y) + i * 3) % 7 < 2;
    const base = alternate ? PUB.chairAlt : PUB.chair;
    const lit = alternate ? PUB.chairAltLit : PUB.chairLit;
    ctx.fillStyle = PUB.tableShadow;
    ctx.fillRect(cx + 1, cy + CHAIR_SIZE - 1, CHAIR_SIZE, 2);
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(cx, cy, CHAIR_SIZE, CHAIR_SIZE);
    ctx.fillStyle = base;
    ctx.fillRect(cx + 1, cy + 1, CHAIR_SIZE - 2, CHAIR_SIZE - 2);
    ctx.fillStyle = lit;
    ctx.fillRect(cx + 1, cy + 1, CHAIR_SIZE - 2, 1);
    // One dark inset pixel reads as a tuft/button at this scale.
    ctx.fillStyle = base;
    ctx.fillRect(cx + Math.floor(CHAIR_SIZE / 2), cy + Math.floor(CHAIR_SIZE / 2), 1, 1);
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
  ctx.fillRect(x + 1, y + bench.h, bench.w, 2);
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(x, y, bench.w, bench.h);
  ctx.fillStyle = PUB.chair;
  ctx.fillRect(x + 1, y + 1, bench.w - 2, bench.h - 2);
  ctx.fillStyle = PUB.chairLit;
  ctx.fillRect(x + 2, y + 1, bench.w - 4, 1);
  ctx.fillStyle = PUB.tableEdge;
  ctx.fillRect(x + 1, y + bench.h - 2, bench.w - 2, 1);
  for (let px = x + 5; px < x + bench.w - 3; px += 9) ctx.fillRect(px, y + Math.floor(bench.h / 2), 1, 1);
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
  ctx.fillRect(sx - halfW + 1, sy + halfH, table.w, 2);

  ctx.fillStyle = PUB.tableEdge;
  ctx.fillRect(sx - halfW, sy - halfH, table.w, table.h);
  ctx.fillStyle = PUB.tableTop;
  ctx.fillRect(sx - halfW + 1, sy - halfH + 1, table.w - 2, table.h - 2);
  ctx.fillStyle = PUB.tableTopLit;
  ctx.fillRect(sx - halfW + 2, sy - halfH + 2, table.w - 4, table.h - 4);
  ctx.fillStyle = PUB.tableTopHi;
  ctx.fillRect(sx - halfW + 3, sy - halfH + 2, table.w - 6, 1);
  ctx.fillStyle = PUB.tableTop;
  for (let gy = sy - halfH + 6; gy < sy + halfH - 2; gy += 7) {
    ctx.fillRect(sx - halfW + 3, gy, Math.max(1, table.w - 7), 1);
  }
  ctx.fillStyle = PUB.tableEdge;
  ctx.fillRect(sx - halfW + 1, sy + halfH - 2, table.w - 2, 1);

  const items = DECOR.clutter.get(table);
  if (items) for (const it of items) drawTableProp(it, sx, sy, camX, camY);
}

function drawTableProp(item, tableSX, tableSY, camX, camY) {
  const x = tableSX + item.ox;
  const y = tableSY + item.oy;
  if (item.kind === 'coaster') {
    ctx.fillStyle = PUB.creamDim;
    ctx.fillRect(x - 1, y, 3, 2);
    ctx.fillStyle = PUB.cream;
    ctx.fillRect(x, y, 1, 1);
  } else if (item.kind === 'glass') {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x - 1, y - 3, 3, 4);
    ctx.fillStyle = PUB.bottleClear;
    ctx.fillRect(x - 1, y - 3, 3, 3);
    ctx.fillStyle = PUB.cream;
    ctx.fillRect(x - 1, y - 3, 1, 2);
  } else {
    ctx.fillStyle = PUB.paper;
    ctx.fillRect(x - 2, y - 1, 5, 3);
    ctx.fillStyle = PUB.tomato;
    ctx.fillRect(x - 1, y, 3, 1);
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
    const y = Math.round(lamp.y - camY);
    if (x < -8 || y < -8 || x > viewW + 8 || y > viewH + 8) continue;
    const glow = lampIntensity(lamp);
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x, y - 6, 1, 3);          // cord
    ctx.fillStyle = '#3b2a12';
    ctx.fillRect(x - 2, y - 4, 5, 1);      // shade, top of the cone
    ctx.fillStyle = '#5c421c';
    ctx.fillRect(x - 3, y - 3, 7, 1);
    ctx.fillStyle = PUB.brass;
    ctx.fillRect(x - 4, y - 2, 9, 1);      // rim
    ctx.fillStyle = glow > 1 ? '#fff3d2' : PUB.amber;
    ctx.fillRect(x - 2, y - 1, 5, 1);      // bulb under the rim
    ctx.fillStyle = PUB.amberDim;
    ctx.fillRect(x - 1, y, 3, 1);
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
  const nightAlpha = Math.min(0.27, 0.05 + (lvl - 1) * 0.024);
  ctx.globalAlpha = nightAlpha;
  ctx.fillStyle = PUB.midnight;
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.globalAlpha = 1;

  ensureVignette();
  ctx.drawImage(vignetteCanvas, 0, 0);
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

function drawEntity(e, camX, camY) {
  const set = SPRITES[e.kind];
  // Seated regulars pick a named pose; movers use the walk cycle.
  const sprite = e.pose
    ? (set[e.pose] || set.idle)
    : set[e.moving ? (e.legFrame === 1 ? 'walk' : 'idle') : 'idle'];
  const sx = e.x - camX - sprite.w / 2 + (e.swayOffset || 0);
  const sy = e.y - camY - sprite.h;
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
  // A small contact shadow so nobody looks pasted onto the floor.
  ctx.fillStyle = PUB.tableShadow;
  ctx.fillRect(footX - 4, footY - 1, 8, 2);
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
  drawSprite(sprite, SPRITES.ghost.palette, g.x - camX - sprite.w / 2, g.y - camY - sprite.h, g.flip);
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

const BUBBLE_FRAME_DEFAULT = PUB.ink;
const BUBBLE_FRAME_REGULAR = PUB.amberDim; // a named regular is waiting
const BUBBLE_FRAME_CARRIED = PUB.greenLit; // this is the order you're carrying
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
  const pad = 3;
  const bw = icon.sprite.w + pad * 2;
  const full = icon.sprite.h + pad * 2;
  const step = grow == null || grow >= 1 ? 3 : Math.max(1, Math.ceil(grow * 3));
  const bh = step === 3 ? full : (step === 2 ? full - 4 : 3);
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

  // One-pixel shadow, clipped paper corners, and a coloured top stitch give
  // this the same hand-built material language as the room furniture.
  ctx.fillStyle = PUB.tableShadow;
  ctx.fillRect(sx + 1, sy + 2, bw, bh);
  ctx.fillStyle = border;
  ctx.fillRect(sx + 1, sy, bw - 2, bh);
  ctx.fillRect(sx, sy + 1, bw, bh - 2);
  ctx.fillStyle = PUB.paper;
  ctx.fillRect(sx + 2, sy + 1, bw - 4, bh - 2);
  ctx.fillRect(sx + 1, sy + 2, bw - 2, bh - 4);
  if (bh >= 7) {
    ctx.fillStyle = highlighted ? PUB.greenLit : PUB.cream;
    ctx.fillRect(sx + 3, sy + 1, bw - 6, 1);
  }
  ctx.fillStyle = border;
  const tailX = clamp(Math.round(worldX - camX) - 1, sx + 2, sx + bw - 4);
  ctx.fillRect(tailX, sy + bh, 3, 2);
  ctx.fillStyle = PUB.paper;
  ctx.fillRect(tailX + 1, sy + bh, 1, 1);

  if (step < 3) return;   // mid-pop: frame only, no icon and no patience bar
  drawSprite(icon.sprite, icon.palette, sx + pad, sy + pad, false);

  if (patienceFraction != null) {
    const barY = sy - 3;
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(sx, barY, bw, 2);
    ctx.fillStyle = patienceBarColor(patienceFraction);
    ctx.fillRect(sx + 1, barY, Math.round((bw - 2) * clamp(patienceFraction, 0, 1)), 1);
  }
}

// Draws whichever bubble a person currently warrants: the live order growing
// in, or the one just dealt with shrinking out. Walk-ins and regulars differ
// only in which frame colour they get, and in that a walk-in has to be seated
// to show one at all.
function drawOrderBubbleFor(e, camX, camY, frameColor) {
  if (e.orderType && !e.served && (e.isRegular || e.state === 'sitting')) {
    const patience = clamp(e.sitTimer / e.patienceDuration, 0, 1);
    const grow = (gameTime - e.orderAppearAt) / BUBBLE_APPEAR_TIME;
    drawOrderBubble(e.x, e.y - e.h, camX, camY, e.orderType, e.beingCarried, patience, frameColor, grow);
  } else if (e.orderExit) {
    drawOrderBubble(e.x, e.y - e.h, camX, camY, e.orderExit.type, false, null, frameColor,
      e.orderExit.ttl / BUBBLE_EXIT_TIME);
  }
}

// ---- Dialogue bubbles -------------------------------------------------------
// Drawn after the order bubbles, above the scene. Three rules shape the
// layout: stay inside the camera, don't cover the speaker's own order bubble,
// and don't cover another bubble already placed this frame.
const DIALOGUE_MAX_W = 92;
const DIALOGUE_PAD = 2;
const DIALOGUE_LINE_GAP = 1;
const DIALOGUE_BG = PUB.paper;
const DIALOGUE_INK = PUB.ink;

// Reused across frames so the bubble pass allocates nothing per frame.
const placedBubbles = [];

function rectsTouch(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Reused; the HUD's footprint is fed to the bubble layout as an obstacle.
const hudRect = { x: 2, y: 2, w: 0, h: 0 };
const LIFE_SEGMENT_COUNT = 3;
const LIFE_SEG_W = 16;
const LIFE_SEG_H = 3;
const LIFE_SEG_GAP = 2;

function lifeBarWidth() {
  return LIFE_SEGMENT_COUNT * LIFE_SEG_W + (LIFE_SEGMENT_COUNT - 1) * LIFE_SEG_GAP;
}

function measureHud() {
  hudRect.w = Math.max(fontTextWidth('LEVEL ' + getLevel() + '  SCORE ' + score) + 6, lifeBarWidth() + 6);
  hudRect.h = FONT_H + LIFE_SEG_H + 10;
  return hudRect;
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

    const headTop = r.y - r.h - camY;
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

    // Frame, clipped paper corners, top stitch, and a tail pointing back at
    // whoever is talking. The offset dark plate keeps text readable over the
    // patterned rugs without resorting to a modern rounded card.
    const accent = r.cfg.accent || '#141414';
    ctx.fillStyle = PUB.tableShadow;
    ctx.fillRect(rect.x + 1, rect.y + 2, bw, bh);
    ctx.fillStyle = accent;
    ctx.fillRect(rect.x + 1, rect.y, bw - 2, bh);
    ctx.fillRect(rect.x, rect.y + 1, bw, bh - 2);
    ctx.fillStyle = DIALOGUE_BG;
    ctx.fillRect(rect.x + 2, rect.y + 1, bw - 4, bh - 2);
    ctx.fillRect(rect.x + 1, rect.y + 2, bw - 2, bh - 4);
    if (bw > 7) {
      ctx.fillStyle = PUB.cream;
      ctx.fillRect(rect.x + 3, rect.y + 1, bw - 6, 1);
    }

    const tailX = clamp(Math.round(r.x - camX) - 1, rect.x + 2, rect.x + bw - 4);
    ctx.fillStyle = accent;
    if (below) {
      ctx.fillRect(tailX, rect.y - 2, 3, 2);
      ctx.fillRect(tailX + 1, rect.y - 3, 1, 1);
    } else {
      ctx.fillRect(tailX, rect.y + bh, 3, 2);
      ctx.fillRect(tailX + 1, rect.y + bh + 2, 1, 1);
    }

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

// The HUD stays a compact pixel plate rather than a card: strong contrast,
// small footprint, and no information the player doesn't need mid-chase.
// Nazim's state deliberately isn't here — it's readable from how he looks and
// what he says, which is the point of him.
function drawHud() {
  const text = 'LEVEL ' + getLevel() + '  SCORE ' + score;
  const hud = measureHud();
  ctx.fillStyle = PUB.tableShadow;
  ctx.fillRect(hud.x + 2, hud.y + 2, hud.w, hud.h);
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(hud.x, hud.y, hud.w, hud.h);
  ctx.fillStyle = 'rgba(24,49,47,0.94)';
  ctx.fillRect(hud.x + 1, hud.y + 1, hud.w - 2, hud.h - 2);
  ctx.fillStyle = PUB.amber;
  ctx.fillRect(hud.x + 2, hud.y + 1, hud.w - 4, 1);
  ctx.fillStyle = PUB.greenLit;
  ctx.fillRect(hud.x + 2, hud.y + hud.h - 2, hud.w - 4, 1);
  ctx.fillStyle = PUB.brass;
  ctx.fillRect(hud.x + 2, hud.y + 3, 1, 1);
  ctx.fillRect(hud.x + hud.w - 3, hud.y + 3, 1, 1);
  fontDrawText(ctx, text, 5, 5, PUB.cream);

  const barY = hud.y + FONT_H + 6;
  for (let i = 0; i < LIFE_SEGMENT_COUNT; i++) {
    const x = hud.x + 3 + i * (LIFE_SEG_W + LIFE_SEG_GAP);
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x - 1, barY - 1, LIFE_SEG_W + 2, LIFE_SEG_H + 2);
    ctx.fillStyle = PUB.wallDark;
    ctx.fillRect(x, barY, LIFE_SEG_W, LIFE_SEG_H);
    const fill = clamp(life * LIFE_SEGMENT_COUNT - i, 0, 1);
    if (fill > 0) {
      ctx.fillStyle = fill > 0.5 ? PUB.tomato : PUB.amber;
      ctx.fillRect(x, barY, Math.ceil(LIFE_SEG_W * fill), LIFE_SEG_H);
      ctx.fillStyle = fill > 0.5 ? '#e9785e' : PUB.cream;
      ctx.fillRect(x, barY, Math.ceil(LIFE_SEG_W * fill), 1);
    }
  }
}

function drawCaughtOverlay() {
  if (caughtImage.complete && caughtImage.naturalWidth > 0) {
    // Cover-fit the image into the internal resolution, cropping overflow.
    const scale = Math.max(viewW / caughtImage.naturalWidth, viewH / caughtImage.naturalHeight);
    const dw = caughtImage.naturalWidth * scale;
    const dh = caughtImage.naturalHeight * scale;
    ctx.drawImage(caughtImage, (viewW - dw) / 2, (viewH - dh) / 2, dw, dh);
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillRect(0, 0, viewW, viewH);
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, viewW, viewH);
  }

  // The text sits on its own plate: the splash is a busy, high-contrast
  // painting and small type disappears into it otherwise.
  // The newest line, not the oldest: the reaction to being caught is the one
  // worth showing, even if an earlier bubble is still on its way out.
  const active = Dialogue.getActive();
  const reaction = active.length ? active[active.length - 1] : null;
  const speaker = reaction ? regularById.get(reaction.who) : null;
  const quipRows = reaction
    ? fontWrapText((speaker ? speaker.name + ': ' : '') + reaction.text.toUpperCase(), Math.min(200, viewW - 20))
    : null;

  // Below the score line the plate shows one of two things: the name field
  // while a score is being filed, or the table it was filed into. Both are
  // built as rows first so the plate can be sized to fit them.
  const rows = [];
  if (enteringName) {
    // A blinking cursor after the typed name shows the field is live.
    const cursor = Math.floor(performance.now() / 400) % 2 === 0 ? '_' : ' ';
    rows.push({ text: 'NEW SCORE - ENTER YOUR NAME', color: PUB.amber });
    rows.push({ text: '> ' + nameInput.toUpperCase() + cursor, color: PUB.cream });
    rows.push({ text: 'ENTER TO CONFIRM   ESC TO SKIP', color: PUB.creamDim });
  } else {
    rows.push({ text: 'PRESS SPACE TO RESTART', color: PUB.amber });
    const highScores = loadHighScores();
    if (highScores.length) {
      rows.push({ text: 'BEST', color: PUB.creamDim });
      for (let i = 0; i < highScores.length; i++) {
        rows.push({
          text: (i + 1) + '. ' + String(highScores[i].name).toUpperCase() + '  ' + highScores[i].score,
          color: PUB.cream,
        });
      }
    }
  }

  const plateH = 30 + rows.length * 8 + (quipRows ? quipRows.length * 7 + 3 : 0);
  const plateY = Math.round(clamp(viewH / 2 - plateH / 2, 2, viewH - plateH - 2));
  ctx.fillStyle = 'rgba(10,6,14,0.72)';
  ctx.fillRect(0, plateY, viewW, plateH);
  ctx.fillStyle = 'rgba(232,161,58,0.55)';
  ctx.fillRect(0, plateY, viewW, 1);
  ctx.fillRect(0, plateY + plateH - 1, viewW, 1);

  ctx.fillStyle = '#e8620c';
  ctx.font = '16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CAUGHT!', viewW / 2, plateY + 15);
  ctx.textAlign = 'left';

  const summary = 'LEVEL ' + getLevel() + '   SCORE ' + score;
  fontDrawTextShadow(ctx, summary, Math.round((viewW - fontTextWidth(summary)) / 2), plateY + 20, PUB.cream);

  let rowY = plateY + 28;
  for (const row of rows) {
    fontDrawTextShadow(ctx, row.text, Math.round((viewW - fontTextWidth(row.text)) / 2), rowY, row.color);
    rowY += 8;
  }

  if (quipRows) {
    for (let k = 0; k < quipRows.length; k++) {
      fontDrawTextShadow(ctx, quipRows[k], Math.round((viewW - fontTextWidth(quipRows[k])) / 2), rowY + 3 + k * 7,
        speaker ? speaker.cfg.accent : PUB.cream);
    }
  }
}

function drawLevelSplashOverlay() {
  if (levelDoneImage.complete && levelDoneImage.naturalWidth > 0) {
    const scale = Math.max(viewW / levelDoneImage.naturalWidth, viewH / levelDoneImage.naturalHeight);
    const dw = levelDoneImage.naturalWidth * scale;
    const dh = levelDoneImage.naturalHeight * scale;
    ctx.drawImage(levelDoneImage, (viewW - dw) / 2, (viewH - dh) / 2, dw, dh);
    ctx.fillStyle = 'rgba(7,15,22,0.28)';
    ctx.fillRect(0, 0, viewW, viewH);
  } else {
    ctx.fillStyle = 'rgba(7,15,22,0.82)';
    ctx.fillRect(0, 0, viewW, viewH);
  }

  const title = 'LEVEL ' + splashLevel + ' DONE';
  const next = 'LEVEL ' + (splashLevel + 1) + ' STARTS NOW';
  const plateY = Math.round(viewH / 2 - 20);
  ctx.fillStyle = 'rgba(8,12,18,0.78)';
  ctx.fillRect(0, plateY, viewW, 38);
  ctx.fillStyle = 'rgba(232,161,58,0.7)';
  ctx.fillRect(0, plateY, viewW, 1);
  ctx.fillRect(0, plateY + 37, viewW, 1);
  fontDrawTextShadow(ctx, title, Math.round((viewW - fontTextWidth(title)) / 2), plateY + 10, PUB.cream);
  fontDrawTextShadow(ctx, next, Math.round((viewW - fontTextWidth(next)) / 2), plateY + 24, PUB.amber);
}

function render() {
  const cam = getCamera();
  const camX = cam.x;
  const camY = cam.y;

  drawBackdrop();
  drawRoom(camX, camY);
  drawFloorLight(camX, camY);

  // Furniture and characters share one y-sorted pass so nearer (lower) things
  // draw over farther ones. Table sortY is still the table top's own front
  // edge, not the chair-inclusive footprint, so a customer on the south chair
  // draws in front of their table (see makeTable).
  drawList.length = 0;
  drawPoolIdx = 0;
  for (const f of FURNITURE) pushDrawable(f.sortY, 'furniture', f);
  pushDrawable(player.y, 'entity', player);
  pushDrawable(hunter.y, 'entity', hunter);
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

  drawForeground(camX, camY);
  drawGrade();

  // Order bubbles float above the scene and above the grade, so a patience bar
  // is never dimmed by the lighting.
  placedOrderBubbles.length = 0;
  const measuredHud = measureHud();
  placedOrderBubbles.push({ x: measuredHud.x, y: measuredHud.y, w: measuredHud.w, h: measuredHud.h });
  for (const c of customers) drawOrderBubbleFor(c, camX, camY, null);
  for (const r of regulars) drawOrderBubbleFor(r, camX, camY, BUBBLE_FRAME_REGULAR);
  if (player.carrying) {
    const carriedFor = player.carrying.customer;
    const carriedPatience = carriedFor ? clamp(carriedFor.sitTimer / carriedFor.patienceDuration, 0, 1) : null;
    drawOrderBubble(player.x, player.y - player.h, camX, camY, player.carrying.type, false, carriedPatience);
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
  else if (levelSplashTimer > 0) drawLevelSplashOverlay();
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
  setScore: (v) => { score = v; },              // level is derived from score
  getLife: () => life,
  setLife: (v) => { life = clamp(v, 0, LIFE_MAX); },
  getLevelSplash: () => ({ timer: levelSplashTimer, level: splashLevel }),
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
