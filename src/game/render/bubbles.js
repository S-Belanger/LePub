const BUBBLE_FRAME_DEFAULT = PUB.ink;
const BUBBLE_FRAME_REGULAR = PUB.amberDim; // a named regular is waiting
const BUBBLE_FRAME_CARRIED = PUB.greenLit; // this is the order you're carrying
const BUBBLE_FRAME_HUNTER = PUB.tomato;    // the hunter wants a pint

// "!" when he spots you, "?" while he's lost the trail, "..." over a pint.
function drawHunterAlert(camX, camY) {
  if (!hunterAlert || hunterState === 'arriving' || hunterOnSmokeBreak()) return;
  const scale = hunterAlert.text.length === 1 ? 2 : 1;
  const tw = fontTextWidth(hunterAlert.text) * scale;
  const bw = tw + 6;
  const bh = FONT_H * scale + 4;
  const bx = clamp(Math.round(hunter.x - camX - bw / 2), 2, Math.max(2, viewW - bw - 2));
  const by = clamp(Math.round(entityHeadTop(hunter) - camY - bh - 3), 2, Math.max(2, viewH - bh - 2));
  const accent = hunterAlert.text === '!' ? PUB.tomato : UI.brassDark;
  drawParchmentPlate(bx, by, bw, bh, accent);
  fontDrawText(ctx, hunterAlert.text, bx + 3, by + 2, hunterAlert.text === '!' ? PUB.tomato : UI.ink, scale);
}
const placedOrderBubbles = [];

function orderBubbleSpotFree(rect) {
  if (rect.x < 2 || rect.y < 2 || rect.x + rect.w > viewW - 2 || rect.y + rect.h > viewH - 2) return false;
  for (const other of placedOrderBubbles) {
    if (rectsTouch(rect, other)) return false;
  }
  return true;
}

// `grow` (0-1) drives a three-step pop: a stub, a short frame, then the full
// bubble with its icon and patience bar. Stepping it keeps the animation on
// whole pixels instead of easing through fractional sizes.
function drawOrderBubble(worldX, headTopY, camX, camY, orderType, highlighted, patienceFraction, frameColor, grow) {
  const icon = ORDER_ICONS[orderType];
  // A ticket is compact while nobody is in a hurry; it grows to the full
  // card once patience drops under 40% or it is yours, so the room's lamps
  // stay the brightest thing on screen most of the time.
  const urgent = patienceFraction != null && patienceFraction < 0.4;
  const pad = highlighted || urgent || patienceFraction == null ? 3 : 1;
  const bw = spriteVisualW(icon.sprite) + pad * 2;
  const full = spriteVisualH(icon.sprite) + pad * 2;
  const step = grow == null || grow >= 1 ? 3 : Math.max(1, Math.ceil(grow * 3));
  const bh = step === 3 ? full : (step === 2 ? Math.max(3, full - 4) : 3);
  const reserveTop = patienceFraction != null && step === 3 ? 3 : 0;
  let bx = clamp(Math.round(worldX - camX - bw / 2), 2, Math.max(2, viewW - bw - 2));
  let by = clamp(
    Math.round(headTopY - camY - bh - 4) - reserveTop,
    2,
    Math.max(2, viewH - (reserveTop + bh + 3) - 2),
  );
  const bounds = { x: bx, y: by, w: bw + 1, h: reserveTop + bh + 3 };

  // Orders at the rear booth used to disappear behind the top edge or the
  // score plate. Keep them camera-safe and try the open side of an occupied
  // bubble before dropping down over a character.
  if (!orderBubbleSpotFree(bounds)) {
    const candidates = [];
    for (const other of placedOrderBubbles) {
      candidates.push(
        { x: other.x + other.w + 2, y: by },
        { x: other.x - bounds.w - 2, y: by },
        { x: bx, y: other.y + other.h + 2 },
        { x: bx, y: other.y - bounds.h - 2 },
      );
    }
    for (const candidate of candidates) {
      const test = { x: candidate.x, y: candidate.y, w: bounds.w, h: bounds.h };
      if (!orderBubbleSpotFree(test)) continue;
      bounds.x = test.x;
      bounds.y = test.y;
      break;
    }
  }
  placedOrderBubbles.push(bounds);
  bx = bounds.x;
  by = bounds.y;
  const sx = bx;
  const sy = by + reserveTop;
  const border = highlighted ? BUBBLE_FRAME_CARRIED : (frameColor || BUBBLE_FRAME_DEFAULT);

  // A parchment order ticket in the shared material kit; the stitch turns
  // green on the one you're carrying so it reads apart from the queue.
  drawParchmentPlate(sx, sy, bw, bh, border, highlighted ? PUB.greenLit : null);
  const tailX = clamp(Math.round(worldX - camX) - 1, sx + 2, sx + bw - 4);
  drawPlateTail(tailX, sy + bh, border, true);

  if (step < 3) return;   // mid-pop: frame only, no icon and no patience bar
  drawSprite(icon.sprite, icon.palette, sx + pad, sy + pad, false);
  // Dog-eared corner in the colour of the station that makes it.
  const station = BAR_STATIONS[stationForType(orderType)];
  if (station) {
    ctx.fillStyle = UI.ink;
    ctx.fillRect(sx + bw - 3.5, sy + 0.5, 3, 1.5);
    ctx.fillRect(sx + bw - 2, sy + 0.5, 1.5, 3);
    ctx.fillStyle = station.color;
    ctx.fillRect(sx + bw - 3, sy + 1, 2, 0.5);
    ctx.fillRect(sx + bw - 2, sy + 1, 1, 1.5);
    ctx.fillRect(sx + bw - 3, sy + 1, 1.5, 1);
  }

  if (patienceFraction != null) {
    // Patience is a brass-capped gauge sitting on the ticket's top edge.
    const barY = sy - 3;
    const fillW = Math.round((bw - 2) * clamp(patienceFraction, 0, 1));
    ctx.fillStyle = UI.ink;
    ctx.fillRect(sx, barY - 0.5, bw, 2.5);
    ctx.fillStyle = UI.walnutDark;
    ctx.fillRect(sx + 1, barY, bw - 2, 1);
    ctx.fillStyle = patienceBarColor(patienceFraction);
    ctx.fillRect(sx + 1, barY, fillW, 1.5);
    ctx.fillStyle = UI.brass;
    ctx.fillRect(sx, barY - 0.5, 0.5, 2.5);
    ctx.fillRect(sx + bw - 0.5, barY - 0.5, 0.5, 2.5);
  }
}

// Draws whichever bubble a person currently warrants: the live order growing
// in, or the one just dealt with shrinking out. Walk-ins and regulars differ
// only in which frame colour they get, and in that a walk-in has to be seated
// to show one at all.
function drawOrderBubbleFor(e, camX, camY, frameColor) {
  if (e.orderType && !e.served && (e.isRegular || e.isHunter || e.state === 'sitting')) {
    const patience = clamp(e.sitTimer / e.patienceDuration, 0, 1);
    const grow = (gameTime - e.orderAppearAt) / BUBBLE_APPEAR_TIME;
    drawOrderBubble(e.x, entityHeadTop(e), camX, camY, e.orderType, e.beingCarried, patience, frameColor, grow);
  } else if (e.orderExit) {
    drawOrderBubble(e.x, entityHeadTop(e), camX, camY, e.orderExit.type, false, null, frameColor,
      e.orderExit.ttl / BUBBLE_EXIT_TIME);
  }
}

// ---- Dialogue bubbles -------------------------------------------------------
// Drawn after the order bubbles, above the scene. Three rules shape the
// layout: stay inside the camera, don't cover the speaker's own order bubble,
// and don't cover another bubble already placed this frame.
const DIALOGUE_MAX_W = 92;
const DIALOGUE_PAD = 2;
const DIALOGUE_LINE_GAP = 1;
const DIALOGUE_INK = PUB.ink;

// Reused across frames so the bubble pass allocates nothing per frame.
const placedBubbles = [];

function rectsTouch(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function drawDialogueBubbles(camX, camY) {
  const lines = Dialogue.getActive();
  if (!lines.length) return;
  placedBubbles.length = 0;
  placedBubbles.push(measureHud());
  for (const bubble of placedOrderBubbles) placedBubbles.push(bubble);

  for (const item of lines) {
    const r = regularById.get(item.who);
    if (!r) continue;

    const maxW = Math.min(DIALOGUE_MAX_W, viewW - 8);
    const rows = fontWrapText(item.text, maxW - DIALOGUE_PAD * 2);
    let textW = 0;
    for (const row of rows) textW = Math.max(textW, fontTextWidth(row));
    const bw = textW + DIALOGUE_PAD * 2;
    const bh = rows.length * FONT_H + (rows.length - 1) * DIALOGUE_LINE_GAP + DIALOGUE_PAD * 2;

    const headTop = entityHeadTop(r) - camY;
    // Three placements, in descending order of preference. The regulars' booth
    // sits close to the top wall, so on a short viewport there genuinely isn't
    // room for the ideal one and the fallbacks matter.
    //   1. clear above their order bubble (icon box + patience bar, ~22px)
    //   2. straight above their head, accepting that it covers that bubble
    //   3. under them, if even that would leave the camera
    const hasOrder = !!(r.orderType && !r.served);
    let bx = Math.round(r.x - camX - bw / 2);
    bx = clamp(bx, 2, Math.max(2, viewW - bw - 2));

    let by = Math.round(headTop - (hasOrder ? 22 : 6) - bh);
    let below = false;
    if (by < 2) by = Math.round(headTop - 6 - bh);
    if (by < 2) {
      // Pin it to the top of the camera instead. The rear wall behind it is
      // decoration, so this costs nothing; dropping the bubble below them
      // would cover the speaker and whoever is sitting in front of them.
      by = 2;
      if (by + bh > headTop + 2) {
        // Genuinely no room over their head. Hang it off the shoulder facing
        // away from the booth, so it lands on open floor instead of on top of
        // whoever they're sitting with.
        by = Math.round(r.y - camY + 5);
        below = true;
        bx = r.x >= REGULARS_TABLE.x
          ? Math.round(r.x - camX + 5)
          : Math.round(r.x - camX - bw - 5);
        bx = clamp(bx, 2, Math.max(2, viewW - bw - 2));
      }
    }

    // Nudge clear of any bubble already drawn this frame. Sideways first: the
    // three regulars sit within about 30px of each other, so moving a bubble
    // vertically tends to drop it straight onto one of them, while there is
    // usually room to sit two bubbles side by side.
    const rect = { x: bx, y: by, w: bw, h: bh };
    for (const other of placedBubbles) {
      if (!rectsTouch(rect, other)) continue;
      const right = other.x + other.w + 2;
      const left = other.x - bw - 2;
      if (right + bw <= viewW - 2) { rect.x = right; continue; }
      if (left >= 2) { rect.x = left; continue; }
      const up = other.y - bh - 3;
      const down = other.y + other.h + 3;
      if (up >= 2) { rect.y = up; below = false; }
      else if (down + bh <= viewH - 2) { rect.y = down; below = true; }
    }
    if (rect.y + bh > viewH - 2) rect.y = viewH - 2 - bh;
    if (rect.y < 2) rect.y = 2;
    placedBubbles.push(rect);

    // A parchment placard in the speaker's accent, with a tail pointing back
    // at whoever is talking. The offset dark plate keeps text readable over
    // the patterned rugs without resorting to a modern rounded card.
    const accent = r.cfg.accent || '#141414';
    drawParchmentPlate(rect.x, rect.y, bw, bh, accent);
    const tailX = clamp(Math.round(r.x - camX) - 1, rect.x + 2, rect.x + bw - 4);
    if (below) drawPlateTail(tailX, rect.y, accent, false);
    else drawPlateTail(tailX, rect.y + bh, accent, true);

    for (let i = 0; i < rows.length; i++) {
      fontDrawText(ctx, rows[i], rect.x + DIALOGUE_PAD, rect.y + DIALOGUE_PAD + i * (FONT_H + DIALOGUE_LINE_GAP), DIALOGUE_INK);
    }
  }
}
