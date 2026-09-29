// ---- Named regulars ---------------------------------------------------------
// Nazim, Sam and Gerald are permanent fixtures of the corner booth. They are
// NOT generic customers: no entering/sitting/leaving lifecycle, no seat
// competition, and they stay for the whole run. What they *do* share is the
// order shape (`orderType`, `sitTimer`, `patienceDuration`, `served`,
// `beingCarried`, `seat`), so pickup, carrying, target highlighting, delivery
// range and scoring all reuse the existing serving code unchanged — the only
// branch is what happens *after* a successful delivery.
//
// Config lives in src/content/regulars.js; this is the runtime instance.
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

// Table chairs face the tabletop. Bench/stool groups declare their real target:
// away from a wall or toward the bar, rather than toward their layout rectangle.
function seatFacing(seat) {
  return seat.table.facing || (seat.side === 's' ? 'up' : seat.side === 'n' ? 'down' : seat.side === 'w' ? 'right' : 'left');
}

function makeRegular(cfg) {
  const seat = SEATS.find(sx => sx.reserved && sx.regularId === cfg.id);
  const r = makeEntity(cfg.spriteKey, seat.x, seat.y);
  r.facing = seatFacing(seat);
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
  r.facing = seatFacing(r.seat);
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
const NAZIM_FAST_ORDER = 0.75;
const NAZIM_TIP_MULT = 2;
const NAZIM_SPILL_CHANCE = 0.5;
const NAZIM_WATER_SOBERS = 2;    // drinks taken off by a water
const NAZIM_WANDER_INTERVAL = [12, 20];
const NAZIM_WANDER_SPEED = 14;

function nazimIsFarGone(r) { return r.id === 'nazim' && (r.stage.id === 'drunk' || r.stage.id === 'gone'); }

function regularPlaceOrder(r) {
  if (r.id === 'nazim' && r.waterOwed) {
    // Gerald's doing. It is still Nazim's order to receive. Owed until it
    // actually lands, so a water that lapses is simply asked for again.
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
  forgetOrder();
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
    r.facing = seatFacing(r.seat);
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
  faceToward(r, dx, dy);
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
  const hasPose = name => !!(set[name] || set[name + '.' + (r.facing || 'down')] ||
    Assets.frameFor(r.kind, name + '.' + (r.facing || 'down'), 0));
  const base = r.wander ? 'lean' : (vis ? vis.pose : 'idle');
  if (r.talkTimer > 0) {
    const talkKey = base === 'idle' ? 'talk' : base + 'Talk';
    if (hasPose(talkKey)) return talkKey;
    if (hasPose('talk')) return 'talk';
  }
  if (r.blinking && set.idleB && base === 'idle') return 'idleB';
  return hasPose(base) ? base : 'idle';
}

// Opens a regular's mouth for a moment. The dialogue layer drives this; a
// delivery reaction uses it directly.
function setRegularTalking(r, seconds) {
  r.talkTimer = Math.max(r.talkTimer, seconds);
}
