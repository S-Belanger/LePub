// Production coverage, not just loader validity. Missing art must fail in CI
// even though the running game deliberately keeps its per-family fallback.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const art = require('../src/character-art');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({ console });
for (const file of ['src/sprites.js', 'src/assets.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
}
const kinds = vm.runInContext('Object.keys(SPRITES)', context);
const Assets = vm.runInContext('Assets', context);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/sprites/manifest.json')));
const records = manifest.atlases.map(file => ({ file,
  meta: JSON.parse(fs.readFileSync(path.join(root, 'assets/sprites', file))),
}));

function validateCoverage(spriteKinds, selected) {
  for (const kind of spriteKinds) {
    const required = Object.entries(art.families).filter(([, spec]) => spec.kind === kind);
    assert(required.length || art.proceduralExceptions[kind], 'Undeclared character: ' + kind);
  }
  for (const [kind, reason] of Object.entries(art.proceduralExceptions)) {
    assert(spriteKinds.includes(kind) && reason.length > 20, 'Stale/unexplained exception: ' + kind);
  }
  assert.equal(selected.length, Object.keys(art.families).length, 'Manifest must select exactly the contracted illustrated cast');
  for (const [family, spec] of Object.entries(art.families)) {
    assert(spriteKinds.includes(spec.kind), 'Unknown gameplay kind: ' + family);
    const matches = selected.filter(record => record.meta.fallbackKey === family);
    assert.equal(matches.length, 1, family + ': missing or competing atlas');
    const { file, meta } = matches[0];
    assert.equal(file, family + '-illustrated.json', family + ': legacy source selected');
    assert.equal(Assets.validate(meta), null, family + ': invalid atlas');
    assert.equal(meta.palettePolicy, 'illustrated-reference', family + ': wrong art policy');
    assert(meta.authoredPixelsPerWorldUnit >= art.minSourceDensity, family + ': insufficient source density');
    assert.deepEqual(meta.directions, art.directions, family + ': direction coverage');
    assert.equal(Object.keys(meta.frames).length, spec.rows.length * art.directions.length, family + ': source row coverage');
    if (spec.rowCuts) {
      assert.equal(spec.rowCuts.length, spec.rows.length + 1, family + ': row cuts');
      assert.equal(spec.rowCuts.at(-1), meta.imageSize.height, family + ': row-cut image mismatch');
      for (let row = 0; row < spec.rows.length; row++) for (const dir of art.directions) {
        const r = meta.frames[spec.rows[row] + '.' + dir].rect;
        assert(r.y >= spec.rowCuts[row] && r.y + r.height <= spec.rowCuts[row + 1], family + ': frame crosses row seam');
      }
    }
    const height = Math.max(...art.directions.map(dir => meta.frames['idle.' + dir].rect.height)) / meta.authoredPixelsPerWorldUnit;
    assert(Math.abs(height - spec.height) < 0.01, family + ': scale drift');
    for (const [pose, rows] of Object.entries(spec.animations)) for (const dir of art.directions) {
      const key = pose + '.' + dir, animation = meta.animations[key];
      assert(animation, family + ': missing pose ' + key);
      assert.deepEqual(animation.sequence.map(step => step.frameId), rows.map(row => row + '.' + dir), family + ': incorrect pose mapping ' + key);
      assert(animation.sequence.every(step => step.durationMs === (rows.length > 1 ? (spec.frameDurationMs || 160) : 1000)), family + ': timing drift ' + key);
    }
    for (const [row, offset] of Object.entries(spec.floorOffsets || {})) for (const dir of art.directions) {
      const frame = meta.frames[row + '.' + dir];
      assert(Math.abs(frame.rect.height - 2 - frame.pivot.y - offset * meta.authoredPixelsPerWorldUnit) < 0.01,
        family + ': floor anchor drift ' + row + '.' + dir);
    }
  }
}
validateCoverage(kinds, records);
for (const { meta } of records) {
  const png = fs.readFileSync(path.join(root, 'assets/sprites', meta.image));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', meta.image + ': PNG missing');
  assert.equal(png.readUInt32BE(16), meta.imageSize.width, meta.image + ': width');
  assert.equal(png.readUInt32BE(20), meta.imageSize.height, meta.image + ': height');
  assert.equal(png[25], 6, meta.image + ': expected RGBA source');
}
// Prove the guard catches the exact class of regression that let Alex ship old.
assert.throws(() => validateCoverage([...kinds, 'new-regular'], records), /Undeclared character/);
assert.throws(() => validateCoverage(kinds, records.filter(r => r.meta.fallbackKey !== 'alex')), /Manifest/);
const missingSplit = JSON.parse(JSON.stringify(records));
delete missingSplit.find(r => r.meta.fallbackKey === 'alex').meta.animations['split.down'];
assert.throws(() => validateCoverage(kinds, missingSplit), /missing pose split.down/);
const lowDensity = JSON.parse(JSON.stringify(records));
lowDensity.find(r => r.meta.fallbackKey === 'alex').meta.authoredPixelsPerWorldUnit = 2;
assert.throws(() => validateCoverage(kinds, lowDensity), /insufficient source density/);
const wrongSplit = JSON.parse(JSON.stringify(records));
wrongSplit.find(r => r.meta.fallbackKey === 'alex').meta.animations['split.down'].sequence[0].frameId = 'idle.down';
assert.throws(() => validateCoverage(kinds, wrongSplit), /incorrect pose mapping split.down/);
console.log('Character art contract PASS: ' + kinds.length + ' gameplay kinds, ' + records.length + ' illustrated families; source/scale/pose/timing coverage and 5 regression guards.');
for (const [kind, reason] of Object.entries(art.proceduralExceptions)) console.log('Explicit exception ' + kind + ': ' + reason);
