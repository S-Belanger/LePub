// Canvas submission contract. The fake is only a canvas boundary recorder:
// source/destination coverage, resource reuse and calm/off behavior are real.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({});
const file = path.join(__dirname, '../src/effects.js');
if (fs.existsSync(file)) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
assert(context.Effects && context.Effects.createHazeRenderer, 'Effects module must expose the haze renderer');
function recorder() {
  const calls = []; const stack = [];
  return { calls, globalAlpha: 1, fillStyle: 'original',
    save() { stack.push([this.globalAlpha, this.fillStyle]); },
    restore() { [this.globalAlpha, this.fillStyle] = stack.pop(); },
    setTransform(...v) { calls.push(['transform', ...v]); },
    clearRect(...v) { calls.push(['clear', ...v]); },
    drawImage(...v) { calls.push(['image', this.globalAlpha, ...v]); },
    fillRect(...v) { calls.push(['fill', this.globalAlpha, this.fillStyle, ...v]); },
    beginPath() {}, rect(...v) { calls.push(['clipRect', ...v]); }, clip() {},
    createRadialGradient(...v) { calls.push(['gradient', ...v]); return { addColorStop() {} }; },
  };
}
const canvas = { width: 780, height: 1440 };
const ctx = recorder(); const backing = recorder();
let allocations = 0; let time = 1000; let calm = false;
let view = { width: 195, height: 360, top: 24 };
const renderer = context.Effects.createHazeRenderer({ canvas, context: ctx, artScale: 4,
  createCanvas: () => { allocations++; return { width: 0, height: 0, getContext: () => backing }; },
  getView: () => view, getReducedMotion: () => calm, now: () => time });
renderer.draw(0); renderer.draw(0.01);
assert.equal(allocations, 0, 'An inactive effect performs no canvas allocation or draws'); assert.equal(ctx.calls.length, 0);
renderer.draw(1);
assert.equal(allocations, 1);
const copied = backing.calls.find(c => c[0] === 'image');
assert.deepEqual(copied.slice(3), [0, 96, 780, 1344, 0, 0, 780, 1344], 'Copy only the scene below the fixed portrait sign');
const images = ctx.calls.filter(c => c[0] === 'image');
const strips = images.filter(c => c[1] === 1);
assert(strips.length > 0 && strips.length <= 64, 'Active phone haze has a bounded strip submission budget');
let bottom = 24;
for (const strip of strips) {
  near(strip[8], bottom); near(strip[9], 195);
  assert(strip[4] >= 0 && strip[4] + strip[6] <= 1344, 'No sample extends beyond the cropped backing');
  bottom += strip[10];
}
near(bottom, 360); assert.equal(images.length, strips.length + 2, 'The two doubled images remain present');
assert.equal(ctx.globalAlpha, 1); assert.equal(ctx.fillStyle, 'original', 'Canvas state is restored for crisp HUD/bubble drawing');
assert.equal(ctx.calls.filter(c => c[0] === 'gradient').length, 1);
ctx.calls.length = 0; backing.calls.length = 0; time += 1000; renderer.draw(0.5);
assert.equal(allocations, 1); assert(!ctx.calls.some(c => c[0] === 'gradient'), 'Stable viewport reuses its vignette gradient');
calm = true; ctx.calls.length = 0; renderer.draw(1);
const calmFirst = ctx.calls.filter(c => c[0] === 'image' || c[0] === 'fill').map(c => c.slice(0));
assert.equal(calmFirst.filter(c => c[0] === 'image').length, 2, 'Reduced motion keeps steady doubled image without wobble strips');
ctx.calls.length = 0; time += 2000; renderer.draw(1);
assert.deepEqual(ctx.calls.filter(c => c[0] === 'image' || c[0] === 'fill'), calmFirst, 'Reduced-motion pixels do not drift with wall time');
view = { width: 320, height: 180, top: 0 }; canvas.width = 1280; canvas.height = 720;
ctx.calls.length = 0; backing.calls.length = 0; renderer.draw(1);
assert.equal(allocations, 1, 'Resize reuses the existing backing canvas');
assert.deepEqual(backing.calls.find(c => c[0] === 'image').slice(3), [0, 0, 1280, 720, 0, 0, 1280, 720]);
assert.equal(ctx.calls.filter(c => c[0] === 'gradient').length, 1, 'Resize invalidates viewport-dependent gradient');
renderer.reset(); ctx.calls.length = 0; renderer.draw(0); assert.equal(ctx.calls.length, 0);
renderer.draw(1); assert.equal(allocations, 1); assert.equal(ctx.globalAlpha, 1);
console.log('Haze renderer PASS: off/crop/coverage/bounded submissions/reuse/resize/reset/calm/state restore.');
function near(actual, expected) { assert(Math.abs(actual - expected) < 1e-9, actual + ' != ' + expected); }
