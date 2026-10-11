// Authored busboy pose selection plus real routed cleanup lifecycle in Edge.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { session } = require('./browser-session');
const out = path.resolve(process.argv[2] || 'docs/art-review/busboy');
fs.mkdirSync(out, { recursive: true });
session(async (browser, url) => {
  const report = [];
  for (const [name, width, height, touch] of [['desktop',1280,720,false],['mobile',390,844,true]]) {
    const page = await browser.newPage({ viewport: {width,height}, hasTouch:touch, isMobile:touch });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(() => { requestAnimationFrame = cb => { window.__reviewFrame = cb; return 1; }; });
    await page.goto(url, {waitUntil:'networkidle'});
    await page.waitForFunction(() => Assets.hasFamily('busboy'));
    await page.locator('#btn-start').click();
    await page.evaluate(() => {
      resetGame(); paused=false; player.x=145;player.y=260;grantSmokeBreak();
      wetPantsPuddles.push({x:145,y:280,r:9,seed:0.2});spawnBusboy();
    });
    const frames = await page.evaluate(() => {
      const verified=[];
      for (const pose of ['idle','walk','mop','mopB']) for (const direction of CharacterArt.directions) {
        busboy.facing=direction;busboy.pose=pose==='idle'||pose==='walk'?null:pose;busboy.moving=pose==='walk';
        if(rasterFamilyFor(busboy)!=='busboy')throw Error('Wrong family');
        const selected=poseBase(busboy,CharacterArt.families.busboy);
        if(selected!==pose)throw Error('Wrong runtime pose '+selected+' expected '+pose);
        if(!Assets.frameFor('busboy',selected+'.'+direction,200))throw Error('Missing frame');
        verified.push(pose+'.'+direction);
      }
      busboy.pose=null;busboy.moving=false;return verified;
    });
    // Follow the real route rather than snapping the actor to the puddle.
    const entry = await page.evaluate(() => {
      let ticks=0;while(busboy.state==='entering'&&ticks++<500){gameTime+=0.05;updateBusboy(0.05);tickLegs(busboy,0.05);}
      if(busboy.state!=='mopping')throw Error('Busboy failed to reach puddle');
      return {ticks,x:busboy.x,y:busboy.y,facing:busboy.facing};
    });
    for (const [phase,time] of [['mop',80],['mopB',80.4]]) {
      await page.evaluate(time => {gameTime=time;updateBusboy(0.01);render();},time);
      assert.equal(await page.evaluate(()=>busboy.pose),phase);
      await page.screenshot({path:path.join(out,name+'-'+phase+'.png')});
    }
    const cleanup=await page.evaluate(()=>{
      updateBusboy(BUSBOY_MOP_TIME);const cleared=wetPantsPuddles.length===0;let ticks=0;
      while(busboy&&ticks++<500)updateBusboy(0.05);
      const left=busboy===null;resetGame();return{cleared,left,ticks,reset:busboy===null&&wetPantsPuddles.length===0};
    });
    assert(cleanup.cleared&&cleanup.left&&cleanup.reset);assert.equal(errors.length,0,errors.join('\n'));
    report.push({name,frames,entry,cleanup,errors});await page.close();
  }
  const fallback=await browser.newPage();const errors=[];fallback.on('pageerror',e=>errors.push(e.message));
  await fallback.route('**/busboy-illustrated.png',r=>r.fulfill({status:404,body:''}));
  await fallback.goto(url,{waitUntil:'networkidle'});
  const result=await fallback.evaluate(()=>{document.getElementById('btn-start').click();wetPantsPuddles.push({x:145,y:280,r:9,seed:0.2});spawnBusboy();render();return{busboy:!!busboy,illustrated:Assets.hasFamily('busboy'),other:Assets.hasFamily('doe')};});
  assert(result.busboy&&!result.illustrated&&result.other&&errors.length===0);await fallback.close();
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({report,fallback:result,limits:'Headless Edge; phone emulation, no physical-device or subjective art approval.'},null,2)+'\n');
  console.log('Busboy browser PASS:16pose mappings per viewport, actual entry/two mop phases/cleanup/exit/reset and single-sheet fallback.');
}).catch(e=>{console.error(e);process.exitCode=1;});
