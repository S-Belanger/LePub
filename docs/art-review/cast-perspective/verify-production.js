// Exact Git-blob comparison avoids Windows checkout CRLF differences.
// node docs/art-review/cast-perspective/verify-production.js [revision]
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { execFileSync } = require('child_process');
const { session } = require('../../../tools/browser-session');
const revision = process.argv[2] || 'HEAD';
const commit = execFileSync('git',['rev-parse',revision],{encoding:'utf8'}).trim();
const url = 'https://lepub-five.vercel.app';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const report = { checkedAt: new Date().toISOString(), commit, url, files: [], privateInputs: [], viewports: [] };
async function verifyBytes() {
  const families = Object.keys(require('../../../src/character-art').families);
  const files = ['src/character-art.js','assets/sprites/manifest.json',...families.flatMap(f => ['assets/sprites/'+f+'-illustrated.png','assets/sprites/'+f+'-illustrated.json'])];
  for (const file of files) {
    const response = await fetch(url+'/'+file);
    const bytes = Buffer.from(await response.arrayBuffer());
    const expected = execFileSync('git',['show',commit+':'+file],{maxBuffer:8*1024*1024});
    if (response.status !== 200 || !bytes.equals(expected)) throw new Error('Production bytes differ: '+file+' HTTP'+response.status);
    report.files.push({file,status:response.status,sha256:hash(bytes),matchesCommit:true});
  }
  for (const file of ['Nazim-New-Face.jpg','Gerald-New-Face.jpg','Sam-New-Face.jpg']) {
    const response = await fetch(url+'/assets/sprites/'+file);
    if (response.status !== 404) throw new Error('Private input exclusion not confirmed: '+file+' HTTP'+response.status);
    report.privateInputs.push({file,status:response.status});
  }
}
(async () => {
  await verifyBytes();
  await session(async browser => {
    for (const [name,width,height,touch] of [['desktop',1280,720,false],['mobile',390,844,true]]) {
      const page = await browser.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch,deviceScaleFactor:1});
      const errors = [];
      page.on('pageerror',e => errors.push(e.message));
      page.on('requestfailed',r => errors.push(r.url()+':'+r.failure().errorText));
      page.on('response',r => {if(r.status()>=400)errors.push(r.url()+':'+r.status());});
      await page.addInitScript(() => {window.requestAnimationFrame = callback => {window.__reviewFrame=callback;return 1;};});
      await page.goto(url,{waitUntil:'networkidle'});
      await page.waitForFunction(() => Object.keys(window.__debug.Assets.status()).length===12 && Object.values(window.__debug.Assets.status()).every(a=>a.state==='ready'));
      const result = await page.evaluate(() => {
        const d=window.__debug;
        document.getElementById('btn-start').click();
        d.player.x=145;d.player.y=266;d.giveSmokeBreak(100,true);
        d.spawnWaiter();Object.assign(d.getWaiter(),{x:115,y:276,facing:'down',moving:false});
        d.spawnNick();Object.assign(d.getNick(),{x:140,y:280,facing:'down',state:'lingering',moving:false,lingerTimer:100,fartTimer:100});
        d.spawnAlex();Object.assign(d.getAlex(),{x:145,y:315,facing:'down',moving:false});
        const poses=[];
        for(const f of ['nick','alex','nazim','sam','gerald'])for(const dir of CharacterArt.directions)for(const pose of Object.keys(CharacterArt.families[f].animations)){
          if(!d.Assets.frameFor(f,pose+'.'+dir,0))throw new Error('Missing '+f+':'+pose+'.'+dir);
          poses.push(f+':'+pose+'.'+dir);
        }
        d.render();return {readyAtlases:Object.keys(d.Assets.status()).length,verifiedPoseMappings:poses.length,viewport:d.getViewport(),visitorNick:!!d.getNick(),visitorAlex:!!d.getAlex()};
      });
      await page.screenshot({path:path.join(__dirname,'live-'+name+'.png')});
      if(errors.length)throw new Error(errors.join('\n'));
      report.viewports.push({name,...result,errors});
      await page.close();
    }
  });
  fs.writeFileSync(path.join(__dirname,'production-receipt.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({result:'PASS',commit,files:report.files.length,privateInputs404:report.privateInputs.length,viewports:report.viewports},null,2));
})().catch(e => {console.error(e);process.exitCode=1;});
