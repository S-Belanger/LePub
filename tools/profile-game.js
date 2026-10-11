// Actual local Edge canvas submission and native RAF scheduling. Requires the
// existing browser-session harness; installs no game/project dependencies.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { session } = require('./browser-session');
const out=path.resolve(process.argv[2]||'docs/game-audit/2026-10-10/performance');
fs.mkdirSync(out,{recursive:true});
session(async(browser,url)=>{
  const report={time:new Date().toISOString(),browser:await browser.version(),
    limits:'Desktop host Edge. Phone viewport emulation only. Submission timings include JS/canvas command submission, not GPU completion. Native RAF intervals include browser scheduling. Live samples follow30nativeRAFwarmup frames after synchronous comparisons. Haze/stress live scenes keep a controlled cloud centered on the player to measure peak haze despite actual chase shoves. No physical-phone or human-playtest claim.',results:[]};
  for(const [device,width,height,touch] of [['desktop',1280,720,false],['mobile',390,844,true]]) {
    const page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.addInitScript(()=>{window.__nativeRAF=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{window.__reviewFrame=cb;return 1;};});
    await page.goto(url,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.Effects&&Object.values(Assets.status()).length>0&&Object.values(Assets.status()).every(a=>a.state==='ready'));
    await page.addScriptTag({path:path.join(__dirname,'performance-review.js')});
    for(const mode of ['normal','haze','stress']) {
      const result=await page.evaluate(async mode=>{
        const profiler=GameProfiler.create(window),scene=profiler.prepare(mode);
        const comparison=profiler.compare(mode,300,true);
        profiler.prepare(mode);
        const intervals=[],submissions=[];let previous=null;
        await new Promise(resolve=>{let count=0;const tick=t=>{
          // Isolate a steady active-haze load while actual game NPCs/physics run.
          if(mode!=='normal'&&fartClouds[0]){fartClouds[0].x=player.x;fartClouds[0].y=player.y+4;}
          const measured=count>=30;
          if(measured&&previous!==null)intervals.push(t-previous);
          const start=performance.now();window.__reviewFrame(t);
          if(measured){submissions.push(performance.now()-start);previous=t;}
          if(++count>=210)resolve();else window.__nativeRAF(tick);};window.__nativeRAF(tick);});
        return {mode,scene,comparison,frameSchedule:profiler.summarize(intervals),gameLoopSubmission:profiler.summarize(submissions),
          ending:{haze:window.__debug.getFartHaze(),caught:eval('caught'),customers:customers.length}};
      },mode);
      const captures=await page.evaluate(()=>window.__profileCaptures);
      for(const [renderer,data] of Object.entries(captures))fs.writeFileSync(path.join(out,device+'-'+mode+'-'+renderer+'.png'),Buffer.from(data.split(',')[1],'base64'));
      assert.equal(result.scene.customers,mode==='stress'?12:6);
      assert.equal(result.comparison.legacy.submission.count,300);assert.equal(result.comparison.bounded.submission.count,300);
      assert.equal(result.frameSchedule.count,179);
      if(mode==='normal')assert.equal(result.comparison.bounded.hazeImageSubmissions,0);
      else {assert(result.comparison.bounded.hazeImageSubmissions<=66);assert.equal(result.ending.haze,1,'Peak haze remains active throughout the live scenario');}
      await page.screenshot({path:path.join(out,device+'-'+mode+'.png')});
      report.results.push({device,...result});
    }
    assert.equal(errors.length,0,errors.join('\n'));await page.close();
  }
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}).catch(e=>{console.error(e);process.exitCode=1;});
