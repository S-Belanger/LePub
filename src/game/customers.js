// ---- Order-bubble lifecycle -------------------------------------------------
// An order bubble grows in when it appears and shrinks out when it's dealt
// with, in a few discrete pixel steps rather than a smooth ease. Both
// populations share these three helpers so the two never drift apart.
const BUBBLE_APPEAR_TIME = 0.18;
const BUBBLE_EXIT_TIME = 0.14;

function noteOrderPlaced(e) {
  e.orderAppearAt = gameTime;
  e.orderExit = null;
}

// Called before the order itself is cleared, so the outgoing bubble still
// knows which icon to shrink.
function noteOrderCleared(e) {
  if (e.orderType) e.orderExit = { type: e.orderType, ttl: BUBBLE_EXIT_TIME };
}

function tickOrderExit(e, dt) {
  if (!e.orderExit) return;
  e.orderExit.ttl -= dt;
  if (e.orderExit.ttl <= 0) e.orderExit = null;
}

// Small floating "+10"/"-15" texts that pop up at a point and drift/fade —
// gives the score/penalty feedback a place to happen visually.
const floatingTexts = [];
function addFloatingText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color, ttl: 1 });
}

// player.tray: up to TRAY_MAX { type, customer } items while ferrying orders from
// the bar to the customers who ordered them.
player.tray = [];
// A second order on the tray slows the Doe under the hunter's top speed, so
// carrying two is a real bet. Landing both without taking a hit pays out.
const PLAYER_SPEED = 62;
const TRAY_MAX = 2;
const TRAY_SPEED = 54;
const DOUBLE_BONUS = 10;
let doubleArmed = false;    // the tray was full at some point this trip
let doubleHitFree = true;   // ...and nobody has been hit since

// ---- Customers: trickle in from the door, walk to a free seat, sit for a
// while, then leave. No movement collision with the chase, but once seated
// they order something (a speech-bubble icon) that the player has to fetch
// from the bar and deliver — a customer who gives up unserved costs points.
const customers = [];
const BASE_MAX_CUSTOMERS = 6;
const CUSTOMER_ORDER_PATIENCE = [45, 65];
const SERVED_CUSTOMER_STAY = [10, 14]; // short drink break before freeing the seat
let customerSpawnTimer = 3;

function spawnCustomer() {
  const freeSeat = SEATS.filter(s => !s.occupied && !s.reserved);
  if (!freeSeat.length) return;
  const seat = freeSeat[Math.floor(Math.random() * freeSeat.length)];
  seat.occupied = true;
  const c = makeEntity('customer', DOOR.x, DOOR.y);
  c.palette = makeCustomerPalette();
  c.look = Math.floor(Math.random() * CUSTOMER_ATLASES.length);
  c.state = 'entering';
  c.seat = seat;
  c.path = computeCustomerPath(DOOR, seat, seat.table);
  c.pathIndex = 0;
  c.sitTimer = 0;
  c.orderType = null;
  c.orderTimer = 0;
  c.orderPlacedAt = 0;
  c.orderAppearAt = 0;
  c.orderExit = null;
  c.served = false;
  c.beingCarried = false;
  customers.push(c);
}

function updateCustomer(c, dt) {
  if (c.state === 'entering' || c.state === 'leaving') {
    const target = c.path[c.pathIndex];
    const dx = target.x - c.x;
    const dy = target.y - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1.5) {
      c.x = target.x;
      c.y = target.y;
      if (c.pathIndex < c.path.length - 1) {
        c.pathIndex++;
        return null;
      }
      c.moving = false;
      if (c.state === 'entering') {
        c.state = 'sitting';
        c.facing = seatFacing(c.seat);
        c.sitTimer = randomInRange(CUSTOMER_ORDER_PATIENCE);
        c.patienceDuration = c.sitTimer; // remembered so the patience bar can show a fraction
        c.orderTimer = 1 + Math.random() * 1.5;
      } else {
        return 'remove';
      }
    } else {
      const step = Math.min(dist, c.speed * dt);
      const stepX = (dx / dist) * step;
      const stepY = (dy / dist) * step;
      // Slide around other tables like the player does (the routed path
      // above avoids them, this is just a safety net), but never collide
      // with the customer's own table — its seats sit inside that table's
      // padded collider, so excluding it is what lets them reach the seat.
      const ownTable = c.seat.table;
      const nx = clamp(c.x + stepX, c.w / 2, WORLD_W - c.w / 2);
      if (!collidesAt(c, nx, c.y, ownTable)) c.x = nx;
      const ny = clamp(c.y + stepY, c.h / 2, WORLD_H - c.h / 2);
      if (!collidesAt(c, c.x, ny, ownTable)) c.y = ny;
      c.flip = dx < 0;
      c.moving = true;
      faceToward(c, dx, dy);
    }
  } else if (c.state === 'sitting') {
    c.moving = false;
    if (c.orderType === null) {
      c.orderTimer -= dt;
      if (c.orderTimer <= 0) {
        c.orderType = randomOrderType();
        c.orderPlacedAt = gameTime;
        noteOrderPlaced(c);
        Sound.play('order');
      }
    }
    c.sitTimer -= dt * patienceRate();
    if (c.sitTimer <= 0) {
      c.seat.occupied = false;
      if (!c.served && c.orderType) {
        forgetOrder();
        addFloatingText(c.x, c.y - c.h - 4, '-' + FORGOTTEN_PENALTY, '#e84c3d');
        noteOrderCleared(c);
        Sound.play('penalty');
        Dialogue.trigger('abandoned', null);
      }
      c.state = 'leaving';
      c.path = computeCustomerPath(c, reachablePoint(c, DOOR), c.seat.table);
      c.pathIndex = 0;
    }
  }
  return null;
}
