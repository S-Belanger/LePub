// ---- Alex: an occasional split. His short routine is a temporary obstacle,
// not damage. Fair scheduling and a preparation cue
// keep it from ambushing an occupied space. `alex` is null between visits.
let alex = null;
const ALEX_INTERVAL_MIN = 120; // Cooldown starts after he leaves, not on entry.
const ALEX_INTERVAL_MAX = 180;
const ALEX_FIRST_MIN = 60;
const ALEX_FIRST_MAX = 90;
let alexDelay = ALEX_FIRST_MIN + Math.random() * (ALEX_FIRST_MAX - ALEX_FIRST_MIN);
let alexLastVisitShift = 0;
const ALEX_SPLIT_TIME = 5;
const ALEX_PREPARE_TIME = 1.2;
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

// Workout bounds are real occupied ground, independent of sprite dimensions.
function alexArea(x, y) {
  return { x: x - ALEX_SPLIT_W / 2, y: y - ALEX_SPLIT_H / 2, w: ALEX_SPLIT_W, h: ALEX_SPLIT_H };
}

function alexPeople() {
  return [player, ...(hunterState !== 'arriving' && hunterSmokeState !== 'outside' ? [hunter] : []),
    ...customers, ...regulars, waiter, busboy].filter(Boolean);
}

function alexSpotClear(x, y) {
  const box = alexArea(x, y);
  // Unlike getFootBox, this is the full workout footprint, not a 55% body box.
  if (box.x < 2 || box.x + box.w > WORLD_W - 2 || box.y < 16 || box.y + box.h > WORLD_H - 32) return false;
  if (rectsOverlap(box, BAR_STAFF_AREA) || Math.hypot(x - BATHROOM.x, y - BATHROOM.y) < 30) return false;
  if (FURNITURE.some(f => f !== (alex && alex.blocker) && rectsOverlap(box, f.collider))) return false;
  const margin = 4;
  const space = { x: box.x - margin, y: box.y - margin, w: box.w + margin * 2, h: box.h + margin * 2 };
  return !alexPeople().some(e => rectsOverlap(space, getFootBox(e, e.x, e.y)));
}

function canScheduleAlex() {
  return !alex && !paused && !caught && !shiftTally && gameTime >= 45 && shiftClock >= 30 &&
    shiftStats.deliveries >= 3 && (!shiftIsTimed() || alexLastVisitShift !== shift) &&
    shiftTimeLeft() > 40 && !round && bladderUrgentTimer <= 0 && hunterState !== 'chase' &&
    regenDelayTimer <= 0 && !alexPeople().some(e => Math.hypot(e.x - DOOR.x, e.y - DOOR.y) < 22);
}

function alexRoute(from, to) {
  const route = computeCustomerPath(from, to, null, ALEX_FOOTPRINT);
  let cursor = from;
  for (const next of route) {
    if (findBlockingObstacle(cursor, next, null, ALEX_FOOTPRINT)) return null;
    cursor = next;
  }
  return route.length ? route : null;
}

function pickAlexSpot() {
  for (let i = 0; i < 30; i++) {
    const x = 18 + Math.random() * (WORLD_W - 36);
    const y = 24 + Math.random() * (WORLD_H - 64);
    if (!alexSpotClear(x, y)) continue;
    const path = alexRoute(DOOR, { x, y });
    if (path) return { x, y, path };
  }
  return null;
}

function spawnAlex() {
  if (alex) return null;
  const spot = pickAlexSpot();
  if (!spot) return null; // floor's too busy this attempt; try again next roll
  alex = makeEntity('alex', DOOR.x, DOOR.y);
  alex.state = 'entering';
  alex.spot = spot;
  alex.path = spot.path;
  alex.pathIndex = 0;
  alex.travelTimer = 0;
  alex.activityTimer = 0;
  alex.prepareTimer = 0;
  alex.blocker = null; // the FURNITURE entry while he's down, else null
  alexLastVisitShift = shift;
  return alex;
}

function clearAlexBlocker() {
  if (!alex || !alex.blocker) return;
  const index = FURNITURE.indexOf(alex.blocker);
  if (index !== -1) FURNITURE.splice(index, 1);
  alex.blocker = null;
}

function dismissAlex() {
  clearAlexBlocker();
  alex = null;
  alexDelay = ALEX_INTERVAL_MIN + Math.random() * (ALEX_INTERVAL_MAX - ALEX_INTERVAL_MIN);
}

function alexLeave() {
  clearAlexBlocker();
  alex.pose = null;
  alex.state = 'leaving';
  alex.path = alexRoute(alex, reachablePoint(alex, DOOR));
  alex.pathIndex = 0;
  alex.travelTimer = 0;
  if (!alex.path) dismissAlex();
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
  faceToward(alex, dx, dy);
  alex.moving = true;
  return false;
}

function updateAlex(dt) {
  if (paused || caught || shiftTally) return;
  if (!alex) {
    alexDelay = Math.max(0, alexDelay - dt);
    if (alexDelay <= 0) {
      if (canScheduleAlex()) {
        spawnAlex();
      }
      if (!alex) alexDelay = 10; // Busy moment or no reachable space: defer.
    }
    return;
  }

  if (alex.state !== 'leaving' && (isLastCall() || round || bladderUrgentTimer > 0)) {
    alexLeave();
    return;
  }

  if (alex.state === 'entering') {
    alex.travelTimer += dt;
    if (alexFollowPath(dt)) {
      if (!alexSpotClear(alex.x, alex.y)) { alexLeave(); return; }
      alex.state = 'preparing';
      alex.pose = 'idle';
      alex.facing = 'down';
      alex.moving = false;
      alex.prepareTimer = ALEX_PREPARE_TIME;
    } else if (alex.travelTimer > ALEX_STUCK_TIMEOUT) {
      dismissAlex();
    }
  } else if (alex.state === 'preparing') {
    // A person can enter the marked space during the cue. Never close on them.
    if (!alexSpotClear(alex.x, alex.y)) { alexLeave(); return; }
    alex.prepareTimer -= dt;
    if (alex.prepareTimer <= 0) {
      alex.state = 'splitting';
      alex.pose = 'split';
      alex.activityTimer = ALEX_SPLIT_TIME;
      alex.blocker = {
        type: 'alex',
        sortY: alex.y,
        collider: alexArea(alex.x, alex.y),
      };
      FURNITURE.push(alex.blocker);
      Sound.play('alexSplit');
    }
  } else if (alex.state === 'splitting') {
    alex.activityTimer -= dt;
    if (alex.activityTimer <= 0) alexLeave();
  } else if (alex.state === 'leaving') {
    alex.travelTimer += dt;
    if (alexFollowPath(dt) || alex.travelTimer > ALEX_STUCK_TIMEOUT) dismissAlex();
  }
}
