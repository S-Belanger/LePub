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
  busboy.path = computeCustomerPath(DOOR, reachablePoint(busboy, target), null, BUSBOY_FOOTPRINT);
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
    busboy.path = computeCustomerPath(busboy, reachablePoint(busboy, next), null, BUSBOY_FOOTPRINT);
    busboy.pathIndex = 0;
    busboy.travelTimer = 0;
    busboy.state = 'entering';
  } else {
    busboy.pose = null; // back to the walk cycle
    busboy.state = 'leaving';
    busboy.path = computeCustomerPath(busboy, reachablePoint(busboy, DOOR), null, BUSBOY_FOOTPRINT);
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
