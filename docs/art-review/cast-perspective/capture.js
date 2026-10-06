// Read-only review of actual production frames, not a source-image edit.
// node docs/art-review/cast-perspective/capture.js
const path = require('path');
const { session } = require('../../../tools/browser-session');
session(async (browser, url) => {
  const page = await browser.newPage({ viewport: { width: 1120, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url + '/tools/art-review.html', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Object.values(Assets.status()).length === 12 && Object.values(Assets.status()).every(a => a.state === 'ready'));
  await page.evaluate(() => {
    const main = document.querySelector('main');
    main.replaceChildren();
    const title = document.createElement('h1'); title.textContent = 'The approved overhead cast';
    const intro = document.createElement('p'); intro.textContent = 'Actual imported frames at one shared display scale. Jay is the shipped reference.';
    main.append(title, intro);
    for (const family of ['waiter', 'nick', 'alex', 'nazim', 'sam', 'gerald']) {
      const label = document.createElement('h2'); label.textContent = CharacterArt.families[family].name;
      main.append(label);
      const row = document.createElement('div'); row.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:12px';
      for (const [direction, name] of [['down','Facing you'],['right','Right'],['up','Facing away'],['left','Left']]) {
        const card = document.createElement('figure'), caption = document.createElement('figcaption'), canvas = document.createElement('canvas');
        caption.textContent = name; canvas.width = 236; canvas.height = 150;
        const frame = Assets.frameFor(family, 'idle.' + direction, 0);
        if (!frame) throw new Error('Missing ' + family + ':' + direction);
        const g = canvas.getContext('2d'), s = 6 / frame.density;
        g.imageSmoothingEnabled = false;
        g.drawImage(frame.image, frame.rect.x, frame.rect.y, frame.rect.width, frame.rect.height,
          Math.round(118-frame.pivot.x*s), Math.round(145-frame.pivot.y*s), frame.rect.width*s, frame.rect.height*s);
        card.append(caption, canvas); row.append(card);
      }
      main.append(row);
    }
  });
  await page.screenshot({ path: path.join(__dirname, 'cast-perspective.png'), fullPage: true });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Cast comparison PASS: 24 actual idle direction frames, shared scale6, 12 ready atlases, zero page errors.');
}).catch(e => { console.error(e); process.exitCode = 1; });
