// Actual Edge keyboard/native-CDP-touch objective scenarios. Deliberately no
// assertion that a scripted player establishes human difficulty or enjoyment.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { session } = require('./browser-session');
const out = path.resolve(process.argv[2] || 'docs/game-audit/2026-10-10/balance');
fs.mkdirSync(out, { recursive:true });

async function driver(page, touch) {
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  const box = touch ? await page.locator('#stick').boundingBox() : null;
  assert(!touch || box, 'Native touch requires the visible game joystick');
  let held = [], touching = false, previous = '';
  async function set(x,y) {
    const token = x+','+y;
    if (token === previous) return;
    previous = token;
    if (touch) {
      const cx=box.x+box.width/2, cy=box.y+box.height/2;
      if (!x && !y) {
        if (touching) await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        touching=false;return;
      }
      if (!touching) { await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx,y:cy}]});touching=true; }
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx+x*46,y:cy+y*46}]});
    } else {
      const next=[...(x<0?['a']:x>0?['d']:[]),...(y<0?['w']:y>0?['s']:[])];
      for (const k of held.filter(k=>!next.includes(k))) await page.keyboard.up(k);
      for (const k of next.filter(k=>!held.includes(k))) await page.keyboard.down(k);
      held=next;
    }
  }
  async function tick(seconds) {
    return page.evaluate(seconds=>{
      const n=Math.ceil(seconds/0.02),dt=seconds/n;
      for(let i=0;i<n;i++)window.__debug.update(dt);
      window.__debug.render();return window.__balance.snapshot();
    },seconds);
  }
  async function walkTo(destination) {
    const route=await page.evaluate(destination=>{
      const fp=footprintFor('doe',PATH_CELL);
      return computeCustomerPath(player,destination,null,fp,player);
    },destination);
    assert(route&&route.length, 'Scenario must have a reachable player route');
    let elapsed=0;
    for(const point of route) {
      for(let attempts=0;attempts<700;attempts++) {
        const p=await page.evaluate(()=>({x:player.x,y:player.y}));
        const dx=point.x-p.x,dy=point.y-p.y,dist=Math.hypot(dx,dy);
        if(dist<1.1)break;
        assert(attempts<699,'Actual input stalled on scenario route to '+JSON.stringify(point)+' at '+JSON.stringify(p));
        let x,y;
        if(touch){x=dx/dist;y=dy/dist;}
        else { x=Math.abs(dx)<0.55?0:Math.sign(dx);y=Math.abs(dy)<0.55?0:Math.sign(dy); }
        await set(x,y);
        const dt=dist>6?0.06:0.015;
        await tick(dt);elapsed+=dt;
        assert(elapsed<35,'Scenario routing exceeded its 35-second limit');
      }
    }
    await set(0,0);return elapsed;
  }
  async function action() { if(touch) await page.locator('#btn-action').tap();else await page.keyboard.press('e'); }
  return {set,tick,walkTo,action};
}

session(async(browser,url)=>{
  const results=[];
  for(const [device,width,height,touch] of [['keyboard',1280,720,false],['native-touch',390,844,true]]) {
    const page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.addInitScript(()=>{
      window.requestAnimationFrame=cb=>{window.__reviewFrame=cb;return 1;};
      let seed=613;Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
    });
    await page.goto(url,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>Object.values(Assets.status()).length>=13&&Object.values(Assets.status()).every(a=>a.state==='ready'));
    await page.addScriptTag({url:url+'/tools/balance-review.js'});
    await page.evaluate(()=>window.__balance=BalanceReview.create(window));
    await page.locator('#btn-start').click();
    const input=await driver(page,touch);
    for(const shift of [1,2,3]) {
      const name=device+'-shift-'+shift;
      const loadedStart=await page.evaluate(shift=>window.__balance.prepare('loaded',shift),shift);
      assert.equal(loadedStart.player.tray,2);assert.equal(loadedStart.player.speed,54);assert.equal(loadedStart.haze,1);
      assert.equal(loadedStart.bladder.urgent,60);
      await page.screenshot({path:path.join(out,name+'-loaded.png')});
      const bathroomSeconds=await input.walkTo({x:180,y:320});
      const loadedEnd=await input.tick(0.02);
      assert.equal(loadedEnd.bladder.level,0);assert.equal(loadedEnd.bladder.puddles,0);
      assert.equal(loadedEnd.player.tray,2);assert.equal(loadedEnd.life,1);
      assert(bathroomSeconds<60,'Reachable bathroom must beat the actual urgency limit');

      await page.evaluate(shift=>window.__balance.prepare('alex',shift),shift);
      await input.set(0,-1);const trip=await input.tick(0.02);
      assert(trip.fall>0&&trip.player.tray===0&&trip.spills===2);
      assert(trip.orders.every(o=>o.type&&!o.served&&!o.carried),'Spilled orders must remain recoverable');
      const fallenAt=trip.player;
      const locked=await input.tick(0.4);await input.action();
      assert.equal(locked.player.x,fallenAt.x);assert.equal(locked.player.y,fallenAt.y);
      assert.equal((await page.evaluate(()=>window.__balance.snapshot())).player.tray,0);
      await input.set(0,0);await input.tick(0.55);
      await page.screenshot({path:path.join(out,name+'-alex-recovery.png')});
      const secondsToTaps=await input.walkTo({x:80,y:96});await input.action();
      const pickedBeer=await page.evaluate(()=>player.tray.some(i=>i.customer.id==='sam'&&i.type==='beer-blond'));
      assert(pickedBeer,'Actual station interaction must recover Sam’s spilled beer');
      const secondsToShelf=await input.walkTo({x:126,y:150});await input.action();
      const pickedWine=await page.evaluate(()=>player.tray.some(i=>i.customer.id==='gerald'&&i.type==='wine'));
      assert(pickedWine,'Actual station interaction must recover Gerald’s spilled wine');
      const secondsToBooth=await input.walkTo({x:84,y:62});await input.action();await input.action();
      const recovery=await page.evaluate(()=>window.__balance.snapshot());
      assert(recovery.orders.every(o=>!o.type&&o.cooldown>0)&&recovery.player.tray===0&&recovery.shift.stats.deliveries===5,'Actual booth interaction must deliver both recovered orders: '+JSON.stringify({player:recovery.player,orders:recovery.orders,stats:recovery.shift.stats,secondsToTaps,secondsToShelf,secondsToBooth}));
      assert.equal(recovery.life,1);

      const chaseStart=await page.evaluate(shift=>window.__balance.prepare('chase',shift),shift);
      await input.set(0,1);const chaseEnd=await input.tick(0.7);await input.set(0,0);
      const separation=s=>Math.hypot(s.player.x-s.hunter.x,s.player.y-s.hunter.y);
      assert.equal(chaseEnd.life,1);assert.equal(chaseEnd.player.tray,2);
      assert(chaseEnd.player.y-chaseStart.player.y>35,'Held native input must move the loaded player during haze and chase');
      assert(separation(chaseEnd)>separation(chaseStart),'Loaded player must be able to gain space on a clear straight run in shifts 1–3');
      assert(chaseEnd.hunter.y>chaseStart.hunter.y+10,'Hunter must actually pursue rather than stand down');
      assert.equal(chaseEnd.hunter.speed,40+(shift-1)*2.5);
      await page.screenshot({path:path.join(out,name+'-chase.png')});
      results.push({device,shift,loadedStart,bathroom:{seconds:bathroomSeconds,end:loadedEnd},alex:{trip,locked,recovery,secondsToTaps,secondsToShelf,secondsToBooth},chase:{start:chaseStart,end:chaseEnd,startSeparation:separation(chaseStart),endSeparation:separation(chaseEnd)}});
      console.log(name+': loaded/bathroom, Alex spill/recover/deliver and chase PASS');
    }
    await page.evaluate(()=>resetGame());
    assert(await page.evaluate(()=>!fallTimer&&!fartHaze&&!alex&&!player.tray.length),'Reset must clear scenario fixtures');
    assert.equal(errors.length,0,errors.join('\n'));
    await page.close();
  }
  const targets=results.slice(0,3).map(r=>r.loadedStart.shift.target);
  assert.deepEqual(targets,[100,140,180]);
  // The optional human-review page must also work with its real RAF game.
  const manual=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const manualErrors=[];manual.on('pageerror',e=>manualErrors.push(e.message));
  await manual.goto(url+'/tools/balance-review.html',{waitUntil:'networkidle'});
  await manual.locator('#prepare').waitFor({state:'visible'});
  await manual.waitForFunction(()=>!document.getElementById('prepare').disabled);
  await manual.locator('#shift').selectOption('3');
  const manualScenes=[];
  for(const mode of ['loaded','alex','chase']) {
    await manual.locator('#scene').selectOption(mode);await manual.locator('#prepare').click();
    const state=JSON.parse(await manual.locator('#report').textContent());
    assert.equal(state.shift.shift,3);assert.equal(state.player.tray,2);
    if(mode==='loaded')assert(state.bladder.urgent>0);
    if(mode==='alex')assert(await manual.frameLocator('#game').locator('#game').evaluate(()=>window.__debug.getAlex().state==='splitting'));
    if(mode==='chase')assert.equal(state.hunter.state,'chase');
    manualScenes.push({mode,shift:state.shift.shift,tray:state.player.tray});
  }
  await manual.locator('#snapshot').click();
  assert.equal(manualErrors.length,0,manualErrors.join('\n'));
  await manual.screenshot({path:path.join(out,'manual-phone-review.png'),fullPage:true});
  await manual.close();
  const report={time:new Date().toISOString(),browser:'Local headless Microsoft Edge',method:'Actual game; seeded fixture setup; held keyboard/native CDP joystick and native action taps; deterministic <=0.02s game updates with natural NPC/order timers. All illustrated families loaded. No movement/action/collision/chase mocks.',limits:'Controlled scripted scenarios establish input, route, order recovery and early-shift numerical scaling only. They do not establish subjective difficulty, a complete winning shift, human playtesting, physical-phone/GPU performance or production deployment. Alex and bathroom are separate because urgency normally releases Alex.',manualPage:{viewport:{width:390,height:844},scenes:manualScenes,errors:manualErrors},results};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log('Balance PASS: 6 shift/device scenarios; targets '+targets.join('/')+'; zero browser errors.');
}).catch(e=>{console.error(e);process.exitCode=1;});
