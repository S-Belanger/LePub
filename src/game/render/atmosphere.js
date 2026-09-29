// ---- Pass 7: foreground -----------------------------------------------------
// The lamp fixtures themselves hang above the room, so they draw over
// everything in the scene; dust drifts in front of all of it.
function drawForeground(camX, camY) {
  for (const lamp of DECOR.lamps) {
    const x = Math.round(lamp.x - camX);
    const y = Math.round(lamp.y - camY);
    if (x < -20 || y < -20 || x > viewW + 20 || y > viewH + 20) continue;
    const glow = lampIntensity(lamp);
    // Seen from above, a pendant is its green enamel dome with a brass rim
    // and the bulb burning through the middle, floating over the pool it
    // throws. No cone, no cord: the camera looks straight down the wire.
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x - 4, y - 5, 8, 10);
    ctx.fillRect(x - 5, y - 4, 10, 8);
    ctx.fillStyle = '#1d3a2c';
    ctx.fillRect(x - 3.5, y - 4, 7, 8);
    ctx.fillRect(x - 4, y - 3, 8, 6);
    ctx.fillStyle = '#2f5a42';
    ctx.fillRect(x - 3.5, y - 4, 3, 2);
    ctx.fillStyle = PUB.brass;
    ctx.fillRect(x - 2, y - 2, 4, 4);
    ctx.fillRect(x - 2.5, y - 1.5, 5, 3);
    ctx.fillStyle = glow > 1 ? '#fff8e0' : '#ffe9b0';
    ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.16 * glow;
    ctx.fillStyle = 'rgb(255,200,110)';
    ctx.fillRect(x - 7, y - 7, 14, 14);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  if (prefersReducedMotion) return;
  for (const d of DUST) {
    ctx.globalAlpha = d.a;
    ctx.fillStyle = '#ffe6bd';
    ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 1);
  }
  ctx.globalAlpha = 1;
}

// ---- Pass 8: grade ----------------------------------------------------------
// The room gets colder and heavier as the night wears on. Level-derived, so it
// resets for free along with the score.
function drawGrade() {
  const lvl = Math.min(getLevel(), EFFECTIVE_LEVEL_CAP);
  const nightAlpha = Math.min(0.16, 0.03 + (lvl - 1) * 0.014);
  ctx.globalAlpha = nightAlpha;
  ctx.fillStyle = PUB.midnight;
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.globalAlpha = 1;

  ensureVignette();
  ctx.drawImage(vignetteCanvas, 0, 0);
  drawDangerEdge();
}

// A red pulse creeping in from the edge the hunter is on while he's close
// and chasing — strongest when he's off camera, which is when you need it.
const DANGER_RANGE = 80;
function drawDangerEdge() {
  if (hunterState !== 'chase' || hunterOnSmokeBreak() || jamesonActive() || caught) return;
  const dx = hunter.x - player.x;
  const dy = hunter.y - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist > DANGER_RANGE) return;
  const cam = getCamera();
  const onScreen = hunter.x - cam.x > -8 && hunter.x - cam.x < viewW + 8 && hunter.y - cam.y > -8 && hunter.y - cam.y < viewH + 8;
  const pulse = 0.65 + 0.35 * Math.sin(gameTime * 9);
  const strength = (1 - dist / DANGER_RANGE) * (onScreen ? 0.22 : 0.42) * pulse;
  if (strength <= 0.01) return;
  // Three stepped bands rather than a gradient, weighted toward his side.
  const wx = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0;
  const wy = wx === 0 ? Math.sign(dy) : 0;
  for (let band = 0; band < 3; band++) {
    ctx.fillStyle = 'rgba(189,73,56,' + (strength * (1 - band * 0.3)).toFixed(3) + ')';
    const t = 2 + band * 2;
    if (wx <= 0) ctx.fillRect(0, 0, t, viewH);                 // left
    if (wx >= 0) ctx.fillRect(viewW - t, 0, t, viewH);         // right
    if (wy <= 0) ctx.fillRect(0, 0, viewW, t);                 // top
    if (wy >= 0) ctx.fillRect(0, viewH - t, viewW, t);         // bottom
  }
}
