// The cellar berg: shelf stock, the hatch, dispenser + heat seal, the ghost's
// wind-up/lunge, the pub staying live but out of the hunter's reach, cleanup.
const assert = require('assert/strict');
const vm = require('vm');
const { createRuntime } = require('./smoke');
const { context, debug: d } = createRuntime();
let seed = 41;
context.Math = Object.assign(Object.create(Math), { random: () => {
  seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296;
} });
const run = code => vm.runInContext(code, context);

function ready() {
  d.resetGame();
  run('paused = false; gameTime = 60; shiftClock = 40;');
  d.setHunterState('scanning', 100);
}
function atHatch() { run('player.x = CELLAR_HATCH.x + CELLAR_HATCH.w / 2; player.y = CELLAR_HATCH.y + CELLAR_HATCH.h / 2;'); }
function atBottle(i) { run(`cellar.doe.x = cellar.bottles[${i}].x; cellar.doe.y = CELLAR_BENCH.y + CELLAR_BENCH.h + 10;`); }

// Layout sanity: the hatch is walkable floor, clear of every counter's
// interact margin, and every cellar spot the Doe needs is reachable.
ready();
assert(!run('collidesAt(player, CELLAR_HATCH.x + 8, CELLAR_HATCH.y + 6)'), 'Hatch must be open floor');
assert(!run('BAR_SEGMENTS.some(b => nearRect(CELLAR_HATCH.x + 8, CELLAR_HATCH.y + 5, b.collider, INTERACT_RANGE + CELLAR_HATCH_RANGE))'),
  'Hatch must not overlap a counter pickup');
assert.equal(d.getShelfStock(), 5, 'Run starts with shelf stock');

// Shelf pickups consume stock; an empty shelf refuses with a hint.
ready();
run("player.x = BAR_SEGMENTS[1].collider.x - 6; player.y = BAR_SEGMENTS[1].collider.y + 40;");
d.forceRegularOrder('sam', 'wine');
d.handleInteract();
assert.equal(d.player.tray.length, 1, 'Wine pickup works with stock');
assert.equal(d.getShelfStock(), 4, 'Shelf pickup consumes one bottle');
run('player.tray.length = 0'); d.setShelfStock(0);
d.forceRegularOrder('gerald', 'cocktail');
d.handleInteract();
assert.equal(d.player.tray.length, 0, 'Empty shelf refuses the pickup');
assert(run("floatingTexts.some(t => t.text === 'EMPTY! CELLAR')"), 'Empty shelf points at the cellar');

// Full shelf: the hatch refuses. With room: it opens.
ready(); atHatch(); d.setShelfStock(8);
d.handleInteract();
assert.equal(d.getCellar(), null, 'Full shelf keeps the hatch shut');
d.setShelfStock(1); d.handleInteract();
assert(d.getCellar(), 'Hatch opens the cellar');
run('cellar.ghostTimer = 999');   // summoned by hand below
const hatchX = d.player.x, hatchY = d.player.y;

// Upstairs stays live, the Doe stays put, the hunter can neither see nor touch.
run("hunter.x = player.x + 4; hunter.y = player.y; hunterState = 'chase'; hitInvulnTimer = 0; keys.add('d');");
const lifeBefore = d.getLife();
run('update(0.2)');
run("keys.delete('d')");
assert.equal(d.player.x, hatchX, 'Real Doe waits at the hatch');
assert.equal(d.player.y, hatchY);
assert(d.getCellar().doe.x > run('CELLAR_SPAWN.x'), 'Input drives the cellar Doe');
assert.equal(d.getLife(), lifeBefore, 'Hunter cannot hit a Doe in the cellar');
assert(!d.hunterCanSeePlayer(), 'Hunter cannot see into the cellar');

// Dispenser, then hold to heat; letting go cools it.
atBottle(0);
d.handleInteract();
assert.equal(d.getCellar().bottles[0].state, 'capped', 'A press seats the dispenser');
run("keys.add('e'); updateCellar(0.5, { x: 0, y: 0 }); keys.delete('e');");
const partial = d.getCellar().bottles[0].heat;
assert(partial > 0.2 && partial < 1, 'Holding heats');
run('updateCellar(0.5, { x: 0, y: 0 })');
assert(d.getCellar().bottles[0].heat < partial, 'Released bottle cools');
run("keys.add('e'); updateCellar(2, { x: 0, y: 0 }); keys.delete('e');");
assert.equal(d.getCellar().bottles[0].state, 'sealed', 'Enough heat seals it');
assert.equal(d.getShelfStock(), 3, 'A sealed bottle restocks the shelf');

// The ghost: wind-up locks a spot, the lunge knocks the dispenser off.
atBottle(1); d.handleInteract();
run("keys.add('e'); updateCellar(0.4, { x: 0, y: 0 }); keys.delete('e');");
const g = d.spawnCellarGhost();
run('cellar.ghost.x = cellar.doe.x + 20; cellar.ghost.y = cellar.doe.y;');
run('updateCellarGhost(0.01)');
assert.equal(g.state, 'windup', 'Ghost winds up inside strike range');
run("keys.add('e'); for (let i = 0; i < 60 && cellar.ghost.state !== 'recover'; i++) updateCellar(0.02, { x: 0, y: 0 }); keys.delete('e');");
assert.equal(d.getCellar().hits, 1, 'Standing still in the lunge gets you hit');
assert.equal(d.getCellar().bottles[1].state, 'bare', 'A hit knocks the dispenser off');
assert.equal(d.getCellar().bottles[1].heat, 0);
assert.equal(d.getLife(), lifeBefore, 'The ghost never costs life');

// Dodging: move off the locked spot during the wind-up and the lunge misses.
run('cellar.stun = 0; cellar.ghost.state = "drift"; cellar.doe.x = 88; cellar.doe.y = 100; cellar.ghost.x = 88 + 25; cellar.ghost.y = 100;');
run('updateCellarGhost(0.01)');
assert.equal(g.state, 'windup');
run("for (let i = 0; i < 60 && cellar.ghost.state !== 'recover'; i++) updateCellar(0.02, { x: -1, y: 0 });");
assert.equal(d.getCellar().hits, 1, 'Moving during the wind-up dodges the lunge');

// Up the stairs: back on the floor with a grace window.
run('cellar.stun = 0; cellar.doe.x = CELLAR_SPAWN.x; cellar.doe.y = CELLAR_SPAWN.y;');
d.handleInteract();
assert.equal(d.getCellar(), null, 'Stairs lead back up');
assert(run('hitInvulnTimer') > 0, 'Coming up grants a grace window');
d.render();

// Clean berg pays; the shift ending downstairs brings the Doe up; reset clears.
ready(); atHatch(); d.setShelfStock(0); d.handleInteract();
run('cellar.ghostTimer = 999');
const tipsBefore = d.getScore();
for (let i = 0; i < 3; i++) { atBottle(i); d.handleInteract(); run("keys.add('e'); updateCellar(2, { x: 0, y: 0 }); keys.delete('e');"); }
assert.equal(d.getShelfStock(), 6, 'Three bottles restock six pours');
assert.equal(d.getScore(), tipsBefore + run('CELLAR_BERG_BONUS'), 'All three without a hit pays the bonus');
d.render();
d.endShift();
assert.equal(d.getCellar(), null, 'Shift end brings the Doe up');
d.startNextShift();
atHatch(); d.setShelfStock(0); d.handleInteract();
assert(d.getCellar());
d.resetGame();
assert.equal(d.getCellar(), null, 'Reset clears the cellar');
assert.equal(d.getShelfStock(), 5, 'Reset restocks the shelf');
console.log('Cellar PASS: stock/empty shelf, hatch gating, live pub out of hunter reach, dispenser + heat/cool/seal, ghost wind-up hit and dodge, exit grace, clean-berg bonus, shift end and reset.');
