// ---- Render -----------------------------------------------------------------
// Layered passes, farthest first:
//   1. backdrop     — the dark outside, wherever the viewport exceeds the world
//   2. ground       — plank floor, dithered grain, static stains
//   3. architecture — walls, wainscot, windows, the door
//   4. back decor   — posters and the dartboard on the rear wall
//   5. floor light  — warm lamp pools and cool window/door spill
//   6. y-sorted     — furniture and every character, nearest last
//   7. foreground   — hanging lamp fixtures, dust
//   8. grade        — night tint and vignette
//   9. bubbles      — orders, then dialogue
//  10. floating score feedback
//  11. HUD
//  12. caught / completed-level overlay
//
// Everything static (clutter, bottles, stains, light textures) is built once at
// load. The frame loop only blits and fills.

const WALL_TOP_H = 16;      // decorative wall band along the top of the world
const WALL_BOTTOM_H = 12;
const WALL_SIDE_W = 7;

// ---- Static scenery ---------------------------------------------------------
// Seeded so the clutter is in the same place on every load: a bar whose
// coasters move when you refresh reads as a bug, not as atmosphere.
const DECOR = buildDecor();

function buildDecor() {
  const rnd = makeSeededRandom(0x5eed1e);

  // Wear on the floor: small dark smudges, denser on the walking routes.
  const stains = [];
  for (let i = 0; i < 30; i++) {
    stains.push({
      x: Math.round(WALL_SIDE_W + 2 + rnd() * (WORLD_W - WALL_SIDE_W * 2 - 8)),
      y: Math.round(WALL_TOP_H + 4 + rnd() * (WORLD_H - WALL_TOP_H - WALL_BOTTOM_H - 10)),
      w: 2 + Math.floor(rnd() * 5),
      h: 1 + Math.floor(rnd() * 3),
    });
  }

  // Patterned rugs give each seating cluster a visual home without changing
  // its collider. Their borders stay under chairs and tables, so the player
  // still reads the furniture footprint before the decoration.
  const rugs = [
    { x: 27, y: 17, w: 70, h: 50, base: PUB.rugRed, accent: PUB.rugGold, motif: 0 },
    { x: 126, y: 25, w: 53, h: 88, base: PUB.rugGreen, accent: PUB.rugGold, motif: 1 },
    { x: 157, y: 183, w: 42, h: 113, base: PUB.rugRed, accent: PUB.paper, motif: 2 },
    { x: 4, y: 234, w: 111, h: 47, base: PUB.rugGreen, accent: PUB.rugGold, motif: 1 },
    { x: 4, y: 291, w: 111, h: 48, base: PUB.rugRed, accent: PUB.rugGold, motif: 0 },
  ];

  // Table clutter, stored as offsets from the table centre so it can never
  // drift away from the table it belongs to.
  const clutter = new Map();
  for (const t of TABLES) {
    const items = [{
      ox: Math.round((rnd() - 0.5) * Math.max(2, t.w * 0.34)),
      oy: Math.round((rnd() - 0.5) * Math.max(2, t.h * 0.28)),
      kind: 'candle',
    }];
    const count = Math.min(8, 3 + Math.floor((t.w * t.h) / 750));
    for (let i = 1; i < count; i++) {
      const roll = rnd();
      items.push({
        ox: Math.round((rnd() - 0.5) * Math.max(2, t.w - 9)),
        oy: Math.round((rnd() - 0.5) * Math.max(2, t.h - 9)),
        kind: roll < 0.16 ? 'coaster'
          : roll < 0.34 ? 'glass'
            : roll < 0.52 ? 'mug'
              : roll < 0.66 ? 'candle'
                : roll < 0.79 ? 'bottle'
                  : roll < 0.9 ? 'plate'
                    : 'menu',
      });
    }
    clutter.set(t, items);
  }

  // Glassware and bottles along the counters, spaced out down each segment's
  // long axis and set back from the customer edge.
  const barProps = [];
  for (const seg of BAR_SEGMENTS) {
    const c = seg.collider;
    const horizontal = c.w >= c.h;
    const length = horizontal ? c.w : c.h;
    let p = 4;
    while (p < length - 4) {
      const roll = rnd();
      const kind = roll < 0.42 ? 'bottle' : roll < 0.72 ? 'glass' : 'tap';
      barProps.push({
        x: horizontal ? c.x + p : c.x + 3 + ((p >> 2) & 1) * 3,
        y: horizontal ? c.y + 3 + ((p >> 2) & 1) * 3 : c.y + p,
        kind,
        seg,
      });
      p += 4 + Math.floor(rnd() * 5);
    }
  }

  // Hand-placed so they sit over the room rather than over the furniture.
  // (x, y) is where the pool lands on the floor; the shade hangs LAMP_DROP
  // above it in screen space, with a visible cone between.
  const lamps = [
    { x: 40, y: 44, r: 46, phase: 0.0 },
    { x: 150, y: 96, r: 48, phase: 1.7 },
    { x: 42, y: 150, r: 44, phase: 3.1 },
    { x: 78, y: 128, r: 40, phase: 2.2 },    // over the pocket behind the bar
    { x: 150, y: 236, r: 44, phase: 4.4 },
    { x: 60, y: 296, r: 50, phase: 5.6 },
    { x: 150, y: 322, r: 40, phase: 0.9 },
  ];

  // Cool light sources: two windows in the rear wall, and the door.
  const windows = [
    { x: 22, w: 31 },
    { x: 128, w: 35 },
  ];

  const posters = [
    { x: 68, w: 14, h: 6, ink: PUB.cream, paper: PUB.tomato },
    { x: 96, w: 10, h: 7, ink: PUB.amber, paper: PUB.wallDark },
    { x: 172, w: 12, h: 6, ink: PUB.coolPale, paper: PUB.green },
  ];

  // Small hanging plants keep the greenery on the wall plane, where it can
  // add the reference image's lived-in density without becoming fake,
  // non-colliding furniture on the playable floor.
  const wallPlants = [
    { x: 15, y: 3, drop: 12 },
    { x: 119, y: 2, drop: 15 },
    { x: 190, y: 4, drop: 18 },
  ];

  return { stains, rugs, clutter, barProps, lamps, windows, posters, wallPlants };
}

// Prebaked lighting. One canvas per lamp radius, plus the cool spills.
const GLOW_CACHE = new Map();
function glowFor(radius, rgb, alpha) {
  const key = radius + ':' + rgb.join(',') + ':' + alpha;
  let g = GLOW_CACHE.get(key);
  if (!g) {
    g = makeGlowCanvas(radius, rgb, alpha);
    GLOW_CACHE.set(key, g);
  }
  return g;
}

const WARM_RGB = [255, 190, 92];
const HOT_RGB = [255, 226, 160];
const FIRE_RGB = [255, 150, 60];
const COOL_RGB = [91, 166, 201];
const LAMP_DROP = 26;   // screen px between a pendant shade and its floor pool
const JAMESON_RGB = [255, 214, 120];

// Rebuilt only when the viewport changes size.
let vignetteCanvas = null;
function ensureVignette() {
  if (vignetteCanvas && vignetteCanvas.width === viewW && vignetteCanvas.height === viewH) return;
  vignetteCanvas = makeVignetteCanvas(viewW, viewH, 0.55);
}

function drawGlow(glow, worldX, worldY, alpha, camX, camY) {
  const r = glow.width / 2;
  const sx = Math.round(worldX - camX - r);
  const sy = Math.round(worldY - camY - r);
  if (sx >= viewW || sy >= viewH || sx + glow.width <= 0 || sy + glow.height <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(glow, sx, sy);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

// ---- Ambient animation ------------------------------------------------------
// A fixed pool of motes drifting in screen space, and per-lamp flicker phases.
// Both are skipped entirely under prefers-reduced-motion.
const DUST = [];
for (let i = 0; i < 14; i++) {
  DUST.push({ x: Math.random(), y: Math.random(), vx: 0, vy: 0, a: 0 });
}
let dustReady = false;

function updateAmbient(dt) {
  if (prefersReducedMotion) return;
  if (!dustReady) {
    for (const d of DUST) {
      d.x = Math.random() * viewW;
      d.y = Math.random() * viewH;
      d.vx = (Math.random() - 0.5) * 3;
      d.vy = -2 - Math.random() * 4;
      d.a = 0.10 + Math.random() * 0.16;
    }
    dustReady = true;
  }
  for (const d of DUST) {
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    if (d.y < -2) { d.y = viewH + 2; d.x = Math.random() * viewW; }
    if (d.x < -2) d.x = viewW + 2;
    if (d.x > viewW + 2) d.x = -2;
  }
}

// How bright each lamp is this frame. Irregular by design: two sine terms of
// unrelated periods so it never settles into a visible loop.
function lampIntensity(lamp) {
  if (prefersReducedMotion) return 1;
  const t = gameTime;
  const wobble = Math.sin(t * 2.3 + lamp.phase) * 0.035 + Math.sin(t * 7.1 + lamp.phase * 2.7) * 0.02;
  return 1 + wobble;
}

// ---- Pass 1: backdrop -------------------------------------------------------
function drawBackdrop() {
  ctx.fillStyle = '#071512';
  ctx.fillRect(0, 0, viewW, viewH);
}

// ---- Pass 2: ground ---------------------------------------------------------
// Staggered planks as before, but on a four-step tobacco ramp with a dithered
// grain pass and the static wear marks on top.
// Painted once into the room canvas in world coordinates, so it walks the
// whole map rather than the camera's slice. The `ctx` parameter deliberately
// shadows the screen context: these two functions are only ever called against
// the offscreen room canvas.
function drawRug(ctx, rug) {
  const { x, y, w, h } = rug;
  ctx.fillStyle = PUB.tableShadow;
  ctx.fillRect(x + 1.5, y + 2, w, h);
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = rug.accent;
  ctx.fillRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = rug.base;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(x + 2.5, y + 2.5, w - 5, 0.5);
  ctx.fillRect(x + 2.5, y + h - 3, w - 5, 0.5);
  ctx.fillRect(x + 2.5, y + 2.5, 0.5, h - 5);
  ctx.fillRect(x + w - 3, y + 2.5, 0.5, h - 5);

  // Dense kilim borders and small woven medallions: the half-unit strokes are
  // single backing pixels, so this detail reads as textile rather than the
  // old row of large square dots.
  ctx.fillStyle = rug.accent;
  for (let px = x + 4; px < x + w - 4; px += 4) {
    ctx.fillRect(px, y + 3.5, 1.5, 0.5);
    ctx.fillRect(px + 1, y + 4, 1.5, 0.5);
    ctx.fillRect(px, y + h - 4, 1.5, 0.5);
    ctx.fillRect(px + 1, y + h - 4.5, 1.5, 0.5);
  }
  for (let py = y + 6; py < y + h - 5; py += 5) {
    ctx.fillRect(x + 3.5, py, 0.5, 2);
    ctx.fillRect(x + 4, py + 1, 0.5, 2);
    ctx.fillRect(x + w - 4, py, 0.5, 2);
    ctx.fillRect(x + w - 4.5, py + 1, 0.5, 2);
  }

  const stepX = rug.motif === 2 ? 10 : 12;
  const stepY = rug.motif === 1 ? 10 : 12;
  for (let py = y + 9; py < y + h - 7; py += stepY) {
    for (let px = x + 9; px < x + w - 7; px += stepX) {
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = rug.accent;
      ctx.fillRect(px, py - 1.5, 1, 1);
      ctx.fillRect(px - 1.5, py, 4, 1);
      ctx.fillRect(px, py + 1, 1, 1);
      ctx.fillStyle = PUB.creamDim;
      ctx.fillRect(px + 0.5, py, 0.5, 0.5);
    }
  }
  ctx.globalAlpha = 1;

  // Fine uneven fringe on the ends.
  ctx.fillStyle = PUB.creamDim;
  for (let px = x + 2; px < x + w - 1; px += 2) {
    const fringe = ((px + rug.motif) & 2) ? 1 : 0.5;
    ctx.fillRect(px, y - fringe, 0.5, fringe);
    ctx.fillRect(px + 0.5, y + h, 0.5, fringe);
  }
}

function floorHash(x, y) {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return (n ^ (n >>> 16)) >>> 0;
}

function drawGround(ctx) {
  const plankH = 6;
  ctx.fillStyle = PUB.floor[0];
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  for (let row = 0, sy = 0; sy < WORLD_H; row++, sy += plankH) {
    let plank = 0;
    let sx = -(row % 3) * 11;
    while (sx < WORLD_W) {
      const hash = floorHash(plank + row * 17, row);
      const length = 23 + (hash % 24);
      ctx.fillStyle = PUB.floor[hash % PUB.floor.length];
      ctx.fillRect(sx + 0.5, sy + 0.5, length - 0.5, plankH - 0.5);

      ctx.fillStyle = PUB.floorEdge;
      ctx.globalAlpha = 0.28;
      ctx.fillRect(sx + 1, sy + 0.5, Math.max(1, length - 2), 0.5);
      ctx.globalAlpha = 1;

      // Fine grain, scratches and the occasional knot. At ART_SCALE 2 each
      // 0.5 unit stroke is one true pixel in the backing store.
      ctx.fillStyle = PUB.floorGrain;
      const grainCount = 2 + (hash & 3);
      for (let g = 0; g < grainCount; g++) {
        const gx = sx + 3 + ((hash >>> (g * 4)) % Math.max(4, length - 7));
        const gy = sy + 1.5 + ((hash >>> (g * 3 + 2)) % 7) * 0.5;
        const gw = 2 + ((hash >>> (g + 11)) % 7);
        ctx.fillRect(gx, gy, Math.min(gw, sx + length - gx - 1), 0.5);
      }
      if ((hash & 15) === 3) {
        const kx = sx + length * 0.62;
        ctx.fillStyle = PUB.floorSeam;
        ctx.fillRect(kx - 1, sy + 2.5, 2.5, 1);
        ctx.fillStyle = PUB.floorEdge;
        ctx.fillRect(kx - 0.5, sy + 2.5, 1, 0.5);
      }

      ctx.fillStyle = PUB.floorSeam;
      ctx.fillRect(sx, sy, 0.5, plankH);
      sx += length;
      plank++;
    }
    ctx.fillStyle = PUB.floorSeam;
    ctx.fillRect(0, sy, WORLD_W, 0.5);
  }

  for (const rug of DECOR.rugs) drawRug(ctx, rug);

  ctx.fillStyle = PUB.floorStain;
  for (const s of DECOR.stains) {
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillRect(s.x + 1, s.y - 1, Math.max(1, s.w - 2), 1);
  }
}

// ---- Pass 3: architecture ---------------------------------------------------
// Wall bands at the world edges. They are decoration, not collision — the
// existing world clamp already keeps everyone inside — so characters can
// overlap the lowest pixels of the rear wall exactly as they would in life.
// Also drawn into the room canvas; see the note on drawGround.
function drawArchitecture(ctx) {
  const left = 0;
  const top = 0;

  // Rear wall: deep raised timber panels, crown rail and a projected
  // wainscot. Half-unit lines are the fine carved edges that were impossible
  // in the old 1x backing store.
  ctx.fillStyle = PUB.wallDark;
  ctx.fillRect(left, top, WORLD_W, WALL_TOP_H);
  ctx.fillStyle = PUB.wall;
  ctx.fillRect(left + 0.5, top + 0.5, WORLD_W - 1, WALL_TOP_H - 3);
  ctx.fillStyle = PUB.wallLit;
  ctx.fillRect(left, top + 0.5, WORLD_W, 1);
  ctx.fillStyle = PUB.wainscotLit;
  ctx.fillRect(left, top + 2, WORLD_W, 0.5);
  for (let x = 8; x < WORLD_W; x += 16) {
    ctx.fillStyle = PUB.wallDark;
    ctx.fillRect(x, top + 2.5, 1, WALL_TOP_H - 5);
    ctx.fillStyle = PUB.wainscotLit;
    ctx.fillRect(x + 1, top + 3, 0.5, WALL_TOP_H - 6);
  }
  ctx.fillStyle = PUB.wainscotLit;
  ctx.fillRect(left, top + WALL_TOP_H - 4, WORLD_W, 1);
  ctx.fillStyle = PUB.wainscot;
  ctx.fillRect(left, top + WALL_TOP_H - 3, WORLD_W, 2);
  for (let x = 1; x < WORLD_W; x += 4) {
    ctx.fillStyle = (x & 4) ? PUB.wallLit : PUB.wall;
    ctx.fillRect(x, top + WALL_TOP_H - 2.5, 2, 0.5);
  }
  ctx.fillStyle = PUB.baseboard;
  ctx.fillRect(left, top + WALL_TOP_H - 1, WORLD_W, 1);
  ctx.fillStyle = PUB.barTopHi;
  ctx.globalAlpha = 0.42;
  ctx.fillRect(left + 1, top + WALL_TOP_H - 1.5, WORLD_W - 2, 0.5);
  ctx.globalAlpha = 1;

  // Windows: cooler light than anything else in the room.
  for (const w of DECOR.windows) {
    const wx = left + w.x;
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(wx - 1.5, top + 0.5, w.w + 3, 13);
    ctx.fillStyle = PUB.wainscotLit;
    ctx.fillRect(wx - 1, top + 1, w.w + 2, 11.5);
    ctx.fillStyle = PUB.midnight;
    ctx.fillRect(wx, top + 1.5, w.w, 10);
    // Tiny skyline blocks and warm windows beyond rain-streaked glass.
    ctx.fillStyle = PUB.cool;
    for (let x = 1; x < w.w - 1; x += 3) {
      const buildingH = 3 + ((x + w.x) % 5);
      ctx.fillRect(wx + x, top + 11 - buildingH, 2.5, buildingH);
      ctx.fillStyle = ((x + w.x) & 1) ? PUB.amber : PUB.coolPale;
      ctx.fillRect(wx + x + 0.5, top + 10 - (buildingH & 1), 0.5, 0.5);
      if (buildingH > 5) ctx.fillRect(wx + x + 1.5, top + 7, 0.5, 0.5);
      ctx.fillStyle = PUB.cool;
    }
    ctx.fillStyle = PUB.coolPale;
    ctx.globalAlpha = 0.72;
    ctx.fillRect(wx + Math.floor(w.w / 2), top + 1.5, 0.5, 10);
    ctx.fillRect(wx, top + 6, w.w, 0.5);
    for (let x = 2; x < w.w; x += 5) {
      ctx.fillRect(wx + x, top + 2, 0.5, 3 + ((x + w.x) & 2));
      ctx.fillRect(wx + x + 0.5, top + 8.5, 0.5, 1.5);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = PUB.barTopHi;
    ctx.fillRect(wx - 1, top + 12, w.w + 2, 0.5);
  }

  for (const p of DECOR.posters) {
    const px = left + p.x;
    const py = top + 2;
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(px - 1, py - 1, p.w + 2, p.h + 2);
    ctx.fillStyle = p.paper;
    ctx.fillRect(px, py, p.w, p.h);
    ctx.fillStyle = p.ink;
    ctx.fillRect(px + 2, py + 2, p.w - 4, 1);
    ctx.fillRect(px + 2, py + 4, Math.max(1, p.w - 6), 1);
  }

  for (const plant of DECOR.wallPlants) {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(plant.x - 2.5, plant.y, 5.5, 2.5);
    ctx.fillStyle = PUB.barTop;
    ctx.fillRect(plant.x - 2, plant.y + 0.5, 4.5, 1.5);
    ctx.fillStyle = PUB.barTopHi;
    ctx.fillRect(plant.x - 1.5, plant.y + 0.5, 3, 0.5);
    ctx.fillStyle = PUB.green;
    ctx.fillRect(plant.x, plant.y + 2, 0.5, plant.drop);
    for (let py = plant.y + 2.5; py < plant.y + plant.drop; py += 2) {
      const side = ((Math.round(py * 2) + plant.x) & 2) ? -1 : 1;
      ctx.fillRect(plant.x + side * 0.5, py, side * 2, 1);
      ctx.fillRect(plant.x + side * 1.5, py + 0.5, side * 1.5, 1);
      ctx.fillStyle = PUB.greenLit;
      ctx.fillRect(plant.x + side * 1.5, py, 0.5, 0.5);
      ctx.fillStyle = PUB.green;
    }
    ctx.fillStyle = PUB.greenLit;
    ctx.fillRect(plant.x - 1, plant.y + 3, 2.5, 1);
  }

  // Side walls.
  ctx.fillStyle = PUB.wainscot;
  ctx.fillRect(left, top, WALL_SIDE_W, WORLD_H);
  ctx.fillRect(left + WORLD_W - WALL_SIDE_W, top, WALL_SIDE_W, WORLD_H);
  ctx.fillStyle = PUB.wainscotLit;
  ctx.fillRect(left + 0.5, top, 0.5, WORLD_H);
  ctx.fillRect(left + WORLD_W - 1, top, 0.5, WORLD_H);
  ctx.fillStyle = PUB.baseboard;
  ctx.fillRect(left + WALL_SIDE_W - 1, top, 1, WORLD_H);
  ctx.fillRect(left + WORLD_W - WALL_SIDE_W, top, 1, WORLD_H);
  for (let y = WALL_TOP_H + 8; y < WORLD_H - WALL_BOTTOM_H; y += 22) {
    ctx.fillStyle = PUB.wallDark;
    ctx.fillRect(left + 1.5, y, WALL_SIDE_W - 3, 0.5);
    ctx.fillRect(left + WORLD_W - WALL_SIDE_W + 1.5, y, WALL_SIDE_W - 3, 0.5);
    ctx.fillStyle = PUB.wallLit;
    ctx.fillRect(left + 2, y + 1, WALL_SIDE_W - 4, 0.5);
    ctx.fillRect(left + WORLD_W - WALL_SIDE_W + 2, y + 1, WALL_SIDE_W - 4, 0.5);
  }

  // Tiny framed portraits and brass sconces layer the otherwise empty side
  // walls. They stay inside the wall plane and never create fake collision.
  for (const side of [0, 1]) {
    const wallX = side ? WORLD_W - WALL_SIDE_W : 0;
    for (const py of [118, 238]) {
      ctx.fillStyle = PUB.ink;
      ctx.fillRect(wallX + 1, py, WALL_SIDE_W - 2, 8);
      ctx.fillStyle = PUB.barTop;
      ctx.fillRect(wallX + 1.5, py + 0.5, WALL_SIDE_W - 3, 7);
      ctx.fillStyle = side ? PUB.cool : PUB.burgundy;
      ctx.fillRect(wallX + 2, py + 1.5, WALL_SIDE_W - 4, 4.5);
      ctx.fillStyle = PUB.creamDim;
      ctx.fillRect(wallX + 2.5, py + 2, 1, 1);
    }
    for (const sy of [92, 185, 315]) {
      ctx.fillStyle = PUB.brass;
      ctx.fillRect(wallX + 2.5, sy, 2, 1.5);
      ctx.fillRect(wallX + 3, sy + 1.5, 1, 2);
      ctx.fillStyle = PUB.cream;
      ctx.fillRect(wallX + 2, sy + 3, 3, 1.5);
      ctx.fillStyle = PUB.amber;
      ctx.fillRect(wallX + 2.5, sy + 3.5, 2, 1);
    }
  }

  // The bathroom: a small door set into the right wall, in the hallway gap
  // above the first table on that side. Purely a landmark for the bladder
  // mechanic (see BATHROOM in src/game/world.js) — there's no room behind it, just the
  // door and a sign, the same way the bar's back rooms are implied rather
  // than modeled.
  {
    const doorH = 20;
    const wallX = left + WORLD_W - WALL_SIDE_W;
    const dy = top + Math.round(BATHROOM.y - doorH / 2);
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(wallX - 1, dy - 1, WALL_SIDE_W + 2, doorH + 2);
    ctx.fillStyle = PUB.midnight;
    ctx.fillRect(wallX, dy, WALL_SIDE_W, doorH);
    ctx.fillStyle = PUB.wainscotLit;
    ctx.fillRect(wallX, dy, WALL_SIDE_W, 1);
    ctx.fillRect(wallX, dy + doorH - 1, WALL_SIDE_W, 1);
    ctx.fillStyle = PUB.brass;
    ctx.fillRect(wallX + 1, dy + doorH - 6, 2, 1);
    const sign = 'WC';
    fontDrawTextShadow(ctx, sign, wallX - fontTextWidth(sign) - 4, dy + doorH / 2 - 2, PUB.coolPale);
  }

  // Front wall and the door everyone arrives through.
  const bottom = top + WORLD_H - WALL_BOTTOM_H;
  ctx.fillStyle = PUB.wallDark;
  ctx.fillRect(left, bottom, WORLD_W, WALL_BOTTOM_H);
  ctx.fillStyle = PUB.wall;
  ctx.fillRect(left, bottom + 1, WORLD_W, WALL_BOTTOM_H - 1);
  ctx.fillStyle = PUB.wainscotLit;
  for (let x = 8; x < WORLD_W; x += 16) ctx.fillRect(x, bottom + 2, 0.5, WALL_BOTTOM_H - 3);
  ctx.fillStyle = PUB.baseboard;
  ctx.fillRect(left, bottom, WORLD_W, 1);

  const doorW = 22;
  const dx = Math.round(left + DOOR.x - doorW / 2);
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(dx - 1.5, bottom, doorW + 3, WALL_BOTTOM_H);
  ctx.fillStyle = PUB.barTop;
  ctx.fillRect(dx - 1, bottom + 0.5, doorW + 2, WALL_BOTTOM_H - 0.5);
  ctx.fillStyle = PUB.midnight;
  ctx.fillRect(dx, bottom + 2, doorW, WALL_BOTTOM_H - 2);
  ctx.fillStyle = PUB.wainscotLit;
  ctx.fillRect(dx, bottom + 2, 0.5, WALL_BOTTOM_H - 2);
  ctx.fillRect(dx + doorW - 0.5, bottom + 2, 0.5, WALL_BOTTOM_H - 2);
  ctx.fillStyle = PUB.cool;
  ctx.fillRect(dx + 3, bottom + 3, doorW - 6, 0.5);
  ctx.fillRect(dx + doorW / 2, bottom + 2, 0.5, WALL_BOTTOM_H - 3);
  ctx.fillStyle = PUB.brass;
  ctx.fillRect(dx + doorW - 4, bottom + 6, 1, 1);

  drawWallProps(ctx);
}

// The pub's stories live on its walls: a stone fireplace in the pocket
// behind the bar, a mounted stag over the rear wall, a string of bulbs along
// the crown rail, a coat stand and a barrel in the front corners, palms on
// the side walls. All of it sits on the wall bands or in dead corners, so no
// collider moves and the lanes stay clean.
const FIREPLACE = { x: 0, y: 116, w: 14, h: 34 };
function drawWallProps(ctx) {
  // Fireplace: rough stone surround, black hearth, embers, a mantel with a
  // bottle and a candle.
  const f = FIREPLACE;
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(f.x, f.y, f.w + 1, f.h);
  const stones = ['#5a5652', '#6b6660', '#4a4642', '#767069'];
  let si = 0;
  for (let y = f.y + 1; y < f.y + f.h - 1; y += 4) {
    for (let x = f.x + ((y >> 2) & 1) * 2; x < f.x + f.w; x += 4, si++) {
      ctx.fillStyle = stones[si % stones.length];
      ctx.fillRect(x + 0.5, y + 0.5, 3, 3);
    }
  }
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(f.x + 2, f.y + 10, f.w - 3, 18);           // hearth opening
  ctx.fillStyle = '#2a1008';
  ctx.fillRect(f.x + 3, f.y + 11, f.w - 5, 16);
  ctx.fillStyle = '#c8501a';                               // logs and embers
  ctx.fillRect(f.x + 4, f.y + 22, f.w - 7, 3);
  ctx.fillStyle = '#ff9a2a';
  ctx.fillRect(f.x + 5, f.y + 19, 3, 3);
  ctx.fillRect(f.x + 9, f.y + 20, 2, 2);
  ctx.fillStyle = '#ffd86a';
  ctx.fillRect(f.x + 6, f.y + 17, 1.5, 2);
  ctx.fillRect(f.x + 9.5, f.y + 18, 1, 1.5);
  ctx.fillStyle = '#fff2b0';
  ctx.fillRect(f.x + 6.5, f.y + 16, 0.5, 1);
  ctx.fillStyle = PUB.barTop;                              // mantel
  ctx.fillRect(f.x, f.y + 7, f.w + 2, 2.5);
  ctx.fillStyle = PUB.barTopHi;
  ctx.fillRect(f.x, f.y + 7, f.w + 2, 0.5);
  ctx.fillStyle = PUB.bottleGreen;                         // bottle on the mantel
  ctx.fillRect(f.x + 3, f.y + 3, 2, 4);
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(f.x + 3.5, f.y + 2, 1, 1.5);
  ctx.fillStyle = PUB.cream;                               // candle
  ctx.fillRect(f.x + 9, f.y + 4, 1.5, 3);
  ctx.fillStyle = PUB.amber;
  ctx.fillRect(f.x + 9.5, f.y + 3, 0.5, 1);
  ctx.fillStyle = PUB.brass;                               // fender
  ctx.fillRect(f.x + 1, f.y + f.h - 2, f.w - 1, 1);

  // The stag over the rear wall: walnut shield, brown head, tan antlers.
  const sx = 116, sy = 2;
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(sx - 4, sy + 4, 9, 9);
  ctx.fillStyle = PUB.barFront;
  ctx.fillRect(sx - 3.5, sy + 4.5, 8, 8);
  ctx.fillStyle = PUB.barTopHi;
  ctx.fillRect(sx - 3, sy + 5, 7, 0.5);
  ctx.fillStyle = '#6b4a30';
  ctx.fillRect(sx - 2, sy + 6, 5, 5);                      // head
  ctx.fillRect(sx - 1, sy + 11, 3, 1.5);                   // muzzle
  ctx.fillStyle = '#4a3020';
  ctx.fillRect(sx - 0.5, sy + 11.5, 2, 1);
  ctx.fillStyle = '#e8ddc0';
  ctx.fillRect(sx - 3, sy + 7, 1, 1.5);                    // ears
  ctx.fillRect(sx + 3, sy + 7, 1, 1.5);
  ctx.fillStyle = '#141414';
  ctx.fillRect(sx - 1, sy + 8, 0.5, 0.5);                  // eyes
  ctx.fillRect(sx + 1.5, sy + 8, 0.5, 0.5);
  ctx.fillStyle = '#d3a26b';                               // antlers
  ctx.fillRect(sx - 3.5, sy + 1, 0.5, 5);
  ctx.fillRect(sx + 4, sy + 1, 0.5, 5);
  ctx.fillRect(sx - 5, sy + 2, 2, 0.5);
  ctx.fillRect(sx + 4, sy + 2, 2, 0.5);
  ctx.fillRect(sx - 4.5, sy, 0.5, 2);
  ctx.fillRect(sx + 5, sy, 0.5, 2);
  ctx.fillRect(sx - 3, sy + 3, 1, 0.5);
  ctx.fillRect(sx + 3, sy + 3, 1, 0.5);

  // String lights along the crown rail: a sagging wire, a warm bulb every
  // seven pixels.
  for (let x = 4; x < WORLD_W - 4; x += 7) {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x, 3.5, 7, 0.5);
    ctx.fillRect(x + 3, 4, 1, 1);
    ctx.fillStyle = (x / 7) % 3 === 0 ? '#ffd27a' : (x / 7) % 3 === 1 ? '#ff9a5a' : '#fff0b8';
    ctx.fillRect(x + 2.5, 5, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 3, 5, 0.5, 0.5);
  }

  // Coat stand in the front-left corner: a pole, hooks, two coats, a hat.
  const cx = 12, cy = 336;
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(cx - 0.5, cy, 2, 22);
  ctx.fillRect(cx - 4, cy + 20, 9, 1.5);                   // foot
  ctx.fillStyle = PUB.brass;
  ctx.fillRect(cx - 3, cy + 1, 7, 0.5);                    // hooks
  ctx.fillRect(cx - 3, cy + 1, 0.5, 1.5);
  ctx.fillRect(cx + 3.5, cy + 1, 0.5, 1.5);
  ctx.fillStyle = '#4a3a2c';                               // coat, brown
  ctx.fillRect(cx - 5, cy + 3, 4, 12);
  ctx.fillStyle = '#5c4a38';
  ctx.fillRect(cx - 4.5, cy + 3.5, 1, 11);
  ctx.fillStyle = '#2f4a3a';                               // coat, green
  ctx.fillRect(cx + 2, cy + 3, 4, 11);
  ctx.fillStyle = '#3f5c48';
  ctx.fillRect(cx + 2.5, cy + 3.5, 1, 10);
  ctx.fillStyle = '#8d342f';                               // hat on top
  ctx.fillRect(cx - 2, cy - 2, 5, 2.5);
  ctx.fillRect(cx - 1, cy - 3.5, 3, 1.5);

  // A barrel in the front-right corner: staves and brass hoops.
  const bx = 186, by = 334;
  ctx.fillStyle = PUB.tableShadow;
  ctx.fillRect(bx + 1, by + 22, 12, 2.5);
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(bx, by, 12, 23);
  ctx.fillStyle = PUB.barFront;
  ctx.fillRect(bx + 0.5, by + 0.5, 11, 22);
  ctx.fillStyle = PUB.barFrontLit;
  ctx.fillRect(bx + 1, by + 1, 2, 21);
  ctx.fillStyle = PUB.barFrontDark;
  for (let px = bx + 3.5; px < bx + 11; px += 2.5) ctx.fillRect(px, by + 1, 0.5, 21);
  ctx.fillStyle = PUB.brass;
  ctx.fillRect(bx + 0.5, by + 4, 11, 1);
  ctx.fillRect(bx + 0.5, by + 17, 11, 1);
  ctx.fillStyle = PUB.barTop;
  ctx.fillRect(bx + 1, by + 0.5, 10, 1.5);                 // lid

  // Palms on the side walls, half in the wall plane.
  for (const [px, py] of [[194, 150], [194, 300], [5, 220]]) {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(px - 3, py + 8, 6, 5);                     // pot
    ctx.fillStyle = '#7a3a2a';
    ctx.fillRect(px - 2.5, py + 8.5, 5, 4);
    ctx.fillStyle = '#9a4a34';
    ctx.fillRect(px - 2.5, py + 8.5, 5, 1);
    ctx.fillStyle = PUB.green;                              // fronds
    ctx.fillRect(px - 0.5, py, 1, 8);
    ctx.fillRect(px - 5, py + 1, 4.5, 1.5);
    ctx.fillRect(px + 0.5, py + 2, 4.5, 1.5);
    ctx.fillRect(px - 6, py + 4, 5.5, 1.5);
    ctx.fillRect(px + 0.5, py + 5, 5.5, 1.5);
    ctx.fillRect(px - 2, py - 2, 4, 2);
    ctx.fillStyle = PUB.greenLit;
    ctx.fillRect(px - 4.5, py + 1, 2, 0.5);
    ctx.fillRect(px + 1, py + 2, 2, 0.5);
    ctx.fillRect(px - 5.5, py + 4, 2.5, 0.5);
    ctx.fillRect(px - 1, py - 2, 2, 0.5);
  }
}

// One world-sized canvas holding passes 2-4. Built at load; the frame loop
// only copies the camera's rectangle out of it.
const roomCanvas = buildRoomCanvas();

function buildRoomCanvas() {
  const cv = document.createElement('canvas');
  cv.width = WORLD_W * ART_SCALE;
  cv.height = WORLD_H * ART_SCALE;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.setTransform(ART_SCALE, 0, 0, ART_SCALE, 0, 0);
  drawGround(g);
  drawArchitecture(g);
  return cv;
}

function drawRoom(camX, camY) {
  // Source rect clipped to the world, destination offset by whatever the
  // camera is showing outside it.
  const sx = Math.max(0, camX);
  const sy = Math.max(0, camY);
  const dx = Math.round(sx - camX);
  const dy = Math.round(sy - camY);
  const w = Math.min(WORLD_W - sx, viewW - dx);
  const h = Math.min(WORLD_H - sy, viewH - dy);
  if (w <= 0 || h <= 0) return;
  ctx.drawImage(
    roomCanvas,
    sx * ART_SCALE,
    sy * ART_SCALE,
    w * ART_SCALE,
    h * ART_SCALE,
    dx,
    dy,
    w,
    h,
  );
}
