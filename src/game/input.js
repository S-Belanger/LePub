// ---- Input ----------------------------------------------------------------
const keys = new Set();

// Any real gesture may be the browser's one opportunity to start Web Audio.
// The explicit start/action sounds also call through this path, but these two
// listeners cover keyboard movement and closing the help panel with Escape.
window.addEventListener('pointerdown', Sound.unlock, { once: true, passive: true, capture: true });
window.addEventListener('keydown', Sound.unlock, { once: true, capture: true });

// Anything that can strand a held key/pointer (restart, tab switch, losing
// focus, entering fullscreen) funnels through here, so the player never walks
// off on their own after an interrupted input.
function clearHeldInputs() {
  keys.clear();
  releaseStick();
}

window.addEventListener('keydown', (e) => {
  // The touch name field handles its own typing (see shell.js).
  if (e.target === el.nameField) return;
  const k = e.key.toLowerCase();
  keys.add(k);
  // Name entry owns the keyboard outright while it is up: every other
  // shortcut would otherwise either eat a letter or drop the score.
  if (enteringName) {
    // A key still held from running when the last hit landed would otherwise
    // auto-repeat straight into the field. Backspace may repeat on purpose.
    if (e.repeat && k !== 'backspace') { if (e.key === ' ') e.preventDefault(); return; }
    if (k === 'enter') finishNameEntry(true);
    else if (k === 'backspace') nameInput = nameInput.slice(0, -1);
    else if (k === 'escape') finishNameEntry(false);     // bail out; the score is lost
    else if (e.key.length === 1 && nameInput.length < NAME_MAX_LEN && /[a-zA-Z0-9 '_-]/.test(e.key)) {
      nameInput += e.key;
    }
    if (e.key === ' ') e.preventDefault();
    return;
  }
  if (k === 'escape') { toggleOverlay(); return; }
  if (!e.repeat && k === 'm') { toggleSound(); return; }
  if (!e.repeat && k === 'n') { toggleMusic(); return; }
  if (caught && e.key === ' ') { if (!e.repeat) resetGame(); e.preventDefault(); return; }
  if (paused) return;
  if (shiftTally) {
    if (!e.repeat && (k === 'e' || e.key === ' ')) startNextShift();
    if (e.key === ' ') e.preventDefault();
    return;
  }
  // E is the primary interact key; Space is the same action (and stays the
  // restart key on the caught screen) so a one-handed grip works too.
  if (!e.repeat && (k === 'e' || e.key === ' ')) handleInteract();
  // C drops a held pack at the player's feet — a separate key from E/Space
  // since it isn't a grab-or-deliver action and can fire while carrying one.
  if (!e.repeat && k === 'c') dropCigarette();
  if (e.key === ' ') e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
// Losing the window or the tab pauses a live run: the hunter shouldn't get a
// free chase while somebody answers a text at the bar.
window.addEventListener('blur', () => { clearHeldInputs(); autoPause(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { clearHeldInputs(); autoPause(); }
  else lastTime = performance.now(); // don't bank a huge dt while hidden
});

// Touch stick output, in the same normalized form the keyboard produces.
const touchMove = { x: 0, y: 0 };

function getInputVector() {
  let dx = 0, dy = 0;
  if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
  if (keys.has('arrowright') || keys.has('d')) dx += 1;
  if (keys.has('arrowup') || keys.has('w')) dy -= 1;
  if (keys.has('arrowdown') || keys.has('s')) dy += 1;
  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.sqrt(2);
    dx *= inv; dy *= inv;
  }
  // The touch stick wins when it's being held, then a gamepad, then the
  // keyboard, so a hybrid device can use any of them without them fighting.
  if (touchMove.x !== 0 || touchMove.y !== 0) return { x: touchMove.x, y: touchMove.y };
  if (gamepadMove.x !== 0 || gamepadMove.y !== 0) return { x: gamepadMove.x, y: gamepadMove.y };
  return { x: dx, y: dy };
}
