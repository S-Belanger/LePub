// Movement regressions: normalize bindings, opposite keys, analog priority and
// interruption clearing. Runs the shipped classic script without browser mocks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({});
const file = path.join(__dirname, '../src/input.js');
if (fs.existsSync(file)) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
assert(context.Input && context.Input.create, 'Input module must expose the movement controller');
const keys = new Set();
const touchMove = { x: 0, y: 0 };
const input = context.Input.create({ keys, touchMove });
function near(value, expected) { assert(Math.abs(value - expected) < 1e-10, value + ' != ' + expected); }
function vector(x, y) { const v = input.vector(); near(v.x, x); near(v.y, y); }
assert.equal(input.normalizeKey('ArrowLeft'), 'arrowleft');
assert.equal(input.normalizeKey('W'), 'w');
assert.equal(input.normalizeKey(' '), ' ', 'Space remains the action binding');
keys.add('a'); keys.add('arrowleft'); vector(-1, 0);
keys.add('d'); vector(0, 0);
keys.clear(); keys.add('w'); keys.add('d'); vector(Math.SQRT1_2, -Math.SQRT1_2);
touchMove.x = 0.3; touchMove.y = -0.4; vector(0.3, -0.4);
input.clear(); vector(0, 0);
let s = input.stick(105, 106, { x: 100, y: 100 });
near(s.x, 0); near(s.y, 0); assert.equal(s.knobX, 5); assert.equal(s.knobY, 6);
s = input.stick(123, 100, { x: 100, y: 100 }); near(s.x, 0.5); near(s.y, 0); assert.equal(s.knobX, 23);
s = input.stick(160, 180, { x: 100, y: 100 }); near(s.x, 0.6); near(s.y, 0.8);
assert.equal(s.knobX, 28); assert.equal(s.knobY, 37); near(Math.hypot(s.x, s.y), 1);
s = input.stick(100, 100, { x: 100, y: 100 }); near(s.x, 0); near(s.y, 0);
keys.add('w'); touchMove.x = 1;
let released = false;
input.clear(() => { released = true; assert.equal(keys.size, 0); assert.equal(touchMove.x, 0); });
assert(released, 'Focus/reset clearing also releases owned pointer state'); vector(0, 0);
console.log('Input PASS: bindings/opposites/diagonal, analog priority/deadzone/clamp, shared clear.');
