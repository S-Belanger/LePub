// Focused real-browser review of Fred at native desktop/phone size and in seats.
// node tools/validate-fred.js [output-directory]
const fs = require('fs');
const os = require('os');
const path = require('path');
const { session } = require('./browser-session');
const out = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'lepub-fred-review'));
fs.mkdirSync(out, { recursive: true });

session(async (browser, url) => {
  const results = [];
  for (const [name, width, height, scale, touch] of [
    ['desktop', 1280, 720, '4', false],
    ['phone', 390, 844, '2', true],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.addInitScript(() => { window.requestAnimationFrame = () => 1; });
    await page.goto(url, { waitUntil: 'networkidle' });
    const ready = await page.evaluate(() => window.__debug.Assets.hasFamily('fred'));
    if (!ready) throw new Error(name + ': Fred atlas failed to load');
    await page.evaluate(() => document.getElementById('btn-start').click());
    for (const [seatName, benchIndex, expected, lastSeat] of [
      ['left-wall', 0, 'right', false],
      ['right-wall', 2, 'left', true],
      ['bar-stem', 3, 'left', false],
    ]) {
      const state = await page.evaluate(({ benchIndex, lastSeat }) => {
        const d = window.__debug;
        const candidates = d.SEATS.filter(item => item.table === d.BENCHES[benchIndex]);
        const seat = lastSeat ? candidates.at(-1) : candidates[0];
        if (!d.customers.length) d.spawnCustomer();
        const fred = d.customers[0];
        fred.seat.occupied = false;
        Object.assign(fred, { seat, x: seat.x, y: seat.y, state: 'sitting', moving: false,
          look: 3, facing: seatFacing(seat), orderType: null, sitTimer: 40, patienceDuration: 40 });
        seat.occupied = true;
        d.player.x = seat.x + 8; d.player.y = seat.y + 16;
        d.render();
        const frame = d.Assets.frameFor('fred', 'idle.' + fred.facing, 0);
        return { facing: fred.facing, frame: !!frame, seat: { x: seat.x, y: seat.y } };
      }, { benchIndex, lastSeat });
      if (state.facing !== expected || !state.frame) throw new Error(name + ' ' + seatName + ': wrong seated Fred frame: ' + JSON.stringify(state));
      await page.screenshot({ path: path.join(out, name + '-' + seatName + '.png') });
      results.push({ viewport: name, seatName, ...state });
    }
    await page.close();
    const gallery = await browser.newPage({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    gallery.on('pageerror', error => errors.push(error.message));
    gallery.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await gallery.goto(url + '/tools/art-review.html', { waitUntil: 'networkidle' });
    const fredCard = gallery.locator('figure').filter({ hasText: 'Fred' });
    if (await fredCard.count() !== 1) throw new Error(name + ': Fred missing from gallery');
    await gallery.selectOption('#scale', scale);
    await gallery.click('#pause');
    for (const direction of ['down', 'right', 'up', 'left']) {
      await gallery.selectOption('#direction', direction);
      for (const pose of ['idle', 'walk', 'talk']) {
        await gallery.selectOption('#pose', pose);
        await gallery.waitForTimeout(50);
        await fredCard.screenshot({ path: path.join(out, name + '-' + direction + '-' + pose + '.png') });
      }
    }
    if (errors.length) throw new Error(name + ': browser errors: ' + errors.join('; '));
    await gallery.close();
  }
  console.log(JSON.stringify({ out, results, galleryCaptures: 24, browserErrors: 0 }, null, 2));
}).catch(error => { console.error(error); process.exitCode = 1; });
