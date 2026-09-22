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
  'src/assets.js',
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
  // Seats well away from every bar station, so a press at a counter can
  // never double as a delivery to a stool next to it.
  const farSeats = debug.SEATS.filter(seat => !seat.reserved && !seat.occupied &&
    debug.BAR_SEGMENTS.every(b => !(seat.x > b.collider.x - 40 && seat.x < b.collider.x + b.collider.w + 40 &&
      seat.y > b.collider.y - 40 && seat.y < b.collider.y + b.collider.h + 40)));
  if (farSeats.length < 2) throw new Error('Need two seats clear of the bar for the loop test.');
  const seatFor = (type, i) => {
    for (const seat of debug.SEATS) seat.occupied = seat !== farSeats[i];
    debug.spawnCustomer();
    for (const seat of debug.SEATS) seat.occupied = false;
    farSeats[i].occupied = true;
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

  // The hunter's rhythm: he arrives through the door after a delay, prowls,
  // spots the Doe only in front of him with a clear line, chases on an A*
  // route sized for his own body, and sits out a pint bought for him.
  debug.resetGame();
  if (debug.getHunterState().state !== 'arriving') throw new Error('A new run should start with the hunter arriving.');
  debug.player.x = 40; debug.player.y = 300;
  for (let i = 0; i < 24 * 20; i++) debug.update(0.05);
  const afterArrival = debug.getHunterState().state;
  if (afterArrival === 'arriving') throw new Error('Hunter never walked in.');
  debug.setHunterState('scanning');
  // He stands in the open lane between the wide tables and the right-hand
  // tables, facing down it. Behind him, out of the cone: unseen.
  debug.hunter.x = 135; debug.hunter.y = 240; debug.player.x = 135; debug.player.y = 200;
  vm.runInContext("hunterFacing = { x: 0, y: 1 }", context);
  if (debug.hunterCanSeePlayer()) throw new Error('Hunter should not see the Doe behind him.');
  // In front of him down the open lane: seen.
  debug.player.y = 290;
  if (!debug.hunterCanSeePlayer()) throw new Error('Hunter should see the Doe in front of him.');
  debug.update(0.05);
  if (debug.getHunterState().state !== 'chase') throw new Error('Seeing the Doe should start a chase.');
  if (!debug.getHunterState().alert || debug.getHunterState().alert.text !== '!') throw new Error('Spotting should raise the "!" placard.');
  // A chase route across the room clears furniture for the hunter's footprint.
  debug.player.x = 40; debug.player.y = 140;   // open floor under the taps
  debug.update(0.05);
  const chase = debug.getHunterState();
  if (!chase.path || !chase.path.length) throw new Error('Chase should compute a route.');
  assertPathClear(debug, debug.hunter, chase.path, null, 'Hunter chase route');
  // Buy him a pint: pick up at the taps, hand it over at arm's length.
  debug.hunterWantsPint();
  if (debug.getHunterState().order !== 'beer-blond') throw new Error('Hunter should want a pint.');
  debug.hunter.orderPlacedAt = -1;   // oldest in the queue, ahead of the seated crowd
  standAt(segFor('taps'));
  debug.handleInteract();
  if (debug.player.tray.length !== 1 || debug.player.tray[0].customer !== debug.hunter) throw new Error('Taps should hand over the hunter pint.');
  const before = debug.getScore();
  debug.player.x = debug.hunter.x + 20; debug.player.y = debug.hunter.y;
  debug.handleInteract();
  if (debug.getHunterState().state !== 'drinking') throw new Error('Serving the hunter should sit him down.');
  if (debug.getScore() - before < 30) throw new Error('Serving the hunter should pay the tip plus the house bonus.');
  for (let i = 0; i < 9 * 20; i++) debug.update(0.05);
  if (debug.getHunterState().state === 'drinking') throw new Error('Hunter should finish his pint.');
  debug.resetGame();

  // Nazim's night: gone, he tips double, Gerald orders him a water, and the
  // water sobers him a stage. The round pays once all three land in time.
  debug.resetGame();
  debug.setHunterState('arriving', 999);
  const nazim = debug.regulars.find(r => r.id === 'nazim');
  const deliverTo = r => { debug.player.tray.length = 0; r.beingCarried = true; debug.player.tray.push({ type: r.orderType, customer: r }); debug.player.x = r.x; debug.player.y = r.y + 6; debug.handleInteract(); };
  debug.setNazimDrinks(4);
  debug.forceRegularOrder('nazim', 'beer-blond');
  nazim.sitTimer = nazim.patienceDuration;   // fresh: base tip 20
  const beforeNazim = debug.getScore();
  deliverTo(nazim);
  if (nazim.stage.id !== 'gone') throw new Error('Fifth drink should make Nazim gone, got ' + nazim.stage.id);
  if (debug.getScore() - beforeNazim < 40) throw new Error('Drunk Nazim should tip double, got +' + (debug.getScore() - beforeNazim));
  if (!nazim.waterOwed) throw new Error('Reaching gone should owe a water.');
  nazim.orderCooldown = 0;
  debug.update(0.05);
  if (nazim.orderType !== 'water') throw new Error('Next order should be the water, got ' + nazim.orderType);
  standAt(segFor('taps'));
  debug.player.tray.length = 0;
  debug.handleInteract();
  if (!debug.player.tray.some(i => i.type === 'water')) throw new Error('Water should come from the taps.');
  deliverTo(nazim);
  if (nazim.stage.id !== 'drunk' || nazim.drinks !== 3) throw new Error('Water should take him back to drunk/3, got ' + nazim.stage.id + '/' + nazim.drinks);
  // Up on his feet and back down again.
  debug.setNazimDrinks(5);
  debug.startNazimWander();
  if (!nazim.wander) throw new Error('Gone Nazim should get up.');
  runUntil(() => debug.update(0.05), () => !nazim.wander, 1200, () => 'Nazim never sat back down; at ' + nazim.x + ',' + nazim.y);
  if (Math.abs(nazim.x - nazim.seat.x) > 0.5 || Math.abs(nazim.y - nazim.seat.y) > 0.5) throw new Error('Nazim should end his wander in his seat.');
  // The round.
  for (const r of debug.regulars) { r.orderType = null; r.orderCooldown = 99; }
  if (!debug.callRound()) throw new Error('Round should be callable with nobody mid-order.');
  if (debug.regulars.some(r => !r.orderType)) throw new Error('A round should give all three an order.');
  const beforeRound = debug.getScore();
  for (const r of debug.regulars) deliverTo(r);
  if (debug.getRound() !== null) throw new Error('Round should close once all three are served.');
  if (debug.getScore() - beforeRound < 25 + 30) throw new Error('Round should pay the three tips plus the bonus.');
  debug.resetGame();

  // The ghost drifting through the hunter stops him for a moment, once.
  debug.resetGame();
  debug.setHunterState('chase');
  debug.hunter.x = 100; debug.hunter.y = 150; debug.player.x = 100; debug.player.y = 300;
  debug.spawnGhost();
  const apparition = debug.getGhost();
  apparition.x = debug.hunter.x - 2; apparition.y = debug.hunter.y; apparition.targetX = debug.hunter.x + 40;
  debug.update(0.05);
  if (debug.getHunterState().state !== 'lost') throw new Error('The ghost passing through the hunter should spook him.');
  debug.resetGame();

  // Reactions ride on real events and never move anyone: a delivery lifts the
  // Doe, a hit outranks a celebration, and the timers clear on restart.
  debug.resetGame();
  const seatR = debug.SEATS.find(s => !s.reserved && !s.occupied);
  for (const s of debug.SEATS) s.occupied = s !== seatR;
  debug.spawnCustomer();
  for (const s of debug.SEATS) s.occupied = false;
  seatR.occupied = true;
  const cR = debug.customers[debug.customers.length - 1];
  cR.state = 'sitting'; cR.x = cR.seat.x; cR.y = cR.seat.y; cR.path = null; cR.sitTimer = 40; cR.patienceDuration = 40; cR.orderType = 'wine'; cR.orderPlacedAt = 0; cR.orderAppearAt = 0;
  cR.beingCarried = true; debug.player.tray.length = 0; debug.player.tray.push({ type: 'wine', customer: cR });
  debug.player.x = cR.x; debug.player.y = cR.y + 6;
  const beforeX = debug.player.x;
  debug.handleInteract();
  if (!debug.player.reaction || debug.player.reaction.kind !== 'serve') throw new Error('A delivery should start the serve reaction.');
  if (debug.player.x !== beforeX) throw new Error('A reaction must not move the player.');
  vm.runInContext("react(player, 'hit')", context);
  vm.runInContext("react(player, 'serve')", context);
  if (debug.player.reaction.kind !== 'hit') throw new Error('A hit must outrank a celebration.');
  debug.render();
  debug.resetGame();
  if (debug.player.reaction) throw new Error('Restart should clear reactions.');

  // Shifts: the clock runs, last call arms in the final seconds and stops
  // new walk-ins, the tally board freezes the floor until a press, and the
  // next shift starts from zero with the target raised.
  debug.resetGame();
  debug.setShiftClock(180 - 14);
  debug.update(0.05);
  if (!debug.getShift().lastCall) throw new Error('Last call should be on with 14 s left.');
  const crowd = debug.customers.length;
  for (let i = 0; i < 60; i++) debug.update(0.05);
  if (debug.customers.length > crowd) throw new Error('No new walk-ins should arrive during last call.');
  debug.setShiftClock(181);
  debug.update(0.05);
  const closed = debug.getShift();
  if (!closed.tally || closed.tally.shift !== 1) throw new Error('Shift 1 should close when its clock runs out.');
  const frozenX = debug.player.x;
  debug.keys.add('d');
  debug.update(0.05);
  debug.keys.delete('d');
  if (debug.player.x !== frozenX) throw new Error('The floor should be frozen under the tally board.');
  debug.setLife(0.5);
  debug.render();
  debug.startNextShift();
  const next = debug.getShift();
  if (next.shift !== 2 || next.tips !== 0 || next.target <= closed.tally.target) throw new Error('Shift 2 should start fresh with a higher target.');
  // Meeting the target closes a shift too.
  debug.setShift(7);   // untimed
  vm.runInContext("shiftTips = shiftTarget(shift)", context);
  debug.update(0.05);
  if (!debug.getShift().tally || debug.getShift().tally.shift !== 7) throw new Error('Meeting the target should close the shift.');
  debug.startNextShift();

  // Every UI board the game can show: the HUD at a real score and partial
  // life, the caught board with the name field open, and the ledger after a
  // name is filed. All of them are pure canvas painting, so a thrown error
  // here is a broken frame in the real game.
  debug.setScore(240);
  debug.setLife(0.5);
  debug.update(0.05);
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

  // Raster path: with a ready atlas the Doe draws from it (frame lookup
  // succeeds and render() survives drawImage with a source rect); without one
  // he falls back to the procedural sheet. Fake I/O, no network.
  const rasterMeta = {
    schemaVersion: 1, assetId: 'test.doe', image: 'doe.png', imageSize: { width: 80, height: 44 },
    frameSpace: 'untrimmed-source-pixels', pivotSpace: 'frame-local-pixels', authoredPixelsPerWorldUnit: 2,
    alphaPolicy: 'binary', palettePolicy: 'test', fallbackKey: 'doe', directions: ['down'],
    frames: { 'idle.down.0': { rect: { x: 0, y: 0, width: 40, height: 44 }, pivot: { x: 20, y: 44 } } },
    animations: { 'idle.down': { loop: true, sequence: [{ frameId: 'idle.down.0', durationMs: 500 }] } },
  };
  debug.Assets.configure({
    fetchJson: () => Promise.resolve(rasterMeta),
    loadImage: () => Promise.resolve({ naturalWidth: 80, naturalHeight: 44 }),
  });
  const rasterCheck = debug.Assets.load('t/doe.json').then(() => {
    if (!debug.Assets.hasFamily('doe')) throw new Error('Fake atlas should be ready.');
    debug.resetGame();
    debug.player.facing = 'down'; debug.player.moving = false;
    const frame = vm.runInContext('rasterFrameFor(player)', context);
    if (!frame || frame.rect.width !== 40) throw new Error('Doe should draw from the atlas frame.');
    debug.render();
    if (vm.runInContext('rasterFrameFor(hunter)', context) !== null) throw new Error('Hunter has no atlas and must fall back.');
    // Directional sheets have lean.up/slump.up, not the old bare aliases.
    // Checking only set.lean silently erased both intoxication silhouettes.
    vm.runInContext("regularById.get('nazim').talkTimer = 0", context);
    for (const [stage, pose] of [['drunk', 'lean'], ['gone', 'slump']]) {
      const actual = vm.runInContext(`regularPose(regularById.get('nazim'), NAZIM_STAGE_VISUALS.${stage})`, context);
      if (actual !== pose) throw new Error(`${stage} Nazim should use ${pose}, got ${actual}`);
    }
  });

  rasterCheck.then(() => console.log(`Smoke test passed: ${SCRIPT_FILES.length} scripts, ${freeSeats} customer routes, ` +
    `${debug.regularState().length} regulars, waiter visit, and serving loop, hunter states, Nazim's night, the round, the ghost's spook, reactions, shifts, and render pass with HUD, tally and caught boards; raster atlas path.`)).catch(err => { console.error(err); process.exit(1); });
}

run();
