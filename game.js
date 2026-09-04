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
// The canvas fills the browser viewport instead of sitting at a fixed 960x540.
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
  for (const px of along(seats.n, w)) out.push({ x: cx + px, y: cy - reachY, side: 'n' });
  for (const px of along(seats.s, w)) out.push({ x: cx + px, y: cy + reachY, side: 's' });
  for (const py of along(seats.w, h)) out.push({ x: cx - reachX, y: cy + py, side: 'w' });
  for (const py of along(seats.e, h)) out.push({ x: cx + reachX, y: cy + py, side: 'e' });
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

// TABLES[0] is the regulars' booth. It was two chairs down each long edge,
// which put the seats ~7px apart — fine for anonymous patrons, unreadable once
// three 14x15 named characters sit there. One chair per side spreads them out
// (Sam west, Gerald east, Nazim south facing the camera) and leaves the north
// chair for ordinary customers. Slightly larger so the three don't touch.
const TABLES = [
  makeTable(40, 45, { w: 22, h: 22, seats: { n: 1, s: 1, w: 1, e: 1 } }),   // regulars' booth
  makeTable(150, 95, { w: 20, h: 140, seats: { n: 0, s: 0, w: 4, e: 4 } }), // top-right, long
  makeTable(175, 210, { w: 16, h: 16, seats: { n: 1, s: 1, e: 0, w: 0 } }),
  makeTable(175, 254, { w: 16, h: 16, seats: { n: 1, s: 1, e: 0, w: 0 } }),
  makeTable(175, 298, { w: 16, h: 16, seats: { n: 1, s: 1, e: 0, w: 0 } }),
  makeTable(85, 270, { w: 110, h: 24, seats: { n: 4, s: 4, e: 0, w: 0 } }), // wide
  makeTable(85, 320, { w: 110, h: 24, seats: { n: 4, s: 4, e: 0, w: 0 } }), // wide
];

const FURNITURE = [...BAR_SEGMENTS, ...TABLES];

// `reserved` is set once at load for the regulars' chairs and never cleared —
// generic customers must never be seated there, restart included.
const SEATS = TABLES.flatMap(t => getTableSeats(t).map(seat => ({
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
// Seconds of un-paused play since the last restart. Used for order age and
// for animation phases, so nothing has to reach for wall-clock time.
let gameTime = 0;
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
  const freeSeat = SEATS.filter(s => !s.occupied && !s.reserved);
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
  c.orderPlacedAt = 0;
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
      if (c.orderTimer <= 0) {
        c.orderType = randomOrderType();
        c.orderPlacedAt = gameTime;
      }
    }
    c.sitTimer -= dt;
    if (c.sitTimer <= 0) {
      c.seat.occupied = false;
      if (!c.served && c.orderType) {
        score = Math.max(0, score - FORGOTTEN_PENALTY);
        addFloatingText(c.x, c.y - c.h - 4, '-' + FORGOTTEN_PENALTY, '#e84c3d');
        Dialogue.trigger('abandoned', null);
      }
      c.state = 'leaving';
    }
  }
  return null;
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
  onRegularGaveUp(r, lapsed);
}

function clearRegularOrder(r) {
  // If the player is mid-trip with this order it becomes stranded, and the
  // per-frame retarget in update() hands it to a generic customer instead.
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
  return { x: WORLD_W / 2, y: 200 }; // fallback: open floor between bar and tables
}

function resetGame() {
  gameTime = 0;
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
  // The regulars persist across restarts as characters, but every scrap of
  // their run state — orders, patience, mood, dialogue history and Nazim's
  // drink count — is wiped.
  if (!regulars.length) buildRegulars();
  else for (const r of regulars) resetRegular(r);
  Dialogue.reset();
  resetDialogueTriggers();
  if (hasPlayedBefore) Dialogue.trigger('restart', null);
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
  addFloatingText(target.x, target.y - target.h - 4, '+' + POINTS_PER_DELIVERY, '#3ddc61');

  if (!target.isRegular) {
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
      return;
    }
  }
  registerWhiff();
}

// ---- Input ----------------------------------------------------------------
const keys = new Set();

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
  if (k === 'escape') { toggleOverlay(); return; }
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

el.start.addEventListener('click', () => { el.start.blur(); setOverlay(false); });
el.help.addEventListener('click', () => { el.help.blur(); toggleOverlay(); });

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

// Mirrors `caught` into the DOM exactly once per transition.
let caughtShown = false;
function syncCaughtDom() {
  if (caught === caughtShown) return;
  caughtShown = caught;
  el.caughtActions.classList.toggle('hidden', !caught);
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

// ---- Update -----------------------------------------------------------------
function update(dt) {
  // Bubbles keep resolving after a catch — nothing else simulates — so the
  // caught screen can show the room's reaction.
  Dialogue.update(dt);
  if (caught) return;
  gameTime += dt;

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

  updateRegulars(dt);
  updateDialogueTriggers(dt, input);

  // Keep a carried order's target valid: if the customer it was picked up
  // for has given up and left (or somehow got served another way), hand it
  // off to anyone else currently waiting on the same drink instead of
  // wasting the trip. Re-checked every frame, so a match found moments
  // later (a new customer sits down wanting the same thing) still works.
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
    hasPlayedBefore = true;
    Dialogue.trigger('caught', null);
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
  const tilesX = Math.ceil(viewW / TILE) + 1;
  const tilesY = Math.ceil(viewH / TILE) + 1;

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

const BUBBLE_FRAME_DEFAULT = '#141414';
const BUBBLE_FRAME_REGULAR = '#c98a2a';  // a named regular is waiting
const BUBBLE_FRAME_CARRIED = '#2e8b45';  // this is the order you're carrying

function drawOrderBubble(worldX, headTopY, camX, camY, orderType, highlighted, patienceFraction, frameColor) {
  const icon = ORDER_ICONS[orderType];
  const pad = 2;
  const bw = icon.sprite.w + pad * 2;
  const bh = icon.sprite.h + pad * 2;
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

  drawSprite(icon.sprite, icon.palette, sx + pad, sy + pad, false);

  if (patienceFraction != null) {
    const barY = sy - 3;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(sx, barY, bw, 2);
    ctx.fillStyle = patienceBarColor(patienceFraction);
    ctx.fillRect(sx, barY, Math.round(bw * clamp(patienceFraction, 0, 1)), 2);
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

function drawDialogueBubbles(camX, camY) {
  const lines = Dialogue.getActive();
  if (!lines.length) return;
  placedBubbles.length = 0;

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
    let by = Math.round(headTop - (hasOrder ? 22 : 6) - bh);
    if (by < 2) by = Math.round(headTop - 6 - bh);
    let bx = Math.round(r.x - camX - bw / 2);
    bx = clamp(bx, 2, Math.max(2, viewW - bw - 2));

    let below = false;
    if (by < 2) {
      by = Math.round(r.y - camY + 5);
      below = true;
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

function render() {
  const cam = getCamera();
  const camX = cam.x;
  const camY = cam.y;

  ctx.clearRect(0, 0, viewW, viewH);
  drawGround(camX, camY);
  drawMapBounds(camX, camY);

  // Draw order: furniture and characters are merged and sorted by their
  // "footprint" y so nearer (lower) things draw over farther (higher) ones.
  const drawables = [
    ...FURNITURE.map(f => ({ sortY: f.sortY, draw: () => drawFurnitureItem(f, camX, camY) })),
    ...[player, hunter, ...customers, ...regulars].map(e => ({
      sortY: e.y,
      draw: () => {
        const set = SPRITES[e.kind];
        // Seated regulars pick a named pose; movers use the walk cycle.
        const sprite = e.pose
          ? (set[e.pose] || set.idle)
          : set[e.moving ? (e.legFrame === 1 ? 'walk' : 'idle') : 'idle'];
        const sx = e.x - camX - sprite.w / 2 + (e.swayOffset || 0);
        const sy = e.y - camY - sprite.h;
        drawSprite(sprite, e.palette || set.palette, sx, sy, e.flip);
      },
    })),
  ];
  drawables.sort((a, b) => a.sortY - b.sortY);
  for (const d of drawables) d.draw();

  // Order bubbles float above everything else in the scene.
  for (const c of customers) {
    if (c.state === 'sitting' && c.orderType && !c.served) {
      const patience = clamp(c.sitTimer / c.patienceDuration, 0, 1);
      drawOrderBubble(c.x, c.y - c.h, camX, camY, c.orderType, c.beingCarried, patience);
    }
  }
  for (const r of regulars) {
    if (!r.orderType || r.served) continue;
    const patience = clamp(r.sitTimer / r.patienceDuration, 0, 1);
    drawOrderBubble(r.x, r.y - r.h, camX, camY, r.orderType, r.beingCarried, patience, BUBBLE_FRAME_REGULAR);
  }
  if (player.carrying) {
    const carriedFor = player.carrying.customer;
    const carriedPatience = carriedFor ? clamp(carriedFor.sitTimer / carriedFor.patienceDuration, 0, 1) : null;
    drawOrderBubble(player.x, player.y - player.h, camX, camY, player.carrying.type, false, carriedPatience);
  }

  drawDialogueBubbles(camX, camY);

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
      const scale = Math.max(viewW / caughtImage.naturalWidth, viewH / caughtImage.naturalHeight);
      const dw = caughtImage.naturalWidth * scale;
      const dh = caughtImage.naturalHeight * scale;
      ctx.drawImage(caughtImage, (viewW - dw) / 2, (viewH - dh) / 2, dw, dh);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, viewW, viewH);
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, viewW, viewH);
    }
    ctx.fillStyle = '#e8620c';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CAUGHT!', viewW / 2, viewH / 2 - 14);

    const summary = 'LEVEL ' + getLevel() + '   SCORE ' + score;
    fontDrawTextShadow(ctx, summary, Math.round((viewW - fontTextWidth(summary)) / 2), Math.round(viewH / 2 - 4), '#f3ead6');
    const prompt = 'PRESS SPACE TO RESTART';
    fontDrawTextShadow(ctx, prompt, Math.round((viewW - fontTextWidth(prompt)) / 2), Math.round(viewH / 2 + 8), '#c9a86a');

    // Whatever the regulars said about it, attributed, under the prompt.
    const reaction = Dialogue.getActive()[0];
    if (reaction) {
      const r = regularById.get(reaction.who);
      const quip = (r ? r.name + ': ' : '') + reaction.text.toUpperCase();
      const rows = fontWrapText(quip, Math.min(180, viewW - 16));
      for (let i = 0; i < rows.length; i++) {
        fontDrawTextShadow(ctx, rows[i], Math.round((viewW - fontTextWidth(rows[i])) / 2), Math.round(viewH / 2 + 24 + i * 7), r ? r.cfg.accent : '#f3ead6');
      }
    }
  }
}

// ---- Main loop ----------------------------------------------------------------
// dt is clamped so coming back to a backgrounded tab never teleports anyone.
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
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
  handleInteract, spawnCustomer, DOOR, update, updateCustomer, keys, touchMove,
  SPRITES, DOE_PALETTE, HUNTER_PALETTE, drawSprite, ctx, floatingTexts,
  getScore: () => score,
  getLevel,
  setScore: (v) => { score = v; },              // level is derived from score
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
  forceCaught: () => { caught = true; hasPlayedBefore = true; Dialogue.trigger('caught', null); },
  triggerDialogue: (category, who) => Dialogue.trigger(category, who ? { who } : null),
  clearDialogueCooldowns: () => {
    Dialogue.clearCooldowns();
    for (const r of regulars) { r.dialogueCooldown = 0; r.recentLines.length = 0; }
  },
  dialogueStats: Dialogue.stats,
  activeDialogue: () => Dialogue.getActive().map(a => a.who + ': ' + a.text),
  DIALOGUE_LINES, DIALOGUE_EXCHANGES,
  resetGame,
};
