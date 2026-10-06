// Mobile booth visibility, stable status geometry and orientation regressions.
const assert = require('assert/strict');
const vm = require('vm');
const { createRuntime } = require('./smoke');
const { context, debug: d } = createRuntime();
const run = code => vm.runInContext(code, context);
const portraitSizes = [[390, 844], [375, 667], [360, 780], [320, 568]];

function resize(width, height) {
  context.window.innerWidth = width;
  context.window.innerHeight = height;
  run('applyViewport()');
}

for (const [width, height] of portraitSizes) {
  d.resetGame();
  resize(width, height);
  // Keep the booth within the camera on shorter phones. The reported 390px
  // case retains the exact original player position.
  run(`paused = false; player.x = 62; player.y = ${height === 844 ? 164 : 100};`);
  const visibility = run(`(() => {
    const hud = { ...measureHud() }, cam = getCamera();
    return regulars.map(e => ({ id: e.id, covered: rectsTouch(hud, {
      x: e.x - cam.x - 8, y: entityHeadTop(e) - cam.y,
      w: 16, h: e.y - entityHeadTop(e),
    }) }));
  })()`);
  for (const patron of visibility) assert.equal(patron.covered, false,
    `${width}x${height}: mobile scorecard must leave ${patron.id}'s body visible`);
  const before = run('({ hud: { ...measureHud() }, camera: getCamera() })');
  run('jamesonTimer = 10; bladderLevel = BLADDER_MAX; bladderUrgentTimer = 20; cigaretteReserve = 3;');
  const after = run('({ hud: { ...measureHud() }, camera: getCamera() })');
  assert.equal(after.hud.h, before.hud.h, 'Status bars must not move the mobile play area');
  assert.equal(after.camera.y, before.camera.y, 'Status bars must not shift the mobile camera');
  assert(after.hud.w <= d.getViewport().viewW - 6, 'Mobile scoreboard must fit the canvas');
  d.render();
  run('player.y = WORLD_H - 12;');
  const bottom = run('({ head: entityHeadTop(player) - getCamera().y, feet: player.y - getCamera().y, sceneTop: hudSceneTop() })');
  assert(bottom.head >= bottom.sceneTop && bottom.feet < d.getViewport().viewH,
    'Camera must keep the player visible at the bottom of the pub');
  d.render();
}

const position = { x: d.player.x, y: d.player.y };
resize(844, 390);
assert.equal(d.getViewport().portrait, false);
assert.equal(d.player.x, position.x);
assert.equal(d.player.y, position.y);
run('jamesonTimer = 0; bladderLevel = 0; bladderUrgentTimer = 0;');
assert(run('measureHud().w < viewW - 6'), 'Landscape keeps its existing corner sign');
d.render();
resize(390, 844);
d.resetGame();
assert.equal(d.getCigaretteReserve(), 0);
console.log('HUD PASS: four portrait sizes, unobstructed booth, stable status layout, orientation and reset.');
