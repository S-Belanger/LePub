// Repeatable fixtures against the actual game, shared by Edge regression and
// the playable review page. No game rules or input handlers are substituted.
(function (root) {
  'use strict';
  function create(win) {
    const run = code => win.eval(code);
    function prepare(mode, shift) {
      if (!['loaded', 'alex', 'chase'].includes(mode)) throw new Error('Unknown balance scene');
      shift = Math.max(1, Math.min(3, shift | 0));
      run('resetGame();paused=false;gameTime=80;shiftClock=25;');
      win.__debug.setShift(shift);
      // The seeded scene retains normal scheduling, patience, collision,
      // movement and chase updates. Orders/tray/hazard are fixture setup only.
      run("player.x=145;player.y=300;player.facing='down';");
      win.__debug.forceRegularOrder('sam', 'beer-blond');
      win.__debug.forceRegularOrder('gerald', 'wine');
      run("for(const id of ['sam','gerald']){const r=regularById.get(id);r.beingCarried=true;player.tray.push({type:r.orderType,customer:r});}");
      run("fartClouds.push({x:145,y:304,vx:0,vy:0,r:8,age:0,ttl:10,color:FART_COLORS[0]});updateFartHaze(1);");
      if (mode === 'chase') {
        run('hunterSmokeState=null;hunter.x=145;hunter.y=270;hunterFacing={x:0,y:1};');
        win.__debug.setHunterState('chase');
      } else win.__debug.giveSmokeBreak(120, true);
      if (mode === 'loaded') win.__debug.fillBladder();
      if (mode === 'alex') {
        run('shiftStats.deliveries=3;player.y=266;');
        if (!win.__debug.spawnAlex()) throw new Error('Alex fixture failed to spawn');
        // Same existing lifecycle fixture used by validate-effects: actual
        // actor reaches/prepares a known clear floor spot, then splits.
        run('Object.assign(alex,{x:145,y:290,path:[{x:145,y:290}],pathIndex:0});alex.route=null;updateAlex(0.01);updateAlex(ALEX_PREPARE_TIME+0.01);');
        if (win.__debug.getAlex().state !== 'splitting') throw new Error('Alex fixture did not split');
        run('player.x=145;player.y=302.5;player.moving=false;');
      }
      run('update(0.001);render();');
      return snapshot();
    }
    function snapshot() {
      const d = win.__debug;
      return {
        shift: d.getShift(), player: { x:d.player.x,y:d.player.y,speed:d.player.speed,tray:d.player.tray.length },
        hunter:{x:d.hunter.x,y:d.hunter.y,speed:d.hunter.speed,...d.getHunterState()},
        life:d.getLife(), haze:d.getFartHaze(), bladder:d.getBladder(),
        fall:run('fallTimer'), spills:d.getSpills().length,
        orders:['sam','gerald'].map(id=>{const r=d.regularById.get(id);return {id,type:r.orderType,served:r.served,carried:r.beingCarried,patience:r.sitTimer,cooldown:r.orderCooldown};}),
      };
    }
    return { prepare, snapshot };
  }
  root.BalanceReview = { create };
})(globalThis);
