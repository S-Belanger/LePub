// Actual mobile Edge layout/help checks. Uses the shipped assets and runtime.
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { session } = require('./browser-session');
const out = path.resolve(process.argv[2] || 'docs/art-review/mobile-hud');
fs.mkdirSync(out, { recursive: true });

session(async (browser, url) => {
  const report = [];
  for (const [width, height] of [[390, 844], [375, 667], [360, 780], [320, 568]]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { window.requestAnimationFrame = cb => { window.__reviewFrame = cb; return 1; }; });
    await page.goto(url, { waitUntil: 'networkidle' });
    assert(await page.evaluate(() => Object.values(window.__debug.Assets.status()).every(a => a.state === 'ready')), 'All production illustrated atlases loaded');
    const help = await page.locator('.hint').allTextContents();
    assert(help.some(t => /five deliveries/.test(t) && /15-second/.test(t) && /25 seconds/.test(t) && /don’t attract/.test(t)), 'Help explains acquisition, smoke break, expiry and nearby pickup');
    await page.locator('.hint').last().scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, `help-${width}x${height}.png`) });
    await page.locator('#btn-start').click();
    const layout = await page.evaluate(height => {
      const d = window.__debug;
      d.player.x = 62; d.player.y = height === 844 ? 164 : 100;
      d.setHunterState('scanning', 100);
      const hud = { ...measureHud() }, cam = getCamera();
      const bodies = regulars.map(e => ({ id: e.id, head: entityHeadTop(e) - cam.y, feet: e.y - cam.y,
        covered: rectsTouch(hud, { x: e.x - cam.x - 8, y: entityHeadTop(e) - cam.y, w: 16, h: e.y - entityHeadTop(e) }) }));
      const original = { ...d.player }, originalCamera = getCamera();
      jamesonTimer = 10; bladderLevel = BLADDER_MAX; bladderUrgentTimer = 20; cigaretteReserve = 3;
      d.render();
      const canvas = document.getElementById('game').getBoundingClientRect();
      const toolbar = document.getElementById('top-bar').getBoundingClientRect();
      const labels = hudLabels();
      return { hud, cam, bodies, viewport: d.getViewport(), toolbarBottom: toolbar.bottom, canvasTop: canvas.top,
        statusStable: measureHud().h === hud.h && getCamera().y === originalCamera.y,
        labelClearance: hud.x + hud.w - HUD_PAD_X - fontTextWidth(labels.clock || '') -
          (hud.x + HUD_PAD_X + fontTextWidth(labels.shift) + 6 + fontTextWidth(labels.tips)),
        bottomClearance: hud.x + hud.w - HUD_PAD_X - packRowWidth() - fontTextWidth('C') - 4 -
          (hud.x + HUD_PAD_X + lifeBarWidth() + 6 + fontTextWidth(labels.total)),
        original: { x: original.x, y: original.y } };
    }, height);
    assert(layout.bodies.every(e => !e.covered && e.head >= 30 && e.feet < layout.viewport.viewH), 'In-camera booth bodies clear score strip');
    assert(layout.statusStable && layout.labelClearance >= 6 && layout.bottomClearance >= 6, 'All mobile labels/statuses fit without camera movement');
    assert(layout.canvasTop > layout.toolbarBottom, 'DOM toolbar and mobile canvas have separate space');
    await page.screenshot({ path: path.join(out, `hud-${width}x${height}.png`) });
    await page.setViewportSize({ width: height, height: width });
    const rotated = await page.evaluate(() => { applyViewport(); window.__debug.render(); return { viewport: window.__debug.getViewport(), x: player.x, y: player.y, hud: { ...measureHud() } }; });
    assert(!rotated.viewport.portrait && rotated.x === layout.original.x && rotated.y === layout.original.y && rotated.hud.w < rotated.viewport.viewW - 6, 'Rotation keeps player and desktop sign');
    await page.setViewportSize({ width, height });
    const cellar = await page.evaluate(() => { applyViewport(); window.__debug.enterCellar(); window.__debug.render(); return !!window.__debug.getCellar(); });
    assert(cellar, 'Cellar renders with new mobile score strip');
    await page.screenshot({ path: path.join(out, `cellar-${width}x${height}.png`) });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // The game reads this preference at startup; reload to test that path.
    await page.reload({ waitUntil: 'networkidle' });
    assert(await page.evaluate(() => { document.getElementById('btn-start').click(); window.__debug.render(); return hudAlpha === 1 && prefersReducedMotion; }), 'Reduced-motion mobile header stays opaque in its reserved space');
    assert(!errors.length, 'No runtime errors');
    report.push({ width, height, layout, rotated, cellar, help: true, errors });
    await page.close();
  }
  fs.writeFileSync(path.join(out, 'hud-report.json'), JSON.stringify(report, null, 2));
  console.log('HUD browser PASS: four actual mobile viewports, loaded sprite bodies, labels/statuses, help scroll/start, toolbar, rotation, cellar and reduced motion.');
}).catch(error => { console.error(error); process.exitCode = 1; });
