// ---- Gamepad ----------------------------------------------------------------
// Standard-mapping pads (Xbox, PlayStation, Switch Pro in a browser): the left
// stick or d-pad moves, A grabs/delivers and also starts, resumes, restarts or
// closes the shift tally — everything Space does — X drops a cigarette pack,
// and Start pauses. Polled once per frame from the main loop; buttons fire on
// the press edge only, so holding A never machine-guns interactions.
const GAMEPAD_DEADZONE = 0.25;
const gamepadMove = { x: 0, y: 0 };
const gamepadHeld = new Set();
const gamepadSupported = typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function';

function connectedGamepad() {
  if (!gamepadSupported) return null;
  let pads;
  try { pads = navigator.getGamepads(); } catch { return null; }
  for (const pad of pads || []) if (pad && pad.connected) return pad;
  return null;
}

function gamepadPrimary() {
  Sound.unlock();
  if (enteringName) finishNameEntry(true);
  else if (caught) resetGame();
  else if (paused) el.start.click();
  else if (shiftTally) startNextShift();
  else handleInteract();
}

const GAMEPAD_BUTTONS = [
  [0, gamepadPrimary],                                                // A / Cross
  [2, () => { if (!paused && !caught && !enteringName) dropCigarette(); }], // X / Square
  [9, () => { if (enteringName || caught) return; if (paused) el.start.click(); else toggleOverlay(); }], // Start
];

function pollGamepad() {
  gamepadMove.x = 0;
  gamepadMove.y = 0;
  const pad = connectedGamepad();
  if (!pad) { gamepadHeld.clear(); return; }
  const pressed = i => !!(pad.buttons[i] && pad.buttons[i].pressed);
  let x = pad.axes[0] || 0;
  let y = pad.axes[1] || 0;
  if (pressed(14)) x = -1;
  if (pressed(15)) x = 1;
  if (pressed(12)) y = -1;
  if (pressed(13)) y = 1;
  const mag = Math.hypot(x, y);
  if (mag > GAMEPAD_DEADZONE || pad.buttons.some(b => b && b.pressed)) lastInputDevice = 'pad';
  if (mag > GAMEPAD_DEADZONE) {
    // Rescale past the deadzone so a gentle push still walks slowly and a
    // full push matches the keyboard, never faster.
    const scale = Math.min(1, (mag - GAMEPAD_DEADZONE) / (1 - GAMEPAD_DEADZONE)) / mag;
    gamepadMove.x = x * scale;
    gamepadMove.y = y * scale;
  }
  for (const [index, action] of GAMEPAD_BUTTONS) {
    if (!pressed(index)) { gamepadHeld.delete(index); continue; }
    if (gamepadHeld.has(index)) continue;
    gamepadHeld.add(index);
    action();
  }
}
