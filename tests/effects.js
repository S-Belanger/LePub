// Recent Alex trip and Nick haze: fair triggers, lock, order lifecycle/reset.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createRuntime } = require('./smoke');
const { context, debug: d } = createRuntime();
const run = code => vm.runInContext(code, context);
const failures = [];
function check(name, test) {
  try { test(); console.log('PASS '+name); }
  catch(e) { failures.push(name+': '+e.message); console.error('FAIL '+name+': '+e.message); }
}
function ready() {
  d.resetGame();
  run("paused=false; gameTime=80; shiftClock=70; shiftStats.deliveries=3; player.x=145; player.y=266; hunter.x=145; hunter.y=238; alexDelay=999; nickDelay=999;");
  d.giveSmokeBreak(1000,true);
}
function split() {
  ready();
  assert(d.spawnAlex());
  run("Object.assign(alex,{x:145,y:290,path:[{x:145,y:290}],pathIndex:0}); updateAlex(0.01); updateAlex(ALEX_PREPARE_TIME+0.01);");
  assert.equal(d.getAlex().state,'splitting');
}
check('standing still alongside Alex does not trip', () => {
  split(); run('player.x=145;player.y=284.5;player.moving=false;updateAlex(0.01)');
  assert.equal(run('fallTimer'),0);
  assert(!d.getAlex().tripped);
});
check('walking near Alex trips from all four sides using the feet', () => {
  for(const [side,x,y] of [['north',145,284.5],['south',145,302.5],['west',127.6,290],['east',162.4,290]]) {
    split(); run(`player.x=${x};player.y=${y};player.moving=true;updateAlex(0.01)`);
    assert(run('fallTimer>0'), side+' must trigger');
    assert(d.getAlex().tripped);
  }
});
check('the fall locks pickup and delivery', () => {
  ready(); d.forceRegularOrder('sam','beer-blond');
  run('player.x=35;player.y=100;fallTimer=0.9;handleInteract()');
  assert.equal(d.player.tray.length,0,'Cannot refill while fallen');
  run("const effectSam=regularById.get('sam');effectSam.beingCarried=true;player.tray.push({type:effectSam.orderType,customer:effectSam});player.x=effectSam.x;player.y=effectSam.y;handleInteract()");
  assert.equal(d.player.tray.length,1,'Cannot deliver while fallen');
  assert.equal(run('effectSam.served'),false);
});
check('the fall locks cigarette dropping', () => {
  ready(); d.fillCigaretteReserve(1);run('fallTimer=0.9');d.dropCigarette();
  assert.equal(d.getCigaretteReserve(),1);
  assert.equal(d.cigarettePacks.length,0);
});
check('trip spills the tray once but keeps orders recoverable', () => {
  split(); d.forceRegularOrder('sam','beer-blond');d.forceRegularOrder('gerald','wine');
  run("for(const id of ['sam','gerald']) {const r=regularById.get(id);r.beingCarried=true;player.tray.push({type:r.orderType,customer:r});} doubleArmed=true;player.x=145;player.y=284.5;player.moving=true;updateAlex(0.01)");
  assert.equal(d.player.tray.length,0);
  assert.equal(d.getSpills().length,2);
  assert.equal(run('doubleArmed'),false);
  assert(run("['sam','gerald'].every(id=>{const r=regularById.get(id);return !r.beingCarried&&!r.served&&!!r.orderType;})"));
  run('updateAlex(0.2)');assert.equal(d.getSpills().length,2);
  assert(Math.abs(run('fallTimer')-0.7)<1e-8,'Once per split; lock does not restart');
  d.keys.add('d'); const x=d.player.x; d.update(0.05);assert.equal(d.player.x,x);
  run('fallTimer=0;player.x=140;player.y=340');d.update(0.05);assert(d.player.x>140);
  d.resetGame();assert.equal(run('fallTimer+shakeTimer'),0);assert.equal(d.getAlex(),null);
});
check('Nick haze rises, caps, clears outside the cloud and resets', () => {
  ready();run('player.x=140;player.y=300;fartClouds.push({x:140,y:304,r:8,age:0,ttl:10});updateFartHaze(0.2)');
  assert(Math.abs(d.getFartHaze()-0.6)<1e-8);
  run('updateFartHaze(1)');assert.equal(d.getFartHaze(),1);
  run('player.x=180;updateFartHaze(3)');assert.equal(d.getFartHaze(),0);
  run('player.x=140;updateFartHaze(1);enterCellar();updateFartHaze(3)');assert.equal(d.getFartHaze(),0);
  d.resetGame();assert.equal(d.getFartHaze(),0);assert.equal(d.getFartClouds().length,0);
});
if(failures.length) { console.error(failures.join('\n'));process.exitCode=1; }
else console.log('Effects PASS: movement/feet trip triggers, full action lock, tray recovery/once/reset, haze ramp/clear/cellar/reset.');
