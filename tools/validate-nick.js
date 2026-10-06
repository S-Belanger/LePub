// Nick's production artwork, real apology lifecycle, and native-size review.
// node tools/validate-nick.js [output-directory]
const fs = require('fs');
const os = require('os');
const path = require('path');
const { session } = require('./browser-session');
const out = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'lepub-nick-review'));
fs.mkdirSync(out, { recursive: true });
const assert = (condition, message) => { if (!condition) throw new Error(message); };

session(async (browser, url) => {
  const results = [];
  for (const [name, width, height, touch] of [
    ['desktop', 1280, 720, false], ['mobile', 390, 844, true],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch,
      isMobile: touch, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('requestfailed', r => errors.push(r.url() + ': ' + r.failure().errorText));
    page.on('response', r => { if (r.status() >= 400) errors.push(r.url() + ': ' + r.status()); });
    await page.addInitScript(() => { window.requestAnimationFrame = () => 1; });
    await page.goto(url, { waitUntil: 'networkidle' });
    const loaded = await page.evaluate(() => window.__debug.Assets.hasFamily('nick'));
    assert(loaded, name + ': Nick must load from the production manifest');
    const walking = await page.evaluate(() => {
      const d = window.__debug;
      document.getElementById('btn-start').click();
      d.player.x = 145; d.player.y = 266;
      d.giveSmokeBreak(100, true);
      const n = d.spawnNick();
      if (!n) throw new Error('No reachable Nick route');
      const start = { x: n.x, y: n.y };
      for (let i = 0; i < 20; i++) d.update(1 / 60);
      const frame = rasterFrameFor(n);
      return { distance: Math.hypot(n.x - start.x, n.y - start.y),
        animation: animIdFor(n), frame: !!frame, hitbox: { w: n.w, h: n.h } };
    });
    assert(walking.distance > 1 && walking.animation.startsWith('walk.') && walking.frame,
      name + ': actual entry must move with the illustrated walk');
    assert(walking.hitbox.w === 14 && walking.hitbox.h === 17, name + ': hitbox changed');
    await page.evaluate(() => {
      const d = window.__debug, n = d.getNick();
      Object.assign(n, { x: 110, y: 246, facing: 'down', state: 'lingering',
        moving: false, pose: null, sorryTimer: 0, lingerTimer: 8, fartTimer: 20,
        line: null, lineTtl: 0 });
      d.spawnWaiter();
      const jay = d.getWaiter();
      if (jay) Object.assign(jay, { x: 80, y: 246, moving: false, pose: null, facing: 'down' });
      d.render();
    });
    await page.screenshot({ path: path.join(out, name + '-idle.png') });
    const poses = [];
    for (const facing of ['down', 'right', 'up', 'left']) {
      poses.push(await page.evaluate(facing => {
        const d = window.__debug, n = d.getNick();
        n.facing = facing;
        return { facing, idle: !!d.Assets.frameFor('nick', 'idle.' + facing, 0),
          walkA: !!d.Assets.frameFor('nick', 'walk.' + facing, 0),
          walkB: !!d.Assets.frameFor('nick', 'walk.' + facing, 320),
          sorry: !!d.Assets.frameFor('nick', 'sorry.' + facing, 0) };
      }, facing));
    }
    const apology = await page.evaluate(() => {
      const d = window.__debug, n = d.getNick();
      n.facing = 'down'; n.fartTimer = 0;
      const before = d.getFartClouds().length;
      d.update(0.02); d.update(0.02);
      const frame = rasterFrameFor(n), expected = d.Assets.frameFor('nick', 'sorry.down', 0);
      d.render();
      return { pose: n.pose, animation: animIdFor(n), cloudsAdded: d.getFartClouds().length - before,
        correctFrame: !!frame && JSON.stringify(frame.rect) === JSON.stringify(expected.rect) };
    });
    assert(apology.pose === 'sorry' && apology.correctFrame && apology.cloudsAdded > 0,
      name + ': actual fart must trigger illustrated apology');
    await page.screenshot({ path: path.join(out, name + '-sorry.png') });
    const returned = await page.evaluate(() => {
      const d = window.__debug;
      for (let i = 0; i < 54; i++) d.update(1 / 60);
      const n = d.getNick();
      d.render();
      return { pose: n.pose, animation: animIdFor(n), frame: !!rasterFrameFor(n) };
    });
    assert(returned.pose === null && returned.animation === 'idle.down' && returned.frame,
      name + ': apology must return to idle');
    const reset = await page.evaluate(() => {
      const d = window.__debug;
      d.resetGame();
      return { visitorCleared: !d.getNick(), cloudsCleared: d.getFartClouds().length === 0 };
    });
    assert(reset.visitorCleared && reset.cloudsCleared, name + ': restart must clear Nick state');
    assert(poses.every(p => p.idle && p.walkA && p.walkB && p.sorry), name + ': missing direction/pose');
    assert(!errors.length, name + ': browser errors: ' + errors.join('; '));
    results.push({ name, walking, poses, apology, returned, reset, browserErrors: errors.length });
    await page.close();
  }

  // Capture each selectable pose/direction in the existing live cast gallery.
  const gallery = await browser.newPage({ viewport: { width: 1120, height: 900 } });
  await gallery.goto(url + '/tools/art-review.html', { waitUntil: 'networkidle' });
  const cards = gallery.locator('figure').filter({ hasText: /^Nick/ });
  assert(await cards.count() === 1, 'Nick must appear in the shared cast gallery');
  await gallery.selectOption('#scale', '8');
  await gallery.click('#pause');
  for (const direction of ['down', 'right', 'up', 'left']) {
    await gallery.selectOption('#direction', direction);
    for (const pose of ['idle', 'walk', 'sorry']) {
      await gallery.selectOption('#pose', pose);
      await gallery.waitForTimeout(40);
      await cards.screenshot({ path: path.join(out, 'detail-' + direction + '-' + pose + '.png') });
    }
  }
  await gallery.close();

  // A shareable board draws actual imported frames, with one density per family.
  const board = await browser.newPage({ viewport: { width: 1120, height: 1080 } });
  await board.goto(url + '/tools/art-review.html', { waitUntil: 'networkidle' });
  await board.evaluate(async () => {
    const nick = await fetch('../assets/sprites/nick-illustrated.json').then(r => r.json());
    document.body.innerHTML = `<main style="max-width:1056px;margin:auto">
      <p style="color:#d99a38;letter-spacing:3px;margin:0">LEPUB · CAST PREVIEW</p>
      <h1 style="font-size:36px;margin:6px 0">Nick joins the rotation.</h1>
      <p>Backward cap. Ginger beard. Baseball uniform. A little trouble.</p>
      <canvas id="nick-board" width="1056" height="900" style="width:100%;image-rendering:pixelated"></canvas>
    </main>`;
    const g = document.getElementById('nick-board').getContext('2d');
    g.imageSmoothingEnabled = false;
    const draw = (family, id, x, y, scale) => {
      const frame = Assets.frameFor(family, id, 0);
      const s = scale / frame.density;
      g.drawImage(frame.image, frame.rect.x, frame.rect.y, frame.rect.width, frame.rect.height,
        x - frame.pivot.x * s, y - frame.pivot.y * s, frame.rect.width * s, frame.rect.height * s);
    };
    const label = (text, x, y, color = '#eedabb', size = 15) => {
      g.fillStyle = color; g.font = size + 'px system-ui'; g.textAlign = 'center'; g.fillText(text, x, y);
    };
    for (const [family, name, x] of [['waiter', 'Jay', 300], ['nick', 'Nick', 528], ['alex', 'Alex', 756]]) {
      draw(family, 'idle.down', x, 220, 8); label(name, x, 253, '#e5b76f', 20);
    }
    label('The same overhead camera, painted finish and physical scale.', 528, 290, '#bcae96');
    g.fillStyle = '#665038'; g.fillRect(0, 310, 1056, 1);
    const dirs = ['down', 'right', 'up', 'left'];
    for (let col = 0; col < 4; col++) label(['Facing you', 'Right', 'Facing away', 'Left'][col], 175 + col * 250, 345, '#e5b76f');
    for (let row = 0; row < 4; row++) {
      const y = 455 + row * 135;
      g.fillStyle = '#211e18'; g.fillRect(80, y - 104, 976, 125);
      label(['Idle', 'Stride A', 'Stride B', 'Pardon!'][row], 38, y - 36, '#bcae96', 12);
      for (let col = 0; col < 4; col++) {
        const id = ['idle', 'walkA', 'walkB', 'special'][row] + '.' + dirs[col];
        const r = nick.frames[id], image = Assets.frameFor('nick', 'idle.down', 0).image;
        const s = 4 / nick.authoredPixelsPerWorldUnit;
        g.drawImage(image, r.rect.x, r.rect.y, r.rect.width, r.rect.height,
          175 + col * 250 - r.pivot.x * s, y - r.pivot.y * s, r.rect.width * s, r.rect.height * s);
      }
    }
  });
  await board.screenshot({ path: path.join(out, 'preview.png') });
  await board.close();

  const fallback = await browser.newPage();
  const fallbackErrors = [];
  fallback.on('pageerror', e => fallbackErrors.push(e.message));
  await fallback.addInitScript(() => { window.requestAnimationFrame = () => 1; });
  await fallback.route('**/nick-illustrated.png', route => route.fulfill({ status: 404, body: '' }));
  await fallback.goto(url, { waitUntil: 'networkidle' });
  const missing = await fallback.evaluate(() => {
    const d = window.__debug;
    document.getElementById('btn-start').click();
    const n = d.spawnNick();
    if (!n) throw new Error('Fallback route unavailable');
    Object.assign(n, { state: 'lingering', moving: false, lingerTimer: 8, fartTimer: 0 });
    d.update(0.02); d.update(0.02); d.render();
    return { nickAtlas: d.Assets.hasFamily('nick'), jayAtlas: d.Assets.hasFamily('waiter'),
      pose: n.pose, proceduralFrame: !!spriteForEntity(n), clouds: d.getFartClouds().length };
  });
  assert(!missing.nickAtlas && missing.jayAtlas && missing.pose === 'sorry' && missing.proceduralFrame &&
    missing.clouds > 0 && !fallbackErrors.length, 'Missing Nick image must preserve gameplay/fallback');
  await fallback.close();
  const report = { results, galleryCaptures: 12, fallback: missing, browserErrors: 0,
    limits: 'Local Edge desktop and phone emulation; no physical-device or production verification.' };
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ out, ...report }, null, 2));
}).catch(error => { console.error(error); process.exitCode = 1; });
