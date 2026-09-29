// ---- House rules: first-time tip cards ---------------------------------------
// The pub has a dozen systems and the phone gets passed around the bar, so the
// game teaches each one the first time it actually happens in a run: a small
// parchment card along the bottom of the screen, one at a time. Detection is
// pure polling of existing state, so no gameplay code has to know tips exist.
// Cards show once per run (not once per device: the next person handed the
// phone is new to it too). Veterans switch them off on the pause panel; that
// choice is remembered.
const HINTS_KEY = 'lepub_hints';
const HINT_GAP = 2.5;          // seconds of quiet between two cards
const HINT_MIN_TIME = 4;
const HINT_PER_CHAR = 0.055;   // reading time grows with the text

function controlName(keyboard, touch, pad) {
  return lastInputDevice === 'pad' ? pad : lastInputDevice === 'touch' ? touch : keyboard;
}

// In priority order: when two are due on the same frame the earlier one wins
// and the other waits its turn.
const HINTS = [
  { id: 'order', when: () => anyOrderWaiting(),
    text: () => 'A TICKET! THE BAR UNDER IT IS THEIR PATIENCE. SERVE FAST FOR BIGGER TIPS.' },
  { id: 'stations', when: () => anyOrderWaiting(),
    text: () => 'BEER + WATER AT THE TAPS, WINE + COCKTAILS AT THE SHELF, FOOD AT THE KITCHEN. ' +
      controlName('E OR SPACE', 'THE RIGHT BUTTON', 'A') + ' GRABS.' },
  { id: 'tray', when: () => player.tray.length > 0,
    text: () => 'WALK IT TO THEM AND PRESS AGAIN. THE TRAY HOLDS TWO, BUT A FULL ONE SLOWS YOU.' },
  { id: 'hunter', when: () => hunterState !== 'arriving' && hunterSmokeState !== 'outside',
    text: () => 'THE HUNTER IS IN. HE SEES IN FRONT OF HIM. EACH CATCH COSTS A PINT - LOSE ALL THREE AND IT\'S OVER.' },
  { id: 'hit', when: () => life < LIFE_MAX && !caught,
    text: () => 'OUCH. STAY CLEAR FOR A FEW SECONDS AND YOUR PINTS REFILL.' },
  { id: 'jameson', when: () => jamesonActive(),
    text: () => 'A JAMESON! FOR 10 SECONDS THE HUNTER CAN\'T TOUCH YOU, AND HE KNOWS IT.' },
  { id: 'hunterOrder', when: () => !!hunter.orderType && !hunter.served,
    text: () => 'THE HUNTER WANTS A PINT. BRING HIM ONE AND HE SITS DOWN FOR A WHILE.' },
  { id: 'cigarettes', when: () => cigaretteReserve > 0,
    text: () => 'A PACK OF SMOKES. DROP IT WITH ' + controlName('C', 'THE C BUTTON', 'X') +
      ' AND THE HUNTER STEPS OUT FOR A CIGARETTE.' },
  { id: 'round', when: () => !!round,
    text: () => 'A ROUND! SERVE ALL THREE REGULARS WITHIN 20 SECONDS FOR A BONUS.' },
  { id: 'nazim', when: () => regulars.some(r => nazimIsFarGone(r)),
    text: () => 'NAZIM IS GETTING THERE: DOUBLE TIPS ON HIS DRINKS, BUT HE SPILLS. WATER SOBERS HIM UP.' },
  { id: 'bladder', when: () => bladderUrgentTimer > 0,
    text: () => 'THREE SHOTS IN. GET TO THE WC BEFORE THE TIMER RUNS OUT...' },
  { id: 'alex', when: () => !!alex && alex.state !== 'leaving',
    text: () => 'ALEX IS HERE FOR A SPLIT. WATCH THE AMBER OUTLINE AND GO AROUND HIM.' },
  { id: 'lastCall', when: () => isLastCall(),
    text: () => 'LAST CALL: NO NEW FACES, AND EVERYONE GETS IMPATIENT FASTER.' },
];

let hintsEnabled = loadHintsEnabled();
const hintsShown = new Set();
let hintActive = null;   // { id, lines, ttl, total }
let hintCooldown = 0;

function loadHintsEnabled() {
  try { return localStorage.getItem(HINTS_KEY) !== '0'; } catch { return true; }
}

function setHintsEnabled(on) {
  hintsEnabled = on;
  if (!on) hintActive = null;
  try { localStorage.setItem(HINTS_KEY, on ? '1' : '0'); } catch {}
}

function anyOrderWaiting() {
  for (const c of customers) if (c.orderType && !c.served && c.state === 'sitting') return true;
  for (const r of regulars) if (r.orderType && !r.served) return true;
  return false;
}

function resetHints() {
  hintsShown.clear();
  hintActive = null;
  hintCooldown = 0;
}

function updateHints(dt) {
  if (!hintsEnabled) return;
  if (hintActive) {
    hintActive.ttl -= dt;
    if (hintActive.ttl <= 0) { hintActive = null; hintCooldown = HINT_GAP; }
    return;
  }
  if (hintCooldown > 0) { hintCooldown -= dt; return; }
  // One voice at a time: a headline banner finishes before a card starts.
  if (caught || shiftTally || banner || bannerQueue.length) return;
  for (const hint of HINTS) {
    if (hintsShown.has(hint.id) || !hint.when()) continue;
    hintsShown.add(hint.id);
    const text = hint.text();
    const time = Math.max(HINT_MIN_TIME, text.length * HINT_PER_CHAR);
    hintActive = { id: hint.id, text, ttl: time, total: time };
    return;
  }
}

// Bottom of the screen, full width less a margin; on touch it sits above the
// stick and the action button, which are DOM widgets over the canvas.
function drawHint() {
  if (!hintActive || caught || shiftTally) return;
  const w = Math.min(viewW - 8, 190);
  const lines = fontWrapText(hintActive.text, w - 12);
  const h = lines.length * (FONT_H + 2) + 8;
  const touchLift = cameraInsets().bottom;
  const x = Math.round((viewW - w) / 2);
  const y = Math.round(viewH - h - 4 - touchLift);
  // Fade in and out over a quarter second rather than popping.
  const age = hintActive.total - hintActive.ttl;
  ctx.globalAlpha = prefersReducedMotion ? 1 : clamp(Math.min(age, hintActive.ttl) * 4, 0, 1);
  drawParchmentPlate(x, y, w, h, UI.brass, true);
  for (let i = 0; i < lines.length; i++) {
    fontDrawText(ctx, lines[i], x + Math.round((w - fontTextWidth(lines[i])) / 2), y + 5 + i * (FONT_H + 2), UI.ink);
  }
  ctx.globalAlpha = 1;
}
