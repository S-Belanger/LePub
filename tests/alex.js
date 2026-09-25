// Deterministic scheduling, occupancy, real collision and cleanup regressions.
const assert = require('assert/strict');
const vm = require('vm');
const { createRuntime } = require('./smoke');
const { context, debug: d } = createRuntime();
let seed = 29;
context.Math = Object.assign(Object.create(Math), { random: () => {
  seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296;
} });
const run = code => vm.runInContext(code, context);
function ready() {
  d.resetGame();
  run('paused = false; gameTime = 80; shiftClock = 70; shiftStats.deliveries = 3; player.x = 145; player.y = 266; hunter.x = 145; hunter.y = 238; regenDelayTimer = 0; hitInvulnTimer = 0;');
  d.setHunterState('scanning', 100);
}
function arrive() {
  assert(d.spawnAlex(), 'Must find clear reachable split space');
  const a = d.getAlex();
  assert.equal(d.spawnAlex(), null, 'Cannot duplicate an active visitor');
  Object.assign(a, { x: 145, y: 290, path: [{ x: 145, y: 290 }], pathIndex: 0 });
  run('updateAlex(0.01)');
  assert.equal(a.state, 'preparing');
  assert.equal(a.blocker, null, 'Preparation must not block');
  return a;
}
const gates = [
  ['opening grace', 'gameTime = 20'], ['shift warmup', 'shiftClock = 5'],
  ['service progress', 'shiftStats.deliveries = 2'], ['same timed shift', 'alexLastVisitShift = shift'],
  ['closing window', 'shiftClock = SHIFT_LENGTH - 35'], ['round', 'round = { deadline: gameTime + 20, served: 0 }'],
  ['bathroom', 'bladderUrgentTimer = 40'], ['chase', "hunterState = 'chase'"],
  ['recent hit', 'regenDelayTimer = 2'], ['busy door', 'player.x = DOOR.x; player.y = DOOR.y'],
  ['pause', 'paused = true'], ['caught', 'caught = true'], ['tally', 'shiftTally = {}'],
];
for (const [label, condition] of gates) {
  ready(); assert(run('canScheduleAlex()'), 'Baseline must be eligible');
  run(condition); assert(!run('canScheduleAlex()'), label + ' must defer entry');
  run('alexDelay = 0; updateAlex(0.1)');
  assert.equal(d.getAlex(), null, label + ' must not spawn Alex');
}
ready();
const initial = d.alexSchedule();
assert(initial.dueIn >= 60 && initial.dueIn <= 90, 'Fresh run grace period');
run('alexDelay = 0; updateAlex(0.01)');
assert(d.getAlex(), 'Eligible scheduler must actually create a visitor');
run('dismissAlex()');
assert(d.alexSchedule().dueIn >= 120 && d.alexSchedule().dueIn <= 180, 'Long cooldown begins at departure');
assert.equal(d.alexSchedule().lastVisitShift, 1, 'Departure must retain visit cap');
run('alexDelay = 0; updateAlex(0.01)');
assert.equal(d.getAlex(), null, 'No second visitor in same timed shift');
run('shift = 2; shiftClock = 70; alexDelay = 0; updateAlex(0.01)');
for (let i = 0; i < 20 && !d.getAlex(); i++) run('updateAlex(10)');
assert(d.getAlex(), 'Clear shift must eventually admit a reachable visitor');
assert.equal(d.getAlex().state, 'entering', 'Later visits still perform the split');
run('dismissAlex(); shift = 6; alexLastVisitShift = 6');
assert(run('canScheduleAlex()'), 'Endless shifts use cooldown instead of permanent once-per-shift exclusion');
run('alexDelay = 120; updateAlex(119)');
assert.equal(d.getAlex(), null, 'Long cooldown cannot be bypassed');

{
  ready(); const a = arrive();
  const prep = a.prepareTimer;
  run('paused = true; updateAlex(10); paused = false');
  assert.equal(a.prepareTimer, prep, 'Pause must freeze preparation');
  d.player.x = a.x; d.player.y = a.y;
  run('updateAlex(2)');
  assert.equal(a.state, 'leaving', 'Occupied space must cancel the workout');
  assert(!run("FURNITURE.some(f => f.type === 'alex')"), 'Cancellation must not leave a blocker');

  ready(); const b = arrive();
  run('updateAlex(ALEX_PREPARE_TIME + 0.01)');
  assert.equal(b.state, 'splitting');
  assert.equal(run('poseBase(alex)'), 'split');
  assert.equal(b.blocker.collider.w, 22);
  assert.equal(b.blocker.collider.h, 7);
  const collision = run('(() => { const y = alex.blocker.collider.y - 1; player.x = alex.x; player.y = y; hunter.x = alex.x; hunter.y = y; return [tryMove(player, 0, 3).blockedY, tryMove(hunter, 0, 3).blockedY]; })()');
  assert(collision.every(Boolean), 'Workout must actually block player and hunter movement');
  d.render(); // Covers procedural split fallback without loaded atlases.
  const timer = b.activityTimer;
  run('shiftTally = {}; updateAlex(10); shiftTally = null');
  assert.equal(b.activityTimer, timer, 'Tally must freeze active workout');
  run('updateAlex(alex.activityTimer + 0.01)');
  assert.equal(b.state, 'leaving');
  assert(!run("FURNITURE.some(f => f.type === 'alex')"), 'Workout expiry removes collision');
  for (let i = 0; i < 400 && d.getAlex(); i++) run('updateAlex(0.05)');
  assert.equal(d.getAlex(), null, 'Visitor exits or times out instead of staying forever');
  assert(d.alexSchedule().dueIn >= 120, 'Departure arms full cooldown');
}
for (const interrupt of ['bladderUrgentTimer = 10', 'shiftClock = SHIFT_LENGTH - 10', 'round = { deadline: gameTime + 20 }', 'endShift()']) {
  ready(); arrive(); run('updateAlex(ALEX_PREPARE_TIME + 0.01)');
  run(interrupt + '; updateAlex(0.01)');
  assert(!run("FURNITURE.some(f => f.type === 'alex')"), 'Urgency or shift end must clear collision: ' + interrupt);
}
ready(); arrive(); run('updateAlex(ALEX_PREPARE_TIME + 0.01)'); d.resetGame();
assert.equal(d.getAlex(), null);
assert(!run("FURNITURE.some(f => f.type === 'alex')"), 'Reset removes active workout blocker');
assert.equal(d.alexSchedule().lastVisitShift, 0);
assert(d.alexSchedule().dueIn >= 60 && d.alexSchedule().dueIn <= 90);
ready();
assert(!run('alexSpotClear(DOOR.x, DOOR.y)'), 'Door must stay clear');
assert(!run('alexSpotClear(BATHROOM.x, BATHROOM.y)'), 'Bathroom must stay clear');
assert(!run('alexSpotClear(BAR_STAFF_AREA.x + 4, BAR_STAFF_AREA.y + 10)'), 'Staff pocket excluded');
assert(!run('alexSpotClear(TABLES[0].collider.x + 5, TABLES[0].collider.y + 5)'), 'Split area cannot overlap furniture');
console.log('Alex PASS: 13 schedule gates, cooldown/timed-vs-endless caps, split lifecycle, occupancy cancellation, player/hunter blocking, pause/tally/urgency/exit/reset, restricted spaces.');
