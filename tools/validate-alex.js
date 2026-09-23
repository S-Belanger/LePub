// Actual Alex lifecycle and source-alpha inspection in Edge, plus 404 fallback.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { session } = require('./browser-session');
const out = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'lepub-alex-review'));
fs.mkdirSync(out, { recursive: true });
session(async (browser, localUrl) => {
  const url = process.argv[3] || localUrl;
  const report = [];
  for (const [name, width, height, touch] of [['desktop', 1280, 720, false], ['mobile', 390, 844, true]]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('requestfailed', r => errors.push(r.url()));
    await page.addInitScript(() => { window.requestAnimationFrame = cb => { window.__reviewFrame = cb; return 1; }; });
    await page.goto(url, { waitUntil: 'networkidle' });
    const sources = [];
    for (const family of ['alex', 'alex-mace']) sources.push(await page.evaluate(async family => {
      const spec = CharacterArt.families[family];
      const image = new Image(); image.src = 'assets/sprites/' + family + '-illustrated.png'; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const g = canvas.getContext('2d'); g.drawImage(image, 0, 0);
      const pixels = g.getImageData(0, 0, canvas.width, canvas.height).data;
      const cells = [];
      for (let row = 0; row < spec.rows.length; row++) for (let col = 0; col < 4; col++) {
        const x0 = Math.round(col * image.width / 4), x1 = Math.round((col + 1) * image.width / 4);
        const y0 = spec.rowCuts ? spec.rowCuts[row] : Math.round(row * image.height / spec.rows.length);
        const y1 = spec.rowCuts ? spec.rowCuts[row + 1] : Math.round((row + 1) * image.height / spec.rows.length);
        let opaque = 0, transparent = 0, edge = 0;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
          const alpha = pixels[(y * canvas.width + x) * 4 + 3];
          if (!alpha) transparent++;
          if (alpha >= 128) {
            opaque++;
            if (x === x0 || x === x1 - 1 || y === y0 || y === y1 - 1) edge++;
          }
        }
        if (!opaque || transparent / ((x1 - x0) * (y1 - y0)) < 0.2 || edge) throw new Error('Clipped/nontransparent cell ' + row + ',' + col + ': edge=' + edge);
        cells.push({ row, col, opaque, transparent, edge });
      }
      return { family, width: image.width, height: image.height, cells };
    }, family));
    await page.evaluate(() => {
      document.getElementById('btn-start').click();
      const d = window.__debug;
      d.player.x = 145; d.player.y = 266;
      d.hunter.x = 145; d.hunter.y = 238; d.setHunterState('scanning', 100);
      d.spawnWaiter(); Object.assign(d.getWaiter(), { x: 132, y: 314, facing: 'down', moving: false });
      d.spawnAlex(); Object.assign(d.getAlex(), { x: 145, y: 290, moving: false, facing: 'down' });
      d.render();
    });
    await page.screenshot({ path: path.join(out, name + '-idle.png') });
    const lifecycle = await page.evaluate(() => {
      const a = window.__debug.getAlex();
      const facingChecks = [];
      for (const [dx, dy, dir] of [[10, 0, 'right'], [-10, 0, 'left'], [0, 10, 'down'], [0, -10, 'up']]) {
        Object.assign(a, { x: 145, y: 290, path: [{ x: 145 + dx, y: 290 + dy }], pathIndex: 0 });
        alexFollowPath(0.01);
        if (a.facing !== dir || animIdFor(a) !== 'walk.' + dir || !rasterFrameFor(a)) throw new Error('Walk facing failed: ' + dir);
        facingChecks.push(dir);
      }
      Object.assign(a, { x: 145, y: 290, path: [{ x: 145, y: 290 }], pathIndex: 0, state: 'entering' });
      const before = { x: a.x, y: a.y, w: a.w, h: a.h };
      updateAlex(0.01);
      if (a.state !== 'preparing' || a.blocker) throw new Error('Missing preparation cue');
      updateAlex(ALEX_PREPARE_TIME + 0.01);
      const split = rasterFrameFor(a), idle = Assets.frameFor('alex', 'idle.down', 0);
      if (a.state !== 'splitting' || animIdFor(a) !== 'split.down' || !split || split.rect === idle.rect) throw new Error('Split artwork was not selected');
      if (!FURNITURE.includes(a.blocker) || a.blocker.collider.w !== 22 || a.blocker.collider.h !== 7) throw new Error('Blocker changed');
      if (a.x !== before.x || a.y !== before.y || a.w !== before.w || a.h !== before.h) throw new Error('Artwork changed body geometry');
      const splitWidth = split.rect.width / split.density;
      if (splitWidth < 21 || splitWidth > 25) throw new Error('Split should align with 22-unit blocker, got ' + splitWidth);
      window.__debug.render();
      return { facingChecks, splitAnimation: animIdFor(a), splitWidth, blocker: a.blocker.collider, body: before };
    });
    await page.screenshot({ path: path.join(out, name + '-split.png') });
    const stood = await page.evaluate(() => {
      const a = window.__debug.getAlex();
      updateAlex(ALEX_SPLIT_TIME + 0.01); alexFollowPath(0.01);
      if (a.state !== 'leaving' || a.pose || FURNITURE.some(f => f.type === 'alex') || !rasterFrameFor(a)) throw new Error('Stand/exit failed');
      window.__debug.render(); return { state: a.state, animation: animIdFor(a) };
    });
    await page.screenshot({ path: path.join(out, name + '-leaving.png') });
    await page.evaluate(() => {
      dismissAlex();
      for (let attempt = 0; attempt < 8 && !alex; attempt++) spawnAlex('mace');
      if (!alex) throw new Error('No reachable mace space after retries');
      for (const [dx, dy, dir] of [[10, 0, 'right'], [-10, 0, 'left'], [0, 10, 'down'], [0, -10, 'up']]) {
        Object.assign(alex, { x: 145, y: 290, path: [{ x: 145 + dx, y: 290 + dy }], pathIndex: 0 });
        alexFollowPath(0.01);
        if (animIdFor(alex) !== 'walk.' + dir || rasterFamilyFor(alex) !== 'alex-mace' || !rasterFrameFor(alex)) throw new Error('Mace carrying direction missing: ' + dir);
      }
      Object.assign(alex, { x: 145, y: 290, path: [{ x: 145, y: 290 }], pathIndex: 0 });
      updateAlex(0.01);
      if (alex.state !== 'preparing' || alex.blocker || rasterFamilyFor(alex) !== 'alex-mace') throw new Error('Mace preparation failed');
      window.__debug.render();
    });
    await page.screenshot({ path: path.join(out, name + '-mace-ready.png') });
    const mace = await page.evaluate(() => {
      updateAlex(ALEX_PREPARE_TIME + 0.01);
      if (alex.state !== 'workingOut' || alex.blocker.collider.w !== 28 || alex.blocker.collider.h !== 14) throw new Error('Mace blocker failed');
      const frames = [];
      for (const seconds of [0, 0.23, 0.45, 0.67]) {
        gameTime = alex.activityStarted + seconds;
        const frame = rasterFrameFor(alex);
        if (!frame) throw new Error('Missing mace frame');
        frames.push(frame.rect.y);
      }
      if (new Set(frames).size !== 4) throw new Error('Mace cycle does not animate');
      return { frames, width: alex.blocker.collider.w, height: alex.blocker.collider.h };
    });
    for (const [phase, seconds] of [['left', 0], ['behind', 0.23], ['front', 0.45]]) {
      await page.evaluate(seconds => { gameTime = alex.activityStarted + seconds; window.__debug.render(); }, seconds);
      await page.screenshot({ path: path.join(out, name + '-mace-' + phase + '.png') });
    }
    await page.evaluate(() => {
      updateAlex(ALEX_MACE_TIME + 0.01);
      if (alex.state !== 'leaving' || FURNITURE.some(f => f.type === 'alex')) throw new Error('Mace exit did not clear blocker');
    });
    if (errors.length) throw new Error(name + ': browser errors ' + errors.join('; '));
    report.push({ name, sources, lifecycle, stood, mace, errors });
    await page.close();
  }
  const fallback = await browser.newPage();
  const fallbackErrors = [];
  fallback.on('pageerror', e => fallbackErrors.push(e.message));
  await fallback.route('**/alex-illustrated.png', route => route.fulfill({ status: 404, body: '' }));
  await fallback.route('**/alex-mace-illustrated.png', route => route.fulfill({ status: 404, body: '' }));
  await fallback.goto(url, { waitUntil: 'networkidle' });
  const fallbackCheck = await fallback.evaluate(() => {
    document.getElementById('btn-start').click();
    const d = window.__debug;
    d.player.x = 145; d.player.y = 266; // Keep random player spawn out of the marked space.
    d.spawnAlex(); const a = d.getAlex();
    Object.assign(a, { x: 145, y: 290, path: [{ x: 145, y: 290 }], pathIndex: 0 });
    updateAlex(0.01); updateAlex(ALEX_PREPARE_TIME + 0.01); d.render();
    const splitOK = !d.Assets.hasFamily('alex') && d.Assets.hasFamily('waiter') && !rasterFrameFor(a) && spriteForEntity(a) === SPRITES.alex.split && FURNITURE.includes(a.blocker);
    dismissAlex(); spawnAlex('mace');
    Object.assign(alex, { x: 145, y: 290, path: [{ x: 145, y: 290 }], pathIndex: 0 });
    updateAlex(0.01); updateAlex(ALEX_PREPARE_TIME + 0.01); d.render();
    return splitOK && !d.Assets.hasFamily('alex-mace') && !rasterFrameFor(alex) && alex.state === 'workingOut' && FURNITURE.includes(alex.blocker);
  });
  if (!fallbackCheck || fallbackErrors.length) throw new Error('Alex failure must preserve fallback split and other cast');
  await fallback.close();
  const reduced = await browser.newPage({ reducedMotion: 'reduce' });
  await reduced.goto(url, { waitUntil: 'networkidle' });
  const reducedCheck = await reduced.evaluate(() => {
    document.getElementById('btn-start').click();
    player.x = 145; player.y = 266; // Exercise motion preference, not occupancy cancellation.
    for (let attempt = 0; attempt < 8 && !alex; attempt++) spawnAlex('mace');
    if (!alex) throw new Error('No reduced-motion visitor');
    Object.assign(alex, { x: 145, y: 290, path: [{ x: 145, y: 290 }], pathIndex: 0 });
    updateAlex(0.01); updateAlex(ALEX_PREPARE_TIME + 0.01);
    const frame = rasterFrameFor(alex);
    gameTime += 0.5;
    window.__debug.render();
    return prefersReducedMotion && frame.rect === rasterFrameFor(alex).rect && !!alex.blocker;
  });
  if (!reducedCheck) throw new Error('Reduced motion must keep static art with working blocker');
  await reduced.close();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ report, reducedMotion: reducedCheck, fallback: { passed: fallbackCheck, errors: fallbackErrors } }, null, 2) + '\n');
  console.log(JSON.stringify({ out, viewports: report.map(r => ({ name: r.name, cells: r.sources.map(s => s.cells.length), ...r.lifecycle, stood: r.stood, mace: r.mace, errors: r.errors })), fallback: fallbackCheck, reducedMotion: reducedCheck }, null, 2));
}).catch(error => { console.error(error); process.exitCode = 1; });
