// Native browser recovery: routes planned before/after a temporary room divider.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {session}=require('./browser-session');
const out=path.resolve(process.argv[2]||'docs/game-audit/2026-10-10/routing');fs.mkdirSync(out,{recursive:true});
session(async(browser,url)=>{
  const report=[];
  for(const [name,width,height,touch]of[['desktop',1280,720,false],['mobile',390,844,true]]){
    const page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch});const errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.addInitScript(()=>{requestAnimationFrame=cb=>{window.__reviewFrame=cb;return 1;};});
    await page.goto(url,{waitUntil:'networkidle'});await page.locator('#btn-start').click();
    const results=await page.evaluate(()=>{
      const results=[];
      for(const afterPlan of[false,true]){
        resetGame();paused=false;player.x=145;player.y=260;grantSmokeBreak();
        spawnWaiter();Object.assign(waiter,{x:125,y:342,state:'entering'});waiter.station={x:125,y:258};
        const wall={type:'browser-route-wall',collider:{x:0,y:296,w:200,h:2}};
        if(!afterPlan)FURNITURE.push(wall);
        beginEntityRoute(waiter,waiter.station);
        if(afterPlan)FURNITURE.push(wall);
        let arrived=false;for(let i=0;i<15;i++)arrived=waiterFollowPath(0.1)||arrived;
        if(arrived||waiter.y!==342||waiter.moving)throw Error('Blocked route moved/arrived');
        const blocked={x:waiter.x,y:waiter.y,pathLength:waiter.path.length,moving:waiter.moving};
        FURNITURE.splice(FURNITURE.indexOf(wall),1);
        let ticks=0;while(!arrived&&ticks++<150)arrived=waiterFollowPath(0.1);
        if(!arrived||Math.abs(waiter.y-258)>1e-9)throw Error('No recovery');
        results.push({afterPlan,blocked,resumed:{x:waiter.x,y:waiter.y,ticks,arrived}});
      }
      render();return results;
    });
    await page.screenshot({path:path.join(out,name+'-recovered.png')});assert.equal(errors.length,0,errors.join('\n'));
    const chase=await page.evaluate(()=>{
      resetGame();paused=false;player.x=80;player.y=150;Object.assign(player,tryMove(player,20,0));
      hunter.x=75;hunter.y=125;setHunterState('chase');
      for(let i=0;i<60;i++){updateHunter(0.05);if(collidesAt(hunter,hunter.x,hunter.y))throw Error('Hunter penetration');}
      const distance=Math.hypot(hunter.x-player.x,hunter.y-player.y),radius=(player.w+hunter.w)/2.4;
      if(distance>=radius)throw Error('Hunter failed contact approach');
      render();return{player:{x:player.x,y:player.y},hunter:{x:hunter.x,y:hunter.y},distance,radius};
    });
    await page.screenshot({path:path.join(out,name+'-chase-contact.png')});assert.equal(errors.length,0,errors.join('\n'));
    report.push({name,results,chase,errors});await page.close();
  }
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({report,limits:'Edge browser and phone emulation; deterministic temporary divider, all NPC caller cases separately checked by Node suite.'},null,2)+'\n');
  console.log('Routing browser PASS: desktop/mobile failed search and newly blocked leg wait, then recover at retained destination.');
}).catch(e=>{console.error(e);process.exitCode=1;});
