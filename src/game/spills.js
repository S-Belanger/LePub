// ---- Spills: a pint Nazim knocked over. A wet patch on the boards that slows
// whoever walks through it — player and hunter alike — until it dries. -------
const spills = [];
const SPILL_TTL = 25;
const SPILL_RADIUS = 9;
const SPILL_SLOW = 0.6;

function addSpill(x, y) {
  spills.push({ x, y, ttl: SPILL_TTL, seed: Math.random() * 1000 });
  Sound.play('spill');
}

function spillSlowAt(x, y) {
  for (const sp of spills) {
    if (Math.hypot(sp.x - x, sp.y - y) < SPILL_RADIUS) return SPILL_SLOW;
  }
  return 1;
}

function updateSpills(dt) {
  for (let i = spills.length - 1; i >= 0; i--) {
    spills[i].ttl -= dt;
    if (spills[i].ttl <= 0) spills.splice(i, 1);
  }
}

// A walk-in who got too close to the puddle: whether they were still on
// their way to a seat or already sitting, they're done with this place.
// Only unserved *sitting* customers cost anything — someone still walking in
// never had an order to abandon, they just turn around.
function scareOffCustomer(c) {
  c.seat.occupied = false;
  if (c.state === 'sitting' && !c.served && c.orderType) {
    forgetOrder();
    dropFromTray(c);
    addFloatingText(c.x, c.y - c.h - 4, '-' + FORGOTTEN_PENALTY, '#e84c3d');
    noteOrderCleared(c);
    Sound.play('penalty');
    Dialogue.trigger('abandoned', null);
  }
  c.state = 'leaving';
  c.path = computeCustomerPath(c, reachablePoint(c, DOOR), c.seat.table);
  c.pathIndex = 0;
  c.moving = true;
}

// A knocked-over pint: a dark wet patch with a couple of lamp glints, drying
// (shrinking) over its last seconds.
function drawSpills(camX, camY) {
  for (const sp of spills) {
    const life = clamp(sp.ttl / SPILL_TTL, 0, 1);
    const r = Math.round(SPILL_RADIUS * (0.6 + 0.4 * life));
    const x = Math.round(sp.x - camX);
    const y = Math.round(sp.y - camY);
    ctx.fillStyle = 'rgba(20,10,6,0.45)';
    ctx.fillRect(x - r, y - Math.round(r * 0.5), r * 2, r);
    ctx.fillRect(x - r + 2, y - Math.round(r * 0.5) - 1, r * 2 - 4, r + 2);
    ctx.fillStyle = 'rgba(232,161,58,0.28)';
    ctx.fillRect(x - r + 3, y - 1, r, 1);
    ctx.fillStyle = 'rgba(245,225,170,0.35)';
    ctx.fillRect(x + Math.round(sp.seed % 5) - 2, y + 1, 2, 0.5);
    ctx.fillRect(x - Math.round(sp.seed % 3), y - 2, 1.5, 0.5);
  }
}
