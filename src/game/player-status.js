// ---- Life: instead of an instant game-over, getting caught costs a third of
// a continuous life bar (1 = full). A brief invulnerability window after a hit
// stops the same touch from draining multiple thirds in one frame, and life
// slowly regenerates once a few seconds pass without being caught again.
// `caught` still means "game over" — it only flips true once life hits 0.
let life = 1;
const LIFE_MAX = 1;
// A hit lands with a beat: the whole floor holds for a few frames and the
// pint that just went shakes on the sign.
const HIT_STOP = 0.08;
const PINT_KNOCK_TIME = 0.5;
let hitStopTimer = 0;
let pintKnockTimer = 0;
let pintKnockIndex = -1;
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
// Safety net for a route blocked by a new obstacle after planning. Smoke
// paths use the hunter's own footprint; only sustained lack of movement
// consumes this timeout, so a long successful walk is never cut short.
const HUNTER_SMOKE_STUCK_TIMEOUT = 6;
let hunterSmokeTravelTimer = 0;
function hunterOnSmokeBreak() { return hunterSmokeState !== null; }

// Drops one held pack at the player's feet. No-op with nothing in reserve.
function dropCigarette() {
  if (caught || paused || shiftTally || cigaretteReserve <= 0) return;
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
  clearHunterOrder();
  dropFromTray(hunter);
  setHunterState('scanning');
  hunterAlert = null;
  hunterSlide = null;
  hunterRubTimer = 0;
  hunterSmokeTravelTimer = 0;
  hunterSmokeReturnSpot = { x: hunter.x, y: hunter.y };
  hunter.path = computeCustomerPath(hunter, reachablePoint(hunter, DOOR), null, HUNTER_FOOTPRINT);
  hunter.pathIndex = 0;
  Sound.play('smokeBreak');
  addFloatingText(hunter.x, hunter.y - hunter.h - 4, 'SMOKE BREAK', '#c9c2b3');
}

// Same routed walk as the waiter's/busboy's, just against `hunter` instead —
// used for both legs of the smoke break (see grantSmokeBreak/update).
function hunterFollowSmokePath(dt) {
  const target = hunter.path[hunter.pathIndex];
  if (!target) return true;
  const oldX = hunter.x, oldY = hunter.y;
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
  faceToward(hunter, dx, dy);
  if (Math.hypot(hunter.x - oldX, hunter.y - oldY) > 0.01) hunterSmokeTravelTimer = 0;
  hunter.moving = true;
  return false;
}
