// Measure generated source sheets and write frame metadata; never modifies the
// source PNG. Usage: node tools/import-illustrated.js doe hunter
// Four directions; row count and optional measured row cuts come from contract.
const fs = require('fs');
const path = require('path');
const { ROOT, session } = require('./browser-session');
const art = require('../src/character-art');
const families = process.argv.slice(2);
if (!families.length) throw new Error('Specify the illustrated families to import.');
for (const family of families) {
  if (!art.families[family]) throw new Error('Declare ' + family + ' in src/character-art.js first.');
}

session(async (browser, url) => {
  const page = await browser.newPage();
  await page.goto(url);
  for (const family of families) {
    const spec = art.families[family];
    const measured = await page.evaluate(async ({ kind, rows, rowCuts }) => {
      const image = new Image();
      image.src = 'assets/sprites/' + kind + '-illustrated.png';
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
      const alpha = (x, y) => pixels[(y * image.width + x) * 4 + 3];
      const cells = [];
      if (rowCuts && (rowCuts.length !== rows + 1 || rowCuts[0] !== 0 || rowCuts[rows] !== image.height || rowCuts.some((v, i) => !Number.isInteger(v) || (i && v <= rowCuts[i - 1])))) throw new Error(kind + ': invalid measured row cuts');
      for (let row = 0; row < rows; row++) for (let col = 0; col < 4; col++) {
        const x0 = Math.round(col * image.width / 4), x1 = Math.round((col + 1) * image.width / 4);
        const y0 = rowCuts ? rowCuts[row] : Math.round(row * image.height / rows);
        const y1 = rowCuts ? rowCuts[row + 1] : Math.round((row + 1) * image.height / rows);
        let left = x1, right = x0, top = y1, bottom = y0, opaque = 0, transparent = 0, edge = 0;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
          const a = alpha(x, y);
          if (!a) transparent++;
          if (a < 128) continue;
          if (x === x0 || x === x1 - 1 || y === y0 || y === y1 - 1) edge++;
          opaque++; left = Math.min(left, x); right = Math.max(right, x);
          top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
        if (transparent < (x1 - x0) * (y1 - y0) * 0.2 || !opaque) throw new Error(kind + ': invalid alpha/cell ' + row + ',' + col);
        if (edge) throw new Error(kind + ': opaque pixels cross cell boundary ' + row + ',' + col);
        // Preserve the actual sheet centre, rather than recentering asymmetric
        // props. Bottom of the opaque silhouette supplies the floor contact.
        const x = Math.max(x0, left - 2), y = Math.max(y0, top - 2);
        cells.push({ rect: { x, y, width: Math.min(x1, right + 3) - x, height: Math.min(y1, bottom + 3) - y },
          pivot: { x: (x0 + x1) / 2 - x, y: bottom + 1 - y }, opaque, transparent });
      }
      return { width: image.width, height: image.height, cells };
    }, { kind: family, rows: spec.rows.length, rowCuts: spec.rowCuts });
    const dirs = art.directions;
    const frames = {}, animations = {};
    const add = (id, ids) => { animations[id] = { loop: ids.length > 1, sequence: ids.map(frameId => ({ frameId, durationMs: ids.length > 1 ? (spec.frameDurationMs || 160) : 1000 })) }; };
    const rows = spec.rows;
    measured.cells.forEach((cell, i) => { frames[rows[Math.floor(i / 4)] + '.' + dirs[i % 4]] = { rect: cell.rect, pivot: cell.pivot }; });
    for (const dir of dirs) {
      for (const [pose, sequence] of Object.entries(spec.animations)) {
        add(pose + '.' + dir, sequence.map(row => row + '.' + dir));
      }
    }
    // Same physical scale in all directions. Lead silhouette ~24 world units,
    // regulars ~21. No change to world, viewport, collider or movement units.
    const height = Math.max(...measured.cells.slice(0, 4).map(c => c.rect.height));
    const density = height / spec.height;
    for (const [row, offset] of Object.entries(spec.floorOffsets || {})) {
      for (const dir of dirs) frames[row + '.' + dir].pivot.y -= offset * density;
    }
    const meta = { schemaVersion: 1, assetId: 'lepub.' + family + '.illustrated', image: family + '-illustrated.png',
      imageSize: { width: measured.width, height: measured.height }, frameSpace: 'untrimmed-source-pixels', pivotSpace: 'frame-local-pixels',
      authoredPixelsPerWorldUnit: density, alphaPolicy: 'translucent', palettePolicy: 'illustrated-reference', fallbackKey: family, directions: dirs,
      provenance: 'Built-in imagegen using documented overhead cast references; source PNG preserved. Bounds measured by tools/import-illustrated.js.', frames, animations };
    const error = await page.evaluate(meta => window.__debug.Assets.validate(meta), meta);
    if (error) throw new Error(family + ': ' + error);
    fs.writeFileSync(path.join(ROOT, 'assets/sprites', family + '-illustrated.json'), JSON.stringify(meta, null, 2) + '\n');
    console.log(family + ': ' + measured.width + 'x' + measured.height + ', ' + measured.cells.length + ' alpha-checked frames, density ' + density.toFixed(2));
  }
}).catch(error => { console.error(error); process.exitCode = 1; });
