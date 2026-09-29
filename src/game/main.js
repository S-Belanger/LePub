// ---- Main loop ----------------------------------------------------------------
// dt is clamped so coming back to a backgrounded tab never teleports anyone.
let lastTime = performance.now();
function loop(now) {
  // Resetting `lastTime` from a click can race an already-queued animation
  // frame whose timestamp is a few milliseconds older. Clamp both ends so
  // that frame cannot run the simulation backwards or extend a splash timer.
  const dt = clamp((now - lastTime) / 1000, 0, 0.05);
  lastTime = now;

  if (viewportDirty) {
    viewportDirty = false;
    applyViewport();
  }

  // A hidden document still gets the occasional frame in some browsers; skip
  // both simulation and painting rather than burning work nobody can see.
  if (!document.hidden) {
    pollGamepad();
    if (!paused) update(dt);
    syncCaughtDom();
    syncStartGate();
    render();
    Ambience.tick(roomSoundState());
  }
  requestAnimationFrame(loop);
}

// What the room should sound like this frame: how full it is, whether the
// hunter is on you, and whether play is on hold.
const roomSound = { people: 0, chase: false, calm: true };
function roomSoundState() {
  let people = regulars.length;
  for (const c of customers) if (c.state === 'sitting') people++;
  roomSound.people = people;
  roomSound.chase = hunterState === 'chase';
  roomSound.calm = paused || caught || !!shiftTally;
  return roomSound;
}

applyViewport();
resetGame();
requestAnimationFrame(loop);
