// Real Edge keyboard/touch and physical furniture contact review.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { session } = require('./browser-session');
const out = path.resolve(process.argv[2] || 'docs/game-audit/2026-10-10');
const baseline = process.argv.includes('--baseline');
fs.mkdirSync(out, { recursive: true });
session(async (browser, url) => {
  const results = [];
  for (const [name, width, height, touch] of [['desktop',1280,720,false],['mobile',390,844,true]]) {
    const page = await browser.newPage({ viewport:{width,height}, hasTouch:touch, isMobile:touch });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(() => { window.requestAnimationFrame = cb => { window.__reviewFrame=cb; return 1; }; });
    await page.goto(url, { waitUntil:'networkidle' });
    await page.waitForFunction(() => Object.values(Assets.status()).every(a => a.state === 'ready'));
    await page.locator('#btn-start').click();
    await page.evaluate(() => {
      const d=window.__debug; d.giveSmokeBreak(1000,true);
      d.player.x=35.2; d.player.y=226; d.render();
    });
    await page.keyboard.down('s');
    await page.evaluate(() => { for(let i=0;i<6;i++) window.__debug.update(0.05); window.__debug.render(); });
    await page.keyboard.up('s');
    const keyboardY = await page.evaluate(() => player.y);
    await page.screenshot({ path:path.join(out, name + (baseline?'-before':'-after') + '.png') });
    const geometry = await page.evaluate(() => ({
      gap:collidesAt(player,35.2,240), stoolGap:collidesAt(player,39.125,218),
      edge:tryMove({...player,x:84,y:150},3,0).x,
      tableSolid:collidesAt(player,58,258),
      chairSolid:collidesAt(player,23.8,240),
      routeGap:!findBlockingObstacle({x:35.2,y:226},{x:35.2,y:242}),
    }));
    if(!baseline) {
      assert(keyboardY > 242 && keyboardY <= 243, 'Keyboard must enter the gap and stop at the table: '+keyboardY);
      assert(!geometry.gap && !geometry.stoolGap && geometry.routeGap);
      assert(geometry.tableSolid && geometry.chairSolid);
      assert(Math.abs(geometry.edge-86.6)<1e-8);
      // Slide on a real held diagonal, then losing focus must clear it.
      await page.evaluate(() => { player.x=84;player.y=140; });
      await page.keyboard.down('d'); await page.keyboard.down('s');
      await page.evaluate(() => { for(let i=0;i<8;i++) update(0.05); });
      const slide=await page.evaluate(() => ({x:player.x,y:player.y}));
      assert(Math.abs(slide.x-86.6)<1e-8 && slide.y>140);
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      assert.deepEqual(await page.evaluate(() => getInputVector()),{x:0,y:0});
      await page.keyboard.up('d'); await page.keyboard.up('s');
      if(touch) {
        await page.evaluate(() => { player.x=39.125;player.y=210; });
        const stick=await page.locator('#stick').boundingBox();
        assert(stick,'Visible mobile stick');
        const cdp=await page.context().newCDPSession(page);
        const x=stick.x+stick.width/2, y=stick.y+stick.height/2;
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:stick.y+stick.height}]});
        await page.evaluate(() => { for(let i=0;i<7;i++) update(0.05); });
        assert(await page.evaluate(() => player.y>228),'Touch stick must cross the stool gap');
        await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
        assert.deepEqual(await page.evaluate(() => getInputVector()),{x:0,y:0});
      }
      // Rotation preserves world position and collision behavior.
      const pos=await page.evaluate(() => ({x:player.x,y:player.y}));
      await page.setViewportSize({width:height,height:width});
      await page.evaluate(() => applyViewport());
      assert.deepEqual(await page.evaluate(() => ({x:player.x,y:player.y})),pos);
    }
    assert.equal(errors.length,0,errors.join('\n'));
    results.push({name,keyboardY,geometry,errors});
    await page.close();
  }
  fs.writeFileSync(path.join(out,baseline?'baseline.json':'report.json'),JSON.stringify({time:new Date().toISOString(),baseline,results},null,2)+'\n');
  console.log(JSON.stringify(results));
}).catch(e => { console.error(e); process.exitCode=1; });
