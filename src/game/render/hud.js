// Reused; the HUD's footprint (chains included) is fed to the bubble layout
// as an obstacle.
const hudRect = { x: 3, y: 0, w: 0, h: 0 };
const HUD_CHAIN_H = 3;   // brass chain between the top of the frame and the sign
const HUD_PAD_X = 6;     // clears the corner rivets
// Life is three pints on the sign. Each is PINT_W × PINT_H and drains from the
// top as that third of the bar goes, so a hit reads as a pint knocked over
// and regeneration as the glass filling back up.
const LIFE_SEGMENT_COUNT = 3;
const PINT_W = 5;
const PINT_H = 7;
const PINT_GAP = 3;
const PINT_FILL_ROWS = PINT_H - 2; // rows between the foam line and the base

function lifeBarWidth() {
  return LIFE_SEGMENT_COUNT * PINT_W + (LIFE_SEGMENT_COUNT - 1) * PINT_GAP;
}

function hudLabels() {
  const left = shiftTimeLeft();
  const clock = left === Infinity ? null
    : Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0');
  return {
    shift: 'SHIFT ' + getLevel(),
    tips: 'TIPS ' + shiftTips + '/' + shiftTarget(shift),
    total: 'TOTAL ' + score,
    clock,
  };
}

// The Jameson row only exists while the shot does, so the plate grows for ten
// seconds and shrinks back. measureHud is what the dialogue layout treats as
// an obstacle, so the taller plate pushes bubbles down for exactly as long.
const JAMESON_BAR_H = 3;
function jamesonRowHeight() { return jamesonActive() ? JAMESON_BAR_H + 3 : 0; }

// The bladder row exists whenever there's anything to show — filling up, or
// counting down the dash to the bathroom — same grow/shrink treatment as the
// Jameson row, and stacked below it so the plate never overlaps either.
const BLADDER_BAR_H = 3;
function bladderRowHeight() { return (bladderLevel > 0 || bladderUrgentTimer > 0) ? BLADDER_BAR_H + 3 : 0; }

// Held packs as a row of tiny icons rather than a number — one slot per
// CIGARETTE_RESERVE_MAX, lit for what's actually in reserve so the empty
// slots still read as "room for more", not just absence. Always present
// (like the life bar) rather than popping in only once the player is
// carrying one, so the row never shifts everything below it around.
const PACK_ICON_W = 6;
const PACK_ICON_H = 6;
const PACK_ICON_GAP = 2;
function packRowWidth() { return CIGARETTE_RESERVE_MAX * PACK_ICON_W + (CIGARETTE_RESERVE_MAX - 1) * PACK_ICON_GAP; }

// Every row below the pints says what it is: an unlabeled amber bar is just
// a mystery that happens to shrink. The labels sit right of the bars/icons.
function hudRowLabels() {
  const secs = t => Math.ceil(t) + 'S';
  return {
    packs: cigaretteReserve > 0 ? 'SMOKES - ' + dropGlyph() + ' DROPS' : 'SMOKES',
    shot: 'JAMESON ' + secs(jamesonTimer),
    bladder: bladderUrgentTimer > 0 ? 'TO THE WC ' + secs(bladderUrgentTimer) : 'BLADDER',
  };
}

// The sign's height with no temporary rows: what the camera keeps clear.
function hudBaseHeight() {
  return HUD_CHAIN_H + 4 + FONT_H + 3 + PINT_H + 4 + PACK_ICON_H + 3;
}

function measureHud() {
  const labels = hudLabels();
  const rows = hudRowLabels();
  const textW = fontTextWidth(labels.shift) + 6 + fontTextWidth(labels.tips);
  const rowTwoW = lifeBarWidth() + 6 + fontTextWidth(labels.total) + (labels.clock ? 6 + fontTextWidth(labels.clock) : 0);
  const packW = packRowWidth() + 4 + fontTextWidth(rows.packs) - 3;
  const shotW = jamesonActive() ? lifeBarWidth() + 4 + fontTextWidth(rows.shot) - 3 : 0;
  const bladderW = bladderRowHeight() ? lifeBarWidth() + 4 + fontTextWidth(rows.bladder) - 3 : 0;
  hudRect.w = Math.max(textW, rowTwoW, packW, shotW, bladderW) + HUD_PAD_X * 2;
  hudRect.h = hudBaseHeight() + jamesonRowHeight() + bladderRowHeight();
  return hudRect;
}

function drawPint(x, y, fill) {
  const rows = Math.ceil(PINT_FILL_ROWS * clamp(fill, 0, 1));
  // Glass: light rim on the outer columns, dark inside.
  ctx.fillStyle = UI.walnutDark;
  ctx.fillRect(x + 1, y + 1, PINT_W - 2, PINT_H - 2);
  ctx.fillStyle = PUB.bottleClear;
  ctx.fillRect(x, y + 1, 1, PINT_H - 2);
  ctx.fillRect(x + PINT_W - 1, y + 1, 1, PINT_H - 2);
  ctx.fillRect(x + 1, y + PINT_H - 1, PINT_W - 2, 1);
  ctx.fillRect(x + 1, y, PINT_W - 2, 0.5);
  if (rows > 0) {
    const top = y + PINT_H - 1 - rows;
    ctx.fillStyle = PUB.amberDim;
    ctx.fillRect(x + 1, top, PINT_W - 2, rows);
    ctx.fillStyle = PUB.amber;
    ctx.fillRect(x + 1, top, PINT_W - 3, rows);
    ctx.fillStyle = PUB.cream;
    ctx.fillRect(x + 1, top, PINT_W - 2, fill >= 0.999 ? 1 : 0.5);
  }
  // Highlight down the left of the glass reads as the lamp on it.
  ctx.fillStyle = PUB.glass;
  ctx.fillRect(x, y + 1, 0.5, PINT_H - 3);
}

// One pack icon: lit slots get the same little white-box-red-flap thumbnail
// as the one dropped on the floor (see drawCigarettePacks), just without the
// poking-out cigarettes — there isn't room at this size to read them as
// anything but noise. An empty slot is just a faint outline.
function drawPackIcon(x, y, filled) {
  if (filled) {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x - 1, y - 1, PACK_ICON_W + 2, PACK_ICON_H + 2);
    ctx.fillStyle = '#e8e4d8';
    ctx.fillRect(x, y, PACK_ICON_W, PACK_ICON_H);
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(x, y, PACK_ICON_W, 2);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x, y, PACK_ICON_W, PACK_ICON_H);
  }
}

// The busboy's occasional line. Deliberately not routed through the Dialogue
// module — that machinery (mood, per-character cooldowns, history) exists
// for the three regulars, and a walk-on with one fixed line doesn't need any
// of it. A plain box above his head, same ink/cream as a dialogue bubble so
// it still reads as speech.
function drawBusboyLine(camX, camY) {
  if (!busboy || !busboy.line) return;
  const text = busboy.line;
  const bw = fontTextWidth(text) + DIALOGUE_PAD * 2;
  const bh = FONT_H + DIALOGUE_PAD * 2;
  const bx = clamp(Math.round(busboy.x - camX - bw / 2), 2, Math.max(2, viewW - bw - 2));
  const by = Math.round(busboy.y - busboy.h - camY - bh - 4);
  drawParchmentPlate(bx, by, bw, bh, PUB.ink);
  fontDrawText(ctx, text, bx + DIALOGUE_PAD, by + DIALOGUE_PAD, DIALOGUE_INK);
}

// The HUD is a walnut pub sign hung on two brass chains from the top of the
// frame: shift and tips on the top line, the three pints of life below.
// Compact, high contrast, and nothing the player doesn't need mid-chase.
// Nazim's state deliberately isn't here — it's readable from how he looks and
// what he says, which is the point of him.
function drawHud() {
  const hud = measureHud();
  const labels = hudLabels();
  const boardY = hud.y + HUD_CHAIN_H;
  const boardH = hud.h - HUD_CHAIN_H;
  drawWalnutPlate(hud.x, boardY, hud.w, boardH, { chains: HUD_CHAIN_H });

  const textY = boardY + 4;
  let tx = hud.x + HUD_PAD_X;
  fontDrawTextShadow(ctx, 'SHIFT', tx, textY, PUB.creamDim, UI.walnutDark);
  fontDrawTextShadow(ctx, String(getLevel()), tx + fontTextWidth('SHIFT ') , textY, PUB.cream, UI.walnutDark);
  tx += fontTextWidth(labels.shift) + 6;
  fontDrawTextShadow(ctx, 'TIPS', tx, textY, PUB.creamDim, UI.walnutDark);
  fontDrawTextShadow(ctx, labels.tips.slice(5), tx + fontTextWidth('TIPS '), textY, PUB.amber, UI.walnutDark);

  const pintY = textY + FONT_H + 3;
  for (let i = 0; i < LIFE_SEGMENT_COUNT; i++) {
    let x = hud.x + HUD_PAD_X + i * (PINT_W + PINT_GAP);
    // The pint that just went rocks on the rail and throws a splash.
    const knocked = pintKnockTimer > 0 && i === pintKnockIndex;
    if (knocked) {
      x += Math.round(Math.sin(pintKnockTimer * 40)) ;
      ctx.fillStyle = PUB.amber;
      ctx.fillRect(x + PINT_W + 1, pintY + PINT_H - 2 - Math.round(pintKnockTimer * 6), 1, 1);
      ctx.fillRect(x - 2, pintY + PINT_H - 1 - Math.round(pintKnockTimer * 4), 1, 1);
    }
    drawPint(x, pintY, clamp(life * LIFE_SEGMENT_COUNT - i, 0, 1));
  }
  // Brass coaster rail under the pints so they sit on something.
  drawBrassRule(hud.x + HUD_PAD_X - 1, pintY + PINT_H, lifeBarWidth() + 2);
  // Running total beside the pints, and the shift clock — red once it's
  // last call, blinking through the final five seconds.
  let rx = hud.x + HUD_PAD_X + lifeBarWidth() + 6;
  fontDrawTextShadow(ctx, labels.total, rx, pintY + 1, PUB.creamDim, UI.walnutDark);
  if (labels.clock) {
    rx += fontTextWidth(labels.total) + 6;
    const left = shiftTimeLeft();
    const blink = left <= 5 && Math.floor(gameTime * 4) % 2 === 0;
    if (!blink) fontDrawTextShadow(ctx, labels.clock, rx, pintY + 1, isLastCall() ? PUB.tomato : PUB.cream, UI.walnutDark);
  }

  // Held cigarette packs, right under the life bar.
  const rowLabels = hudRowLabels();
  const labelX = hud.x + 3 + lifeBarWidth() + 4;
  const packY = pintY + PINT_H + 4;
  for (let i = 0; i < CIGARETTE_RESERVE_MAX; i++) {
    const x = hud.x + 3 + i * (PACK_ICON_W + PACK_ICON_GAP);
    drawPackIcon(x, packY, i < cigaretteReserve);
  }
  fontDrawTextShadow(ctx, rowLabels.packs, hud.x + 3 + packRowWidth() + 4, packY + 1,
    cigaretteReserve > 0 ? PUB.cream : PUB.creamDim, UI.walnutDark);

  // The shot's remaining seconds: one unbroken amber bar under the life
  // segments, blinking through its last stretch alongside the sprite tint so
  // the two warnings agree.
  let rowY = packY + PACK_ICON_H + 3;
  if (jamesonActive()) {
    const jx = hud.x + 3;
    const jw = lifeBarWidth();
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(jx - 1, rowY - 1, jw + 2, JAMESON_BAR_H + 2);
    const blink = jamesonTimer < JAMESON_WARN_TIME && !prefersReducedMotion &&
      Math.floor(gameTime * 9) % 2 === 0;
    ctx.fillStyle = blink ? PUB.amberDim : PUB.amber;
    ctx.fillRect(jx, rowY, Math.ceil(jw * clamp(jamesonTimer / JAMESON_DURATION, 0, 1)), JAMESON_BAR_H);
    fontDrawTextShadow(ctx, rowLabels.shot, labelX, rowY - 1, PUB.amber, UI.walnutDark);
    rowY += JAMESON_BAR_H + 3;
  }

  // The bladder: a pale blue fill while it's just topping up, then a countdown
  // once full — same bar, same slot, so the plate reads as one system rather
  // than two. Its own blink (independent of the Jameson one above) is what
  // sells "the clock is actually running out" once it's the bathroom dash.
  if (bladderLevel > 0 || bladderUrgentTimer > 0) {
    const bx = hud.x + 3;
    const bw = lifeBarWidth();
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(bx - 1, rowY - 1, bw + 2, BLADDER_BAR_H + 2);
    const urgent = bladderUrgentTimer > 0;
    const frac = urgent ? clamp(bladderUrgentTimer / BLADDER_TIME_LIMIT, 0, 1) : bladderLevel / BLADDER_MAX;
    const blink = urgent && !prefersReducedMotion && Math.floor(gameTime * 11) % 2 === 0;
    ctx.fillStyle = blink ? PUB.burgundy : (urgent ? PUB.coolPale : PUB.cool);
    ctx.fillRect(bx, rowY, Math.ceil(bw * frac), BLADDER_BAR_H);
    fontDrawTextShadow(ctx, rowLabels.bladder, labelX, rowY - 1, urgent ? PUB.coolPale : PUB.creamDim, UI.walnutDark);
  }
}
