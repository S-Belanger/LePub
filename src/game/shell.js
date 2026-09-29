// ---- Page shell: overlay, fullscreen, caught-screen buttons -----------------
// The DOM around the canvas is a thin control layer. It is only written on
// state transitions (never per frame), so it costs no layout work in the loop.
const el = {
  overlay: document.getElementById('overlay'),
  start: document.getElementById('btn-start'),
  help: document.getElementById('btn-help'),
  sound: document.getElementById('btn-sound'),
  music: document.getElementById('btn-music'),
  fullscreen: document.getElementById('btn-fullscreen'),
  caughtActions: document.getElementById('caught-actions'),
  restart: document.getElementById('btn-restart'),
  nameEntry: document.getElementById('name-entry'),
  nameField: document.getElementById('name-field'),
  nameSkip: document.getElementById('btn-name-skip'),
};

let paused = true; // the start overlay is up until the player begins

function setOverlay(open) {
  paused = open;
  el.overlay.classList.toggle('hidden', !open);
  el.start.textContent = overlaySeen ? 'RESUME' : 'START SHIFT';
  if (!open) {
    clearHeldInputs();
    overlaySeen = true;
    lastTime = performance.now();
  }
}
let overlaySeen = false;
function toggleOverlay() { setOverlay(!paused); }

// The very first START waits for the illustrated cast to finish loading (or
// fail over to procedural art), so a slow phone connection never opens the
// shift with placeholder people who then swap mid-run. A short grace period
// caps the wait; after it the fallback art is fine.
const START_GRACE_MS = 8000;
let startGateOpen = false;
function castSettled() {
  const entries = Object.values(Assets.status());
  return entries.length >= Object.keys(CharacterArt.families).length &&
    entries.every(entry => entry.state !== 'loading');
}
function syncStartGate() {
  if (startGateOpen || overlaySeen) return;
  const open = castSettled() || performance.now() > START_GRACE_MS;
  el.start.disabled = !open;
  el.start.textContent = open ? 'START SHIFT' : 'POURING...';
  startGateOpen = open;
}

// Opens the pause panel only when there is a live run to protect: not before
// the first START, and not over the caught screen or a shift tally, which
// are already waiting on the player.
function autoPause() {
  if (!paused && overlaySeen && !caught && !shiftTally) setOverlay(true);
}

function syncSoundButton() {
  const muted = Sound.isMuted();
  el.sound.classList.toggle('muted', muted);
  el.sound.setAttribute('aria-pressed', muted ? 'true' : 'false');
  el.sound.setAttribute('aria-label', muted ? 'Enable sound effects' : 'Mute sound effects');
}

function toggleSound() {
  const wasMuted = Sound.isMuted();
  Sound.setMuted(!wasMuted);
  syncSoundButton();
  if (wasMuted) Sound.play('start');
}

function syncMusicButton() {
  const off = !Ambience.isOn();
  el.music.classList.toggle('muted', off);
  el.music.setAttribute('aria-pressed', off ? 'true' : 'false');
  el.music.setAttribute('aria-label', off ? 'Turn music on' : 'Turn music off');
}

function toggleMusic() {
  Sound.unlock();
  Ambience.setOn(!Ambience.isOn());
  syncMusicButton();
}

syncSoundButton();
syncMusicButton();
if (!Sound.supported) { el.sound.classList.add('hidden'); el.music.classList.add('hidden'); }

el.start.addEventListener('click', () => {
  el.start.blur();
  Sound.unlock();
  Sound.play('start');
  setOverlay(false);
});
el.help.addEventListener('click', () => { el.help.blur(); toggleOverlay(); });
el.sound.addEventListener('click', () => { el.sound.blur(); toggleSound(); });
el.music.addEventListener('click', () => { el.music.blur(); toggleMusic(); });

// Fullscreen is a nicety, not a requirement: if the API is missing the button
// simply isn't offered and everything else still works.
const fullscreenSupported = !!(document.fullscreenEnabled || document.documentElement.webkitRequestFullscreen);
function fullscreenElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
function toggleFullscreen() {
  const root = document.documentElement;
  try {
    if (fullscreenElement()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
    }
  } catch (err) {
    /* Rejected (user gesture rules, iOS Safari) — stay windowed. */
  }
}
if (!fullscreenSupported) el.fullscreen.classList.add('hidden');
el.fullscreen.addEventListener('click', () => { el.fullscreen.blur(); toggleFullscreen(); });
document.addEventListener('fullscreenchange', () => {
  el.fullscreen.classList.toggle('active', !!fullscreenElement());
  invalidateViewport();
  clearHeldInputs();
});

el.restart.addEventListener('click', () => { el.restart.blur(); resetGame(); });

el.nameField.addEventListener('input', () => {
  nameInput = cleanName(el.nameField.value);
  if (el.nameField.value !== nameInput) el.nameField.value = nameInput;
});
el.nameEntry.addEventListener('submit', (e) => {
  e.preventDefault();
  el.nameField.blur();
  finishNameEntry(true);
});
el.nameSkip.addEventListener('click', () => { el.nameSkip.blur(); finishNameEntry(false); });

// Mirrors the caught state into the DOM exactly once per transition. The
// restart button stays hidden while a name is being typed, so a click can't
// throw the run away mid-entry; on touch the name field takes its place.
let caughtShown = false;
let nameEntryShown = false;
let bodyCaught = false;
function syncCaughtDom() {
  const show = caught && !enteringName;
  if (show !== caughtShown) {
    caughtShown = show;
    el.caughtActions.classList.toggle('hidden', !show);
  }
  if (caught !== bodyCaught) {
    bodyCaught = caught;
    document.body.classList.toggle('caught', caught);
  }
  const showName = caught && enteringName && usesTouch();
  if (showName !== nameEntryShown) {
    nameEntryShown = showName;
    el.nameEntry.classList.toggle('hidden', !showName);
    if (showName) el.nameField.value = '';
    else el.nameField.blur();
  }
}
