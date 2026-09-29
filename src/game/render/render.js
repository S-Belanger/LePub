// Camera: centered on the player and clamped to the world. When the viewport
// is *wider* (or taller) than the world, clamping would pin the world to the
// top-left corner, so the axis is centered instead and the leftover margin is
// painted as the room's surroundings.
// Screen bands the camera keeps the pub out from under: the HUD sign along
// the top, and on a touch device the stick and action button along the
// bottom, unless the world is narrow enough on screen to sit between them.
// The camera may scroll above the rear wall (into the dark backdrop) so the
// regulars' booth is never permanently hidden behind the sign.
const TOUCH_CONTROLS_CSS = 150;   // stick height + margin, in CSS pixels
function cameraInsets() {
  const worldLeft = viewW >= WORLD_W ? (viewW - WORLD_W) / 2 : 0;
  const controlsW = 138 / pixelScale;
  return {
    top: hudBaseHeight() + 2,
    bottom: usesTouch() && worldLeft + 2 < controlsW ? Math.ceil(TOUCH_CONTROLS_CSS / pixelScale) : 0,
  };
}

function getCamera() {
  const insets = cameraInsets();
  const camX = viewW >= WORLD_W
    ? (WORLD_W - viewW) / 2
    : clamp(player.x - viewW / 2, 0, WORLD_W - viewW);
  const band = viewH - insets.top - insets.bottom;
  const camY = band >= WORLD_H
    ? -insets.top - (band - WORLD_H) / 2
    : clamp(player.y - insets.top - band / 2, -insets.top, WORLD_H - viewH + insets.bottom);
  return { x: Math.round(camX), y: Math.round(camY) };
}

function render() {
  const cam = getCamera();
  const camX = cam.x;
  const camY = cam.y;

  drawBackdrop();
  drawRoom(camX, camY);
  drawDarkness(DARK_FLOOR);
  drawSpills(camX, camY);
  drawWetPantsPuddles(camX, camY);
  drawCigarettePacks(camX, camY);
  drawAlexWorkoutArea(camX, camY);

  // Furniture and characters share one y-sorted pass so nearer (lower) things
  // draw over farther ones. Table sortY is still the table top's own front
  // edge, not the chair-inclusive footprint, so a customer on the south chair
  // draws in front of their table (see makeTable).
  drawList.length = 0;
  drawPoolIdx = 0;
  for (const f of FURNITURE) pushDrawable(f.sortY, 'furniture', f);
  for (const chair of CHAIRS) pushDrawable(chair.sortY, 'chair', chair);
  pushDrawable(player.y, 'entity', player);
  if (hunterState !== 'arriving' && hunterSmokeState !== 'outside') pushDrawable(hunter.y, 'entity', hunter);
  for (const c of customers) pushDrawable(seatedSortY(c), 'entity', c);
  for (const r of regulars) pushDrawable(seatedSortY(r), 'entity', r);
  // Floats above the floor with no ground shadow and no collision — it should
  // read as passing through the scene, not standing in it.
  if (ghost) pushDrawable(ghost.y, 'ghost', ghost);
  // The waiter, by contrast, is on the floor like anyone else — his own pass
  // exists only so the mist can be painted over his sprite.
  if (waiter) pushDrawable(waiter.y, 'waiter', waiter);
  // The busboy needs no such extras — his pose alone (mop/mopB) carries the
  // whole effect — so he draws through the ordinary entity path.
  if (busboy) pushDrawable(busboy.y, 'entity', busboy);
  // Alex, likewise — the split pose alone carries the gag, and his actual
  // blocking collider is a separate FURNITURE entry pushed/popped in
  // updateAlex, not anything drawn here.
  if (alex) pushDrawable(alex.y, 'entity', alex);
  drawList.sort(sortByY);
  for (const d of drawList) {
    if (d.type === 'furniture') drawFurnitureItem(d.ref, camX, camY);
    else if (d.type === 'chair') drawChair(d.ref, camX, camY);
    else if (d.type === 'ghost') drawGhost(d.ref, camX, camY);
    else if (d.type === 'waiter') drawWaiter(d.ref, camX, camY);
    else drawEntity(d.ref, camX, camY);
  }

  // Night base over everything drawn so far, then the lamps paint the room
  // back in — people included, so a character between pools is genuinely in
  // the dark and one under a lamp is genuinely lit.
  drawDarkness(DARK_SCENE);
  drawFloorLight(camX, camY);
  drawForeground(camX, camY);
  drawGrade();

  // Order bubbles float above the scene and above the grade, so a patience bar
  // is never dimmed by the lighting.
  placedOrderBubbles.length = 0;
  const measuredHud = measureHud();
  placedOrderBubbles.push({ x: measuredHud.x, y: measuredHud.y, w: measuredHud.w, h: measuredHud.h });
  for (const c of customers) drawOrderBubbleFor(c, camX, camY, null);
  for (const r of regulars) drawOrderBubbleFor(r, camX, camY, BUBBLE_FRAME_REGULAR);
  if (hunterState !== 'arriving' && !hunterOnSmokeBreak()) drawOrderBubbleFor(hunter, camX, camY, BUBBLE_FRAME_HUNTER);
  drawHunterAlert(camX, camY);
  for (const item of player.tray) {
    const carriedFor = item.customer;
    const carriedPatience = carriedFor ? clamp(carriedFor.sitTimer / carriedFor.patienceDuration, 0, 1) : null;
    drawOrderBubble(player.x, entityHeadTop(player), camX, camY, item.type, false, carriedPatience);
  }

  drawDialogueBubbles(camX, camY);
  drawBusboyLine(camX, camY);

  // Floating score/penalty feedback, fading out as it drifts up.
  for (const t of floatingTexts) {
    const tw = fontTextWidth(t.text);
    ctx.globalAlpha = clamp(t.ttl, 0, 1);
    fontDrawTextShadow(ctx, t.text, Math.round(t.x - camX - tw / 2), Math.round(t.y - camY), t.color);
  }
  ctx.globalAlpha = 1;

  drawGuidance(camX, camY);
  drawHint();
  drawHud();

  if (caught) drawCaughtOverlay();
  else if (shiftTally) drawShiftTallyOverlay();
}
