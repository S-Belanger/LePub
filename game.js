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
  const pad = CHAIR_GAP + CHAIR_SIZE;
  return {
    type: 'table',
    x: cx,
    y: cy,
    w,
    h,
    seats,
    // Sort by the table top's own front edge, not the wider chair footprint —
    // a customer seated south is standing at the table's edge and should
    // draw in front of it, not behind.
    sortY: cy + h / 2,
    collider: {
      x: cx - (w / 2 + pad),
      y: cy - (h / 2 + pad),
      w: w + 2 * pad,
      h: h + 2 * pad,
    },
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
const BAR_SEGMENTS = [
  { x: 10, y: 78, w: 56, h: 18 },   // short counter, upper-left
  { x: 70, y: 104, w: 20, h: 126 }, // vertical stem
  { x: 10, y: 212, w: 80, h: 18 },  // foot, meets the stem, touches the wall
].map(r => ({
  type: 'bar',
  collider: r,
  sortY: r.y + r.h,
}));

const TABLES = [
  makeTable(40, 45, { w: 18, h: 20, seats: { n: 0, s: 0, w: 2, e: 2 } }),   // top-left
  makeTable(150, 95, { w: 20, h: 140, seats: { n: 0, s: 0, w: 4, e: 4 } }), // top-right, long
  makeTable(175, 210, { w: 16, h: 16, seats: { n: 1, s: 1, e: 0, w: 0 } }),
  makeTable(175, 254, { w: 16, h: 16, seats: { n: 1, s: 1, e: 0, w: 0 } }),
  makeTable(175, 298, { w: 16, h: 16, seats: { n: 1, s: 1, e: 0, w: 0 } }),
  makeTable(85, 270, { w: 110, h: 24, seats: { n: 4, s: 4, e: 0, w: 0 } }), // wide
  makeTable(85, 320, { w: 110, h: 24, seats: { n: 4, s: 4, e: 0, w: 0 } }), // wide
];

const FURNITURE = [...BAR_SEGMENTS, ...TABLES];

const SEATS = TABLES.flatMap(t => getTableSeats(t).map(seat => ({ ...seat, table: t, occupied: false })));

// Customers walk in from this point at the bottom wall.
const DOOR = { x: WORLD_W / 2, y: WORLD_H - 3 };

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
  k: '#f0c090', // skin
  g: '#141414', // glasses
  e: '#5a4030', // beard
  d: '#6b4a30', // onesie
  c: '#e8ddc0', // chest patch
  s: '#2a2018', // feet
};

const DOE_IDLE = buildSprite([
  R('.', 5, 'n', 1, '.', 4, 'n', 1, '.', 5), // antler tips (taller rack)
  R('.', 5, 'n', 1, '.', 4, 'n', 1, '.', 5), // antler base
  R('.', 3, 'f', 2, '.', 6, 'f', 2, '.', 3),
  R('.', 4, 'h', 8, '.', 4),
  R('.', 3, 'h', 1, 'k', 8, 'h', 1, '.', 3),
  R('.', 4, 'g', 3, 'k', 2, 'g', 3, '.', 4), // round lenses + skin bridge, not a bar
  R('.', 4, 'k', 8, '.', 4),
  R('.', 4, 'e', 8, '.', 4),
  R('.', 5, 'e', 6, '.', 5),
  R('.', 2, 'd', 4, 'c', 4, 'd', 4, '.', 2),
  R('.', 1, 'd', 4, 'c', 6, 'd', 4, '.', 1),
  R('.', 1, 'd', 5, 'c', 4, 'd', 5, '.', 1),
  R('.', 2, 'd', 12, '.', 2),
  R('.', 3, 'd', 10, '.', 3),
  R('.', 4, 'd', 3, '.', 2, 'd', 3, '.', 4),
  R('.', 4, 'd', 3, '.', 2, 'd', 3, '.', 4),
  R('.', 4, 'd', 3, '.', 2, 'd', 3, '.', 4),
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
  o: '#5c5a3e', // fedora crown
  r: '#454330', // fedora brim
  k: '#f0c090', // skin
  g: '#141414', // glasses
  w: '#e8e4d8', // collar
  f: '#8a2020', // flannel red
  x: '#1c1c1c', // flannel black check
  p: '#4a4630', // pants
  s: '#1a1512', // shoes
  u: '#3a2f22', // shotgun
};

const HUNTER_IDLE = buildSprite([
  R('.', 4, 'o', 8, '.', 4),
  R('.', 2, 'r', 12, '.', 2),
  R('.', 4, 'o', 8, '.', 4),
  R('.', 4, 'k', 8, '.', 4),
  R('.', 4, 'g', 3, 'k', 2, 'g', 3, '.', 4), // round lenses + skin bridge, not a bar
  R('.', 4, 'k', 8, '.', 4),
  R('.', 4, 'w', 8, '.', 4),
  // Buffalo-check plaid runs the full torso (not just the shoulders), two
  // alternating 2x2 blocks per row so it reads as a checked flannel.
  R('.', 2, 'w', 2, 'f', 2, 'x', 2, 'f', 2, 'x', 2, 'w', 2, '.', 2, 'u', 5),
  R('.', 2, 'w', 2, 'x', 2, 'f', 2, 'x', 2, 'f', 2, 'w', 2, '.', 2, 'u', 5),
  R('.', 2, 'w', 2, 'f', 2, 'x', 2, 'f', 2, 'x', 2, 'w', 2, '.', 2),
  R('.', 2, 'x', 10, '.', 2),
  R('.', 3, 'x', 10, '.', 3),
  R('.', 3, 'p', 10, '.', 3),
  R('.', 4, 'p', 8, '.', 4),
  R('.', 4, 'p', 2, '.', 2, 'p', 2, '.', 4),
  R('.', 4, 'p', 2, '.', 2, 'p', 2, '.', 4),
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
  R('.', 5, 'h', 4, '.', 5),
  R('.', 4, 'h', 6, '.', 4),
  R('.', 3, 'h', 1, 'k', 6, 'h', 1, '.', 3),
  R('.', 4, 'k', 6, '.', 4),
  R('.', 4, 'm', 6, '.', 4),
  R('.', 3, 'm', 8, '.', 3),
  R('.', 2, 'm', 10, '.', 2),
  R('.', 2, 'm', 10, '.', 2),
  R('.', 3, 'm', 8, '.', 3),
  R('.', 3, 'p', 8, '.', 3),
  R('.', 4, 'p', 2, '.', 2, 'p', 2, '.', 4),
  R('.', 4, 'p', 2, '.', 2, 'p', 2, '.', 4),
  R('.', 3, 's', 3, '.', 2, 's', 3, '.', 3),
]);

const CUSTOMER_WALK = buildSprite([
  ...CUSTOMER_IDLE.rows.slice(0, 10),
  R('.', 3, 'p', 2, '.', 4, 'p', 2, '.', 3),
  R('.', 2, 'p', 2, '.', 6, 'p', 2, '.', 2),
  R('.', 1, 's', 3, '.', 8, 's', 3, '.', 1),
]);

const CUSTOMER_SHIRT_COLORS = ['#4a6fa5', '#8a4a9e', '#4a9e6a', '#c9a227', '#c9622f', '#5a7d8a'];

function makeCustomerPalette() {
  return {
    '.': null,
    h: '#3a2a1a',
    k: '#f0c090',
    m: CUSTOMER_SHIRT_COLORS[Math.floor(Math.random() * CUSTOMER_SHIRT_COLORS.length)],
    p: '#2a2418',
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

const SPRITES = {
  hunter: { idle: HUNTER_IDLE, walk: HUNTER_WALK, palette: HUNTER_PALETTE },
  doe: { idle: DOE_IDLE, walk: DOE_WALK, palette: DOE_PALETTE },
  customer: { idle: CUSTOMER_IDLE, walk: CUSTOMER_WALK, palette: null },
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
  const h = 7;
  return { x: x - w / 2, y: y - h, w, h };
}

function collidesAt(e, x, y) {
  const box = getFootBox(e, x, y);
  for (const f of FURNITURE) {
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

// ---- Entities -----------------------------------------------------------
function makeEntity(kind, x, y) {
  const s = SPRITES[kind];
  return {
    kind,
    x, y,
    w: s.idle.w,
    h: s.idle.h,
    speed: kind === 'doe' ? 62 : kind === 'customer' ? 38 : 54,
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

// ---- Levels: every LEVEL_UP_SCORE points ramps up difficulty (more
// customers, a hungrier hunter). Level is derived from score rather than
// tracked separately, so a restart resets it for free. Scaling is capped at
// EFFECTIVE_LEVEL_CAP so the game plateaus instead of becoming impossible —
// the displayed level keeps climbing past that as a badge of endurance.
const LEVEL_UP_SCORE = 100;
const EFFECTIVE_LEVEL_CAP = 10;
function getLevel() { return Math.floor(score / LEVEL_UP_SCORE) + 1; }

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
  c.sitTimer = 0;
  c.orderType = null;
  c.orderTimer = 0;
  c.served = false;
  c.beingCarried = false;
  customers.push(c);
}

function updateCustomer(c, dt) {
  if (c.state === 'entering' || c.state === 'leaving') {
    const target = c.state === 'entering' ? c.seat : DOOR;
    const dx = target.x - c.x;
    const dy = target.y - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1.5) {
      c.x = target.x;
      c.y = target.y;
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
      c.x += (dx / dist) * step;
      c.y += (dy / dist) * step;
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
    }
  }
  return null;
}

function pickClearSpawn(e) {
  for (let i = 0; i < 30; i++) {
    const x = clamp(WORLD_W / 2 + (Math.random() < 0.5 ? 1 : -1) * Math.random() * WORLD_W * 0.4, e.w / 2, WORLD_W - e.w / 2);
    const y = clamp(WORLD_H / 2 + (Math.random() < 0.5 ? 1 : -1) * Math.random() * WORLD_H * 0.4, e.h / 2, WORLD_H - e.h / 2);
    if (!collidesAt(e, x, y)) return { x, y };
  }
  return { x: WORLD_W / 2, y: 200 }; // fallback: open floor between bar and tables
}

function resetGame() {
  player.x = WORLD_W / 2;
  player.y = WORLD_H / 2;
  const spawn = pickClearSpawn(hunter);
  hunter.x = spawn.x;
  hunter.y = spawn.y;
  hunterDir = { x: 0, y: 0 };
  hunterChangeTimer = 0;
  caught = false;
  score = 0;
  customers.length = 0;
  for (const seat of SEATS) seat.occupied = false;
  customerSpawnTimer = 3;
  player.carrying = null;
  floatingTexts.length = 0;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ---- Serving: 'E' grabs the oldest waiting order from the bar, or (while
// already carrying one) delivers it if standing next to its customer. ------
const INTERACT_RANGE = 14;

function nearRect(x, y, rect, margin) {
  return x > rect.x - margin && x < rect.x + rect.w + margin &&
    y > rect.y - margin && y < rect.y + rect.h + margin;
}

function handleInteract() {
  if (caught) return;

  if (player.carrying) {
    // player.carrying.customer is kept valid (or reassigned to someone else
    // waiting on the same drink) by the per-frame check in update(); it can
    // still be null here if nobody currently wants this order.
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
  if (caught && e.key === ' ') resetGame();
  if (!e.repeat && e.key.toLowerCase() === 'e') handleInteract();
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
  hunter.speed = Math.min(60, 54 + hunterLvl * 1.5);

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

  // Keep a carried order's target valid: if the customer it was picked up
  // for has given up and left (or somehow got served another way), hand it
  // off to anyone else currently waiting on the same drink instead of
  // wasting the trip. Re-checked every frame, so a match found moments
  // later (a new customer sits down wanting the same thing) still works.
  if (player.carrying) {
    const target = player.carrying.customer;
    if (!target || target.state !== 'sitting' || target.served) {
      const replacement = customers.find(c =>
        c.state === 'sitting' && !c.served && !c.beingCarried && c.orderType === player.carrying.type
      );
      player.carrying.customer = replacement || null;
      if (replacement) replacement.beingCarried = true;
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

  // Catch detection.
  const dx = player.x - hunter.x;
  const dy = player.y - hunter.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < (player.w + hunter.w) / 2.4) {
    caught = true;
  }
}

// ---- Render -----------------------------------------------------------------
// Hardwood floor: planks PLANK_TILES wide, staggered brick-style every other
// row, each plank getting one of a few warm wood shades (stable per-plank,
// not per-tile, so a plank reads as a single board) plus a subtle seam line
// at each plank edge and row line for grain definition.
const PLANK_TILES = 4;
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

      const rowShift = worldTileY % 2 === 0 ? 0 : Math.floor(PLANK_TILES / 2);
      const plankCol = worldTileX + rowShift;
      const plankIndex = Math.floor(plankCol / PLANK_TILES);
      const shadeIdx = Math.abs((plankIndex * 928371 + worldTileY * 6151)) % WOOD_SHADES.length;

      const sx = worldTileX * TILE - camX;
      const sy = worldTileY * TILE - camY;
      ctx.fillStyle = WOOD_SHADES[shadeIdx];
      ctx.fillRect(Math.round(sx), Math.round(sy), TILE, TILE);

      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(Math.round(sx), Math.round(sy), TILE, 1); // row grain line
      if (plankCol % PLANK_TILES === 0) ctx.fillRect(Math.round(sx), Math.round(sy), 1, TILE); // plank seam
    }
  }
}

// A bar segment is just a wood counter rect with a lighter top edge and a
// darker front trim — no fixed "behind" side, since segments can run in any
// direction to form an L, so every segment gets the same simple treatment.
function drawBar(bar, camX, camY) {
  const c = bar.collider;
  ctx.fillStyle = '#7a4a2a';
  ctx.fillRect(Math.round(c.x - camX), Math.round(c.y - camY), c.w, c.h);
  ctx.fillStyle = '#9a6a3a';
  ctx.fillRect(Math.round(c.x - camX), Math.round(c.y - camY), c.w, 2);
  ctx.fillStyle = '#4a2c14';
  ctx.fillRect(Math.round(c.x - camX), Math.round(c.y - camY + c.h - 3), c.w, 3);
}

function drawTable(table, camX, camY) {
  const sx = table.x - camX;
  const sy = table.y - camY;
  const halfW = table.w / 2;
  const halfH = table.h / 2;

  ctx.fillStyle = '#4a3222';
  for (const seat of getTableSeats(table)) {
    ctx.fillRect(
      Math.round(seat.x - camX - CHAIR_SIZE / 2),
      Math.round(seat.y - camY - CHAIR_SIZE / 2),
      CHAIR_SIZE, CHAIR_SIZE
    );
  }

  ctx.fillStyle = '#5a3418';
  ctx.fillRect(Math.round(sx - halfW), Math.round(sy - halfH), table.w, table.h);
  ctx.fillStyle = '#8a5a34';
  ctx.fillRect(Math.round(sx - halfW + 2), Math.round(sy - halfH + 2), table.w - 4, table.h - 4);
}

function drawFurnitureItem(item, camX, camY) {
  if (item.type === 'bar') drawBar(item, camX, camY);
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

function render() {
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
        drawSprite(sprite, e.palette || set.palette, sx, sy, e.flip);
      },
    })),
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
    ctx.fillText('press SPACE to restart', INTERNAL_W / 2, INTERNAL_H / 2 + 10);
  }
}

// ---- Main loop ----------------------------------------------------------------
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

resetGame();
requestAnimationFrame(loop);

window.__debug = {
  player, hunter, customers, SEATS, TABLES, BAR_SEGMENTS, handleInteract, spawnCustomer, DOOR, update, updateCustomer, keys,
  SPRITES, DOE_PALETTE, HUNTER_PALETTE, drawSprite, ctx, floatingTexts,
  getScore: () => score,
  getLevel,
  setScore: (v) => { score = v; },
};
