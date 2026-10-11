// Physical furniture gaps, contact, sliding and routed movement regressions.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createRuntime } = require('./smoke');
const { context } = createRuntime();
const run = code => vm.runInContext(code, context);
const failures = [];
function check(name, test) {
  try { test(); console.log('PASS ' + name); }
  catch (e) { failures.push(name + ': ' + e.message); console.error('FAIL ' + name + ': ' + e.message); }
}

// Literal probes derived from the rendered furniture, not its collider helper.
// Wide table north chairs sit at x=23.8,46.6,69.4,92.2, y=238.5.
check('walk through the empty space between wide-table chairs', () => {
  assert.equal(run('collidesAt(player, 35.2, 240)'), false);
  assert.equal(run('pointBlocked(35.2, 240)'), false);
  assert.equal(run('findBlockingObstacle({x:35.2,y:226}, {x:35.2,y:242})'), null);
  const move = run('tryMove({...player,x:35.2,y:226}, 0, 16)');
  assert(Math.abs(move.y - 242) < 1e-8);
});
check('walk between separate bar stools', () => {
  assert.equal(run('collidesAt(player, 39.125, 218)'), false);
  assert.equal(run('findBlockingObstacle({x:39.125,y:209}, {x:39.125,y:230})'), null);
});
check('chairless table edge has no invisible two-unit border', () => {
  assert.equal(run('collidesAt(player, 152, 34.5)'), false);
  assert.equal(run('collidesAt(player, 152, 36)'), true);
});
check('table tops, chairs, benches and counters remain solid', () => {
  for (const [x,y] of [[58,258],[23.8,240],[142,151],[8,43],[100,150]]) {
    assert.equal(run(`collidesAt(player, ${x}, ${y})`), true, `${x},${y}`);
  }
});
check('bar contact advances to the edge instead of rejecting the whole step', () => {
  const move = run('tryMove({...player,x:84,y:150}, 3, 0)');
  assert(Math.abs(move.x - 86.6) < 1e-8, 'expected contact x=86.6, got ' + move.x);
  assert(move.blockedX);
});
check('contact is independent of movement speed', () => {
  for (const step of [0.7, 1.5, 2.7, 20]) {
    const x = run(`(() => { const e={...player,x:80,y:150}; for(let i=0;i<50;i++) Object.assign(e,tryMove(e,${step},0)); return e.x; })()`);
    assert(Math.abs(x - 86.6) < 1e-8, `step ${step}: ${x}`);
  }
});
check('slide along a counter while maintaining exact contact', () => {
  const move = run('tryMove({...player,x:84,y:140}, 12, 12)');
  assert(Math.abs(move.x - 86.6) < 1e-8);
  assert.equal(move.y, 152);
});
check('large knockback cannot cross even a thin temporary blocker', () => {
  const move = run(`(() => { const b={type:'test',collider:{x:130,y:280,w:0.25,h:15}};
    FURNITURE.push(b); try { return tryMove({...player,x:120,y:290},40,0); }
    finally { FURNITURE.splice(FURNITURE.indexOf(b),1); } })()`);
  assert(Math.abs(move.x - 125.6) < 1e-8);
  assert(move.blockedX);
});
check('dynamic bodies block movement and self does not block', () => {
  run('dynamicBlockers.push({...player,x:140,y:300})');
  try {
    const move = run('tryMove({...player,x:120,y:300},40,0)');
    assert(Math.abs(move.x - 131.2) < 1e-8);
    assert.equal(run('collidesAt(dynamicBlockers[0],140,300)'), false);
  } finally { run('dynamicBlockers.length=0'); }
});
check('all chair gaps use the same collision geometry for routing', () => {
  const mismatches = run(`(() => { let n=0; for(let y=10;y<350;y+=2) for(let x=10;x<190;x+=2)
    if(collidesAt({w:14},x,y)!==pointBlocked(x,y)) n++; return n; })()`);
  assert.equal(mismatches, 0);
});
check('world boundary clamps survive large moves', () => {
  const move = run('tryMove({...player,x:140,y:340},100,100)');
  assert.equal(move.x, 192);
  assert.equal(move.y, 351);
});
check('a moving patron overlapping the player cannot trap escape', () => {
  run('dynamicBlockers.push({w:14,x:143,y:300})');
  try {
    assert.equal(run('tryMove({...player,x:140,y:300},-1,0).x'),139,'A step reducing overlap must be allowed');
    assert.equal(run('tryMove({...player,x:140,y:300},1,0).x'),140,'A step deeper into the patron stays blocked');
    assert.equal(run('tryMove({...player,x:140,y:300},0,-1).y'),299,'Vertical escape must work too');
  } finally {run('dynamicBlockers.length=0');}
});
check('exact chair contact is not reported as penetration', () => {
  assert.equal(run('(() => {const e={...player,x:35.2,y:226};const r=tryMove(e,5,15);return collidesAt(e,r.x,r.y);})()'),false);
});
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log('Collision PASS: furniture gaps/solids, routing agreement, exact contact, sliding, thin sweep, dynamic bodies and world bounds.');
