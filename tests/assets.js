// Asset registry tests: `node tests/assets.js`. Dependency-free; runs
// src/assets.js in a bare vm context with fake I/O so the loader's contract,
// failure handling and lifecycle are exercised without a browser.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const context = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'assets.js'), 'utf8'), context, { filename: 'assets.js' });
const Assets = vm.runInContext('Assets', context);

let checks = 0;
function assert(cond, msg) { checks++; if (!cond) { console.error('FAIL: ' + msg); process.exit(1); } }

function goodMeta() {
  return {
    schemaVersion: 1, assetId: 'test.doe', image: 'doe.png', imageSize: { width: 128, height: 64 },
    frameSpace: 'untrimmed-source-pixels', pivotSpace: 'frame-local-pixels', authoredPixelsPerWorldUnit: 2,
    alphaPolicy: 'binary', palettePolicy: 'lepub-base-30', fallbackKey: 'doe', directions: ['down'],
    frames: {
      'idle.down.0': { rect: { x: 0, y: 0, width: 64, height: 64 }, pivot: { x: 32, y: 60 } },
      'idle.down.1': { rect: { x: 64, y: 0, width: 64, height: 64 }, pivot: { x: 32, y: 60 } },
    },
    animations: { 'idle.down': { loop: true, sequence: [{ frameId: 'idle.down.0', durationMs: 450 }, { frameId: 'idle.down.1', durationMs: 450 }] } },
  };
}

// ---- validate ---------------------------------------------------------------
assert(Assets.validate(goodMeta()) === null, 'good metadata validates');
const bad = [
  [m => { m.schemaVersion = 2; }, 'schemaVersion'],
  [m => { delete m.assetId; }, 'assetId'],
  [m => { m.imageSize.width = 0; }, 'imageSize'],
  [m => { m.frameSpace = 'trimmed'; }, 'frameSpace'],
  [m => { m.authoredPixelsPerWorldUnit = -1; }, 'authoredPixelsPerWorldUnit'],
  [m => { m.alphaPolicy = 'fuzzy'; }, 'alphaPolicy'],
  [m => { delete m.fallbackKey; }, 'fallbackKey'],
  [m => { m.frames['idle.down.1'].rect.x = 100; }, 'rect outside image'],
  [m => { m.frames['idle.down.1'].rect.width = 0.5; }, 'rect invalid'],
  [m => { m.frames['idle.down.1'].pivot.y = 99; }, 'pivot outside frame'],
  [m => { m.animations['idle.down'].sequence[0].frameId = 'nope'; }, 'unknown frame'],
  [m => { m.animations['idle.down'].sequence[0].durationMs = 0; }, 'duration invalid'],
  [m => { m.animations['idle.down'].loop = 'yes'; }, 'loop must be boolean'],
  [m => { m.frames = {}; }, 'no frames'],
];
for (const [mutate, expect] of bad) {
  const m = goodMeta();
  mutate(m);
  const reason = Assets.validate(m);
  assert(reason && reason.indexOf(expect) !== -1, 'rejects ' + expect + ' (got: ' + reason + ')');
}

// ---- load lifecycle with fake I/O -------------------------------------------
function fakeIO(jsonByUrl, imageByUrl, delays) {
  const calls = { json: 0, image: 0 };
  return {
    calls,
    fetchJson: url => { calls.json++; return new Promise((res, rej) => setTimeout(() => {
      if (!(url in jsonByUrl)) rej(new Error('HTTP 404')); else res(JSON.parse(JSON.stringify(jsonByUrl[url])));
    }, (delays && delays[url]) || 0)); },
    loadImage: url => { calls.image++; return new Promise((res, rej) => setTimeout(() => {
      if (!(url in imageByUrl)) rej(new Error('image failed to load'));
      else if (imageByUrl[url] === 'broken') rej(new Error('decode failed'));
      else res(imageByUrl[url]);
    }, 0)); },
  };
}
const goodImage = { naturalWidth: 128, naturalHeight: 64 };

async function run() {
  // Happy path.
  let io = fakeIO({ 'assets/sprites/doe.json': goodMeta() }, { 'assets/sprites/doe.png': goodImage });
  Assets.configure(io);
  const e = await Assets.load('assets/sprites/doe.json');
  assert(e && e.state === 'ready', 'valid atlas becomes ready');
  assert(Assets.hasFamily('doe'), 'family is served');
  let f = Assets.frameFor('doe', 'idle.down', 0);
  assert(f && f.rect.x === 0 && f.pivot.y === 60 && f.density === 2, 'frame 0 at t=0');
  f = Assets.frameFor('doe', 'idle.down', 600);
  assert(f && f.rect.x === 64, 'frame 1 at t=600');
  f = Assets.frameFor('doe', 'idle.down', 900 + 10);
  assert(f && f.rect.x === 0, 'loops back at t=910');
  assert(Assets.frameFor('doe', 'walk.down', 0) === null, 'unknown animation returns null');
  assert(Assets.frameFor('hunter', 'idle.down', 0) === null, 'unknown family returns null');

  // Dedupe: two concurrent loads share one fetch.
  io = fakeIO({ 'a/h.json': Object.assign(goodMeta(), { assetId: 'h', fallbackKey: 'hunter' }) }, { 'a/doe.png': goodImage }, { 'a/h.json': 10 });
  Assets.configure(io);
  await Promise.all([Assets.load('a/h.json'), Assets.load('a/h.json')]);
  assert(io.calls.json === 1, 'concurrent loads of one URL fetch once');

  // Failures: missing JSON, invalid schema, missing image, size mismatch, decode failure.
  io = fakeIO({
    'f/bad-schema.json': Object.assign(goodMeta(), { schemaVersion: 9 }),
    'f/no-image.json': Object.assign(goodMeta(), { image: 'missing.png' }),
    'f/wrong-size.json': Object.assign(goodMeta(), { imageSize: { width: 64, height: 64 }, frames: { 'idle.down.0': { rect: { x: 0, y: 0, width: 64, height: 64 }, pivot: { x: 32, y: 60 } } }, animations: { 'idle.down': { loop: true, sequence: [{ frameId: 'idle.down.0', durationMs: 100 }] } } }),
    'f/broken.json': Object.assign(goodMeta(), { image: 'broken.png' }),
  }, { 'f/doe.png': goodImage, 'f/broken.png': 'broken' });
  Assets.configure(io);
  for (const [url, expect] of [['f/missing.json', 'HTTP 404'], ['f/bad-schema.json', 'schemaVersion'], ['f/no-image.json', 'image failed'], ['f/wrong-size.json', 'metadata says'], ['f/broken.json', 'decode failed']]) {
    const r = await Assets.load(url);
    const st = Assets.status()[url];
    assert(r === null && st.state === 'failed' && st.reason.indexOf(expect) !== -1, url + ' fails with "' + expect + '" (got: ' + st.reason + ')');
  }
  assert(Assets.hasFamily('doe'), 'earlier ready family survives later failures');

  // Stale generation: a reset while a load is in flight drops its result.
  io = fakeIO({ 's/late.json': Object.assign(goodMeta(), { assetId: 'late', fallbackKey: 'sam' }) }, { 's/doe.png': goodImage }, { 's/late.json': 20 });
  Assets.configure(io);
  const pending = Assets.load('s/late.json');
  Assets.reset();
  const late = await pending;
  assert(late === null && !Assets.hasFamily('sam'), 'load completing after reset is dropped');

  // Manifest: missing manifest is quiet; a good one loads its atlases.
  io = fakeIO({ 'm/manifest.json': { atlases: ['g.json'] }, 'm/g.json': Object.assign(goodMeta(), { assetId: 'g', fallbackKey: 'gerald' }) }, { 'm/doe.png': goodImage });
  Assets.configure(io);
  await Assets.loadManifest('nowhere/manifest.json');
  await Assets.loadManifest('m/manifest.json');
  assert(Assets.hasFamily('gerald'), 'manifest loads its atlases');

  console.log('Asset registry tests passed: ' + checks + ' checks.');
}
run().catch(err => { console.error(err); process.exit(1); });
