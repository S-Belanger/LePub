const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SCRIPT_FILES = [
  'src/pixelfont.js',
  'src/scenery.js',
  'src/sprites.js',
  'src/dialogue-content.js',
  'src/dialogue.js',
  'src/regulars.js',
  'src/sound.js',
  'game.js',
];

class ClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach(name => this.values.add(name)); }
  remove(...names) { names.forEach(name => this.values.delete(name)); }
  contains(name) { return this.values.has(name); }
  toggle(name, force) {
    const enabled = force === undefined ? !this.values.has(name) : force;
    if (enabled) this.values.add(name);
    else this.values.delete(name);
    return enabled;
  }
}

class Element {
  constructor(id = '') {
    this.id = id;
    this.classList = new ClassList();
    this.style = {};
    this.textContent = '';
  }
  addEventListener() {}
  setAttribute() {}
  blur() {}
  setPointerCapture() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
}

function makeCanvasContext() {
  return {
    imageSmoothingEnabled: false,
    fillStyle: '',
    font: '',
    textAlign: '',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillRect() {},
    fillText() {},
    drawImage() {},
    setTransform() {},
    putImageData() {},
    createImageData(width, height) {
      return { data: new Uint8ClampedArray(width * height * 4), width, height };
    },
  };
}

class Canvas extends Element {
  constructor(id = '') {
    super(id);
    this.width = 320;
    this.height = 180;
    this.context = makeCanvasContext();
  }
  getContext() { return this.context; }
}

function createRuntime() {
  const elements = new Map();
  const ids = [
    'stage', 'top-bar', 'btn-help', 'btn-sound', 'btn-fullscreen', 'overlay',
    'btn-start', 'caught-actions', 'btn-restart', 'touch', 'stick', 'btn-action',
  ];
  for (const id of ids) elements.set(id, new Element(id));
  elements.set('game', new Canvas('game'));
  elements.set('stick-knob', new Element('stick-knob'));

  const storage = new Map();
  const localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); },
  };
  const document = {
    hidden: false,
    fullscreenEnabled: false,
    fullscreenElement: null,
    webkitFullscreenElement: null,
    body: new Element('body'),
    documentElement: new Element('html'),
    getElementById(id) { return elements.get(id) || null; },
    querySelector(selector) {
      return selector === '#stick .stick-knob' ? elements.get('stick-knob') : null;
    },
    createElement(tag) { return tag === 'canvas' ? new Canvas() : new Element(); },
    addEventListener() {},
  };
  const window = {
    innerWidth: 1280,
    innerHeight: 720,
    visualViewport: null,
    localStorage,
    addEventListener() {},
    matchMedia() { return { matches: false, addEventListener() {} }; },
  };
  class MockImage {
    constructor() {
      this.complete = false;
      this.naturalWidth = 0;
      this.naturalHeight = 0;
      this.src = '';
    }
  }

  const context = vm.createContext({
    console,
    document,
    window,
    localStorage,
    navigator: { maxTouchPoints: 0 },
    Image: MockImage,
    performance: { now: () => 1000 },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    setTimeout,
    clearTimeout,
    Uint8ClampedArray,
    Map,
    Set,
    WeakMap,
    Math,
    JSON,
  });

  for (const file of SCRIPT_FILES) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
    vm.runInContext(source, context, { filename: file });
  }
  return { context, debug: window.__debug };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runUntil(step, done, maxTicks, failureMessage) {
  for (let tick = 0; tick < maxTicks; tick++) {
    if (done()) return;
    step();
  }
  throw new Error(failureMessage());
}

function assertPathClear(debug, start, waypoints, exclude, label) {
  let from = start;
  for (const to of waypoints) {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const samples = Math.max(1, Math.ceil(distance * 2));
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      assert(!debug.pointBlocked(x, y, exclude),
        `${label} crosses furniture at ${x.toFixed(1)},${y.toFixed(1)}.`);
    }
    from = to;
  }
}

function assertSpritePalettes(context) {
  vm.runInContext(`
    for (const [kind, set] of Object.entries(SPRITES)) {
      const palette = kind === 'customer' ? makeCustomerPalette() : set.palette;
      for (const [pose, sprite] of Object.entries(set)) {
        if (!sprite || !sprite.rows) continue;
        for (const row of sprite.rows) {
          for (const key of row) {
            if (key !== '.' && !palette[key]) {
              throw new Error(kind + '/' + pose + ' is missing palette key "' + key + '".');
            }
          }
        }
      }
    }
  `, context);
}

function run() {
  const { context, debug } = createRuntime();
  assert(debug, 'The debug API was not created.');
  assertSpritePalettes(context);
  assert(debug.reservedSeats().length === 3, 'Expected exactly three reserved regular seats.');
  assert(debug.regularState().length === 3, 'Expected exactly three named regulars.');

  const freeSeats = debug.freeGenericSeats();
  for (let i = 0; i < freeSeats; i++) debug.spawnCustomer();
  assert(debug.customers.length === freeSeats,
    `Expected ${freeSeats} customers, received ${debug.customers.length}.`);

  for (const customer of debug.customers) {
    assertPathClear(debug, debug.DOOR, customer.path, customer.seat.table,
      `Route to ${customer.seat.side} seat at ${customer.seat.x},${customer.seat.y}`);
    runUntil(
      () => debug.updateCustomer(customer, 0.05),
      () => customer.state === 'sitting',
      2400,
      () => `Customer could not reach ${customer.seat.side} seat at ` +
        `${customer.seat.x},${customer.seat.y}; stopped at ${customer.x},${customer.y}.`,
    );
  }

  for (const customer of debug.customers) {
    customer.orderType = null;
    customer.sitTimer = 0;
    debug.updateCustomer(customer, 0.05);
    assertPathClear(debug, customer, customer.path, customer.seat.table,
      `Exit route from ${customer.seat.side} seat at ${customer.seat.x},${customer.seat.y} ` +
        `(${JSON.stringify(customer.path)})`);
    let removed = false;
    runUntil(
      () => { removed = debug.updateCustomer(customer, 0.05) === 'remove'; },
      () => removed,
      2400,
      () => `Customer from ${customer.seat.side} seat at ` +
        `${customer.seat.x},${customer.seat.y} could not leave; stopped at ${customer.x},${customer.y}.`,
    );
  }

  debug.render();
  debug.spawnGhost();
  debug.spawnWaiter();
  const arrivingWaiter = debug.getWaiter();
  assertPathClear(debug, arrivingWaiter, arrivingWaiter.path, null, 'Waiter arrival route');
  debug.render();
  let waiterTick = 0;
  runUntil(
    () => {
      vm.runInContext('updateWaiter(0.05)', context);
      if (++waiterTick % 10 === 0) debug.render();
    },
    () => !debug.getWaiter(),
    2400,
    () => {
      const waiter = debug.getWaiter();
      return `Waiter could not complete the visit; state=${waiter.state}, ` +
        `position=${waiter.x},${waiter.y}, waypoint=${waiter.pathIndex}/${waiter.path.length}.`;
    },
  );

  // The serving loop: orders are picked up at the station that makes them,
  // the tray holds two, tips scale with patience, and the DOUBLE pays only
  // when both tray orders land.
  debug.resetGame();
  const seatFor = (type, i) => {
    debug.spawnCustomer();
    const c = debug.customers[debug.customers.length - 1];
    c.state = 'sitting'; c.x = c.seat.x; c.y = c.seat.y; c.path = null; c.pathIndex = 0;
    c.sitTimer = 40; c.patienceDuration = 40; c.orderType = type; c.orderPlacedAt = i; c.orderAppearAt = 0;
    return c;
  };
  const wineDrinker = seatFor('wine', 0);
  const beerDrinker = seatFor('beer-red', 1);
  const standAt = seg => { debug.player.x = seg.collider.x + 12; debug.player.y = seg.collider.y - 6; };
  const segFor = id => debug.BAR_SEGMENTS.find(b => b.station === id);
  standAt(segFor('hatch'));
  debug.handleInteract();
  if (debug.player.tray.length !== 0 || wineDrinker.beingCarried || beerDrinker.beingCarried) throw new Error('The kitchen should not hand over a drink order.');
  standAt(segFor('shelf'));
  debug.handleInteract();
  if (debug.player.tray.length !== 1 || !wineDrinker.beingCarried || beerDrinker.beingCarried) throw new Error('Shelf should hand over the wine order only.');
  standAt(segFor('taps'));
  debug.handleInteract();
  if (debug.player.tray.length !== 2 || !beerDrinker.beingCarried) throw new Error('Taps should hand over the beer as the second tray item.');
  debug.update(0.05);
  if (debug.player.speed !== 54) throw new Error('A full tray should slow the player to 54, got ' + debug.player.speed);
  debug.handleInteract();
  if (debug.player.tray.length !== 2) throw new Error('A third pickup must be refused on a full tray.');
  debug.player.x = wineDrinker.x; debug.player.y = wineDrinker.y + 6;
  debug.handleInteract();
  if (debug.player.tray.length !== 1 || !wineDrinker.served) throw new Error('Wine was not delivered next to its customer.');
  const afterFirst = debug.getScore();
  if (afterFirst < 15 || afterFirst > 25) throw new Error('A fresh delivery should tip 15-25, got ' + afterFirst);
  debug.player.x = beerDrinker.x; debug.player.y = beerDrinker.y + 6;
  debug.handleInteract();
  if (debug.player.tray.length !== 0 || !beerDrinker.served) throw new Error('Beer was not delivered next to its customer.');
  if (debug.getScore() - afterFirst < 25) throw new Error('Second tray delivery should include the DOUBLE bonus.');
  debug.update(0.05);
  if (debug.player.speed !== 62) throw new Error('Empty tray should restore speed 62.');
  debug.resetGame();

  // Every UI board the game can show: the HUD at a real score and partial
  // life, the level-done board, the caught board with the name field open,
  // and the ledger after a name is filed. All of them are pure canvas
  // painting, so a thrown error here is a broken frame in the real game.
  debug.setScore(240);
  debug.setLife(0.5);
  debug.update(0.05);
  if (debug.getLevelSplash().timer <= 0) throw new Error('Level-done splash did not fire at score 240.');
  debug.render();
  debug.forceCaught();
  if (!debug.getNameEntry().entering) throw new Error('Caught with a score should open the name field.');
  debug.render();
  vm.runInContext("finishNameEntry(true)", context);
  debug.render();
  if (!debug.loadHighScores().length) throw new Error('Filed score did not land in the ledger.');
  debug.clearHighScores();
  debug.resetGame();
  debug.render();

  console.log(`Smoke test passed: ${SCRIPT_FILES.length} scripts, ${freeSeats} customer routes, ` +
    `${debug.regularState().length} regulars, waiter visit, and serving loop, and render pass with HUD, level and caught boards.`);
}

run();
