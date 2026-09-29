// ---- Pass 5: floor lighting -------------------------------------------------
// Warm pools under the lamps, cool spill under the windows and the door. Drawn
// before the characters so people are lit by the room, not tinted through it.
function drawFloorLight(camX, camY) {
  for (const lamp of DECOR.lamps) {
    const k = lampIntensity(lamp);
    // A wide soft pool, then a hot core: the reference's lamps have a bright
    // disc directly under the shade and a long soft skirt.
    drawGlow(glowFor(lamp.r, WARM_RGB, 0.26), lamp.x, lamp.y, k, camX, camY);
    drawGlow(glowFor(Math.round(lamp.r * 0.4), HOT_RGB, 0.16), lamp.x, lamp.y, k, camX, camY);
    // Varnish reflection: a long broken streak straight under the bulb, the
    // way the boards throw a lamp back in the reference.
    const sx = Math.round((lamp.x - camX) * 2) / 2;
    const sy = Math.round((lamp.y - camY) * 2) / 2;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const ry = sy + 2 + i * 3;
      const rw = Math.max(0.5, 3 - i * 0.28);
      ctx.globalAlpha = (0.2 - i * 0.02) * k;
      ctx.fillStyle = i < 3 ? '#fff4d6' : PUB.amber;
      ctx.fillRect(sx - rw / 2 + ((i & 1) ? 0.5 : 0), ry, rw, i < 3 ? 1 : 1.5);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  // The bar is its own light source: bottles and the gantry lamp lay a warm
  // strip along every counter top.
  for (const seg of BAR_SEGMENTS) {
    const c = seg.collider;
    const horizontal = c.w >= c.h;
    const length = horizontal ? c.w : c.h;
    for (let p = 10; p < length - 4; p += 20) {
      const gx = horizontal ? c.x + p : c.x + c.w / 2 - 2;
      const gy = horizontal ? c.y + c.h / 2 - 4 : c.y + p;
      drawGlow(glowFor(18, HOT_RGB, 0.07), gx, gy, 0.8, camX, camY);
    }
  }
  for (const table of TABLES) {
    const items = DECOR.clutter.get(table) || [];
    for (const item of items) {
      if (item.kind !== 'candle') continue;
      drawGlow(glowFor(11, HOT_RGB, 0.24), table.x + item.ox, table.y + item.oy, 0.9, camX, camY);
    }
  }
  for (const w of DECOR.windows) {
    drawGlow(glowFor(26, COOL_RGB, 0.14), w.x + w.w / 2, 8, 1, camX, camY);
  }
  // The fire: an orange pool that breathes, plus a hotter core in the hearth.
  const fire = prefersReducedMotion ? 1 : 0.86 + Math.sin(gameTime * 9.3) * 0.08 + Math.sin(gameTime * 23.7) * 0.06;
  drawGlow(glowFor(30, FIRE_RGB, 0.26), FIREPLACE.x + 8, FIREPLACE.y + 24, fire, camX, camY);
  drawGlow(glowFor(10, HOT_RGB, 0.24), FIREPLACE.x + 7, FIREPLACE.y + 21, fire, camX, camY);
  // Readability halos on the two leads, dim enough to be separation rather
  // than a spotlight, so they read even when a route runs between pools.
  drawGlow(glowFor(20, WARM_RGB, 0.14), player.x, player.y - 4, 1, camX, camY);
  if (hunterState !== 'arriving' && hunterSmokeState !== 'outside') drawGlow(glowFor(18, WARM_RGB, 0.1), hunter.x, hunter.y - 4, 1, camX, camY);
  // The door brightens while someone is coming in or going out.
  let doorBusy = 0;
  for (const c of customers) {
    if (c.state === 'sitting') continue;
    const d = Math.hypot(c.x - DOOR.x, c.y - DOOR.y);
    if (d < 40) doorBusy = Math.max(doorBusy, 1 - d / 40);
  }
  drawGlow(glowFor(26, COOL_RGB, 0.12), DOOR.x, WORLD_H - 8, 0.55 + doorBusy * 0.8, camX, camY);

  // A pool of its own under the deer while the shot is in him: same prebaked
  // glow the lamps use, so it reads as part of the room's lighting rather
  // than an effect pasted on top. It fades out with the last two seconds.
  if (jamesonActive()) {
    const fade = clamp(jamesonTimer / 2, 0, 1);
    const pulse = prefersReducedMotion ? 0.8 : 0.66 + 0.34 * Math.abs(Math.sin(gameTime * 6));
    drawGlow(glowFor(20, JAMESON_RGB, 0.34), player.x, player.y - 3, fade * pulse, camX, camY);
  }
}

// A soft additive rectangle (stepped edges, no gradient) for counter tops.
function drawGlowRect(x, y, w, h, alpha) {
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = alpha * (0.5 + i * 0.25);
    ctx.fillStyle = 'rgb(255,190,92)';
    ctx.fillRect(Math.round(x + i * 3), Math.round(y + i * 3), Math.max(0, w - i * 6), Math.max(0, h - i * 6));
  }
  ctx.globalAlpha = 1;
}

// The bladder losing its race against the clock, made unmistakable and made
// to stick: a stain left on the floor exactly where it happened. Unlike the
// sprite tint (wetPantsTimer, a few seconds) this doesn't fade — it's part
// of the room now, same as a table, until resetGame() wipes it. Drawn on the
// floor, under every character, same layer as the contact shadows in
// drawEntity.
function drawWetPantsPuddles(camX, camY) {
  if (!wetPantsPuddles.length) return;
  ctx.globalAlpha = 0.7;
  for (const p of wetPantsPuddles) {
    const x = Math.round(p.x - camX);
    const y = Math.round(p.y - camY);
    ctx.fillStyle = '#c8b45a';
    ctx.fillRect(x - 5, y - 2, 10, 4);
    ctx.fillRect(x - 3, y - 3, 6, 1);
    ctx.fillRect(x - 3, y + 2, 6, 1);
    ctx.fillStyle = '#e8d68a';
    ctx.fillRect(x - 2, y - 1, 4, 2);
  }
  ctx.globalAlpha = 1;
}

// The room is dark first, then lit. A single multiply over everything drawn
// so far (floor, furniture, people) drops the scene to a night base; the
// additive pools above bring back the honey wherever a lamp hangs. This is
// what makes the lamps the brightest thing on screen rather than the floor.
// Two steps, both a touch cool so the warm pools sit forward: the floor is
// multiplied twice (once alone, once with everything else) and ends up near
// black between lamps, while furniture and people take only the second,
// lighter step and stay readable in the dark.
const DARK_FLOOR = '#6a6066';
const DARK_SCENE = '#aea3a6';
function drawDarkness(colour) {
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.globalCompositeOperation = 'source-over';
}

// A stray pack on the floor: white box, a torn-open red top flap, a couple of
// cigarettes poking out. Small and flat enough to sit on the same layer as
// the puddles above — under every character, not part of the y-sorted pass.
function drawCigarettePacks(camX, camY) {
  if (!cigarettePacks.length) return;
  for (const cig of cigarettePacks) {
    // Fades over its last few seconds rather than popping away, so a pack
    // nobody found doesn't just disappear out from under the player.
    ctx.globalAlpha = clamp(cig.ttl / CIGARETTE_PACK_FADE_TIME, 0, 1);
    const x = Math.round(cig.x - camX);
    const y = Math.round(cig.y - camY);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x - 3, y + 1, 6, 2);
    ctx.fillStyle = '#e8e4d8';
    ctx.fillRect(x - 3, y - 4, 6, 5);
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(x - 3, y - 4, 6, 2);
    ctx.fillStyle = '#d8d0b8';
    ctx.fillRect(x - 2, y - 6, 1, 3);
    ctx.fillRect(x, y - 7, 1, 4);
    ctx.fillStyle = '#e07850';
    ctx.fillRect(x, y - 7, 1, 1);
  }
  ctx.globalAlpha = 1;
}
