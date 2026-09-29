// ---- Entities -----------------------------------------------------------
function makeEntity(kind, x, y) {
  const s = SPRITES[kind];
  const hitbox = ENTITY_HITBOXES[kind] || { w: spriteVisualW(s.idle), h: spriteVisualH(s.idle) };
  return {
    kind,
    x, y,
    w: hitbox.w,
    h: hitbox.h,
    speed: kind === 'doe' ? 62 : kind === 'customer' ? 38 : kind === 'ghost' ? 16 : kind === 'waiter' ? 46 : kind === 'busboy' ? 40 : kind === 'alex' ? 58 : 54,
    flip: false,
    facing: 'down',   // down | up | right | left — visual only, from movement
    legTimer: 0,
    legFrame: 0,
    moving: false,
    palette: null,
  };
}

// Visual facing from a movement vector: the dominant axis wins, a small
// dead-zone stops diagonal flicker, and standing still keeps the last facing.
// This never touches the movement vector itself.
function faceToward(e, dx, dy) {
  const ax = Math.abs(dx), ay = Math.abs(dy);
  if (ax < 0.01 && ay < 0.01) return;
  if (ax > ay * 1.15) e.facing = dx > 0 ? 'right' : 'left';
  else if (ay > ax * 1.15) e.facing = dy > 0 ? 'down' : 'up';
  // Near-diagonal: keep whatever it was.
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

// Optional raster atlases (src/engine/assets.js). Loaded once at startup from the
// manifest next to the sheets; anything missing or invalid leaves that family
// on its procedural sprites. No fetch in a test runtime means nothing loads.
if (typeof fetch === 'function' && typeof Image === 'function') {
  Assets.configure(Assets.browserIO());
  Assets.loadManifest('assets/sprites/manifest.json');
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
