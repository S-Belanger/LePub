// Actual trip/order/action lifecycle and haze rendering, including reduced motion.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { session } = require('./browser-session');
const familyCount = Object.keys(require('../src/character-art').families).length;
const out=path.resolve(process.argv[2] || 'docs/game-audit/2026-10-10/effects');
fs.mkdirSync(out,{recursive:true});
session(async(browser,url) => {
  const results=[];
  for(const [device,width,height,touch] of [['desktop',1280,720,false],['mobile',390,844,true]]) {
    for(const reduced of [false,true]) {
      const name=device+(reduced?'-reduced':'');
      const page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch,reducedMotion:reduced?'reduce':'no-preference'});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      await page.addInitScript(()=>{ window.requestAnimationFrame=cb=>{window.__reviewFrame=cb;return 1;}; });
      await page.goto(url,{waitUntil:'networkidle'});
      await page.waitForFunction(count=>Object.values(Assets.status()).length===count&&Object.values(Assets.status()).every(a=>a.state==='ready'),familyCount);
      await page.locator('#btn-start').click();
      await page.evaluate(()=>{
        const d=window.__debug;d.resetGame();paused=false;gameTime=80;shiftClock=70;shiftStats.deliveries=3;
        player.x=145;player.y=266;d.giveSmokeBreak(1000,true);alexDelay=999;nickDelay=999;
        if(!d.spawnAlex())throw Error('No Alex');
        Object.assign(alex,{x:145,y:290,path:[{x:145,y:290}],pathIndex:0});
        updateAlex(0.01);updateAlex(ALEX_PREPARE_TIME+0.01);
        if(alex.state!=='splitting')throw Error('No split');
        player.x=145;player.y=302.5;player.moving=false;updateAlex(0.01);
        if(fallTimer!==0)throw Error('Idle trip');
        for(const id of ['sam','gerald']){d.forceRegularOrder(id,id==='sam'?'beer-blond':'wine');const r=regularById.get(id);r.beingCarried=true;player.tray.push({type:r.orderType,customer:r});}
      });
      await page.keyboard.down('w');await page.evaluate(()=>update(0.01));await page.keyboard.up('w');
      const trip=await page.evaluate(()=>({fallen:fallTimer>0,tray:player.tray.length,spills:spills.length,
        recoverable:['sam','gerald'].every(id=>{const r=regularById.get(id);return !r.beingCarried&&!r.served&&!!r.orderType;}),
        reduced:prefersReducedMotion}));
      assert(trip.fallen&&trip.tray===0&&trip.spills===2&&trip.recoverable);
      assert.equal(trip.reduced,reduced);
      const translations=await page.evaluate(()=>{
        let calls=0;const original=ctx.translate;ctx.translate=function(...args){calls++;return original.apply(this,args);};
        try{render();}finally{ctx.translate=original;}return calls;
      });
      assert.equal(translations,reduced?0:1,'Reduced motion must suppress scene shake');
      await page.screenshot({path:path.join(out,name+'-trip.png')});
      await page.evaluate(()=>{player.x=35;player.y=100;cigaretteReserve=1;});
      await page.keyboard.press('e');await page.keyboard.press('c');
      if(touch){await page.locator('#btn-action').tap();await page.locator('#btn-drop').tap();}
      assert(await page.evaluate(()=>player.tray.length===0&&cigaretteReserve===1&&cigarettePacks.length===0),'Fall must lock all actions');
      await page.evaluate(()=>{
        player.x=145;player.y=302.5;player.moving=true;updateAlex(0.2);
        if(spills.length!==2||Math.abs(fallTimer-0.7)>1e-8)throw Error('Repeated trip');
        fallTimer=0;shakeTimer=0;player.x=140;player.y=300;
        fartClouds.push({x:140,y:304,r:8,age:0,ttl:10});updateFartHaze(1);render();
        if(fartHaze!==1)throw Error('No haze');
      });
      await page.screenshot({path:path.join(out,name+'-haze.png')});
      await page.evaluate(()=>{resetGame();render();if(fallTimer||shakeTimer||fartHaze||fartClouds.length||alex)throw Error('Reset did not clear effects');});
      await page.locator('#btn-help').click();
      assert(await page.locator('#overlay').isVisible());
      await page.locator('#btn-start').click();
      assert.equal(errors.length,0,errors.join('\n'));
      results.push({name,trip,translations,errors});await page.close();
    }
  }
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({time:new Date().toISOString(),results},null,2)+'\n');
  console.log(JSON.stringify(results));
}).catch(e=>{console.error(e);process.exitCode=1;});
