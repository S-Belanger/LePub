// Real runtime routing regressions. DOM/canvas are mocked only by the shared harness.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRuntime } = require('./smoke');
const failures = [];
function check(name, test) {
  const { context } = createRuntime();
  const run = code => vm.runInContext(code, context);
  try { test(run); console.log('PASS ' + name); }
  catch (e) { failures.push(name + ': ' + e.message); console.error('FAIL ' + name + ': ' + e.message); }
}
const wall = "FURNITURE.push({type:'routing-test',collider:{x:0,y:296,w:200,h:2}})";
const removeWall = "FURNITURE.splice(FURNITURE.findIndex(f=>f.type==='routing-test'),1)";
check('collision factory works without a browser and sees live supplied geometry', () => {
  const isolated = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/collision-routing.js'), 'utf8'), isolated);
  const furniture = [];
  const hitboxes = Object.fromEntries(['customer', 'hunter', 'busboy', 'alex', 'nick'].map(kind => [kind, { w: 14, h: 15 }]));
  const api = vm.runInContext('CollisionRouting', isolated).create({ worldW: 200, worldH: 360, furniture, hitboxes });
  const actor = { x: 125, y: 342, w: 14, h: 15 };
  assert.equal(api.computeCustomerPath(actor, { x: 125, y: 258 }).length, 1);
  furniture.push({ collider: { x: 0, y: 296, w: 200, h: 2 } });
  assert.equal(api.computeCustomerPath(actor, { x: 125, y: 258 }).length, 0);
  furniture.length = 0;
  assert.equal(api.computeCustomerPath(actor, { x: 125, y: 258 }).length, 1);
});
check('full-width wall returns no unsafe straight-line waypoint', run => {
  run(wall);
  assert.equal(run('computeCustomerPath({x:125,y:342},{x:125,y:258},TABLES[4]).length'), 0);
});
check('blocked endpoint is unreachable, including endpoint grid anchoring', run => {
  assert.equal(run('computeCustomerPath({x:125,y:342},{x:100,y:150}).length'), 0);
});
check('routing can depart exact collision contact and travel along a tangent', run => {
  run('let c=makeEntity("customer",80,150);Object.assign(c,tryMove(c,20,0));');
  assert.equal(run('collidesAt(c,c.x,c.y)'), false);
  assert(run('computeCustomerPath(c,{x:75,y:150}).length') > 0, 'must be able to move away from contact');
  assert(run('computeCustomerPath(c,{x:c.x,y:140}).length') > 0, 'must be able to move along the edge');
});

// All follower adapters must fail safely and retain their destination until the
// barrier is removed; an empty path means waiting, never successful arrival.
const followers = [
  ['customer', 'c=makeEntity("customer",125,342); c.state="entering"; c.seat={x:125,y:258,table:TABLES[4],side:"n"}; c.sitTimer=0; c.path=computeCustomerPath(c,c.seat,c.seat.table); c.pathIndex=0', 'updateCustomer(c,0.1)', 'c', 'c.state!=="entering"'],
  ['waiter', 'waiter=makeEntity("waiter",125,342); waiter.station={x:125,y:258}; waiter.state="entering"; waiter.path=computeCustomerPath(waiter,waiter.station); waiter.pathIndex=0', 'waiterFollowPath(0.1)', 'waiter', 'false'],
  ['busboy', 'busboy=makeEntity("busboy",125,342); busboy.target={x:125,y:258}; busboy.state="entering"; busboy.path=computeCustomerPath(busboy,busboy.target,null,BUSBOY_FOOTPRINT); busboy.pathIndex=0', 'busboyFollowPath(0.1)', 'busboy', 'false'],
  ['Alex', 'alex=makeEntity("alex",125,342); alex.spot={x:125,y:258}; alex.state="entering"; alex.path=computeCustomerPath(alex,alex.spot,null,ALEX_FOOTPRINT); alex.pathIndex=0', 'alexFollowPath(0.1)', 'alex', 'false'],
  ['Nick', 'nick=makeEntity("nick",125,342); nick.stop={x:125,y:258}; nick.state="entering"; nick.path=computeCustomerPath(nick,nick.stop,null,NICK_FOOTPRINT); nick.pathIndex=0', 'nickFollowPath(0.1)', 'nick', 'false'],
  ['hunter smoke', 'hunter.x=125; hunter.y=342; hunterSmokeState="returning"; hunterSmokeReturnSpot={x:125,y:258}; hunter.path=computeCustomerPath(hunter,hunterSmokeReturnSpot,null,HUNTER_FOOTPRINT); hunter.pathIndex=0', 'hunterFollowSmokePath(0.1)', 'hunter', 'false'],
  ['Nazim', 'r=regularById.get("nazim"); r.x=125;r.y=342;r.seat={x:125,y:258,table:TABLES[0],side:"s"};r.wander={path:computeCustomerPath(r,r.seat,r.seat.table),index:0,pauseTimer:0,returning:true};dynamicBlockers.push(r)', 'updateNazimWander(r,0.1)', 'r', '!r.wander'],
];
for (const [name, setup, step, entity, arrived] of followers) {
  const exclusion = name === 'customer' ? 'TABLES[4]' : name === 'Nazim' ? 'TABLES[0]' : 'null';
  const kind = name === 'Nazim' ? 'nazim' : name === 'hunter smoke' ? 'hunter' : name === 'Alex' ? 'alex' : name === 'Nick' ? 'nick' : name;
  const begin = `beginEntityRoute(${entity},{x:125,y:258},${exclusion},footprintFor(${JSON.stringify(kind)},${name === 'hunter smoke' ? 4 : 8}),${name === 'Nazim' ? 'r.wander' : 'undefined'});`;
  check(name + ' waits on failure and resumes once the obstacle is removed', run => {
    run(wall + ';let c,r;' + setup);
    // Normal production route setup is centralized and stores a destination;
    // use it after constructing the same caller state as a real visit.
    run(begin);
    for (let i = 0; i < 15; i++) {
      assert.notEqual(run(step), true, name + ' must not report arrival');
      assert.equal(run(arrived), false, name + ' must not change to arrived state');
    }
    assert.equal(run(entity + '.y'), 342, 'blocked actor stays on its side');
    run(removeWall);
    run(`for(let i=0;i<140 && ${entity}.y>259;i++) {${step};}`);
    assert(run(entity + '.y') < 259, 'actor must recover without being respawned');
  });
  check(name + ' replans a newly blocked leg without moving or false arrival', run => {
    run('let c,r;' + setup + ';' + begin);
    run(step + ';' + step);
    const before = run(entity + '.y');
    run(wall);
    for (let i = 0; i < 15; i++) {
      assert.notEqual(run(step), true, name + ' must not report arrival');
      assert.equal(run(arrived), false, name + ' must not change to arrived state');
    }
    assert.equal(run(entity + '.y'), before, 'actor stops as soon as the planned leg is blocked');
    run(removeWall);
    run(`for(let i=0;i<140 && ${entity}.y>259;i++) {${step};}`);
    assert(run(entity + '.y') < 259, 'actor resumes its retained destination');
  });
}
check('a new route-leg obstacle prevents short-distance arrival and recovers', run => {
  run('let c=makeEntity("customer",125,299);c.state="entering";c.seat={x:125,y:298,table:TABLES[4],side:"n"};c.path=computeCustomerPath(c,c.seat,c.seat.table);c.pathIndex=0;');
  // The blocker is added after route creation, within the old 1.5-unit snap.
  run("FURNITURE.push({type:'routing-test',collider:{x:0,y:297.7,w:200,h:0.1}})");
  run('updateCustomer(c,0.1)');
  assert.equal(run('c.state'), 'entering');
  assert.equal(run('c.y'), 299);
  run(removeWall);
  run('for(let i=0;i<15;i++)updateCustomer(c,0.1)');
  assert.equal(run('c.state'), 'sitting');
});
check('own-table exclusion survives interruption and replanning', run => {
  run('let c=makeEntity("customer",125,342);c.state="entering";c.seat=SEATS.find(s=>s.table===TABLES[4]&&s.side==="n");c.path=computeCustomerPath(c,c.seat,c.seat.table);c.pathIndex=0;');
  run(wall);
  run('for(let i=0;i<12;i++)updateCustomer(c,0.1)');
  assert.equal(run('c.state'), 'entering');
  run(removeWall);
  run('for(let i=0;i<240&&c.state==="entering";i++)updateCustomer(c,0.1)');
  assert.equal(run('c.state'), 'sitting');
  assert.equal(run('c.x===c.seat.x&&c.y===c.seat.y'), true);
});
check('new finite blocker produces a safe detour to the original destination', run => {
  run('let c=makeEntity("customer",125,342);c.state="entering";c.seat={x:125,y:258,table:TABLES[4],side:"n"};beginEntityRoute(c,c.seat,c.seat.table);');
  run("FURNITURE.push({type:'routing-test',collider:{x:121,y:296,w:8,h:2}})");
  let crossed = false;
  for (let tick = 0; tick < 240; tick++) {
    run('updateCustomer(c,0.05)');
    assert.equal(run('collidesAt(c,c.x,c.y,c.seat.table)'), false, 'each detour step must stay clear');
    if (run('c.x') > 133) crossed = true;
    if (run('c.state') === 'sitting') break;
  }
  assert(crossed, 'must visibly walk around the new obstacle');
  assert.equal(run('c.state'), 'sitting');
  assert.equal(run('c.x===125&&c.y===258'), true);
});
check('dynamic blocker blocks planned legs until it is removed', run => {
  run('let c=makeEntity("customer",125,305);c.state="entering";c.seat={x:125,y:290,table:TABLES[4],side:"n"};c.path=computeCustomerPath(c,c.seat,c.seat.table);c.pathIndex=0;dynamicBlockers.push({w:2000,x:125,y:298});');
  run('for(let i=0;i<12;i++)updateCustomer(c,0.1)');
  assert.equal(run('c.state'), 'entering');
  assert.equal(run('c.y'), 305);
  run('dynamicBlockers.length=0;for(let i=0;i<40&&c.state==="entering";i++)updateCustomer(c,0.1)');
  assert.equal(run('c.state'), 'sitting');
});
check('a wanderer ignores its own body while planning and replanning', run => {
  run('let r=regularById.get("nazim");r.x=125;r.y=342;dynamicBlockers.push(r);');
  assert(run('computeCustomerPath(r,{x:125,y:258},TABLES[0]).length') > 0);
  run(wall);
  assert.equal(run('computeCustomerPath(r,{x:125,y:258},TABLES[0]).length'), 0);
  run(removeWall);
  assert(run('computeCustomerPath(r,{x:125,y:258},TABLES[0]).length') > 0);
});
check('failed searches retry at most once per second rather than every frame', run => {
  run(wall + ';let c=makeEntity("customer",125,342);c.state="entering";c.seat={x:125,y:258,table:TABLES[4],side:"n"};beginEntityRoute(c,c.seat,c.seat.table);let calls=0;const originalCompute=computeCustomerPath;computeCustomerPath=(...args)=>{calls++;return originalCompute(...args)};');
  run('for(let i=0;i<200;i++)updateCustomer(c,0.01)');
  const calls = run('calls');
  assert(calls >= 1 && calls <= 3, 'expected bounded recovery attempts, got ' + calls);
});
check('hunter scanning failure waits and resumes with a bounded retry rate', run => {
  run(wall + ';hunter.x=125;hunter.y=342;hunterRouteTo({x:125,y:258});let calls=0;const originalCompute=computeCustomerPath;computeCustomerPath=(...args)=>{calls++;return originalCompute(...args)};');
  run('for(let i=0;i<200;i++){dt_=0.01;hunterFollowPath(1)}');
  assert.equal(run('hunter.y'), 342);
  assert(run('calls') <= 3, 'hunter must avoid per-frame search');
  run(removeWall);
  run('for(let i=0;i<120;i++){dt_=0.1;hunterFollowPath(1)}');
  assert(run('hunter.y') < 260);
});
check('hunter chase waits on an impossible route and retries at one second', run => {
  run(wall + ';resetGame();paused=false;hunter.x=125;hunter.y=342;player.x=125;player.y=258;setHunterState("chase");let calls=0;const originalCompute=computeCustomerPath;computeCustomerPath=(...args)=>{calls++;return originalCompute(...args)};');
  run('for(let i=0;i<200;i++){hunterLastSeenTimer=0;updateHunter(0.01)}');
  assert.equal(run('hunter.y'), 342);
  assert(run('calls') >= 1 && run('calls') <= 3);
  run(removeWall);
  run('for(let i=0;i<150;i++){hunterLastSeenTimer=0;updateHunter(0.05)}');
  assert(run('hunter.y') < 296, 'hunter crosses only after a clear route exists');
});
check('hunter approaches a player at a legal narrower-body furniture contact', run => {
  run('resetGame();paused=false;player.x=80;player.y=150;Object.assign(player,tryMove(player,20,0));hunter.x=75;hunter.y=125;setHunterState("chase");');
  assert.equal(run('player.x'), 86.6);
  assert.equal(run('collidesAt(player,player.x,player.y)'), false);
  assert.equal(run('pointBlocked(player.x,player.y,null,HUNTER_FOOTPRINT)'), true);
  assert.equal(run('computeCustomerPath(hunter,player,null,HUNTER_FOOTPRINT).length'), 0);
  run('for(let i=0;i<60;i++)updateHunter(0.05)');
  assert(run('Math.hypot(hunter.x-player.x,hunter.y-player.y)<(player.w+hunter.w)/2.4'), 'hunter must approach within normal catch distance');
  assert.equal(run('collidesAt(hunter,hunter.x,hunter.y)'), false, 'hunter body must remain outside the furniture');
});
check('a player near a dynamic-body edge can be approached without body penetration', run => {
  run('resetGame();paused=false;player.x=140;player.y=300;hunter.x=125;hunter.y=275;dynamicBlockers.push({w:14,x:148.5,y:300});setHunterState("chase");');
  assert.equal(run('collidesAt(player,player.x,player.y)'), false);
  assert.equal(run('pointBlocked(player.x,player.y,null,HUNTER_FOOTPRINT)'), true);
  run('for(let i=0;i<60;i++)updateHunter(0.05)');
  assert(run('Math.hypot(hunter.x-player.x,hunter.y-player.y)<(player.w+hunter.w)/2.4'));
  assert.equal(run('collidesAt(hunter,hunter.x,hunter.y)'), false);
});
check('reset clears active route/wander retry state', run => {
  run('grantSmokeBreak();spawnCustomer();resetGame();');
  assert.equal(run('customers.length'), 0);
  assert.equal(run('dynamicBlockers.length'), 0);
  assert.equal(run('hunter.path == null || hunter.path.length === 0'), true);
  assert.equal(run('hunter.route == null'), true);
});
check('smoke timeout cancels safely instead of arriving through a permanent wall', run => {
  run(wall + ';resetGame();paused=false;hunter.x=125;hunter.y=258;grantSmokeBreak();');
  run('for(let i=0;i<Math.ceil((HUNTER_SMOKE_STUCK_TIMEOUT+0.2)/0.1);i++)update(0.1)');
  assert.equal(run('hunterSmokeState'), null, 'failed departure cancels the smoke break');
  assert(run('hunter.y') < 296, 'must remain on the reachable side of the wall');
});
check('smoke return timeout stays at a reachable entrance instead of teleporting home', run => {
  run(wall + ';resetGame();paused=false;hunter.x=DOOR.x;hunter.y=DOOR.y;hunterSmokeState="outside";hunterSmokeOutsideTimer=0.01;hunterSmokeReturnSpot={x:125,y:258};');
  run('for(let i=0;i<Math.ceil((HUNTER_SMOKE_STUCK_TIMEOUT+0.3)/0.1);i++)update(0.1)');
  assert.equal(run('hunterSmokeState'), null);
  assert(run('hunter.y') > 305, 'must remain on the entrance side of the wall');
  assert(run('hunter.y') <= 351, 'must stand within the world bounds');
});
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log('Routing PASS: blocked paths/endpoint, all seven follower roles, recovery, own-table, dynamic bodies, bounded retries, hunter and reset.');
