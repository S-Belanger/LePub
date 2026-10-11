// Dependency-free classic-script geometry factory. No DOM, rendering or timers.
// Mutable furniture/body references are supplied by the game, never copied.
const CollisionRouting = (() => {
  function create({ worldW: WORLD_W, worldH: WORLD_H, hitboxes: ENTITY_HITBOXES, furniture: FURNITURE, getDynamicBlockers = () => [] }) {
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    // ---- Collision: furniture blocks movement for both characters. A small
    // footprint box near the feet is tested against each furniture collider so
    // characters can still visually overlap tall furniture like a real top-down
    // game (sprite draws above its feet). -------------------------------------
    const COLLISION_EPSILON = 1e-9;
    function rectsOverlap(a, b) {
      // Fractional chair contact can differ by a few ulps. Occupancy and movement
      // share one tolerance so tangency remains free in both queries.
      return a.x < b.x + b.w - COLLISION_EPSILON && a.x + a.w > b.x + COLLISION_EPSILON &&
        a.y < b.y + b.h - COLLISION_EPSILON && a.y + a.h > b.y + COLLISION_EPSILON;
    }

    function getFootBox(e, x, y) {
      const w = e.w * 0.55;
      const h = 7;
      return { x: x - w / 2, y: y - h, w, h };
    }

    // Temporary bodies participate in both routing and per-step collision.
    // The moving actor is excluded from its own route.


    function furnitureRects(f) { return f.colliders || [f.collider]; }

    function collidesAt(e, x, y, exclude) {
      const box = getFootBox(e, x, y);
      for (const f of FURNITURE) {
        if (f === exclude) continue;
        if (furnitureRects(f).some(r => rectsOverlap(box, r))) return true;
      }
      for (const b of getDynamicBlockers()) {
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

    function tryMove(e, dx, dy, exclude) {
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / MOVE_SUBSTEP));
      if (steps === 1) return tryMoveStep(e, e.x, e.y, dx, dy, exclude);
      const sx = dx / steps;
      const sy = dy / steps;
      let x = e.x;
      let y = e.y;
      let blockedX = false;
      let blockedY = false;
      for (let i = 0; i < steps; i++) {
        // Retry each axis as the other axis slides beyond a corner.
        const r = tryMoveStep(e, x, y, sx, sy, exclude);
        x = r.x;
        y = r.y;
        blockedX = blockedX || r.blockedX;
        blockedY = blockedY || r.blockedY;
        if (r.blockedX && r.blockedY) break;
      }
      return { x, y, blockedX, blockedY };
    }

    // Sweep one axis to exact contact rather than rejecting its entire step.
    // This also catches arbitrarily thin obstacles between start and destination.
    function moveAxis(e, x, y, amount, axis, exclude) {
      const start = axis === 'x' ? x : y;
      if (amount === 0) return start;
      const size = axis === 'x' ? 'w' : 'h';
      const other = axis === 'x' ? 'y' : 'x';
      const otherSize = axis === 'x' ? 'h' : 'w';
      const half = e[size] / 2;
      let target = clamp(start + amount, half, (axis === 'x' ? WORLD_W : WORLD_H) - half);
      const box = getFootBox(e, x, y);
      function constrain(r) {
        if (box[other] >= r[other] + r[otherSize] - COLLISION_EPSILON || box[other] + box[otherSize] <= r[other] + COLLISION_EPSILON) return;
        if (amount > 0 && box[axis] + box[size] <= r[axis] + COLLISION_EPSILON) {
          target = Math.min(target, r[axis] - (axis === 'x' ? box.w / 2 : 0));
        } else if (amount < 0 && box[axis] >= r[axis] + r[size] - COLLISION_EPSILON) {
          target = Math.max(target, r[axis] + r[size] + (axis === 'x' ? box.w / 2 : box.h));
        } else if (rectsOverlap(box, r)) {
          // A wandering body can overlap an actor between frames. Let that actor
          // reduce penetration a little at a time, without moving deeper inside.
          const overlap = Math.min(box[axis] + box[size], r[axis] + r[size]) - Math.max(box[axis], r[axis]);
          const endMin = box[axis] + target - start;
          const endOverlap = Math.min(endMin + box[size], r[axis] + r[size]) - Math.max(endMin, r[axis]);
          if (endOverlap > COLLISION_EPSILON && endOverlap >= overlap - COLLISION_EPSILON) target = start;
        }
      }
      for (const f of FURNITURE) if (f !== exclude) for (const r of furnitureRects(f)) constrain(r);
      for (const b of getDynamicBlockers()) if (b !== e) constrain(getFootBox(b, b.x, b.y));
      return target;
    }

    function tryMoveStep(e, x0, y0, dx, dy, exclude) {
      const x = moveAxis(e, x0, y0, dx, 'x', exclude);
      const y = moveAxis(e, x, y0, dy, 'y', exclude);
      return { x, y, blockedX: dx !== 0 && Math.abs(x - (x0 + dx)) > COLLISION_EPSILON,
        blockedY: dy !== 0 && Math.abs(y - (y0 + dy)) > COLLISION_EPSILON };
    }

    // ---- Footprint-aware routing with exact edge validation and smoothing.
    // Callers retain destinations, validate live legs and retry failed searches
    // on a bounded cadence; a failed search returns an empty path.
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
    const NICK_FOOTPRINT = footprintFor('nick');

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

    function findBlockingObstacle(p1, p2, exclude, fp, actor = p1) {
      const margin = fp ? fp.margin : PATH_MARGIN;
      for (const f of FURNITURE) {
        if (f === exclude) continue;
        for (const r of furnitureRects(f)) {
          // Inflate each physical piece into the forbidden feet-anchor region.
          const inflated = {
            x: r.x - margin + COLLISION_EPSILON,
            y: r.y + COLLISION_EPSILON,
            w: r.w + 2 * margin - 2 * COLLISION_EPSILON,
            h: r.h + PATH_FOOT_H - 2 * COLLISION_EPSILON,
          };
          if (segmentHitsRect(p1, p2, inflated)) return f;
        }
      }
      for (const b of getDynamicBlockers()) {
        if (b === actor) continue;
        const r = getFootBox(b, b.x, b.y);
        const inflated = { x: r.x - margin + COLLISION_EPSILON, y: r.y + COLLISION_EPSILON,
          w: r.w + 2 * margin - 2 * COLLISION_EPSILON, h: r.h + PATH_FOOT_H - 2 * COLLISION_EPSILON };
        if (segmentHitsRect(p1, p2, inflated)) return b;
      }
      return null;
    }

    function pointBlocked(x, y, excludeTable, fp, actor) {
      // Mirrors getFootBox's feet-anchored shape (see collision section above)
      // so the grid agrees with the runtime collision check that walks it.
      const margin = fp ? fp.margin : PATH_MARGIN;
      const box = { x: x - margin, y: y - PATH_FOOT_H, w: margin * 2, h: PATH_FOOT_H };
      for (const f of FURNITURE) {
        if (f === excludeTable) continue;
        if (furnitureRects(f).some(r => rectsOverlap(box, r))) return true;
      }
      for (const b of getDynamicBlockers()) {
        if (b !== actor && rectsOverlap(box, getFootBox(b, b.x, b.y))) return true;
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
    function computeCustomerPath(from, to, excludeTable, fp, actor = from) {
      if (pointBlocked(from.x, from.y, excludeTable, fp, actor) || pointBlocked(to.x, to.y, excludeTable, fp, actor)) return [];
      if (!findBlockingObstacle(from, to, excludeTable, fp, actor)) return [to];

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
          blocked.set(k, pointBlocked(c.x, c.y, excludeTable, fp, actor));
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
            if (!findBlockingObstacle(point, candidate.center, excludeTable, fp, actor)) {
              return { cx: candidate.cx, cy: candidate.cy };
            }
          }
        }
        return null;
      };

      const start = nearestVisibleCell(from);
      const goal = nearestVisibleCell(to);
      if (!start || !goal) return [];

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
            if (findBlockingObstacle(cellCenter(cur.cx, cur.cy, fp), cellCenter(nx, ny, fp), excludeTable, fp, actor)) continue;
            const g = cur.g + Math.hypot(dx, dy);
            const nk = key(nx, ny);
            if (gScore.has(nk) && g >= gScore.get(nk)) continue;
            gScore.set(nk, g);
            cameFrom.set(nk, ck);
            open.push({ cx: nx, cy: ny, g, f: g + heuristic(nx, ny) });
          }
        }
      }

      if (reached === null) return []; // no route means wait; never invent a blocked leg

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
        let farthest = -1;
        for (let j = i; j < cellPoints.length; j++) {
          if (!findBlockingObstacle(cursor, cellPoints[j], excludeTable, fp, actor)) farthest = j;
        }
        if (farthest < i) return [];
        waypoints.push(cellPoints[farthest]);
        cursor = cellPoints[farthest];
        i = farthest + 1;
      }
      return waypoints;
    }

    // A larger pursuer may not fit at a smaller actor's legal feet anchor.
    // Pick the nearest reachable point inside interaction range, rather than
    // treating that occupied endpoint as a disconnected floor component.
    // At most one candidate per direction is searched; clear endpoint routes
    // retain the ordinary no-route result, including permanent wall failures.
    function computeApproachPath(from, to, range, fp, actor = from) {
      if (!pointBlocked(to.x, to.y, null, fp, actor)) return computeCustomerPath(from, to, null, fp, actor);
      const candidates = [];
      const maxRadius = Math.max(0, range - 3.5); // leave room for chase waypoint tolerance
      for (let direction = 0; direction < 16; direction++) {
        const angle = direction * Math.PI / 8;
        for (let radius = 0.5; radius <= maxRadius; radius += 0.5) {
          const point = {
            x: clamp(to.x + Math.cos(angle) * radius, fp.halfW, WORLD_W - fp.halfW),
            y: clamp(to.y + Math.sin(angle) * radius, fp.halfH, WORLD_H - fp.halfH),
          };
          if (Math.hypot(point.x - to.x, point.y - to.y) > maxRadius) continue;
          if (pointBlocked(point.x, point.y, null, fp, actor)) continue;
          // No approach through a wall or intervening body. This connection
          // tests the physical furniture; the pursuer remains at its clear
          // anchor instead of needing to occupy the smaller target's anchor.
          if (findBlockingObstacle(point, to, null, { margin: 0 }, actor)) continue;
          candidates.push(point);
          break;
        }
      }
      candidates.sort((a, b) => Math.hypot(a.x - to.x, a.y - to.y) - Math.hypot(b.x - to.x, b.y - to.y) ||
        Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y));
      for (const point of candidates) {
        const path = computeCustomerPath(from, point, null, fp, actor);
        if (path.length) return path;
      }
      return [];
    }

    return { rectsOverlap, getFootBox, furnitureRects, collidesAt, tryMove, tryMoveStep, moveAxis, footprintFor, segmentHitsRect, findBlockingObstacle, pointBlocked, cellFromKey, cellCenter, reachablePoint, computeCustomerPath, computeApproachPath, COLLISION_EPSILON, MOVE_SUBSTEP, PATH_CELL, PATH_MARGIN, PATH_FOOT_H, CUSTOMER_HALF_W, CUSTOMER_HALF_H, CUSTOMER_FOOTPRINT, HUNTER_FOOTPRINT, BUSBOY_FOOTPRINT, ALEX_FOOTPRINT, NICK_FOOTPRINT };
  }
  return { create };
})();
