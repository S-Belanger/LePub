// ---- Customer path routing: customers don't have real-time obstacle
// avoidance (see tryMove above, which is for the player/hunter), but the
// floor plan is static, so a route from the door to a seat can be worked
// out once, up front, with a coarse-grid search — cheap since it only runs
// when a customer starts entering/leaving, never per frame. A line-of-sight
// smoothing pass then collapses that grid path down to a handful of
// waypoints so movement still reads as a straight walk, not grid-snapping.
const PATH_CELL = 8;
const PATH_MARGIN = (ENTITY_HITBOXES.customer.w * 0.55) / 2;
const PATH_FOOT_H = 7;

// The search is body-size aware: a footprint carries the half-width of the
// foot box (what furniture blocks) and the half extents of the hitbox (what
// the world edge clamps). Customers are the default; the hunter's is wider,
// which is exactly why some corridors a customer strolls through are walls
// to him.
function footprintFor(kind, cell) {
  const hb = ENTITY_HITBOXES[kind];
  return { margin: (hb.w * 0.55) / 2, halfW: hb.w / 2, halfH: hb.h / 2, cell: cell || PATH_CELL };
}
const CUSTOMER_FOOTPRINT = footprintFor('customer');
// A wide body on an 8px grid finds no clear cell centre in a corridor it
// physically fits through (the 15px lane beside the bar stem, for one), so
// the hunter searches a 4px grid: four times the cells, still cheap for a
// route recomputed every second or so.
const HUNTER_FOOTPRINT = footprintFor('hunter', 4);
const BUSBOY_FOOTPRINT = footprintFor('busboy');
const ALEX_FOOTPRINT = footprintFor('alex');

// Exact line-segment/AABB test. Sampling a fixed number of points can skip a
// thin chair collider on a long diagonal, which made the smoothing pass turn
// an otherwise valid grid route into a path through furniture.
function segmentHitsRect(p1, p2, rect) {
  let tMin = 0;
  let tMax = 1;
  for (const [axis, size] of [['x', 'w'], ['y', 'h']]) {
    const start = p1[axis];
    const delta = p2[axis] - start;
    const min = rect[axis];
    const max = min + rect[size];
    if (Math.abs(delta) < 1e-9) {
      if (start < min || start > max) return false;
      continue;
    }
    let near = (min - start) / delta;
    let far = (max - start) / delta;
    if (near > far) [near, far] = [far, near];
    tMin = Math.max(tMin, near);
    tMax = Math.min(tMax, far);
    if (tMin > tMax) return false;
  }
  return true;
}

function findBlockingObstacle(p1, p2, exclude, fp) {
  const margin = fp ? fp.margin : PATH_MARGIN;
  for (const f of FURNITURE) {
    if (f === exclude) continue;
    const r = f.collider;
    // Convert the furniture collider into the region a feet anchor cannot
    // enter. The footprint is centered horizontally but extends upward from
    // the anchor, so the vertical padding is deliberately asymmetric.
    const inflated = {
      x: r.x - margin,
      y: r.y,
      w: r.w + 2 * margin,
      h: r.h + PATH_FOOT_H,
    };
    if (segmentHitsRect(p1, p2, inflated)) return f;
  }
  return null;
}

function pointBlocked(x, y, excludeTable, fp) {
  // Mirrors getFootBox's feet-anchored shape (see collision section above)
  // so the grid agrees with the runtime collision check that walks it.
  const margin = fp ? fp.margin : PATH_MARGIN;
  const box = { x: x - margin, y: y - PATH_FOOT_H, w: margin * 2, h: PATH_FOOT_H };
  for (const f of FURNITURE) {
    if (f === excludeTable) continue;
    if (rectsOverlap(box, f.collider)) return true;
  }
  return false;
}

function cellFromKey(k, cols) {
  return { cx: k % cols, cy: Math.floor(k / cols) };
}

// Same world clamp tryMove/updateCustomer apply to a customer's position —
// the grid must agree, or it can route through a corner (e.g. a world edge)
// the entity can never actually reach.
const CUSTOMER_HALF_W = ENTITY_HITBOXES.customer.w / 2;
const CUSTOMER_HALF_H = ENTITY_HITBOXES.customer.h / 2;
function cellCenter(cx, cy, fp) {
  const halfW = fp ? fp.halfW : CUSTOMER_HALF_W;
  const halfH = fp ? fp.halfH : CUSTOMER_HALF_H;
  const cell = fp ? fp.cell : PATH_CELL;
  return {
    x: clamp(cx * cell, halfW, WORLD_W - halfW),
    y: clamp(cy * cell, halfH, WORLD_H - halfH),
  };
}

// DOOR sits at the very bottom of the world, below the lowest y a body can
// actually stand at — movement is clamped to half a sprite in from every
// world edge. Walking somebody straight at it leaves them stranded a few
// pixels short of their last waypoint, close but never "arrived", which is
// how leaving customers used to pile up invisibly at the bottom wall and eat
// the spawn cap. Route to the nearest point they can actually occupy instead.
function reachablePoint(e, p) {
  return {
    x: clamp(p.x, e.w / 2, WORLD_W - e.w / 2),
    y: clamp(p.y, e.h / 2, WORLD_H - e.h / 2),
  };
}

// Full path computation: grid search for a walkable route, then collapse it
// to the minimal set of waypoints a straight-line walk can follow without
// clipping anything (skip ahead to the farthest point still in clear sight).
function computeCustomerPath(from, to, excludeTable, fp) {
  if (!findBlockingObstacle(from, to, excludeTable, fp)) return [to];

  const cell = fp ? fp.cell : PATH_CELL;
  const cols = Math.ceil(WORLD_W / cell);
  const rows = Math.ceil(WORLD_H / cell);
  const toCell = p => ({
    cx: clamp(Math.round(p.x / cell), 0, cols - 1),
    cy: clamp(Math.round(p.y / cell), 0, rows - 1),
  });
  const key = (cx, cy) => cy * cols + cx;

  const blocked = new Map();
  const isBlocked = (cx, cy) => {
    const k = key(cx, cy);
    if (!blocked.has(k)) {
      const c = cellCenter(cx, cy, fp);
      blocked.set(k, pointBlocked(c.x, c.y, excludeTable, fp));
    }
    return blocked.get(k);
  };

  // The entity usually starts between grid centers. Rounding that position
  // can put the nominal start cell on the far side of a furniture corner,
  // even though both the real start and the cell center are individually
  // clear. Anchor each endpoint to the nearest grid center it can actually
  // see so the first and last short hops are valid too.
  const nearestVisibleCell = point => {
    const origin = toCell(point);
    const maxRadius = Math.max(cols, rows);
    for (let radius = 0; radius < maxRadius; radius++) {
      const candidates = [];
      const minX = Math.max(0, origin.cx - radius);
      const maxX = Math.min(cols - 1, origin.cx + radius);
      const minY = Math.max(0, origin.cy - radius);
      const maxY = Math.min(rows - 1, origin.cy + radius);
      for (let cy = minY; cy <= maxY; cy++) {
        for (let cx = minX; cx <= maxX; cx++) {
          if (Math.max(Math.abs(cx - origin.cx), Math.abs(cy - origin.cy)) !== radius) continue;
          const center = cellCenter(cx, cy, fp);
          candidates.push({
            cx,
            cy,
            center,
            distance: (center.x - point.x) ** 2 + (center.y - point.y) ** 2,
          });
        }
      }
      candidates.sort((a, b) => a.distance - b.distance);
      for (const candidate of candidates) {
        if (isBlocked(candidate.cx, candidate.cy)) continue;
        if (!findBlockingObstacle(point, candidate.center, excludeTable, fp)) {
          return { cx: candidate.cx, cy: candidate.cy };
        }
      }
    }
    return origin;
  };

  const start = nearestVisibleCell(from);
  const goal = nearestVisibleCell(to);

  const open = [{ cx: start.cx, cy: start.cy, g: 0, f: 0 }];
  const cameFrom = new Map();
  const gScore = new Map([[key(start.cx, start.cy), 0]]);
  const closed = new Set();
  const heuristic = (cx, cy) => Math.hypot(cx - goal.cx, cy - goal.cy);

  let reached = null;
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    const ck = key(cur.cx, cur.cy);
    if (closed.has(ck)) continue;
    closed.add(ck);
    if (cur.cx === goal.cx && cur.cy === goal.cy) { reached = ck; break; }
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cur.cx + dx, ny = cur.cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        if (isBlocked(nx, ny)) continue;
        if (dx !== 0 && dy !== 0 && (isBlocked(cur.cx + dx, cur.cy) || isBlocked(cur.cx, cur.cy + dy))) continue;
        // Endpoint occupancy alone can miss a narrow collider between two
        // neighboring centers. Keep every A* edge collision-free so the
        // unsmoothed path is always a valid fallback for string-pulling.
        if (findBlockingObstacle(cellCenter(cur.cx, cur.cy, fp), cellCenter(nx, ny, fp), excludeTable, fp)) continue;
        const g = cur.g + Math.hypot(dx, dy);
        const nk = key(nx, ny);
        if (gScore.has(nk) && g >= gScore.get(nk)) continue;
        gScore.set(nk, g);
        cameFrom.set(nk, ck);
        open.push({ cx: nx, cy: ny, g, f: g + heuristic(nx, ny) });
      }
    }
  }

  if (reached === null) return [to]; // no walkable route found; fall back to a straight line

  const cellPoints = [];
  let k = reached;
  while (true) {
    const { cx, cy } = cellFromKey(k, cols);
    cellPoints.unshift(cellCenter(cx, cy, fp));
    if (!cameFrom.has(k)) break;
    k = cameFrom.get(k);
  }
  cellPoints.push(to);

  // String-pulling: from `from`, skip ahead to the farthest waypoint still
  // reachable in a straight line, repeat from there.
  const waypoints = [];
  let cursor = from;
  let i = 0;
  while (i < cellPoints.length) {
    let farthest = i;
    for (let j = i; j < cellPoints.length; j++) {
      if (!findBlockingObstacle(cursor, cellPoints[j], excludeTable, fp)) farthest = j;
    }
    waypoints.push(cellPoints[farthest]);
    cursor = cellPoints[farthest];
    i = farthest + 1;
  }
  return waypoints;
}
