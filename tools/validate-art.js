// Real Edge validation of the production manifest and gameplay. No replacement
// assets are injected. node tools/validate-art.js [output-directory]
const fs = require('fs');
const os = require('os');
const path = require('path');
const { session } = require('./browser-session');
const art = require('../src/character-art');
const familyCount = Object.keys(art.families).length;
const out = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'lepub-art-final'));
fs.mkdirSync(out, { recursive: true });
const assert = (condition, message) => { if (!condition) throw new Error(message); };

session(async (browser, url) => {
  const report = [];
  for (const [name, width, height, touch] of [['desktop', 1280, 720, false], ['mobile', 390, 844, true]]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('requestfailed', r => errors.push(r.url() + ': ' + r.failure().errorText));
    page.on('response', r => { if (r.status() >= 400) errors.push(r.url() + ': ' + r.status()); });
    await page.addInitScript(() => {
      window.requestAnimationFrame = callback => { window.__reviewFrame = callback; return 1; };
    });
    await page.goto(url, { waitUntil: 'networkidle' });
    const assets = await page.evaluate(() => window.__debug.Assets.status());
    assert(Object.keys(assets).length === familyCount && Object.values(assets).every(a => a.state === 'ready'), name + ': all contracted atlases must load');
    await page.screenshot({ path: path.join(out, name + '-start.png') });
    await page.evaluate(() => {
      const d = window.__debug;
      document.getElementById('btn-start').click();
      d.player.x = 62; d.player.y = 164; d.player.facing = 'down';
      d.hunter.x = 128; d.hunter.y = 166; d.hunter.facing = 'left';
      d.setHunterState('scanning', 100);
      for (let i = 0; i < 9; i++) {
        d.spawnCustomer();
        const c = d.customers[d.customers.length - 1];
        const seat = c.seat;
        Object.assign(c, { x: seat.x, y: seat.y, state: 'sitting', moving: false, look: i % 3,
          facing: { n: 'down', s: 'up', w: 'right', e: 'left' }[seat.side], orderType: 'beer-blond', sitTimer: 35,
          patienceDuration: 40, orderAppearAt: -1 });
      }
      for (const id of ['nazim', 'sam', 'gerald']) {
        d.forceRegularOrder(id, 'beer-blond');
        d.regularById.get(id).orderAppearAt = -1;
      }
      d.render();
    });
    await page.screenshot({ path: path.join(out, name + '-gameplay.png') });
    await page.evaluate(() => {
      const d = window.__debug;
      d.player.x = 76; d.player.y = 96; d.player.facing = 'up';
      d.hunter.x = 105; d.hunter.y = 102; d.hunter.facing = 'down';
      d.render();
    });
    await page.screenshot({ path: path.join(out, name + '-booth.png') });
    const checks = await page.evaluate(() => {
      const d = window.__debug;
      const families = Object.values(d.Assets.status()).map(a => a.family);
      let animationCount = 0;
      for (const family of families) for (const direction of CharacterArt.directions) {
        const poses = Object.keys(CharacterArt.families[family].animations);
        for (const pose of poses) {
          if (!d.Assets.frameFor(family, pose + '.' + direction, 200)) throw new Error('Missing ' + family + ':' + pose + '.' + direction);
          animationCount++;
        }
      }
      const n = d.regularById.get('nazim');
      n.talkTimer = 0;
      d.setNazimDrinks(3); d.update(0.01);
      const lean = n.pose;
      d.setNazimDrinks(5); d.update(0.01);
      const slump = n.pose;
      if (lean !== 'lean' || slump !== 'slump') throw new Error('Intoxication poses did not reach runtime');
      d.setNazimDrinks(0);
      d.regularById.get('sam').talkTimer = 1;
      d.regularById.get('gerald').talkTimer = 1;
      d.update(0.01);
      if (d.regularById.get('sam').pose !== 'talk' || d.regularById.get('gerald').pose !== 'talk') throw new Error('Talking poses did not reach runtime');
      d.player.tray.push({ target: n, type: 'beer-blond' });
      d.player.moving = true;
      d.setHunterState('drinking', 8);
      d.spawnWaiter();
      const waiter = d.getWaiter();
      waiter.x = 56; waiter.y = 125; waiter.pose = 'spray';
      for (const direction of ['down', 'right', 'up', 'left']) {
        d.player.facing = direction; d.hunter.facing = direction; waiter.facing = direction;
        d.render();
      }
      d.player.tray.length = 0;
      return { animationCount, lean, slump, viewport: d.getViewport(), backing: { width: d.ctx.canvas.width, height: d.ctx.canvas.height } };
    });
    await page.screenshot({ path: path.join(out, name + '-poses.png') });
    const movement = await page.evaluate(touch => {
      const d = window.__debug;
      d.player.x = 62; d.player.y = 160;
      const before = d.player.x;
      if (touch) d.touchMove.x = 1; else d.keys.add('d');
      for (let i = 0; i < 12; i++) d.update(1 / 60);
      d.keys.clear(); d.touchMove.x = 0;
      d.render();
      return d.player.x - before;
    }, touch);
    assert(movement > 1, name + ': input must move player');
    const start = await page.evaluate(() => ({ x: window.__debug.player.x, y: window.__debug.player.y }));
    await page.setViewportSize({ width: height, height: width });
    const rotated = await page.evaluate(() => {
      window.__reviewFrame(performance.now());
      const d = window.__debug;
      return { viewport: d.getViewport(), player: { x: d.player.x, y: d.player.y } };
    });
    assert(rotated.viewport.portrait === !touch, name + ': orientation must switch');
    assert(rotated.player.x === start.x && rotated.player.y === start.y, name + ': resize must preserve world position');
    await page.screenshot({ path: path.join(out, name + '-rotated.png') });
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.__reviewFrame(performance.now()));
    const perf = await page.evaluate(() => {
      const d = window.__debug;
      d.setShift(6); d.setHunterState('chase', 10);
      const samples = [];
      for (let i = 0; i < 330; i++) {
        const start = performance.now();
        d.render();
        if (i >= 30) samples.push(performance.now() - start);
      }
      samples.sort((a, b) => a - b);
      return { kind: 'render submission CPU only; 300 frames, 9 patrons + regulars + waiter', medianMs: samples[150], p95Ms: samples[285] };
    });
    report.push({ name, assets, checks, movement, rotated, perf, errors });
    await page.close();
  }
  const fallback = await browser.newPage();
  const fallbackErrors = [];
  fallback.on('pageerror', e => fallbackErrors.push(e.message));
  await fallback.route('**/doe-illustrated.png', route => route.fulfill({ status: 404, body: '' }));
  await fallback.goto(url, { waitUntil: 'networkidle' });
  const fallbackResult = await fallback.evaluate(() => {
    const d = window.__debug;
    document.getElementById('btn-start').click();
    d.player.x = 62; d.player.y = 160;
    const x = d.player.x;
    d.keys.add('d'); d.update(0.1); d.keys.clear(); d.render();
    return { doe: d.Assets.hasFamily('doe'), hunter: d.Assets.hasFamily('hunter'), moved: d.player.x > x };
  });
  assert(!fallbackResult.doe && fallbackResult.hunter && fallbackResult.moved && !fallbackErrors.length, 'Single-sheet failure must fall back without breaking play');
  await fallback.close();
  const gallery = await browser.newPage({ viewport: { width: 1120, height: 1160 } });
  const galleryErrors = [];
  gallery.on('pageerror', error => galleryErrors.push(error.message));
  await gallery.goto(url + '/tools/art-review.html', { waitUntil: 'networkidle' });
  assert(await gallery.locator('figure').count() === familyCount, 'Review gallery must show all contracted characters');
  assert((await gallery.locator('#status').textContent()).startsWith(familyCount + ' of ' + familyCount), 'Review gallery must load all contracted atlases');
  await gallery.selectOption('#pose', 'walk');
  await gallery.click('#pause');
  await gallery.screenshot({ path: path.join(out, 'cast-review.png') });
  assert(!galleryErrors.length, 'Review gallery has script errors');
  await gallery.close();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ report, fallback: fallbackResult }, null, 2));
  console.log(JSON.stringify({ out, viewports: report.map(r => ({ name: r.name, ...r.checks, movement: r.movement, perf: r.perf, errors: r.errors })), fallback: fallbackResult }, null, 2));
  assert(report.every(r => !r.errors.length), 'Browser errors; see report.');
}).catch(error => { console.error(error); process.exitCode = 1; });
