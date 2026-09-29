// Encode the lossless PNG masters in art-source/sprites/ into the WebP sheets
// the game downloads (assets/sprites/*.webp), and point each atlas JSON at
// its WebP. Masters are never modified; frame rects, pivots and densities
// stay valid because the pixel dimensions are unchanged.
//
// Why: the eleven illustrated sheets are ~13 MB as PNG and ~4 MB as WebP.
// The game draws a figure under 100 backing pixels tall, where quality 0.95
// is indistinguishable from lossless, and alpha stays lossless in WebP.
//
// Usage: node tools/build-sprites.js            (every atlas in the manifest)
//        node tools/build-sprites.js doe fred   (just these families)
const fs = require('fs');
const path = require('path');
const { ROOT, session } = require('./browser-session');

const QUALITY = 0.95;
const SPRITES = path.join(ROOT, 'assets/sprites');
const MASTERS = path.join(ROOT, 'art-source/sprites');
const manifest = JSON.parse(fs.readFileSync(path.join(SPRITES, 'manifest.json'), 'utf8'));
const only = process.argv.slice(2);
const atlases = manifest.atlases.filter(file => !only.length || only.includes(file.replace(/-illustrated\.json$/, '')));
if (!atlases.length) throw new Error('No matching atlases in assets/sprites/manifest.json.');

session(async (browser, url) => {
  const page = await browser.newPage();
  await page.goto(url + '/tools/art-review.html');
  let before = 0, after = 0;
  for (const file of atlases) {
    const metaPath = path.join(SPRITES, file);
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const master = file.replace(/\.json$/, '.png');
    const masterPath = path.join(MASTERS, master);
    if (!fs.existsSync(masterPath)) throw new Error(file + ': master ' + path.relative(ROOT, masterPath) + ' is missing');
    const encoded = await page.evaluate(async ({ src, quality }) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.getContext('2d').drawImage(image, 0, 0);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return { width: image.width, height: image.height, data: btoa(binary) };
    }, { src: '/art-source/sprites/' + master, quality: QUALITY });
    if (encoded.width !== meta.imageSize.width || encoded.height !== meta.imageSize.height) {
      throw new Error(file + ': master is ' + encoded.width + 'x' + encoded.height + ', metadata says ' +
        meta.imageSize.width + 'x' + meta.imageSize.height + '. Re-run tools/import-illustrated.js first.');
    }
    const webp = file.replace(/\.json$/, '.webp');
    const bytes = Buffer.from(encoded.data, 'base64');
    fs.writeFileSync(path.join(SPRITES, webp), bytes);
    if (meta.image !== webp) {
      meta.image = webp;
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
    }
    const masterSize = fs.statSync(masterPath).size;
    before += masterSize;
    after += bytes.length;
    console.log(webp + ': ' + Math.round(masterSize / 1024) + ' KB -> ' + Math.round(bytes.length / 1024) + ' KB');
  }
  console.log('Total: ' + (before / 1048576).toFixed(1) + ' MB of masters -> ' + (after / 1048576).toFixed(1) + ' MB shipped.');
}).catch(error => { console.error(error); process.exitCode = 1; });
