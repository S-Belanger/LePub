// Read-only atlas diagnostics for Claude users. No PNG/JSON writes.
// node docs/claude/scripts/inspect-atlas.js nick [--equal-rows]
const fs = require('fs');
const path = require('path');
const { ROOT, session } = require('../../../tools/browser-session');
const art = require('../../../src/character-art');
const [family, mode, ...extra] = process.argv.slice(2);
if (!family || !/^[a-z][a-z0-9-]*$/.test(family) || extra.length ||
    (mode && mode !== '--equal-rows')) {
  throw new Error('Usage: node docs/claude/scripts/inspect-atlas.js <family> [--equal-rows]');
}
const spec = art.families[family];
if (!spec) throw new Error('Declare the family in src/character-art.js first: ' + family);
const source = path.join(ROOT, 'assets/sprites', family + '-illustrated.png');
const header = fs.readFileSync(source);
if (header.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Expected a PNG source');
const png = { width: header.readUInt32BE(16), height: header.readUInt32BE(20),
  colorType: header[25], rgba: header[25] === 6 };

session(async (browser, url) => {
  const page = await browser.newPage();
  await page.goto(url);
  const measured = await page.evaluate(async ({ family, rows, declaredCuts }) => {
    const image = new Image();
    image.src = 'assets/sprites/' + family + '-illustrated.png';
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width; canvas.height = image.height;
    const g = canvas.getContext('2d', { willReadFrequently: true });
    g.drawImage(image, 0, 0);
    const pixels = g.getImageData(0, 0, canvas.width, canvas.height).data;
    const alpha = (x, y) => pixels[(y * canvas.width + x) * 4 + 3];
    const cuts = declaredCuts || Array.from({ length: rows + 1 }, (_, i) => Math.round(i * canvas.height / rows));
    if (cuts.length !== rows + 1 || cuts[0] !== 0 || cuts.at(-1) !== canvas.height ||
        cuts.some((n, i) => !Number.isInteger(n) || (i && n <= cuts[i - 1]))) throw new Error('Invalid contract row cuts');
    const fullyEmptyRows = [], emptySilhouetteRows = [];
    let transparentRun = -1, silhouetteRun = -1;
    for (let y = 0; y <= canvas.height; y++) {
      let anyAlpha = false, anyOpaque = false;
      if (y < canvas.height) for (let x = 0; x < canvas.width; x++) {
        const a = alpha(x, y); anyAlpha ||= a > 0; anyOpaque ||= a >= 128;
      }
      if (y < canvas.height && !anyAlpha && transparentRun < 0) transparentRun = y;
      if ((anyAlpha || y === canvas.height) && transparentRun >= 0) {
        fullyEmptyRows.push([transparentRun, y - 1]); transparentRun = -1;
      }
      if (y < canvas.height && !anyOpaque && silhouetteRun < 0) silhouetteRun = y;
      if ((anyOpaque || y === canvas.height) && silhouetteRun >= 0) {
        emptySilhouetteRows.push([silhouetteRun, y - 1]); silhouetteRun = -1;
      }
    }
    const cells = [];
    for (let row = 0; row < rows; row++) for (let col = 0; col < 4; col++) {
      const x0 = Math.round(col * canvas.width / 4), x1 = Math.round((col + 1) * canvas.width / 4);
      const y0 = cuts[row], y1 = cuts[row + 1];
      let left = x1, right = x0, top = y1, bottom = y0, opaque = 0, transparent = 0, edgeHits = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const a = alpha(x, y); if (a === 0) transparent++;
        if (a < 128) continue;
        opaque++; left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
        if (x === x0 || x === x1 - 1 || y === y0 || y === y1 - 1) edgeHits++;
      }
      const area = (x1 - x0) * (y1 - y0);
      cells.push({ row, col, direction: ['down', 'right', 'up', 'left'][col],
        cell: { x0, x1, y0, y1 }, silhouetteBounds: opaque ? { left, top, right, bottom } : null,
        opaque, fullyTransparent: transparent, fullyTransparentFraction: transparent / area, edgeHits });
    }
    return { width: canvas.width, height: canvas.height, rowCuts: cuts,
      fullyTransparentRowsAlphaZero: fullyEmptyRows, emptySilhouetteRowsAlphaBelow128: emptySilhouetteRows,
      cells, boundaryHitCells: cells.filter(c => c.edgeHits > 0).length };
  }, { family, rows: spec.rows.length, declaredCuts: mode ? undefined : spec.rowCuts });
  console.log(JSON.stringify({ family, mode: mode ? 'equal rows for diagnosis' : 'declared contract',
    source: path.relative(ROOT, source), png, ...measured,
    notice: 'Read-only diagnostics, not production acceptance. Run importer/tests and inspect the artwork.' }, null, 2));
}).catch(error => { console.error(error); process.exitCode = 1; });
