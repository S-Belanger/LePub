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

// The bathroom, for the bladder mechanic below: no extra floor space, just a
// marked spot in the existing gap on the right side of the room — the open
// floor right of TABLES[3] (bottom edge y=293.5) and short of the back wall,
// the first thing on the right after walking in through DOOR. Clear of every
// collider in that pocket.
const BATHROOM = { x: 180, y: 320 };

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
  const footH = 7;
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
    speed: kind === 'doe' ? 62 : kind === 'customer' ? 38 : kind === 'ghost' ? 16 :
      kind === 'waiter' ? 46 : kind === 'busboy' ? 40 : kind === 'alex' ? 58 : 54,
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

// ---- The Jameson: roughly two out of every five drink deliveries comes back
// as a shot for the deer, and for JAMESON_DURATION afterwards the hunter
// cannot touch him — the star from Mario, poured. It deliberately stacks with
// nothing: a second shot restarts the clock rather than extending it, so the
// effect can never be farmed into a permanently safe run.
//
// Only alcoholic orders qualify (a plate of food doesn't come with a whiskey),
// which puts the real rate a little under the nominal chance.
const JAMESON_CHANCE = 0.4;
const JAMESON_DURATION = 10;
const JAMESON_WARN_TIME = 3;      // last seconds, where the tint starts strobing
const JAMESON_BOUNCE_COOLDOWN = 0.4; // between shoves, so contact isn't a buzz
const JAMESON_BOUNCE_FORCE = 40;
let jamesonTimer = 0;
let jamesonBounceTimer = 0;
function jamesonActive() { return jamesonTimer > 0; }

// ---- The bladder: a comic consequence for stacking up Jamesons. Every shot
// fills it a third; once full, the deer has BLADDER_TIME_LIMIT seconds to
// reach the bathroom (BATHROOM, declared with the world furniture) or he wets
// himself — a score penalty and a brief, purely cosmetic recolor, nothing
// that touches the chase itself.
const BLADDER_MAX = 3;
const BLADDER_TIME_LIMIT = 60;
const BLADDER_REACH_RADIUS = 14;
const WET_PANTS_DURATION = 6;
const WET_PANTS_PENALTY = 20;
const WET_PANTS_SCARE_RADIUS = 28; // walk-ins this close to the puddle bail
let bladderLevel = 0;
let bladderUrgentTimer = 0; // >0 once full: seconds left to reach the bathroom
let wetPantsTimer = 0;      // >0 briefly after an accident — just the sprite tint
// Every accident leaves its own puddle, and unlike the tint it doesn't fade —
// it's a stain on the floor, not a status effect, and stays for the rest of
// the run (cleared on resetGame()) still scaring off anyone who gets close.
const wetPantsPuddles = [];
function bladderFull() { return bladderLevel >= BLADDER_MAX; }

// ---- Cigarette packs: every CIGARETTES_EVERY completed deliveries (walk-in
// or regular, same counter) the player pockets a pack, up to
// CIGARETTE_RESERVE_MAX held at once. Pressing the drop key drops one at the
// player's own feet as a trap — nothing rolls onto the floor on its own. If
// the hunter's own patrol steps on a dropped pack he stops the chase outright
// for a smoke break, same length no matter how many turn up (refresh, not
// stack — see grantSmokeBreak, same policy as the Jameson).
const CIGARETTES_EVERY = 5;
const CIGARETTE_RESERVE_MAX = 3;
const CIGARETTE_PICKUP_RADIUS = 8;
const SMOKE_BREAK_DURATION = 15;
// A dropped pack left untouched doesn't sit there forever — it's clutter,
// not furniture. The last stretch fades it out rather than popping it away,
// so it doesn't vanish out from under the player's nose without warning.
const CIGARETTE_PACK_TTL = 25;
const CIGARETTE_PACK_FADE_TIME = 4;
let deliveriesSinceCigarette = 0;
let cigaretteReserve = 0;       // packs the player is currently holding
const cigarettePacks = []; // { x, y, ttl } — packs actually dropped on the floor

// He can't smoke inside: stepping on a pack routes him out through DOOR
// (same route customers use) rather than freezing him on the spot. 'leaving'
// and 'returning' are a walk like any other routed walk-on, and only
// 'outside' is a plain timer with the hunter off the floor entirely — not
// drawn, not collidable, nowhere for the player to even find him.
let hunterSmokeState = null;   // null | 'leaving' | 'outside' | 'returning'
let hunterSmokeOutsideTimer = 0;
let hunterSmokeReturnSpot = null; // where he was standing when he left
// Safety net for the walk to/from the door. computeCustomerPath's grid is
// sized for a customer's narrower footprint (see the architecture note on
// the hunter having the widest foot box in the game), so a route it judges
// clear can still pinch shut for him specifically — without this he could
// stall mid-walk forever, stuck both un-catchable and not actually chasing.
// Not reached in the ordinary case; it only fires if he's made no headway.
const HUNTER_SMOKE_STUCK_TIMEOUT = 6;
let hunterSmokeTravelTimer = 0;
function hunterOnSmokeBreak() { return hunterSmokeState !== null; }

// Drops one held pack at the player's feet. No-op with nothing in reserve.
function dropCigarette() {
  if (cigaretteReserve <= 0) return;
  cigaretteReserve--;
  cigarettePacks.push({ x: player.x, y: player.y, ttl: CIGARETTE_PACK_TTL });
  Sound.play('pickup');
  addFloatingText(player.x, player.y - player.h - 4, 'PACK DROPPED', '#c9c2b3');
}

// Stepping on a pack. Already on the way out (or already outside): refresh
// the outside timer rather than restarting the whole walk, same "refresh not
// stack" policy as the Jameson. Mid-walk in either direction, a second pack
// underfoot changes nothing until he's actually outside to refresh.
function grantSmokeBreak() {
  if (hunterSmokeState === 'outside') { hunterSmokeOutsideTimer = SMOKE_BREAK_DURATION; return; }
  if (hunterSmokeState) return;
  hunterSmokeState = 'leaving';
  hunterSlide = null;
  hunterRubTimer = 0;
  hunterSmokeTravelTimer = 0;
  hunterSmokeReturnSpot = { x: hunter.x, y: hunter.y };
  hunter.path = computeCustomerPath(hunter, reachablePoint(hunter, DOOR), null);
  hunter.pathIndex = 0;
  Sound.play('smokeBreak');
  addFloatingText(hunter.x, hunter.y - hunter.h - 4, 'SMOKE BREAK', '#c9c2b3');
}

// Same routed walk as the waiter's/busboy's, just against `hunter` instead —
// used for both legs of the smoke break (see grantSmokeBreak/update).
function hunterFollowPath(dt) {
  const target = hunter.path[hunter.pathIndex];
  const dx = target.x - hunter.x;
  const dy = target.y - hunter.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1.5) {
    hunter.x = target.x;
    hunter.y = target.y;
    if (hunter.pathIndex < hunter.path.length - 1) { hunter.pathIndex++; return false; }
    hunter.moving = false;
    return true;
  }
  const step = Math.min(dist, hunter.speed * dt);
  const nx = clamp(hunter.x + (dx / dist) * step, hunter.w / 2, WORLD_W - hunter.w / 2);
  if (!collidesAt(hunter, nx, hunter.y)) hunter.x = nx;
  const ny = clamp(hunter.y + (dy / dist) * step, hunter.h / 2, WORLD_H - hunter.h / 2);
  if (!collidesAt(hunter, hunter.x, ny)) hunter.y = ny;
  hunter.flip = dx < 0;
  hunter.moving = true;
  return false;
}

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

// A walk-in who got too close to the puddle: whether they were still on
// their way to a seat or already sitting, they're done with this place.
// Only unserved *sitting* customers cost anything — someone still walking in
// never had an order to abandon, they just turn around.
function scareOffCustomer(c) {
  c.seat.occupied = false;
  if (c.state === 'sitting' && !c.served && c.orderType) {
    score = Math.max(0, score - FORGOTTEN_PENALTY);
    addFloatingText(c.x, c.y - c.h - 4, '-' + FORGOTTEN_PENALTY, '#e84c3d');
    noteOrderCleared(c);
    Sound.play('penalty');
    Dialogue.trigger('abandoned', null);
  }
  c.state = 'leaving';
  c.path = computeCustomerPath(c, reachablePoint(c, DOOR), c.seat.table);
  c.pathIndex = 0;
  c.moving = true;
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
// Every so often a pull of the trigger sends a glass over the edge instead of
// (or alongside) the usual sparks — purely cosmetic, same as the sparks: no
// score, hunter or dialogue hook, just something to notice.
const WAITER_BREAK_CHANCE = 0.16;
const WAITER_SHARD_COUNT = 10;
const WAITER_SHARD_COLORS = ['#dff6ff', '#a9dced', '#7fb8cc', '#ffffff'];
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
  waiter.shards = [];
  waiter.breakTimer = 0;
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
  if (waiter.breakTimer <= 0 && Math.random() < WAITER_BREAK_CHANCE) {
    // Same flight time as the sparks, plus a beat — the crash lands a hair
    // after the water hits, as if it's the jet that knocked it over.
    waiter.breakTimer = WAITER_SPARK_DELAY + 0.08 + Math.random() * 0.12;
  }
}

// A glass goes over: a spray of shards off the counter top, no jet required.
function waiterBreakGlass() {
  const dir = waiter.flip ? -1 : 1;
  const ix = waiter.x + dir * (10 + Math.random() * 12);
  const iy = WAITER_COUNTER.y + WAITER_COUNTER.h - 2;
  for (let i = 0; i < WAITER_SHARD_COUNT; i++) {
    const ttl = 0.4 + Math.random() * 0.5;
    waiter.shards.push({
      x: ix, y: iy,
      vx: (Math.random() - 0.5) * 70,
      vy: -50 - Math.random() * 40,
      size: Math.random() < 0.4 ? 2 : 1,
      color: WAITER_SHARD_COLORS[Math.floor(Math.random() * WAITER_SHARD_COLORS.length)],
      ttl, maxTtl: ttl,
    });
  }
  Sound.play('glassBreak');
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
    if (waiter.breakTimer > 0) {
      waiter.breakTimer -= dt;
      if (waiter.breakTimer <= 0) waiterBreakGlass();
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
  // Shards fall like the sparks but don't fade as fast — glass on the floor
  // reads better lingering a beat than snapping out.
  for (let i = waiter.shards.length - 1; i >= 0; i--) {
    const s = waiter.shards[i];
    s.ttl -= dt;
    if (s.ttl <= 0) { waiter.shards.splice(i, 1); continue; }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vy += 140 * dt;
  }
}

// ---- Busboy: cleans up after the bladder mechanic. Every accident leaves a
// puddle (see wetPantsPuddles); a while after the *first* one appears he's
// sent in, mops each one in turn, and leaves once the floor is clear again.
// He's an ordinary floor-standing character like the waiter — no bespoke
// draw pass needed, drawEntity already picks 'mop'/'mopB' up as a pose — the
// only extra is the occasional line over his head.
//
// Like the waiter he is pure scenery: no orders, no seat, no score of his
// own, no effect on the chase. `busboy` is null whenever nobody is on it.
let busboy = null;
const BUSBOY_DISPATCH_DELAY_MIN = 6;  // seconds after a puddle appears before he's sent
const BUSBOY_DISPATCH_DELAY_MAX = 16;
let busboyDispatchDelay = BUSBOY_DISPATCH_DELAY_MIN + Math.random() * (BUSBOY_DISPATCH_DELAY_MAX - BUSBOY_DISPATCH_DELAY_MIN);
const BUSBOY_MOP_TIME = 3; // seconds spent on each puddle
const BUSBOY_LINE_MIN = 6;
const BUSBOY_LINE_MAX = 14;
const BUSBOY_LINE_TTL = 2.4;
const BUSBOY_LINE_TEXT = 'Du coup !';
// A puddle can land anywhere the player happened to be standing, unlike a
// seat or the waiter's station, which are always placed with clearance. A
// spot that's valid for the player isn't guaranteed valid for the busboy's
// own footprint, and the routed walk (same as customers/the waiter) has no
// wall-following fallback if the direct approach clips something. Rather
// than risk him parked at the door forever, any attempt — walking to a
// puddle or back out — gets a time budget; blowing it abandons that puddle
// (marked so he doesn't keep re-targeting it) instead of freezing him.
const BUSBOY_STUCK_TIMEOUT = 18;

function spawnBusboy() {
  const target = wetPantsPuddles.find(p => !p.unreachable);
  // Nothing to send him to (or every puddle left has already beaten him
  // once). Real callers only reach this once there's a fresh one; this guard
  // is for __debug.spawnBusboy().
  if (!target) return null;
  busboy = makeEntity('busboy', DOOR.x, DOOR.y);
  busboy.state = 'entering';
  busboy.target = target;
  busboy.path = computeCustomerPath(DOOR, target, null);
  busboy.pathIndex = 0;
  busboy.travelTimer = 0;
  busboy.mopTimer = 0;
  busboy.line = null;
  busboy.lineTtl = 0;
  busboy.lineTimer = BUSBOY_LINE_MIN + Math.random() * (BUSBOY_LINE_MAX - BUSBOY_LINE_MIN);
  return busboy;
}

// Same routed walk as the waiter's, just against `busboy` instead.
function busboyFollowPath(dt) {
  const target = busboy.path[busboy.pathIndex];
  const dx = target.x - busboy.x;
  const dy = target.y - busboy.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1.5) {
    busboy.x = target.x;
    busboy.y = target.y;
    if (busboy.pathIndex < busboy.path.length - 1) { busboy.pathIndex++; return false; }
    busboy.moving = false;
    return true;
  }
  const step = Math.min(dist, busboy.speed * dt);
  const nx = clamp(busboy.x + (dx / dist) * step, busboy.w / 2, WORLD_W - busboy.w / 2);
  if (!collidesAt(busboy, nx, busboy.y)) busboy.x = nx;
  const ny = clamp(busboy.y + (dy / dist) * step, busboy.h / 2, WORLD_H - busboy.h / 2);
  if (!collidesAt(busboy, busboy.x, ny)) busboy.y = ny;
  busboy.flip = dx < 0;
  busboy.moving = true;
  return false;
}

// Sends him toward whichever puddle is still both present and not already
// given up on, or out the door if there's nothing left he can reach.
function busboySendToNextPuddleOrLeave() {
  const next = wetPantsPuddles.find(p => !p.unreachable);
  if (next) {
    busboy.target = next;
    busboy.path = computeCustomerPath(busboy, next, null);
    busboy.pathIndex = 0;
    busboy.travelTimer = 0;
    busboy.state = 'entering';
  } else {
    busboy.pose = null; // back to the walk cycle
    busboy.state = 'leaving';
    busboy.path = computeCustomerPath(busboy, reachablePoint(busboy, DOOR), null);
    busboy.pathIndex = 0;
    busboy.travelTimer = 0;
  }
}

function updateBusboy(dt) {
  if (!busboy) {
    if (wetPantsPuddles.some(p => !p.unreachable)) {
      busboyDispatchDelay -= dt;
      if (busboyDispatchDelay <= 0) spawnBusboy();
    } else {
      busboyDispatchDelay = BUSBOY_DISPATCH_DELAY_MIN + Math.random() * (BUSBOY_DISPATCH_DELAY_MAX - BUSBOY_DISPATCH_DELAY_MIN);
    }
    return;
  }

  if (busboy.state === 'entering') {
    busboy.travelTimer += dt;
    if (busboyFollowPath(dt)) {
      busboy.state = 'mopping';
      busboy.mopTimer = BUSBOY_MOP_TIME;
    } else if (busboy.travelTimer > BUSBOY_STUCK_TIMEOUT) {
      busboy.target.unreachable = true;
      busboySendToNextPuddleOrLeave();
    }
  } else if (busboy.state === 'mopping') {
    busboy.moving = false;
    busboy.pose = Math.floor(gameTime * 3) % 2 === 0 ? 'mop' : 'mopB';
    busboy.mopTimer -= dt;
    if (busboy.mopTimer <= 0) {
      const idx = wetPantsPuddles.indexOf(busboy.target);
      if (idx !== -1) wetPantsPuddles.splice(idx, 1);
      Sound.play('mop');
      busboySendToNextPuddleOrLeave();
    }
  } else if (busboy.state === 'leaving') {
    busboy.travelTimer += dt;
    if (busboyFollowPath(dt) || busboy.travelTimer > BUSBOY_STUCK_TIMEOUT) {
      busboy = null;
      busboyDispatchDelay = BUSBOY_DISPATCH_DELAY_MIN + Math.random() * (BUSBOY_DISPATCH_DELAY_MAX - BUSBOY_DISPATCH_DELAY_MIN);
      return;
    }
  }

  // A word to himself now and then, purely a flourish — no hook into the
  // Dialogue module, which is built around the named regulars' mood/cooldown
  // state and has nothing to do with a walk-on like this one.
  busboy.lineTimer -= dt;
  if (busboy.lineTimer <= 0 && !busboy.line) {
    busboy.line = BUSBOY_LINE_TEXT;
    busboy.lineTtl = BUSBOY_LINE_TTL;
    busboy.lineTimer = BUSBOY_LINE_MIN + Math.random() * (BUSBOY_LINE_MAX - BUSBOY_LINE_MIN);
  }
  if (busboy.line) {
    busboy.lineTtl -= dt;
    if (busboy.lineTtl <= 0) busboy.line = null;
  }
}

// ---- Alex: wanders in every so often, drops flat into a full split
// somewhere out on the floor, and holds it — a temporary wall for whoever's
// nearby. Like the waiter/busboy he's pure scenery walking a routed path;
// unlike them, while he's down he adds a real collider of his own to
// FURNITURE, so he can block the player's escape route or the hunter's
// pursuit exactly like a table would, for as long as the split lasts. `alex`
// is null whenever he isn't on the floor.
let alex = null;
const ALEX_INTERVAL_MIN = 30;
const ALEX_INTERVAL_MAX = 75;
let alexDelay = ALEX_INTERVAL_MIN + Math.random() * (ALEX_INTERVAL_MAX - ALEX_INTERVAL_MIN);
const ALEX_SPLIT_TIME = 5;
// The blocking box: wide enough to actually close a corridor, low and flat
// like a body on the floor rather than a standing character's footprint.
const ALEX_SPLIT_W = 22;
const ALEX_SPLIT_H = 7;
// A random spot on the floor has no guaranteed route the way a seat does —
// same problem the busboy has with a puddle wherever the player happened to
// be standing. Same fix: a time budget on getting there or back, so a bad
// draw abandons the attempt instead of freezing him mid-floor.
const ALEX_STUCK_TIMEOUT = 12;

// The staff pocket the bar's L wraps around — the same one the waiter works
// (see WAITER_COUNTER/pickWaiterStation). It's open floor, not a collider, so
// collidesAt alone wouldn't keep a random spot out of it; a customer would
// never end up back here, and neither should Alex. Bounded by the short
// counter's bottom edge, the stem's left edge and the foot's top edge.
const BAR_STAFF_AREA = {
  x: 0,
  y: BAR_SEGMENTS[0].collider.y + BAR_SEGMENTS[0].collider.h,
  w: BAR_SEGMENTS[1].collider.x,
  h: BAR_SEGMENTS[2].collider.y - (BAR_SEGMENTS[0].collider.y + BAR_SEGMENTS[0].collider.h),
};

// Same random-then-retry placement as spawnCigarettePack, against the split's
// own footprint rather than a customer's — and kept off the strip right in
// front of the door so he doesn't plant himself in his own entrance. Doesn't
// know a "corridor" from open floor; landing somewhere that actually pinches
// a route is just the odds of a floor this furnished.
function pickAlexSpot() {
  const dummy = { w: ALEX_SPLIT_W, h: ALEX_SPLIT_H };
  for (let i = 0; i < 30; i++) {
    const x = clamp(Math.random() * WORLD_W, dummy.w / 2 + 2, WORLD_W - dummy.w / 2 - 2);
    const y = clamp(Math.random() * WORLD_H, dummy.h / 2 + 2, WORLD_H - dummy.h / 2 - 2);
    if (y > WORLD_H - 24) continue; // clear of the doorway itself
    const box = { x: x - dummy.w / 2, y: y - dummy.h / 2, w: dummy.w, h: dummy.h };
    if (rectsOverlap(box, BAR_STAFF_AREA)) continue;
    if (!collidesAt(dummy, x, y)) return { x, y };
  }
  return null;
}

function spawnAlex() {
  const spot = pickAlexSpot();
  if (!spot) return null; // floor's too busy this attempt; try again next roll
  alex = makeEntity('alex', DOOR.x, DOOR.y);
  alex.state = 'entering';
  alex.spot = spot;
  alex.path = computeCustomerPath(DOOR, spot, null);
  alex.pathIndex = 0;
  alex.travelTimer = 0;
  alex.splitTimer = 0;
  alex.blocker = null; // the FURNITURE entry while he's down, else null
  return alex;
}

// Same routed walk as the waiter's/busboy's, just against `alex` instead.
function alexFollowPath(dt) {
  const target = alex.path[alex.pathIndex];
  const dx = target.x - alex.x;
  const dy = target.y - alex.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1.5) {
    alex.x = target.x;
    alex.y = target.y;
    if (alex.pathIndex < alex.path.length - 1) { alex.pathIndex++; return false; }
    alex.moving = false;
    return true;
  }
  const step = Math.min(dist, alex.speed * dt);
  const nx = clamp(alex.x + (dx / dist) * step, alex.w / 2, WORLD_W - alex.w / 2);
  if (!collidesAt(alex, nx, alex.y)) alex.x = nx;
  const ny = clamp(alex.y + (dy / dist) * step, alex.h / 2, WORLD_H - alex.h / 2);
  if (!collidesAt(alex, alex.x, ny)) alex.y = ny;
  alex.flip = dx < 0;
  alex.moving = true;
  return false;
}

function updateAlex(dt) {
  if (!alex) {
    alexDelay -= dt;
    if (alexDelay <= 0) {
      spawnAlex();
      alexDelay = ALEX_INTERVAL_MIN + Math.random() * (ALEX_INTERVAL_MAX - ALEX_INTERVAL_MIN);
    }
    return;
  }

  if (alex.state === 'entering') {
    alex.travelTimer += dt;
    if (alexFollowPath(dt)) {
      alex.state = 'splitting';
      alex.pose = 'split';
      alex.moving = false;
      alex.splitTimer = ALEX_SPLIT_TIME;
      // A real collider, live in FURNITURE for as long as he's down — this is
      // what actually blocks the player and the hunter, not the sprite.
      alex.blocker = {
        type: 'alex',
        sortY: alex.y,
        collider: {
          x: alex.x - ALEX_SPLIT_W / 2,
          y: alex.y - ALEX_SPLIT_H / 2,
          w: ALEX_SPLIT_W,
          h: ALEX_SPLIT_H,
        },
      };
      FURNITURE.push(alex.blocker);
      Sound.play('alexSplit');
    } else if (alex.travelTimer > ALEX_STUCK_TIMEOUT) {
      // Couldn't find his own way in — bail rather than stand there forever;
      // he'll try again on the next roll.
      alex = null;
    }
  } else if (alex.state === 'splitting') {
    alex.splitTimer -= dt;
    if (alex.splitTimer <= 0) {
      if (alex.blocker) {
        const idx = FURNITURE.indexOf(alex.blocker);
        if (idx !== -1) FURNITURE.splice(idx, 1);
        alex.blocker = null;
      }
      alex.pose = null; // back to the walk cycle
      alex.state = 'leaving';
      alex.path = computeCustomerPath(alex, reachablePoint(alex, DOOR), null);
      alex.pathIndex = 0;
      alex.travelTimer = 0;
    }
  } else if (alex.state === 'leaving') {
    alex.travelTimer += dt;
    if (alexFollowPath(dt) || alex.travelTimer > ALEX_STUCK_TIMEOUT) alex = null;
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
  jamesonTimer = 0;
  jamesonBounceTimer = 0;
  bladderLevel = 0;
  bladderUrgentTimer = 0;
  wetPantsTimer = 0;
  wetPantsPuddles.length = 0;
  cigarettePacks.length = 0;
  deliveriesSinceCigarette = 0;
  cigaretteReserve = 0;
  hunterSmokeState = null;
  hunterSmokeOutsideTimer = 0;
  hunterSmokeReturnSpot = null;
  hunterSmokeTravelTimer = 0;
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
  busboy = null;
  busboyDispatchDelay = BUSBOY_DISPATCH_DELAY_MIN + Math.random() * (BUSBOY_DISPATCH_DELAY_MAX - BUSBOY_DISPATCH_DELAY_MIN);
  // A restart mid-split would otherwise leave his blocker stuck in FURNITURE
  // forever with nothing left to clear it.
  if (alex && alex.blocker) {
    const idx = FURNITURE.indexOf(alex.blocker);
    if (idx !== -1) FURNITURE.splice(idx, 1);
  }
  alex = null;
  alexDelay = ALEX_INTERVAL_MIN + Math.random() * (ALEX_INTERVAL_MAX - ALEX_INTERVAL_MIN);
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

// The customer pushes a shot back across the table. Refresh, not stack: the
// clock restarts at full, and `hunterSlide` is dropped so the hunter re-aims
// on the next frame and turns tail immediately rather than finishing a wall
// follow it committed to while it was still the one doing the chasing.
function grantJameson(from) {
  jamesonTimer = JAMESON_DURATION;
  jamesonBounceTimer = 0;
  hunterSlide = null;
  hunterChangeTimer = 0;
  Sound.play('jameson');
  addFloatingText(from.x, from.y - from.h - 4, 'JAMESON!', PUB.amber);
  Dialogue.trigger('jameson', null);

  // Every shot tops up the bladder. Filling it is what starts the clock —
  // topping off an already-full one (another Jameson while already racing
  // for the bathroom) doesn't restart the timer, same as it doesn't for the
  // Jameson effect itself.
  if (!bladderFull()) {
    bladderLevel = Math.min(BLADDER_MAX, bladderLevel + 1);
    if (bladderFull()) {
      bladderUrgentTimer = BLADDER_TIME_LIMIT;
      Dialogue.trigger('bladderFull', null);
    }
  }
}

// A delivery that actually landed. Everything a completed order awards happens
// here and nowhere else — notably Nazim's drink count, so mashing the interact
// button can never advance his night without a trip to the bar.
function completeDelivery(target) {
  const type = target.orderType;
  target.served = true;
  target.beingCarried = false;
  player.carrying = null;
  score += POINTS_PER_DELIVERY;
  Sound.play('deliver');
  addFloatingText(target.x, target.y - target.h - 4, '+' + POINTS_PER_DELIVERY, '#3ddc61');

  // Every CIGARETTES_EVERY deliveries — walk-in or regular, one shared
  // counter — the player pockets another pack, up to the reserve cap.
  // Counted here, not in the per-type branches below, so both populations
  // feed the same clock. Held back (not reset) while the reserve is already
  // full, so the very next delivery past the cap grants one the moment a
  // dropped pack frees up a slot, instead of being silently lost.
  deliveriesSinceCigarette++;
  if (deliveriesSinceCigarette >= CIGARETTES_EVERY && cigaretteReserve < CIGARETTE_RESERVE_MAX) {
    deliveriesSinceCigarette = 0;
    cigaretteReserve++;
    addFloatingText(target.x, target.y - target.h - 12, '+1 PACK', '#c9c2b3');
  }

  // Rolled here, alongside the points, so it can only ever come from a trip
  // that actually landed — and for regulars as well as walk-ins, since a
  // grateful Nazim buying a round is the whole joke.
  if (isAlcoholicOrder(type) && Math.random() < JAMESON_CHANCE) grantJameson(target);

  if (!target.isRegular) {
    noteOrderCleared(target);
    target.sitTimer = Math.min(target.sitTimer, 3 + Math.random() * 3);
    return;
  }

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
  // C drops a held pack at the player's feet — a separate key from E/Space
  // since it isn't a grab-or-deliver action and can fire while carrying one.
  if (!e.repeat && k === 'c') dropCigarette();
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
  drop: document.getElementById('btn-drop'),
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

if (touchEl.drop) {
  touchEl.drop.addEventListener('pointerdown', (e) => {
    touchEl.drop.classList.add('active');
    if (!caught && !paused) dropCigarette();
    e.preventDefault();
  });
  const endDrop = () => touchEl.drop.classList.remove('active');
  touchEl.drop.addEventListener('pointerup', endDrop);
  touchEl.drop.addEventListener('pointercancel', endDrop);
  touchEl.drop.addEventListener('pointerleave', endDrop);
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
    // While the deer is on a Jameson the same aim is simply reversed: the
    // hunter keeps its jitter, its speed and its habits, and spends the ten
    // seconds putting the room between them.
    const toPlayer = Math.atan2(player.y - hunter.y, player.x - hunter.x);
    const baseAngle = jamesonActive() ? toPlayer + Math.PI : toPlayer;
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

  if (hunterSmokeState === 'leaving') {
    // Walking himself out the door. The catch check below stands down for
    // this whole break, so there's no risk in him crossing right past the
    // player on the way.
    hunterSmokeTravelTimer += dt;
    if (hunterFollowPath(dt) || hunterSmokeTravelTimer > HUNTER_SMOKE_STUCK_TIMEOUT) {
      // Either he actually made it, or the walk stalled (see
      // HUNTER_SMOKE_STUCK_TIMEOUT) — either way he's outside now.
      hunter.x = DOOR.x;
      hunter.y = DOOR.y;
      hunterSmokeState = 'outside';
      hunterSmokeOutsideTimer = SMOKE_BREAK_DURATION;
      hunter.moving = false;
    }
  } else if (hunterSmokeState === 'outside') {
    // Off the floor entirely — render/collision both skip him for this state
    // (see render() and the catch check below).
    hunter.moving = false;
    hunterSmokeOutsideTimer -= dt;
    if (hunterSmokeOutsideTimer <= 0) {
      hunterSmokeOutsideTimer = 0;
      hunterSmokeState = 'returning';
      hunterSmokeTravelTimer = 0;
      hunter.x = DOOR.x;
      hunter.y = DOOR.y;
      const spot = hunterSmokeReturnSpot || reachablePoint(hunter, { x: WORLD_W / 2, y: WORLD_H / 2 });
      hunter.path = computeCustomerPath(DOOR, spot, null);
      hunter.pathIndex = 0;
      Sound.play('smokeBreakEnd');
    }
  } else if (hunterSmokeState === 'returning') {
    hunterSmokeTravelTimer += dt;
    if (hunterFollowPath(dt) || hunterSmokeTravelTimer > HUNTER_SMOKE_STUCK_TIMEOUT) {
      // Same stuck fallback as above: snap him the rest of the way in rather
      // than leaving him parked at the door forever.
      const spot = hunterSmokeReturnSpot || reachablePoint(hunter, { x: WORLD_W / 2, y: WORLD_H / 2 });
      hunter.x = spot.x;
      hunter.y = spot.y;
      hunterSmokeState = null;
      hunterSmokeReturnSpot = null;
      hunterChangeTimer = 0; // back on the hunt without waiting out the timer
    }
  } else {
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
  }

  // Dropped packs: cleared out either by the hunter stepping on one, or by
  // simply running out the clock on a pack nobody found in time.
  for (let i = cigarettePacks.length - 1; i >= 0; i--) {
    const cig = cigarettePacks[i];
    if (Math.hypot(hunter.x - cig.x, hunter.y - cig.y) < CIGARETTE_PICKUP_RADIUS) {
      cigarettePacks.splice(i, 1);
      grantSmokeBreak();
      continue;
    }
    cig.ttl -= dt;
    if (cig.ttl <= 0) cigarettePacks.splice(i, 1);
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

  // Every puddle on the floor is disgusting enough to clear the room around
  // it — any walk-in still nearby (entering, waiting, or already seated)
  // bails, which is what actually costs the player customers, not just the
  // score hit from the accident itself. Regulars hold their booth regardless.
  // Puddles don't fade, so this keeps checking for the rest of the run.
  if (wetPantsPuddles.length) {
    for (const c of customers) {
      if (c.state === 'leaving') continue;
      const scared = wetPantsPuddles.some(p => Math.hypot(c.x - p.x, c.y - p.y) < WET_PANTS_SCARE_RADIUS);
      if (scared) {
        scareOffCustomer(c);
      }
    }
  }

  updateRegulars(dt);
  updateGhost(dt);
  updateWaiter(dt);
  updateBusboy(dt);
  updateAlex(dt);
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
  if (busboy) tickLegs(busboy, dt);
  if (alex) tickLegs(alex, dt);

  // The Jameson counting itself down. Sliding is dropped for its duration so
  // the wall-following that exists to close distance can't be used to keep it.
  if (jamesonBounceTimer > 0) jamesonBounceTimer -= dt;
  if (jamesonTimer > 0) {
    jamesonTimer -= dt;
    hunterSlide = null;
    if (jamesonTimer <= 0) {
      jamesonTimer = 0;
      Sound.play('jamesonEnd');
      hunterChangeTimer = 0;   // back on the hunt without waiting out the timer
    }
  }

  // The bladder, once full: reaching the bathroom clears it, running out the
  // clock doesn't. Independent of the Jameson countdown above — drinking
  // through the timer buys no extra time to get there.
  if (wetPantsTimer > 0) wetPantsTimer -= dt;
  if (bladderUrgentTimer > 0) {
    if (Math.hypot(player.x - BATHROOM.x, player.y - BATHROOM.y) < BLADDER_REACH_RADIUS) {
      bladderUrgentTimer = 0;
      bladderLevel = 0;
      Sound.play('bathroomRelief');
      addFloatingText(player.x, player.y - player.h - 4, 'RELIEF!', PUB.coolPale);
      Dialogue.trigger('bathroomRelief', null);
    } else {
      bladderUrgentTimer -= dt;
      if (bladderUrgentTimer <= 0) {
        bladderUrgentTimer = 0;
        bladderLevel = 0;
        wetPantsTimer = WET_PANTS_DURATION;
        wetPantsPuddles.push({ x: player.x, y: player.y });
        score = Math.max(0, score - WET_PANTS_PENALTY);
        Sound.play('wetPants');
        addFloatingText(player.x, player.y - player.h - 10, 'OOPS!', '#e84c3d');
        addFloatingText(player.x, player.y - player.h - 2, '-' + WET_PANTS_PENALTY, '#e84c3d');
        Dialogue.trigger('wetPants', null);
      }
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
  const touching = !hunterOnSmokeBreak() && dist < (player.w + hunter.w) / 2.4;

  // On a Jameson the collision still happens, it just runs the other way:
  // the hunter is the one shoved clear, and the player walks through.
  if (touching && jamesonActive()) {
    if (jamesonBounceTimer <= 0) {
      jamesonBounceTimer = JAMESON_BOUNCE_COOLDOWN;
      const away = dist > 0.001 ? Math.atan2(-dy, -dx) : Math.random() * Math.PI * 2;
      const knock = tryMove(hunter, Math.cos(away) * JAMESON_BOUNCE_FORCE, Math.sin(away) * JAMESON_BOUNCE_FORCE);
      hunter.x = knock.x;
      hunter.y = knock.y;
      hunterSlide = null;
      hunterChangeTimer = 0;
      Sound.play('jamesonBounce');
    }
  } else if (hitInvulnTimer <= 0 && touching) {
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
    { x: 68, w: 14, h: 6, ink: PUB.cream, paper: PUB.burgundy },
    { x: 96, w: 10, h: 7, ink: PUB.amber, paper: PUB.wallDark },
    { x: 172, w: 12, h: 6, ink: PUB.coolPale, paper: PUB.green },
  ];

  return { stains, clutter, barProps, lamps, windows, posters };
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

const WARM_RGB = [255, 186, 96];
const COOL_RGB = [120, 168, 226];
const JAMESON_RGB = [255, 214, 120];

// Rebuilt only when the viewport changes size.
let vignetteCanvas = null;
function ensureVignette() {
  if (vignetteCanvas && vignetteCanvas.width === viewW && vignetteCanvas.height === viewH) return;
  vignetteCanvas = makeVignetteCanvas(viewW, viewH, 0.42);
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
  ctx.fillStyle = '#100a14';
  ctx.fillRect(0, 0, viewW, viewH);
}

// ---- Pass 2: ground ---------------------------------------------------------
// Staggered planks as before, but on a four-step tobacco ramp with a dithered
// grain pass and the static wear marks on top.
// Painted once into the room canvas in world coordinates, so it walks the
// whole map rather than the camera's slice. The `ctx` parameter deliberately
// shadows the screen context: these two functions are only ever called against
// the offscreen room canvas.
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
    ctx.fillStyle = PUB.cool;
    for (let x = 0; x < w.w; x++) {
      for (let y = 0; y < 6; y++) {
        if (((x + y) & 1) === 0) ctx.fillRect(wx + x, top + y, 1, 1);
      }
    }
    ctx.fillStyle = PUB.coolPale;
    ctx.fillRect(wx + Math.floor(w.w / 2), top, 1, 6);
    ctx.fillRect(wx, top + 3, w.w, 1);
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

  // The bathroom: a small door set into the right wall, in the hallway gap
  // above the first table on that side. Purely a landmark for the bladder
  // mechanic (see BATHROOM in game.js) — there's no room behind it, just the
  // door and a sign, the same way the bar's back rooms are implied rather
  // than modeled.
  {
    const doorH = 20;
    const wallX = left + WORLD_W - WALL_SIDE_W;
    const dy = top + Math.round(BATHROOM.y - doorH / 2);
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(wallX - 1, dy - 1, WALL_SIDE_W + 2, doorH + 2);
    ctx.fillStyle = PUB.midnight;
    ctx.fillRect(wallX, dy, WALL_SIDE_W, doorH);
    ctx.fillStyle = PUB.wainscotLit;
    ctx.fillRect(wallX, dy, WALL_SIDE_W, 1);
    ctx.fillRect(wallX, dy + doorH - 1, WALL_SIDE_W, 1);
    ctx.fillStyle = PUB.brass;
    ctx.fillRect(wallX + 1, dy + doorH - 6, 2, 1);
    const sign = 'WC';
    fontDrawTextShadow(ctx, sign, wallX - fontTextWidth(sign) - 4, dy + doorH / 2 - 2, PUB.coolPale);
  }

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
  // The door brightens while someone is coming in or going out.
  let doorBusy = 0;
  for (const c of customers) {
    if (c.state === 'sitting') continue;
    const d = Math.hypot(c.x - DOOR.x, c.y - DOOR.y);
    if (d < 40) doorBusy = Math.max(doorBusy, 1 - d / 40);
  }
  drawGlow(glowFor(24, COOL_RGB, 0.18), DOOR.x, WORLD_H - 8, 0.55 + doorBusy * 0.8, camX, camY);

  // A pool of its own under the deer while the shot is in him: same prebaked
  // glow the lamps use, so it reads as part of the room's lighting rather
  // than an effect pasted on top. It fades out with the last two seconds.
  if (jamesonActive()) {
    const fade = clamp(jamesonTimer / 2, 0, 1);
    const pulse = prefersReducedMotion ? 0.8 : 0.66 + 0.34 * Math.abs(Math.sin(gameTime * 6));
    drawGlow(glowFor(20, JAMESON_RGB, 0.34), player.x, player.y - 3, fade * pulse, camX, camY);
  }
}

// The bladder losing its race against the clock, made unmistakable and made
// to stick: a stain left on the floor exactly where it happened. Unlike the
// sprite tint (wetPantsTimer, a few seconds) this doesn't fade — it's part
// of the room now, same as a table, until resetGame() wipes it. Drawn on the
// floor, under every character, same layer as the contact shadows in
// drawEntity.
function drawWetPantsPuddles(camX, camY) {
  if (!wetPantsPuddles.length) return;
  ctx.globalAlpha = 0.7;
  for (const p of wetPantsPuddles) {
    const x = Math.round(p.x - camX);
    const y = Math.round(p.y - camY);
    ctx.fillStyle = '#c8b45a';
    ctx.fillRect(x - 5, y - 2, 10, 4);
    ctx.fillRect(x - 3, y - 3, 6, 1);
    ctx.fillRect(x - 3, y + 2, 6, 1);
    ctx.fillStyle = '#e8d68a';
    ctx.fillRect(x - 2, y - 1, 4, 2);
  }
  ctx.globalAlpha = 1;
}

// A stray pack on the floor: white box, a torn-open red top flap, a couple of
// cigarettes poking out. Small and flat enough to sit on the same layer as
// the puddles above — under every character, not part of the y-sorted pass.
function drawCigarettePacks(camX, camY) {
  if (!cigarettePacks.length) return;
  for (const cig of cigarettePacks) {
    // Fades over its last few seconds rather than popping away, so a pack
    // nobody found doesn't just disappear out from under the player.
    ctx.globalAlpha = clamp(cig.ttl / CIGARETTE_PACK_FADE_TIME, 0, 1);
    const x = Math.round(cig.x - camX);
    const y = Math.round(cig.y - camY);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x - 3, y + 1, 6, 2);
    ctx.fillStyle = '#e8e4d8';
    ctx.fillRect(x - 3, y - 4, 6, 5);
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(x - 3, y - 4, 6, 2);
    ctx.fillStyle = '#d8d0b8';
    ctx.fillRect(x - 2, y - 6, 1, 3);
    ctx.fillRect(x, y - 7, 1, 4);
    ctx.fillStyle = '#e07850';
    ctx.fillRect(x, y - 7, 1, 1);
  }
  ctx.globalAlpha = 1;
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

  ctx.fillStyle = PUB.barFront;
  ctx.fillRect(x, y, c.w, c.h);
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
  ctx.fillStyle = PUB.barFrontLit;
  ctx.fillRect(x, y + c.h - 6, c.w, 1);
  ctx.fillStyle = PUB.amberDim;
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
  for (const seat of getTableSeats(table)) {
    const cx = Math.round(seat.x - camX - CHAIR_SIZE / 2);
    const cy = Math.round(seat.y - camY - CHAIR_SIZE / 2);
    ctx.fillStyle = PUB.tableShadow;
    ctx.fillRect(cx + 1, cy + CHAIR_SIZE - 1, CHAIR_SIZE, 2);
    ctx.fillStyle = PUB.chair;
    ctx.fillRect(cx, cy, CHAIR_SIZE, CHAIR_SIZE);
    ctx.fillStyle = PUB.chairLit;
    ctx.fillRect(cx + 1, cy + 1, CHAIR_SIZE - 2, 1);
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
  ctx.fillStyle = PUB.chair;
  ctx.fillRect(x, y, bench.w, bench.h);
  ctx.fillStyle = PUB.chairLit;
  ctx.fillRect(x + 1, y + 1, bench.w - 2, 1);
  ctx.fillStyle = PUB.tableEdge;
  ctx.fillRect(x + 1, y + bench.h - 2, bench.w - 2, 1);
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
    ctx.fillStyle = PUB.cream;
    ctx.fillRect(x - 2, y - 1, 5, 3);
    ctx.fillStyle = PUB.burgundy;
    ctx.fillRect(x - 1, y, 3, 1);
  }
}

function drawFurnitureItem(item, camX, camY) {
  if (item.type === 'wall') return; // collision-only — baked into roomCanvas by drawArchitecture
  if (item.type === 'alex') return; // collision-only — Alex himself draws in the y-sorted entity pass
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
  const nightAlpha = Math.min(0.30, 0.08 + (lvl - 1) * 0.026);
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

// The Jameson tint, or null for everyone and every other moment. The cycle
// runs on gameTime rather than a dedicated phase so it stops dead with the
// rest of the simulation during the level splash, and it steps through whole
// palettes rather than easing a colour, which is what keeps it pixel art.
// Over the last JAMESON_WARN_TIME it alternates with the ordinary palette, so
// the effect visibly runs out instead of simply stopping.
function jamesonPaletteFor(e) {
  if (e !== player) return null;
  if (wetPantsTimer > 0) return DOE_WET_PALETTE;
  if (!jamesonActive()) return null;
  if (prefersReducedMotion) return DOE_JAMESON_PALETTES[1];
  const step = Math.floor(gameTime * 9);
  if (jamesonTimer < JAMESON_WARN_TIME && step % 2 === 0) return null;
  return DOE_JAMESON_PALETTES[step % DOE_JAMESON_PALETTES.length];
}

function drawEntity(e, camX, camY) {
  const set = SPRITES[e.kind];
  // Seated regulars pick a named pose; movers use the walk cycle.
  const sprite = e.pose
    ? (set[e.pose] || set.idle)
    : set[e.moving ? (e.legFrame === 1 ? 'walk' : 'idle') : 'idle'];
  const sx = e.x - camX - sprite.w / 2 + (e.swayOffset || 0);
  const sy = e.y - camY - sprite.h;
  // A small contact shadow so nobody looks pasted onto the floor.
  ctx.fillStyle = PUB.tableShadow;
  ctx.fillRect(Math.round(e.x - camX - 4), Math.round(e.y - camY - 1), 8, 2);
  // Flicker the player after a hit so the temporary invulnerability is visible
  // as well as mechanical. Whole-frame stepping keeps the pixel-art feel.
  const flicker = e === player && hitInvulnTimer > 0 && Math.floor(hitInvulnTimer * 10) % 2 === 0;
  ctx.globalAlpha = flicker ? 0.4 : 1;
  drawSprite(sprite, jamesonPaletteFor(e) || e.palette || set.palette, sx, sy, e.flip);
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
  for (const s of w.shards) {
    ctx.globalAlpha = clamp(s.ttl / s.maxTtl, 0, 1);
    ctx.fillStyle = s.color;
    ctx.fillRect(Math.round(s.x - camX), Math.round(s.y - camY), s.size, s.size);
  }
  ctx.globalAlpha = 1;
}

function sortByY(a, b) { return a.sortY - b.sortY; }


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

const BUBBLE_FRAME_DEFAULT = '#141414';
const BUBBLE_FRAME_REGULAR = '#c98a2a';  // a named regular is waiting
const BUBBLE_FRAME_CARRIED = '#2e8b45';  // this is the order you're carrying

// `grow` (0-1) drives a three-step pop: a stub, a short frame, then the full
// bubble with its icon and patience bar. Stepping it keeps the animation on
// whole pixels instead of easing through fractional sizes.
function drawOrderBubble(worldX, headTopY, camX, camY, orderType, highlighted, patienceFraction, frameColor, grow) {
  const icon = ORDER_ICONS[orderType];
  const pad = 2;
  const bw = icon.sprite.w + pad * 2;
  const full = icon.sprite.h + pad * 2;
  const step = grow == null || grow >= 1 ? 3 : Math.max(1, Math.ceil(grow * 3));
  const bh = step === 3 ? full : (step === 2 ? full - 4 : 3);
  const sx = Math.round(worldX - camX - bw / 2);
  const sy = Math.round(headTopY - camY - bh - 4);
  const border = highlighted ? BUBBLE_FRAME_CARRIED : (frameColor || BUBBLE_FRAME_DEFAULT);

  ctx.fillStyle = border;
  ctx.fillRect(sx, sy, bw, bh);
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(sx + 1, sy + 1, bw - 2, bh - 2);
  ctx.fillStyle = border;
  ctx.fillRect(sx + bw / 2 - 2, sy + bh, 4, 2);
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(sx + bw / 2 - 1, sy + bh, 2, 1);

  if (step < 3) return;   // mid-pop: frame only, no icon and no patience bar
  drawSprite(icon.sprite, icon.palette, sx + pad, sy + pad, false);

  if (patienceFraction != null) {
    const barY = sy - 3;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(sx, barY, bw, 2);
    ctx.fillStyle = patienceBarColor(patienceFraction);
    ctx.fillRect(sx, barY, Math.round(bw * clamp(patienceFraction, 0, 1)), 2);
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
const DIALOGUE_BG = '#f3ead6';
const DIALOGUE_INK = '#241c18';

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

// The Jameson row only exists while the shot does, so the plate grows for ten
// seconds and shrinks back. measureHud is what the dialogue layout treats as
// an obstacle, so the taller plate pushes bubbles down for exactly as long.
const JAMESON_BAR_H = 3;
function jamesonRowHeight() { return jamesonActive() ? JAMESON_BAR_H + 3 : 0; }

// The bladder row exists whenever there's anything to show — filling up, or
// counting down the dash to the bathroom — same grow/shrink treatment as the
// Jameson row, and stacked below it so the plate never overlaps either.
const BLADDER_BAR_H = 3;
function bladderRowHeight() { return (bladderLevel > 0 || bladderUrgentTimer > 0) ? BLADDER_BAR_H + 3 : 0; }

// Held packs as a row of tiny icons rather than a number — one slot per
// CIGARETTE_RESERVE_MAX, lit for what's actually in reserve so the empty
// slots still read as "room for more", not just absence. Always present
// (like the life bar) rather than popping in only once the player is
// carrying one, so the row never shifts everything below it around.
const PACK_ICON_W = 6;
const PACK_ICON_H = 6;
const PACK_ICON_GAP = 2;
function packRowWidth() { return CIGARETTE_RESERVE_MAX * PACK_ICON_W + (CIGARETTE_RESERVE_MAX - 1) * PACK_ICON_GAP; }

function measureHud() {
  const text = 'LEVEL ' + getLevel() + '  SCORE ' + score;
  hudRect.w = Math.max(fontTextWidth(text) + 6, lifeBarWidth() + 6, packRowWidth() + 6);
  hudRect.h = FONT_H + LIFE_SEG_H + PACK_ICON_H + 13 + jamesonRowHeight() + bladderRowHeight();
  return hudRect;
}

// One pack icon: lit slots get the same little white-box-red-flap thumbnail
// as the one dropped on the floor (see drawCigarettePacks), just without the
// poking-out cigarettes — there isn't room at this size to read them as
// anything but noise. An empty slot is just a faint outline.
function drawPackIcon(x, y, filled) {
  if (filled) {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x - 1, y - 1, PACK_ICON_W + 2, PACK_ICON_H + 2);
    ctx.fillStyle = '#e8e4d8';
    ctx.fillRect(x, y, PACK_ICON_W, PACK_ICON_H);
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(x, y, PACK_ICON_W, 2);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x, y, PACK_ICON_W, PACK_ICON_H);
  }
}

// The busboy's occasional line. Deliberately not routed through the Dialogue
// module — that machinery (mood, per-character cooldowns, history) exists
// for the three regulars, and a walk-on with one fixed line doesn't need any
// of it. A plain box above his head, same ink/cream as a dialogue bubble so
// it still reads as speech.
function drawBusboyLine(camX, camY) {
  if (!busboy || !busboy.line) return;
  const text = busboy.line;
  const bw = fontTextWidth(text) + DIALOGUE_PAD * 2;
  const bh = FONT_H + DIALOGUE_PAD * 2;
  const bx = clamp(Math.round(busboy.x - camX - bw / 2), 2, Math.max(2, viewW - bw - 2));
  const by = Math.round(busboy.y - busboy.h - camY - bh - 4);
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = DIALOGUE_BG;
  ctx.fillRect(bx + 1, by + 1, bw - 2, bh - 2);
  fontDrawText(ctx, text, bx + DIALOGUE_PAD, by + DIALOGUE_PAD, DIALOGUE_INK);
}

function drawDialogueBubbles(camX, camY) {
  const lines = Dialogue.getActive();
  if (!lines.length) return;
  placedBubbles.length = 0;
  placedBubbles.push(measureHud());

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

    // Frame, fill, and a tail pointing back at whoever is talking.
    const accent = r.cfg.accent || '#141414';
    ctx.fillStyle = accent;
    ctx.fillRect(rect.x, rect.y, bw, bh);
    ctx.fillStyle = DIALOGUE_BG;
    ctx.fillRect(rect.x + 1, rect.y + 1, bw - 2, bh - 2);

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
  ctx.fillStyle = 'rgba(12,8,16,0.74)';
  ctx.fillRect(hud.x, hud.y, hud.w, hud.h);
  ctx.fillStyle = PUB.amberDim;
  ctx.fillRect(hud.x, hud.y, hud.w, 1);
  fontDrawText(ctx, text, 5, 5, PUB.cream);

  const barY = hud.y + FONT_H + 6;
  for (let i = 0; i < LIFE_SEGMENT_COUNT; i++) {
    const x = hud.x + 3 + i * (LIFE_SEG_W + LIFE_SEG_GAP);
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x - 1, barY - 1, LIFE_SEG_W + 2, LIFE_SEG_H + 2);
    ctx.fillStyle = PUB.burgundy;
    ctx.fillRect(x, barY, LIFE_SEG_W, LIFE_SEG_H);
    const fill = clamp(life * LIFE_SEGMENT_COUNT - i, 0, 1);
    if (fill > 0) {
      ctx.fillStyle = fill > 0.5 ? '#c74b3c' : '#e8620c';
      ctx.fillRect(x, barY, Math.ceil(LIFE_SEG_W * fill), LIFE_SEG_H);
    }
  }

  // Held cigarette packs, right under the life bar.
  const packY = barY + LIFE_SEG_H + 4;
  for (let i = 0; i < CIGARETTE_RESERVE_MAX; i++) {
    const x = hud.x + 3 + i * (PACK_ICON_W + PACK_ICON_GAP);
    drawPackIcon(x, packY, i < cigaretteReserve);
  }

  // The shot's remaining seconds: one unbroken amber bar under the life
  // segments, blinking through its last stretch alongside the sprite tint so
  // the two warnings agree.
  let rowY = packY + PACK_ICON_H + 3;
  if (jamesonActive()) {
    const jx = hud.x + 3;
    const jw = lifeBarWidth();
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(jx - 1, rowY - 1, jw + 2, JAMESON_BAR_H + 2);
    const blink = jamesonTimer < JAMESON_WARN_TIME && !prefersReducedMotion &&
      Math.floor(gameTime * 9) % 2 === 0;
    ctx.fillStyle = blink ? PUB.amberDim : PUB.amber;
    ctx.fillRect(jx, rowY, Math.ceil(jw * clamp(jamesonTimer / JAMESON_DURATION, 0, 1)), JAMESON_BAR_H);
    rowY += JAMESON_BAR_H + 3;
  }

  // The bladder: a pale blue fill while it's just topping up, then a countdown
  // once full — same bar, same slot, so the plate reads as one system rather
  // than two. Its own blink (independent of the Jameson one above) is what
  // sells "the clock is actually running out" once it's the bathroom dash.
  if (bladderLevel > 0 || bladderUrgentTimer > 0) {
    const bx = hud.x + 3;
    const bw = lifeBarWidth();
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(bx - 1, rowY - 1, bw + 2, BLADDER_BAR_H + 2);
    const urgent = bladderUrgentTimer > 0;
    const frac = urgent ? clamp(bladderUrgentTimer / BLADDER_TIME_LIMIT, 0, 1) : bladderLevel / BLADDER_MAX;
    const blink = urgent && !prefersReducedMotion && Math.floor(gameTime * 11) % 2 === 0;
    ctx.fillStyle = blink ? PUB.burgundy : (urgent ? PUB.coolPale : PUB.cool);
    ctx.fillRect(bx, rowY, Math.ceil(bw * frac), BLADDER_BAR_H);
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
  ctx.fillText('CHARBONNEAU!', viewW / 2, plateY + 15);
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
  drawWetPantsPuddles(camX, camY);
  drawCigarettePacks(camX, camY);

  // Furniture and characters share one y-sorted pass so nearer (lower) things
  // draw over farther ones. Table sortY is still the table top's own front
  // edge, not the chair-inclusive footprint, so a customer on the south chair
  // draws in front of their table (see makeTable).
  drawList.length = 0;
  drawPoolIdx = 0;
  for (const f of FURNITURE) pushDrawable(f.sortY, 'furniture', f);
  pushDrawable(player.y, 'entity', player);
  // Off the floor entirely for the "outside" leg of a smoke break — nothing
  // to draw where there's nobody standing.
  if (hunterSmokeState !== 'outside') pushDrawable(hunter.y, 'entity', hunter);
  for (const c of customers) pushDrawable(c.y, 'entity', c);
  for (const r of regulars) pushDrawable(r.y, 'entity', r);
  // Floats above the floor with no ground shadow and no collision — it should
  // read as passing through the scene, not standing in it.
  if (ghost) pushDrawable(ghost.y, 'ghost', ghost);
  // The waiter, by contrast, is on the floor like anyone else — his own pass
  // exists only so the mist can be painted over his sprite.
  if (waiter) pushDrawable(waiter.y, 'waiter', waiter);
  // The busboy needs no such extras — his pose alone (mop/mopB) carries the
  // whole effect — so he draws through the ordinary entity path.
  if (busboy) pushDrawable(busboy.y, 'entity', busboy);
  // Alex, likewise — the split pose alone carries the gag, and his actual
  // blocking collider is a separate FURNITURE entry pushed/popped in
  // updateAlex, not anything drawn here.
  if (alex) pushDrawable(alex.y, 'entity', alex);
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
  for (const c of customers) drawOrderBubbleFor(c, camX, camY, null);
  for (const r of regulars) drawOrderBubbleFor(r, camX, camY, BUBBLE_FRAME_REGULAR);
  if (player.carrying) {
    const carriedFor = player.carrying.customer;
    const carriedPatience = carriedFor ? clamp(carriedFor.sitTimer / carriedFor.patienceDuration, 0, 1) : null;
    drawOrderBubble(player.x, player.y - player.h, camX, camY, player.carrying.type, false, carriedPatience);
  }

  drawDialogueBubbles(camX, camY);
  drawBusboyLine(camX, camY);

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
  getBusboy: () => busboy,
  spawnBusboy,
  getAlex: () => alex,
  spawnAlex,
  alexSchedule: () => ({ dueIn: +alexDelay.toFixed(1) }),
  wetPantsPuddles,
  loadHighScores, saveHighScore,
  clearHighScores: () => { try { localStorage.removeItem(HIGH_SCORE_KEY); } catch {} },
  getNameEntry: () => ({ entering: enteringName, name: nameInput }),
  SPRITES, DOE_PALETTE, HUNTER_PALETTE, drawSprite, ctx, floatingTexts,
  getScore: () => score,
  getLevel,
  setScore: (v) => { score = v; },              // level is derived from score
  getLife: () => life,
  setLife: (v) => { life = clamp(v, 0, LIFE_MAX); },
  getJameson: () => ({ active: jamesonActive(), remaining: +jamesonTimer.toFixed(2) }),
  // No delivery needed: hands the shot over as if the player were standing.
  giveJameson: (seconds) => {
    grantJameson(player);
    if (seconds != null) jamesonTimer = Math.max(0, seconds);
    return jamesonTimer;
  },
  getBladder: () => ({ level: bladderLevel, max: BLADDER_MAX, urgent: +bladderUrgentTimer.toFixed(2), wet: +wetPantsTimer.toFixed(2), puddles: wetPantsPuddles.length }),
  cigarettePacks,
  dropCigarette,
  getCigaretteReserve: () => cigaretteReserve,
  fillCigaretteReserve: (n) => { cigaretteReserve = clamp(n ?? CIGARETTE_RESERVE_MAX, 0, CIGARETTE_RESERVE_MAX); return cigaretteReserve; },
  getSmokeBreak: () => ({ state: hunterSmokeState, outsideRemaining: +hunterSmokeOutsideTimer.toFixed(2) }),
  // No pack needed underfoot: hands the hunter the break directly. Still
  // walks him to and from the door like the real thing, unless `instant` skips
  // straight past both walks to just being outside.
  giveSmokeBreak: (seconds, instant) => {
    grantSmokeBreak();
    if (instant) {
      hunterSmokeState = 'outside';
      hunter.x = DOOR.x;
      hunter.y = DOOR.y;
    }
    if (seconds != null) hunterSmokeOutsideTimer = Math.max(0, seconds);
    return hunterSmokeOutsideTimer;
  },
  // Tops the bladder up without a Jameson delivery; fills it to bursting by
  // default, same as giveJameson stands in for a drink.
  fillBladder: (n) => {
    bladderLevel = clamp(n ?? BLADDER_MAX, 0, BLADDER_MAX);
    if (bladderFull() && bladderUrgentTimer <= 0) bladderUrgentTimer = BLADDER_TIME_LIMIT;
    else if (!bladderFull()) bladderUrgentTimer = 0;
    return bladderLevel;
  },
  BATHROOM,
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
