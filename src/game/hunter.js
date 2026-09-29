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

const HUNTER_WAYPOINT_OVERSHOOT = 10;

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
  react(hunter, 'spotted');
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
  faceToward(hunter, dx, dy);
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
    const wx = wp.x - hunter.x;
    const wy = wp.y - hunter.y;
    const wd = Math.hypot(wx, wy);
    // Reached it, or ran a little past it on the last leg (it now lies behind
    // his heading): aiming back at it would turn him round on the spot.
    const overshot = wd < HUNTER_WAYPOINT_OVERSHOOT && wx * hunterDir.x + wy * hunterDir.y < 0;
    if (wd < 3 || overshot) hunterPathIndex++;
    if (hunterPathIndex < hunterPath.length) aimAt = hunterPath[hunterPathIndex];
  }
  if (Math.random() < pauseChance) {
    hunterDir = { x: 0, y: 0 };
  } else {
    // Half the old jitter when following a route: the waypoints already
    // carry the "not quite straight" feel, and too much slop walks him into
    // the very corner the route was going round.
    const jitterMax = Math.max(Math.PI / 24, Math.PI / 6 - lvl * (Math.PI / 72));
    const baseAngle = jamesonActive()
      ? Math.atan2(hunter.y - player.y, hunter.x - player.x)
      : Math.atan2(aimAt.y - hunter.y, aimAt.x - hunter.x);
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
        hunter.facing = hunter.flip ? 'left' : 'right';
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
      // Fleeing a Jameson he faces away from her by design, so the sight cone
      // would lose her mid-retreat; he knows exactly who he's running from.
      if (jamesonActive() || hunterCanSeePlayer(hunterSightRange() * 1.5)) hunterLastSeenTimer = 0;
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
      faceToward(hunter, hunterDir.x, hunterDir.y);

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
