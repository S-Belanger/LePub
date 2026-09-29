// ---- Collision: furniture blocks movement for both characters. A small
// footprint box near the feet is tested against each furniture collider so
// characters can still visually overlap tall furniture like a real top-down
// game (sprite draws above its feet). -------------------------------------
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function getFootBox(e, x, y) {
  const w = e.w * 0.55;
  const h = 7;
  return { x: x - w / 2, y: y - h, w, h };
}

// Bodies that block movement for a while without being furniture: Nazim on
// his feet, staggering about the booth lane. Routes ignore them (they are
// computed once, and he isn't there for long); per-step collision slides
// everyone else around him.
const dynamicBlockers = [];

function collidesAt(e, x, y, exclude) {
  const box = getFootBox(e, x, y);
  for (const f of FURNITURE) {
    if (f === exclude) continue;
    if (rectsOverlap(box, f.collider)) return true;
  }
  for (const b of dynamicBlockers) {
    if (b === e) continue;
    if (rectsOverlap(box, getFootBox(b, b.x, b.y))) return true;
  }
  return false;
}

// Moves an entity by (dx, dy), resolving each axis independently so it can
// slide along furniture/walls instead of stopping dead on diagonal moves.
// Long moves (a hit shove, the Jameson bounce) are swept in MOVE_SUBSTEP
// chunks: testing only the destination would let a 40px knock hop clean over
// a counter thinner than the jump.
const MOVE_SUBSTEP = 3;

function tryMove(e, dx, dy) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / MOVE_SUBSTEP));
  if (steps === 1) return tryMoveStep(e, e.x, e.y, dx, dy);
  const sx = dx / steps;
  const sy = dy / steps;
  let x = e.x;
  let y = e.y;
  let blockedX = false;
  let blockedY = false;
  for (let i = 0; i < steps; i++) {
    const r = tryMoveStep(e, x, y, blockedX ? 0 : sx, blockedY ? 0 : sy);
    x = r.x;
    y = r.y;
    blockedX = blockedX || r.blockedX;
    blockedY = blockedY || r.blockedY;
    if ((blockedX || sx === 0) && (blockedY || sy === 0)) break;
  }
  return { x, y, blockedX, blockedY };
}

function tryMoveStep(e, x0, y0, dx, dy) {
  let x = x0;
  let y = y0;
  let blockedX = false;
  let blockedY = false;

  if (dx !== 0) {
    const nx = clamp(x0 + dx, e.w / 2, WORLD_W - e.w / 2);
    if (nx !== x0 && !collidesAt(e, nx, y)) x = nx;
    else blockedX = true;
  }
  if (dy !== 0) {
    const ny = clamp(y0 + dy, e.h / 2, WORLD_H - e.h / 2);
    if (ny !== y0 && !collidesAt(e, x, ny)) y = ny;
    else blockedY = true;
  }
  return { x, y, blockedX, blockedY };
}
