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
