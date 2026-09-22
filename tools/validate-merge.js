// Exercises main's new UI/effects with the illustrated branch in real Edge.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { session } = require('./browser-session');
const out = path.join(os.tmpdir(), 'lepub-merge-review');
fs.mkdirSync(out, { recursive: true });
const assert = (value, message) => { if (!value) throw new Error(message); };

session(async (browser, localUrl) => {
  const url = process.argv[2] || localUrl;
  for (const [name, width, height, touch] of [['desktop', 1280, 720, false], ['mobile', 390, 844, true]]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => { window.requestAnimationFrame = cb => { window.__reviewFrame = cb; return 1; }; });
    await page.goto(url, { waitUntil: 'networkidle' });
    const checks = await page.evaluate(() => {
      document.getElementById('btn-start').click();
      const d = window.__debug;
      d.player.x = 145; d.player.y = 320;
      d.hunter.x = 145; d.hunter.y = 300;
      d.setHunterState('scanning');
      d.giveJameson(); d.fillBladder(); d.fillCigaretteReserve();
      d.wetPantsPuddles.push({ x: 150, y: 320 });
      d.spawnBusboy();
      Object.assign(d.getBusboy(), { x: 150, y: 320, state: 'mopping', pose: 'mop', line: 'Du coup !', lineTtl: 3, mopTimer: 3 });
      d.spawnAlex();
      const a = d.getAlex();
      Object.assign(a, { x: 168, y: 340, path: [{ x: 168, y: 340 }], pathIndex: 0 });
      d.update(0.01); d.render();
      const frame = rasterFrameFor(d.player);
      const tint = statusRasterFrame(frame, d.player);
      return { ready: Object.values(d.Assets.status()).every(a => a.state === 'ready'), tinted: frame.image !== tint.image,
        pivotPreserved: frame.pivot === tint.pivot, split: a.state === 'splitting', viewport: d.getViewport() };
    });
    assert(checks.ready && checks.tinted && checks.pivotPreserved && checks.split, name + ': merged features missing');
    await page.screenshot({ path: path.join(out, name + '-statuses.png') });
    if (touch) await page.locator('#btn-drop').tap();
    else await page.keyboard.press('c');
    const dropped = await page.evaluate(() => {
      const d = window.__debug; d.render();
      return d.getCigaretteReserve() === 2 && d.cigarettePacks.length === 1;
    });
    assert(dropped, name + ': pack control failed');
    await page.evaluate(() => {
      const d = window.__debug;
      d.giveJameson(0); wetPantsTimer = 2; d.render();
    });
    await page.screenshot({ path: path.join(out, name + '-wet.png') });
    await page.evaluate(() => {
      const d = window.__debug; d.giveSmokeBreak(10, true); d.render();
      if (drawList.some(item => item.ref === d.hunter)) throw new Error('Off-floor hunter still rendered');
      d.forceCaught(); d.render();
    });
    await page.screenshot({ path: path.join(out, name + '-caught.png') });
    assert(errors.length === 0, name + ': ' + errors.join('; '));
    console.log(JSON.stringify({ name, checks, packControl: 'pass', errors }));
    await page.close();
  }
  console.log('Merge browser checks passed; captures: ' + out);
}).catch(error => { console.error(error); process.exitCode = 1; });
