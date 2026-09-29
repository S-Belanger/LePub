// ---- Y-sorted pass ----------------------------------------------------------
// Entries are pooled and reused, so a frame with 14 customers on screen still
// allocates nothing.
const drawList = [];
const drawPool = [];
let drawPoolIdx = 0;

// Someone seated at the side of a table leans over its edge, so they draw
// after the tabletop even though their feet are above its front edge.
// North-side sitters stay behind the table; south-side sitters are already
// in front of it.
function isSeated(e) {
  const seat = e.seat;
  return !!seat && e.state === 'sitting' && e.x === seat.x && e.y === seat.y;
}
function seatedSortY(e) {
  const seat = e.seat;
  if (!isSeated(e)) return e.y;
  if (seat.table.type !== 'table' || (seat.side !== 'w' && seat.side !== 'e')) return e.y;
  return Math.max(e.y, seat.table.sortY + 0.5);
}

function pushDrawable(sortY, type, ref) {
  let e = drawPool[drawPoolIdx];
  if (!e) { e = { sortY: 0, type: '', ref: null }; drawPool.push(e); }
  drawPoolIdx++;
  e.sortY = sortY;
  e.type = type;
  e.ref = ref;
  drawList.push(e);
}

// The Jameson tint, or null for everyone and every other moment. The cycle
// runs on gameTime rather than a dedicated phase so it stops dead with the
// rest of the simulation during the level splash, and it steps through whole
// palettes rather than easing a colour, which is what keeps it pixel art.
// Over the last JAMESON_WARN_TIME it alternates with the ordinary palette, so
// the effect visibly runs out instead of simply stopping.
function jamesonPaletteFor(e) {
  if (e !== player) return null;
  if (wetPantsTimer > 0) return DOE_WET_PALETTE;
  if (!jamesonActive()) return null;
  if (prefersReducedMotion) return DOE_JAMESON_PALETTES[1];
  const step = Math.floor(gameTime * 9);
  if (jamesonTimer < JAMESON_WARN_TIME && step % 2 === 0) return null;
  return DOE_JAMESON_PALETTES[step % DOE_JAMESON_PALETTES.length];
}

// The pose an entity is in, as the raster animation id ("carryWalk.down"):
// the same name the procedural sets key their frames by.
function poseBase(e) {
  if (e === player && e.tray.length) return e.moving ? 'carryWalk' : 'carry';
  if (e === hunter) return hunterState === 'drinking' ? 'drink' : e.moving ? 'gunWalk' : 'gun';
  if (e.pose === 'spray' || e.pose === 'sprayB') return 'spray';
  const art = CharacterArt.families[rasterFamilyFor(e)];
  if (e.pose && art && art.animations[e.pose]) return e.pose;
  if (e.pose) return e.pose.indexOf('slump') === 0 ? 'slump' : e.pose.indexOf('lean') === 0 ? 'lean' : 'idle';
  return e.moving ? 'walk' : 'idle';
}
function animIdFor(e) { return poseBase(e) + '.' + (e.facing || 'down'); }

// Walk-in appearance uses the existing per-spawn look; gameplay identity and
// the per-entity procedural palette remain intact for missing-sheet fallback.
const CUSTOMER_ATLASES = ['customer-teal', 'customer-ochre', 'customer-blue', 'fred'];
function rasterFamilyFor(e) {
  return e.kind === 'customer' ? CUSTOMER_ATLASES[(e.look || 0) % CUSTOMER_ATLASES.length] : e.kind;
}

// A ready raster frame for this entity, or null for its procedural fallback.
function rasterFrameFor(e) {
  const family = rasterFamilyFor(e);
  if (!Assets.hasFamily(family)) return null;
  return Assets.frameFor(family, animIdFor(e), gameTime * 1000);
}

// Cache status variants of atlas frames, retaining their detail, alpha and
// feet pivot. The same status palette drives both raster and fallback art.
const rasterStatusCache = new WeakMap();
function statusRasterFrame(frame, e) {
  const palette = jamesonPaletteFor(e);
  if (!palette) return frame;
  let variants = rasterStatusCache.get(frame.image);
  if (!variants) { variants = new Map(); rasterStatusCache.set(frame.image, variants); }
  const wet = palette === DOE_WET_PALETTE;
  const colour = wet ? '#625034' : palette.f;
  const r = frame.rect;
  const key = [r.x, r.y, r.width, r.height, colour].join(':');
  if (variants.has(key)) return variants.get(key);
  const image = document.createElement('canvas');
  image.width = r.width; image.height = r.height;
  const paint = image.getContext('2d');
  paint.drawImage(frame.image, r.x, r.y, r.width, r.height, 0, 0, r.width, r.height);
  paint.globalCompositeOperation = 'source-atop';
  paint.globalAlpha = wet ? 0.5 : 0.3;
  paint.fillStyle = colour;
  const top = wet ? Math.floor(r.height * 0.6) : 0;
  paint.fillRect(0, top, r.width, r.height - top);
  const tinted = Object.assign({}, frame, { image, rect: { x: 0, y: 0, width: r.width, height: r.height } });
  variants.set(key, tinted);
  return tinted;
}

// Directional sets ("dirs") key poses as "pose.facing" with a two-step walk
// (walk/walkB); older sets use idle/walk and a horizontal flip.
// A walk-in's head shape is chosen at spawn (`look`), from the family's
// variant sets; everyone else has one set.
function spriteSetFor(e) {
  const set = SPRITES[e.kind];
  return set.variants && e.look != null ? set.variants[e.look % set.variants.length] : set;
}

function spriteForEntity(e) {
  const set = spriteSetFor(e);
  if (set.dirs) {
    const facing = e.facing || 'down';
    let base = poseBase(e);
    if (e.moving && (base === 'walk' || base === 'carryWalk' || base === 'gunWalk') && e.legFrame !== 1) base += 'B';
    return set[base + '.' + facing] || (base === 'drink' && set['gun.' + facing]) || set['idle.' + facing] || set.idle;
  }
  if (e === player && e.tray.length) {
    return set[e.moving && e.legFrame === 1 ? 'carryWalk' : 'carry'] || set.idle;
  }
  // Seated regulars pick a named pose; movers use the walk cycle.
  return e.pose
    ? (set[e.pose] || set.idle)
    : set[e.moving ? (e.legFrame === 1 ? 'walk' : 'idle') : 'idle'];
}

function entityHeadTop(e) {
  const frame = rasterFrameFor(e);
  if (frame) return e.y - frame.pivot.y / frame.density;
  return e.y - spriteVisualH(spriteForEntity(e));
}

function drawEntity(e, camX, camY) {
  const set = spriteSetFor(e);
  const sprite = spriteForEntity(e);
  const flip = set.dirs ? false : e.flip;   // directional sets author left; no mirroring
  const stepLift = (e.moving && e.legFrame === 1) || e.pose === 'sprayB' ? -0.5 : 0;
  const sx = e.x - camX - spriteAnchorX(sprite, flip) + (e.swayOffset || 0);
  const sy = e.y - camY - spriteVisualH(sprite) + stepLift;
  const footX = Math.round(e.x - camX);
  const footY = Math.round(e.y - camY);
  // Tiny broken rings make the two gameplay roles instantly readable in a
  // crowded room without turning the pub into a neon arena. They sit under
  // the feet, preserve the authored silhouette, and survive the night grade.
  if (e === player || e === hunter) {
    ctx.globalAlpha = e === player ? 0.92 : 0.72;
    ctx.fillStyle = e === player ? PUB.amber : PUB.tomato;
    ctx.fillRect(footX - 6, footY, 4, 1);
    ctx.fillRect(footX + 3, footY, 4, 1);
    ctx.fillRect(footX - 7, footY - 2, 1, 2);
    ctx.fillRect(footX + 7, footY - 2, 1, 2);
    ctx.globalAlpha = 1;
  }
  // Layered cast/contact shadow: a soft offset mass plus the crisp foot lock.
  // Someone seated is grounded by their chair instead.
  const seated = isSeated(e);
  if (!seated) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = PUB.tableShadow;
    ctx.fillRect(footX - 7, footY - 3, 14, 4);
    ctx.fillRect(footX - 8, footY - 2, 16, 2);
    ctx.fillRect(footX - 5, footY + 1, 10, 1);
    ctx.globalAlpha = 1;
  }
  // Flicker the player after a hit so the temporary invulnerability is visible
  // as well as mechanical. Whole-frame stepping keeps the pixel-art feel.
  const flicker = e === player && hitInvulnTimer > 0 && Math.floor(hitInvulnTimer * 10) % 2 === 0;
  ctx.globalAlpha = flicker ? 0.4 : 1;
  const frame = rasterFrameFor(e);
  const squash = squashFor(e);
  if (frame) drawRasterFrame(statusRasterFrame(frame, e), e.x - camX + (e.swayOffset || 0), e.y - camY + stepLift, squash, seated);
  else drawSprite(sprite, jamesonPaletteFor(e) || e.palette || set.palette, sx, sy, flip, squash);
  ctx.globalAlpha = 1;
  // The hunter's pint while he sits one out: the existing drinking state,
  // shown in his hand.
  if (e === hunter && hunterState === 'drinking' && !frame) {
    const icon = ORDER_ICONS['beer-blond'];
    drawSprite(icon.sprite, icon.palette, e.x - camX + 5, e.y - camY - 12, false);
  }
}

function drawAlexWorkoutArea(camX, camY) {
  if (!alex || alex.state !== 'preparing') return;
  const box = alexArea(alex.x, alex.y);
  const x = box.x - camX, y = box.y - camY;
  ctx.fillStyle = PUB.amber;
  ctx.globalAlpha = 0.8;
  for (let i = 0; i < box.w; i += 4) { ctx.fillRect(x + i, y, 2, 0.5); ctx.fillRect(x + i, y + box.h, 2, 0.5); }
  for (let i = 0; i < box.h; i += 4) { ctx.fillRect(x, y + i, 0.5, 2); ctx.fillRect(x + box.w, y + i, 0.5, 2); }
  ctx.globalAlpha = 1;
}

// Source rect in image pixels; destination in world units, snapped to backing
// grid, with the frame's floor-contact pivot at world point (wx, wy).
// The illustrated sheets have no sitting pose, so a seated person is drawn
// from the hips up: the legs are under the table (or the bar) from this
// camera anyway, and dropping the cut onto the cushion is what makes them
// read as sitting in the chair rather than standing on it.
const SEATED_KEEP = 0.72;  // fraction of the figure, crown to feet, still drawn
const SEATED_DROP = 1.5;   // world units the hip line sits below the seat point

function drawRasterFrame(frame, wx, wy, squash, seated) {
  const d = frame.density;
  const w = frame.rect.width / d;
  const sxScale = squash ? squash.x : 1;
  const syScale = squash ? squash.y : 1;
  const srcH = seated ? Math.round(frame.pivot.y * SEATED_KEEP) : frame.rect.height;
  const x = Math.round((wx - frame.pivot.x / d * sxScale) * ART_SCALE) / ART_SCALE;
  const top = seated ? wy + SEATED_DROP - srcH / d * syScale : wy - frame.pivot.y / d * syScale;
  const y = Math.round(top * ART_SCALE) / ART_SCALE;
  ctx.drawImage(frame.image, frame.rect.x, frame.rect.y, frame.rect.width, srcH, x, y, w * sxScale, srcH / d * syScale);
}

// ---- Reactions (presentation only) ------------------------------------------
// A reaction is a short timer on an entity, set where the game commits an
// outcome (a hit, a delivery, the hunter spotting you) and read only here.
// It changes how the sprite is drawn — a squash, a lift — never where the
// entity is, what it scores or whether it can move. The existing hit-stop is
// reused, not stacked.
const REACTIONS = {
  hit: { time: 0.32, squash: t => ({ x: 1 + 0.18 * t, y: 1 - 0.22 * t }) },          // recoil, settles
  serve: { time: 0.26, squash: t => ({ x: 1 - 0.06 * Math.sin(t * Math.PI), y: 1 + 0.1 * Math.sin(t * Math.PI) }) },  // a lift
  spotted: { time: 0.22, squash: t => ({ x: 1 - 0.08 * t, y: 1 + 0.14 * t }) },       // a startle stretch
};
function react(e, kind) {
  const def = REACTIONS[kind];
  if (!def) return;
  // A hit outranks a celebration; nothing outranks a hit in progress.
  if (e.reaction && e.reaction.kind === 'hit' && kind !== 'hit') return;
  e.reaction = { kind, t: def.time };
}
function tickReactions(dt) {
  for (const e of [player, hunter]) {
    if (!e.reaction) continue;
    e.reaction.t -= dt;
    if (e.reaction.t <= 0) e.reaction = null;
  }
}
function squashFor(e) {
  if (!e.reaction || prefersReducedMotion) return null;
  const def = REACTIONS[e.reaction.kind];
  return def.squash(clamp(e.reaction.t / def.time, 0, 1));
}

// No contact shadow and no flicker handling — the ghost isn't standing on the
// floor and can't be hit, so drawEntity's extras would only anchor it.
function drawGhost(g, camX, camY) {
  const sprite = SPRITES.ghost.idle;
  ctx.globalAlpha = 0.7;
  drawSprite(
    sprite,
    SPRITES.ghost.palette,
    g.x - camX - spriteAnchorX(sprite, g.flip),
    g.y - camY - spriteVisualH(sprite),
    g.flip,
  );
  ctx.globalAlpha = 1;
}

// The waiter is an ordinary floor-standing character, plus the mist: drawn
// after his sprite so the droplets read as leaving the nozzle rather than
// being painted under his hand.
function drawWaiter(w, camX, camY) {
  drawEntity(w, camX, camY);
  ctx.fillStyle = WAITER_MIST_COLOR;
  for (const m of w.mist) {
    ctx.globalAlpha = clamp(m.ttl / m.maxTtl, 0, 1) * 0.85;
    ctx.fillRect(Math.round(m.x - camX), Math.round(m.y - camY), m.size, m.size);
  }
  // Sparks last, and additively: they're the brightest thing in the room for
  // the fifth of a second they exist.
  ctx.globalCompositeOperation = 'lighter';
  if (w.flash) {
    // A plus-shaped pop at the point of contact, so the sparks have a source.
    ctx.globalAlpha = clamp(w.flash.ttl / 0.1, 0, 1) * 0.9;
    ctx.fillStyle = '#ffffff';
    const fx = Math.round(w.flash.x - camX);
    const fy = Math.round(w.flash.y - camY);
    ctx.fillRect(fx - 2, fy, 5, 1);
    ctx.fillRect(fx, fy - 2, 1, 5);
  }
  for (const k of w.sparks) {
    ctx.globalAlpha = clamp(k.ttl / k.maxTtl, 0, 1);
    ctx.fillStyle = k.color;
    ctx.fillRect(Math.round(k.x - camX), Math.round(k.y - camY), k.size, k.size);
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const s of w.shards) {
    ctx.globalAlpha = clamp(s.ttl / s.maxTtl, 0, 1);
    ctx.fillStyle = s.color;
    ctx.fillRect(Math.round(s.x - camX), Math.round(s.y - camY), s.size, s.size);
  }
  ctx.globalAlpha = 1;
}

function sortByY(a, b) { return a.sortY - b.sortY; }


// Cartoon-style speech bubble with an order icon inside, floating above a
// head. `highlighted` marks the order currently being carried to them.
// patienceFraction (0-1, or null/undefined to omit) draws a thin depleting
// bar above the bubble — green/yellow/red as the customer's patience runs
// down toward giving up.
function patienceBarColor(frac) {
  if (frac > 0.5) return PUB.greenLit;
  if (frac > 0.2) return PUB.amber;
  return PUB.tomato;
}
