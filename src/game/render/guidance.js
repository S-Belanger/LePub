// ---- Guidance: making the state of the room readable at a glance -------------
// Four small layers, all read-only views of existing state, drawn above the
// night grade so the lighting never dims them:
//   - banners        a headline card when something changes the rules for a
//                    while: a new shift, the hunter walking in, last call,
//                    a round, the bathroom dash
//   - action prompt  a keycap beside the Doe naming what the button will do
//                    right now (GRAB / SERVE / TRAY FULL / wrong counter)
//   - station badges a count of waiting orders on each counter's plaque, the
//                    one holding the oldest order pulsing
//   - edge arrows    when your delivery, an order about to lapse, or a
//                    chasing hunter is off screen, an arrow on the screen edge
//                    points the way
// Station colours (BAR_STATIONS[].color) tie the three together: tickets,
// plaques, badges and arrows all use them.

// ---- Which control the player is using, for prompt glyphs -------------------
let lastInputDevice = 'keyboard';   // 'keyboard' | 'touch' | 'pad'
window.addEventListener('keydown', () => { lastInputDevice = 'keyboard'; }, { capture: true, passive: true });
window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') lastInputDevice = 'touch'; }, { capture: true, passive: true });

function actionGlyph() { return lastInputDevice === 'pad' ? 'A' : 'E'; }
function dropGlyph() { return lastInputDevice === 'pad' ? 'X' : 'C'; }

// ---- Banners ------------------------------------------------------------------
const BANNER_TIME = 2.4;
let banner = null;            // { title, sub, color, t }
const bannerQueue = [];
const bannerSeen = { shift: 0, lastCall: false, round: false, hunter: false, bladder: false };

function announce(title, sub, color) {
  bannerQueue.push({ title, sub, color: color || PUB.amber, t: 0 });
}

function resetGuidance() {
  banner = null;
  bannerQueue.length = 0;
  bannerSeen.shift = 0;
  bannerSeen.lastCall = false;
  bannerSeen.round = false;
  bannerSeen.hunter = false;
  bannerSeen.bladder = false;
}

// Edge detection on existing state, so no system has to call in here.
function updateGuidance(dt) {
  if (!shiftTally && bannerSeen.shift !== shift) {
    bannerSeen.shift = shift;
    bannerSeen.lastCall = false;
    announce('SHIFT ' + shift, 'EARN ' + shiftTarget(shift) + ' IN TIPS' + (shiftIsTimed() ? ' BEFORE CLOSING' : ''));
  }
  const hunterIn = hunterState !== 'arriving';
  if (hunterIn && !bannerSeen.hunter) announce('HE\'S IN', 'THE HUNTER JUST WALKED IN', PUB.tomato);
  bannerSeen.hunter = hunterIn;
  if (isLastCall() && !bannerSeen.lastCall) announce('LAST CALL', 'NO NEW FACES - PATIENCE DRAINS FASTER', PUB.tomato);
  bannerSeen.lastCall = bannerSeen.lastCall || isLastCall();
  if (round && !bannerSeen.round) announce('A ROUND!', 'SERVE ALL THREE IN ' + ROUND_WINDOW + 'S FOR +' + ROUND_BONUS);
  bannerSeen.round = !!round;
  const dash = bladderUrgentTimer > 0;
  if (dash && !bannerSeen.bladder) announce('NATURE CALLS', 'GET TO THE WC - ' + BLADDER_TIME_LIMIT + 'S', PUB.coolPale);
  bannerSeen.bladder = dash;

  if (banner) {
    banner.t += dt;
    if (banner.t >= BANNER_TIME) banner = null;
  }
  if (!banner && bannerQueue.length) banner = bannerQueue.shift();
}

function drawBanner() {
  if (!banner || caught || shiftTally) return;
  const titleScale = 2;
  const titleW = fontTextWidth(banner.title) * titleScale;
  const subW = fontTextWidth(banner.sub);
  const w = Math.min(viewW - 8, Math.max(titleW, subW) + 16);
  const h = FONT_H * titleScale + FONT_H + 13;
  // Drops in from above, holds, then fades.
  const t = banner.t;
  const slide = prefersReducedMotion ? 0 : Math.max(0, 1 - t / 0.18);
  const alpha = clamp((BANNER_TIME - t) / 0.35, 0, 1);
  const x = Math.round((viewW - w) / 2);
  const y = Math.round(viewH * 0.22 - h / 2 - slide * 14);
  ctx.globalAlpha = alpha;
  drawWalnutPlate(x, y, w, h, { rail: true });
  drawCenteredText(banner.title, y + 4, banner.color, titleScale);
  drawCenteredText(banner.sub, y + 6 + FONT_H * titleScale + 2, PUB.cream);
  ctx.globalAlpha = 1;
}

// ---- Action prompt -------------------------------------------------------------
// Mirrors handleInteract's decision without doing any of it.
function interactPreview() {
  if (caught || shiftTally) return null;
  for (const item of player.tray) {
    if (canDeliverTo(item.customer)) return { word: 'SERVE', ready: true };
  }
  const seg = nearestBarSegment();
  if (!seg) return null;
  if (findOldestPendingOrder(BAR_STATIONS[seg.station].types)) {
    return player.tray.length >= TRAY_MAX ? { word: 'TRAY FULL', ready: false } : { word: 'GRAB', ready: true };
  }
  const elsewhere = findOldestPendingOrder();
  if (elsewhere) {
    const station = BAR_STATIONS[stationForType(elsewhere.orderType)];
    return { word: 'TRY ' + station.label, ready: false, color: station.color };
  }
  return null;
}

let actionReadyShown = false;
function drawActionPrompt(camX, camY) {
  const preview = interactPreview();
  // The touch action button lights up to match, so a thumb knows too.
  const ready = !!(preview && preview.ready);
  if (ready !== actionReadyShown && touchEl.action) {
    actionReadyShown = ready;
    touchEl.action.classList.toggle('ready', ready);
  }
  if (!preview) return;
  const px = Math.round(player.x - camX);
  const py = Math.round(entityHeadTop(player) - camY);
  const glyph = actionGlyph();
  const keyW = fontTextWidth(glyph) + 4;
  const wordW = fontTextWidth(preview.word);
  const w = (preview.ready ? keyW + 2 : 0) + wordW;
  let x = px + 9;
  if (x + w > viewW - 2) x = px - 9 - w;
  const y = py + 6;
  if (preview.ready) {
    const bob = prefersReducedMotion ? 0 : Math.round(Math.sin(gameTime * 6) * 0.5 + 0.5) * 0.5;
    ctx.fillStyle = UI.ink;
    ctx.fillRect(x - 0.5, y - 1.5 + bob, keyW + 1, FONT_H + 4);
    ctx.fillStyle = UI.brassDark;
    ctx.fillRect(x, y - 1 + bob, keyW, FONT_H + 3);
    ctx.fillStyle = UI.brass;
    ctx.fillRect(x, y - 1 + bob, keyW, FONT_H + 2);
    ctx.fillStyle = UI.brassLit;
    ctx.fillRect(x + 0.5, y - 1 + bob, keyW - 1, 0.5);
    fontDrawText(ctx, glyph, x + 2, y + bob, UI.ink);
    x += keyW + 2;
  }
  fontDrawTextShadow(ctx, preview.word, x, y, preview.ready ? PUB.cream : (preview.color || PUB.creamDim), UI.ink);
}

// ---- Station badges ------------------------------------------------------------
function pendingCountFor(types) {
  let n = 0;
  const wants = e => e.orderType && !e.served && !e.beingCarried && types.indexOf(e.orderType) !== -1;
  for (const c of customers) if (c.state === 'sitting' && wants(c)) n++;
  for (const r of regulars) if (wants(r)) n++;
  if (hunterState !== 'arriving' && !hunterOnSmokeBreak() && wants(hunter)) n++;
  return n;
}

function drawStationBadges(camX, camY) {
  const oldest = findOldestPendingOrder();
  const hot = oldest ? stationForType(oldest.orderType) : null;
  for (const bar of BAR_SEGMENTS) {
    const station = BAR_STATIONS[bar.station];
    const count = pendingCountFor(station.types);
    if (!count) continue;
    const tag = stationTagRect(bar);
    const label = String(count);
    const w = fontTextWidth(label) + 4;
    const h = FONT_H + 2;
    const x = Math.round(tag.x + tag.w - camX + 1);
    const y = Math.round(tag.y - camY - 2);
    if (bar.station === hot) {
      // The counter to head for next: a pulsing ring in its colour around
      // the plaque and badge, leaving the lettering itself untouched.
      const rx = Math.round(tag.x - camX) - 2;
      const ry = Math.round(tag.y - camY) - 2;
      const rw = tag.w + w + 5;
      const rh = tag.h + 4;
      ctx.globalAlpha = prefersReducedMotion ? 0.8 : 0.45 + 0.45 * Math.sin(gameTime * 5);
      ctx.fillStyle = station.color;
      ctx.fillRect(rx, ry, rw, 1);
      ctx.fillRect(rx, ry + rh - 1, rw, 1);
      ctx.fillRect(rx, ry, 1, rh);
      ctx.fillRect(rx + rw - 1, ry, 1, rh);
      ctx.globalAlpha = 1;
    }
    fillClipped(x - 0.5, y - 0.5, w + 1, h + 1, UI.ink);
    fillClipped(x, y, w, h, station.color);
    fontDrawText(ctx, label, x + 2, y + 1, UI.ink);
  }
}

// ---- Edge arrows ---------------------------------------------------------------
const ARROW_MARGIN = 5;
const edgeTargets = [];

function collectEdgeTargets() {
  edgeTargets.length = 0;
  for (const item of player.tray) {
    if (item.customer) edgeTargets.push({ e: item.customer, color: BUBBLE_FRAME_CARRIED, icon: item.type });
  }
  const urgent = e => e.orderType && !e.served && !e.beingCarried && e.patienceDuration &&
    e.sitTimer / e.patienceDuration < 0.35;
  for (const c of customers) if (c.state === 'sitting' && urgent(c)) edgeTargets.push({ e: c, color: PUB.tomato, icon: c.orderType });
  for (const r of regulars) if (urgent(r)) edgeTargets.push({ e: r, color: PUB.tomato, icon: r.orderType });
  if (hunterState === 'chase' && !hunterOnSmokeBreak() && !jamesonActive()) edgeTargets.push({ e: hunter, color: PUB.tomato, text: '!' });
}

function drawEdgeArrows(camX, camY) {
  collectEdgeTargets();
  const insets = cameraInsets();
  const top = Math.max(ARROW_MARGIN, insets.top > 0 ? hudRect.y + hudRect.h + 2 : ARROW_MARGIN);
  const bottom = viewH - insets.bottom - ARROW_MARGIN;
  const left = ARROW_MARGIN;
  const right = viewW - ARROW_MARGIN;
  const cx = player.x - camX;
  const cy = player.y - camY;
  for (const target of edgeTargets) {
    const tx = target.e.x - camX;
    const ty = target.e.y - camY - 6;
    if (tx >= left && tx <= right && ty >= top && ty <= bottom) continue;
    // Walk from the player toward the target until the line leaves the safe
    // rectangle; that is where the arrow sits.
    const dx = tx - cx;
    const dy = ty - cy;
    let s = 1;
    if (dx !== 0) s = Math.min(s, dx > 0 ? (right - cx) / dx : (left - cx) / dx);
    if (dy !== 0) s = Math.min(s, dy > 0 ? (bottom - cy) / dy : (top - cy) / dy);
    const ax = Math.round(cx + dx * clamp(s, 0, 1));
    const ay = Math.round(cy + dy * clamp(s, 0, 1));
    drawEdgeArrow(ax, ay, Math.atan2(dy, dx), target);
  }
}

function drawEdgeArrow(x, y, angle, target) {
  // A chunky pixel chevron pointing outward, with what it's for beside it.
  const pulse = prefersReducedMotion ? 1 : 0.75 + 0.25 * Math.sin(gameTime * 8);
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  ctx.globalAlpha = pulse;
  for (let i = 0; i < 4; i++) {
    const along = 3 - i;
    const half = i;
    for (let k = -half; k <= half; k++) {
      const px = x + ux * along - uy * k;
      const py = y + uy * along + ux * k;
      ctx.fillStyle = UI.ink;
      ctx.fillRect(Math.round(px) - 0.5, Math.round(py) - 0.5, 2, 2);
      ctx.fillStyle = target.color;
      ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
    }
  }
  ctx.globalAlpha = 1;
  // Label sits on the inward side of the chevron.
  const lx = Math.round(x - ux * 9);
  const ly = Math.round(y - uy * 9);
  if (target.text) {
    fillClipped(lx - 3, ly - 4, 7, FONT_H + 3, target.color);
    fontDrawText(ctx, target.text, lx - 1, ly - 3, UI.ink);
  } else if (target.icon && ORDER_ICONS[target.icon]) {
    const icon = ORDER_ICONS[target.icon];
    const iw = spriteVisualW(icon.sprite);
    const ih = spriteVisualH(icon.sprite);
    drawParchmentPlate(lx - Math.round(iw / 2) - 1, ly - Math.round(ih / 2) - 1, iw + 2, ih + 2, target.color);
    drawSprite(icon.sprite, icon.palette, lx - Math.round(iw / 2), ly - Math.round(ih / 2), false);
  }
}

// ---- One entry point for the render pass ---------------------------------------
function drawGuidance(camX, camY) {
  if (caught || shiftTally) return;
  drawStationBadges(camX, camY);
  drawActionPrompt(camX, camY);
  drawEdgeArrows(camX, camY);
  drawBanner();
}
