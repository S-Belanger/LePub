// Exports the game's directional sprite sets as PNG atlases + JSON under the
// src/assets.js contract (schemaVersion 1), into assets/sprites/, plus the
// manifest the game loads at startup. Runs the real game in headless Edge so
// the pixels are exactly what the procedural renderer would draw; replacing
// any exported PNG with a hand-cleaned sheet of the same layout is the
// intended production path.
//
//   node tools/export-sheets.js            # all families
//   node tools/export-sheets.js doe hunter # a subset
//
// Needs playwright-core in the npx cache (npx -y playwright-core) and Edge.
const http = require('http');
const fs = require('fs');
const path = require('path');

const repo = path.join(__dirname, '..');
const outDir = path.join(repo, 'assets', 'sprites');
const families = process.argv.slice(2).length ? process.argv.slice(2) : ['doe', 'hunter', 'nazim', 'sam', 'gerald', 'waiter'];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(repo, url === '/' ? 'index.html' : url);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});
function findPlaywright() {
  const base = path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx');
  if (fs.existsSync(base)) {
    for (const dir of fs.readdirSync(base)) {
      const cand = path.join(base, dir, 'node_modules', 'playwright-core');
      if (fs.existsSync(cand)) return cand;
    }
  }
  try { return require.resolve('playwright-core'); } catch (e) { throw new Error('playwright-core not found; run: npx -y playwright-core'); }
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  await new Promise(r => server.listen(8936, r));
  const { chromium } = require(findPlaywright());
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.goto('http://localhost:8936/', { waitUntil: 'load' });
  const written = [];
  for (const family of families) {
    const result = await page.evaluate((kind) => {
      const set = window.__debug.SPRITES[kind];
      if (!set || !set.dirs) return null;
      const bases = ['idle', 'walk', 'carry', 'carryWalk', 'gun', 'gunWalk', 'lean', 'slump', 'spray'];
      const dirs = ['down', 'up', 'right', 'left'];
      const frames = [];       // { id, sprite }
      const animations = {};
      for (const base of bases) {
        for (const dir of dirs) {
          const a = set[base + '.' + dir];
          if (!a) continue;
          const b = set[base + 'B.' + dir];
          const ids = [];
          const seq = b ? [a, b] : [a];
          seq.forEach((sprite, n) => { const id = base + '.' + dir + '.' + n; frames.push({ id, sprite }); ids.push(id); });
          animations[base + '.' + dir] = { loop: true, sequence: ids.map(id => ({ frameId: id, durationMs: b ? 140 : 1000 })) };
        }
      }
      const cellW = frames[0].sprite.w, cellH = frames[0].sprite.h;
      const cols = 8;
      const rows = Math.ceil(frames.length / cols);
      const cv = document.createElement('canvas');
      cv.width = cols * cellW; cv.height = rows * cellH;
      const g = cv.getContext('2d');
      const palette = set.palette;
      const meta = {
        schemaVersion: 1, assetId: 'lepub.' + kind, image: kind + '.png',
        imageSize: { width: cv.width, height: cv.height },
        frameSpace: 'untrimmed-source-pixels', pivotSpace: 'frame-local-pixels',
        authoredPixelsPerWorldUnit: 1 / (frames[0].sprite.pixelSize || 1),
        alphaPolicy: 'binary', palettePolicy: 'lepub-base-30+identity', fallbackKey: kind,
        directions: dirs, provenance: 'exported from the procedural overhead generator by tools/export-sheets.js',
        frames: {}, animations,
      };
      frames.forEach((f, i) => {
        const cx = (i % cols) * cellW, cy = Math.floor(i / cols) * cellH;
        for (let y = 0; y < f.sprite.h; y++) {
          const row = f.sprite.rows[y];
          for (let x = 0; x < f.sprite.w; x++) {
            const col = palette[row[x]];
            if (!col) continue;
            g.fillStyle = col;
            g.fillRect(cx + x, cy + y, 1, 1);
          }
        }
        const anchorX = f.sprite.anchorX == null ? f.sprite.w / 2 : f.sprite.anchorX / (f.sprite.pixelSize || 1);
        meta.frames[f.id] = { rect: { x: cx, y: cy, width: cellW, height: cellH }, pivot: { x: anchorX, y: cellH } };
      });
      return { png: cv.toDataURL('image/png'), meta };
    }, family);
    if (!result) { console.log(family + ': no directional set, skipped'); continue; }
    fs.writeFileSync(path.join(outDir, family + '.png'), Buffer.from(result.png.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(outDir, family + '.json'), JSON.stringify(result.meta, null, 2) + '\n');
    written.push(family);
    console.log(family + ': ' + Object.keys(result.meta.frames).length + ' frames, ' + result.meta.imageSize.width + 'x' + result.meta.imageSize.height);
  }
  const manifestPath = path.join(outDir, 'manifest.json');
  const existing = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { atlases: [] };
  const atlases = new Set(existing.atlases || []);
  for (const f of written) atlases.add(f + '.json');
  fs.writeFileSync(manifestPath, JSON.stringify({ atlases: [...atlases] }, null, 2) + '\n');
  await browser.close();
  server.close();
}
main().catch(e => { console.error(e); server.close(); process.exit(1); });
