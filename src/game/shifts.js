// ---- Shifts: the run is a sequence of shifts, and difficulty (more
// customers, a hungrier hunter) follows the shift number rather than the
// score, so losing tips never makes the room easier. A shift ends when its
// tips target is met or, for the first SHIFT_TIMED_COUNT shifts, when its
// clock runs out — with a last-call rush in the final seconds. Every shift
// closes on a tally board that waits for a press, which is the run's natural
// stopping point. Scaling is capped at EFFECTIVE_LEVEL_CAP so the game
// plateaus instead of becoming impossible; the shift number keeps climbing
// past that as a badge of endurance.
const EFFECTIVE_LEVEL_CAP = 10;
const SHIFT_LENGTH = 180;          // seconds, timed shifts only
const SHIFT_TIMED_COUNT = 5;       // after this, shifts end on the target alone
const LAST_CALL_TIME = 15;         // final seconds of a timed shift
const LAST_CALL_PATIENCE = 1.5;    // patience drains this much faster at last call
function shiftTarget(n) { return 100 + (n - 1) * 40; }

let shift = 1;
let shiftClock = 0;
let shiftTips = 0;
let lastCallArmed = false;
let shiftTally = null;              // the closed shift's numbers while the board is up
let bestShiftTips = 0;
const shiftStats = { deliveries: 0, forgotten: 0, clutch: 0, doubles: 0, rounds: 0, hits: 0 };

function getLevel() { return shift; }
function shiftIsTimed() { return shift <= SHIFT_TIMED_COUNT; }
function shiftTimeLeft() { return shiftIsTimed() ? Math.max(0, SHIFT_LENGTH - shiftClock) : Infinity; }
function isLastCall() { return shiftIsTimed() && shiftTimeLeft() <= LAST_CALL_TIME; }
function patienceRate() { return isLastCall() ? LAST_CALL_PATIENCE : 1; }

function resetShiftStats() {
  for (const k in shiftStats) shiftStats[k] = 0;
}

// Every tip earned or lost goes through here so the shift ledger stays true.
function earnTips(n) {
  score += n;
  shiftTips += n;
}
function loseTips(n) {
  score = Math.max(0, score - n);
  shiftTips = Math.max(0, shiftTips - n);
}
// A lost order: the penalty plus the tally line. Kept apart from loseTips so
// a penalty that isn't a customer (wet pants) doesn't count as one.
function forgetOrder() {
  loseTips(FORGOTTEN_PENALTY);
  shiftStats.forgotten++;
}

function endShift() {
  if (alex && alex.state !== 'leaving') alexLeave();
  shiftTally = {
    shift,
    tips: shiftTips,
    total: score,
    target: shiftTarget(shift),
    madeTarget: shiftTips >= shiftTarget(shift),
    stats: Object.assign({}, shiftStats),
  };
  bestShiftTips = Math.max(bestShiftTips, shiftTips);
  Sound.play('levelUp');
  clearHeldInputs();
}

function startNextShift() {
  if (!shiftTally || caught) return;
  shiftTally = null;
  shift++;
  shiftClock = 0;
  shiftTips = 0;
  lastCallArmed = false;
  resetShiftStats();
  lastTime = performance.now();
}

function updateShift(dt) {
  shiftClock += dt;
  if (shiftIsTimed() && !lastCallArmed && isLastCall()) {
    lastCallArmed = true;
    Sound.play('bell');
    Dialogue.trigger('lastCall', null);
  }
  if (shiftTips >= shiftTarget(shift) || (shiftIsTimed() && shiftTimeLeft() <= 0)) endShift();
}
