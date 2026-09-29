// ---- World ------------------------------------------------------------------
// Portrait map (narrower than tall) to match the intended floor plan: a small
// table up-left, a long many-seat table up-right, an L-shaped bar down the
// middle-left, a column of small 2-seat tables, and two wide tables below.
const WORLD_W = 200;
const WORLD_H = 360;

// Collision boxes intentionally remain at the dimensions used by the
// accepted playable build. Sprite sheets can now gain resolution or alter
// their outer silhouette without silently widening routes or catch distance.
const ENTITY_HITBOXES = {
  doe: { w: 16, h: 18 },
  hunter: { w: 21, h: 18 },
  customer: { w: 14, h: 13 },
  ghost: { w: 12, h: 10 },
  waiter: { w: 14, h: 17 },
  busboy: { w: 14, h: 17 },
  alex: { w: 14, h: 17 },
  nazim: { w: 14, h: 15 },
  sam: { w: 14, h: 15 },
  gerald: { w: 14, h: 15 },
};

// ---- Furniture: an L-shaped bar plus tables of varying size and seat count.
// Colliders block movement for both characters; visuals are z-sorted
// together with the characters below. ----------------------------------------
const TABLE_SIZE = 14; // default table size when a table doesn't specify w/h
const CHAIR_SIZE = 6;
const CHAIR_GAP = 2;

// A table can be any size and can put any number of chairs evenly spaced
// along each side (n/s/e/w), not just one — e.g. a long table with 4 seats
// down each long edge. `seats` counts default to 1 per side, 0 = no chairs
// on that side.
function makeTable(cx, cy, opts = {}) {
  const w = opts.w ?? TABLE_SIZE;
  const h = opts.h ?? TABLE_SIZE;
  const seats = { n: 1, s: 1, e: 1, w: 1, ...opts.seats };
  const type = opts.type ?? 'table';
  const seatStyle = opts.seatStyle ?? 'chairs';
  // A bare stool row (e.g. chairs at the bar) has no tabletop of its own to
  // block movement around — only the chairs drawn there should. A wall
  // bench (seatStyle 'bench') does draw a solid body matching its full w/h,
  // same as a table, so those still get the table-shaped collider below.
  const hasSolidBody = type !== 'bench' || seatStyle === 'bench';

  let collider;
  if (hasSolidBody) {
    // A side only needs room for a chair to stick out if it actually has
    // one — padding every side by the same chair-sized margin made the
    // walkable corridors around chairless sides feel needlessly tight.
    const CHAIR_PAD = CHAIR_GAP + CHAIR_SIZE;
    const padN = seats.n > 0 ? CHAIR_PAD : CHAIR_GAP;
    const padS = seats.s > 0 ? CHAIR_PAD : CHAIR_GAP;
    const padW = seats.w > 0 ? CHAIR_PAD : CHAIR_GAP;
    const padE = seats.e > 0 ? CHAIR_PAD : CHAIR_GAP;
    collider = {
      x: cx - (w / 2 + padW),
      y: cy - (h / 2 + padN),
      w: w + padW + padE,
      h: h + padN + padS,
    };
  } else {
    // Tight box around wherever the chairs actually land, instead of the
    // w/h footprint used only to space them out (which has no matching
    // visual and was blocking a much wider area than the chairs occupy).
    const seatPoints = getTableSeats({ x: cx, y: cy, w, h, seats });
    const half = CHAIR_SIZE / 2 + CHAIR_GAP;
    const xs = seatPoints.map(p => p.x);
    const ys = seatPoints.map(p => p.y);
    collider = {
      x: Math.min(...xs) - half,
      y: Math.min(...ys) - half,
      w: Math.max(...xs) - Math.min(...xs) + 2 * half,
      h: Math.max(...ys) - Math.min(...ys) + 2 * half,
    };
  }

  return {
    type,
    x: cx,
    y: cy,
    w,
    h,
    seats,
    seatStyle,
    facing: opts.facing ?? null,
    // Sort by the table top's own front edge, not the wider chair footprint —
    // a customer seated south is standing at the table's edge and should
    // draw in front of it, not behind. A wall bench sorts by its back edge
    // instead: everyone on it sits in front of it, never under it. Chairs
    // and stools are separate drawables (CHAIRS), each sorted just behind
    // the person sitting on it.
    sortY: type === 'bench' && seatStyle === 'bench' ? cy - h / 2 : cy + h / 2,
    collider,
  };
}

// Evenly spaced seats along one side of a table (used for both gameplay
// seat positions and where to draw the chair sprites, so they always match).
function getTableSeats(table) {
  const { x: cx, y: cy, w, h, seats } = table;
  const reachY = h / 2 + CHAIR_GAP + CHAIR_SIZE / 2;
  const reachX = w / 2 + CHAIR_GAP + CHAIR_SIZE / 2;
  function along(count, length) {
    const out = [];
    const step = length / (count + 1);
    for (let i = 1; i <= count; i++) out.push(-length / 2 + step * i);
    return out;
  }
  const out = [];
  for (const px of along(seats.n, w)) out.push({ x: cx + px, y: cy - reachY, side: 'n' });
  for (const px of along(seats.s, w)) out.push({ x: cx + px, y: cy + reachY, side: 's' });
  for (const py of along(seats.w, h)) out.push({ x: cx - reachX, y: cy + py, side: 'w' });
  for (const py of along(seats.e, h)) out.push({ x: cx + reachX, y: cy + py, side: 'e' });
  return out;
}

// The bar as a small L: a short counter, a vertical stem, and a foot that
// meets it — three rectangular segments sharing the same visual treatment.
// Coordinates traced from the hand-drawn floor plan (see assets/art-direction/floor-plan.png).
//
// Each segment is also a *station*: the taps pour the beers, the shelf holds
// the wine and cocktails, the kitchen hatch does food. An order can only be
// picked up at the station that makes it, so every trip to the bar is a
// choice — which station is nearer, whose patience is reddest, is the hunter
// between me and the taps. Remapping a station is a one-word edit here.
// Each station also has a colour, used everywhere it's referred to — its
// plaque, the corner of every ticket it makes, its waiting-count badge — so
// "which counter?" is answered by colour before anyone reads a word.
const BAR_STATIONS = {
  taps: { label: 'TAPS', color: '#e6a93c', types: ['beer-dark', 'beer-red', 'beer-blond', 'water'] },
  shelf: { label: 'SHELF', color: '#c56a9a', types: ['wine', 'cocktail'] },
  hatch: { label: 'KITCHEN', color: '#86b85e', types: ['food'] },
};
function stationForType(type) {
  for (const id in BAR_STATIONS) if (BAR_STATIONS[id].types.indexOf(type) !== -1) return id;
  return null;
}
const BAR_SEGMENTS = [
  { x: 1, y: 67, w: 71, h: 22, station: 'taps' },    // short counter, upper-left
  { x: 91, y: 109, w: 27, h: 90, station: 'shelf' }, // vertical stem
  { x: 1, y: 177, w: 87, h: 23, station: 'hatch' },  // foot, meets the stem, touches the wall
].map(r => ({
  type: 'bar',
  collider: { x: r.x, y: r.y, w: r.w, h: r.h },
  station: r.station,
  sortY: r.y + r.h,
}));

// TABLES[0] is the regulars' booth — the traced plan's top-left table, nudged
// right so it clears the left wall bench. It was two chairs down each long
// edge, which put the seats ~7px apart: fine for anonymous patrons, unreadable
// once three 14x15 named characters sit there. One chair per side spreads them
// out (Sam west, Gerald east, Nazim south facing the table). The north side is
// left chairless because the wall bench above it is already within reach.
const TABLES = [
  makeTable(62, 40, { w: 40, h: 22, seats: { n: 0, s: 1, w: 1, e: 1 } }),   // regulars' booth
  makeTable(152, 68, { w: 22, h: 65, seats: { n: 0, s: 0, w: 4, e: 0 } }),  // top-right, long
  makeTable(180, 210, { w: 38, h: 32, seats: { n: 1, s: 1, e: 0, w: 0 } }),
  makeTable(180, 269, { w: 37, h: 33, seats: { n: 1, s: 1, e: 0, w: 0 } }),
  makeTable(58, 258, { w: 114, h: 29, seats: { n: 4, s: 4, e: 0, w: 0 } }), // wide
  makeTable(58, 315, { w: 114, h: 29, seats: { n: 4, s: 4, e: 0, w: 0 } }), // wide
];

// Wall-hugging benches: seating with no tabletop of its own. The three
// wall/corner benches draw as a single long bench shape (`seatStyle:
// 'bench'`) rather than a row of separate chairs, and sit just inside the
// decorative wall bands so they aren't painted over by them; the two at the
// bar are individual stools (`seatStyle: 'chairs'`, the default), since
// that's how people actually sit at a bar. Reuses makeTable purely for its
// evenly-spaced-seats math and collider (for the "near their table" delivery
// check) — `type: 'bench'` tells the renderer to skip drawing a tabletop.
const BENCHES = [
  makeTable(8, 43, { w: 6, h: 55, seats: { n: 0, s: 0, e: 3, w: 0 }, type: 'bench', seatStyle: 'bench', facing: 'right' }),      // left wall: into room
  makeTable(163, 13, { w: 60, h: 8, seats: { n: 0, s: 3, e: 0, w: 0 }, type: 'bench', seatStyle: 'bench', facing: 'down' }),    // top wall: into room
  makeTable(191, 68, { w: 6, h: 71, seats: { n: 0, s: 0, e: 0, w: 4 }, type: 'bench', seatStyle: 'bench', facing: 'left' }),    // right wall: into room
  makeTable(152, 151, { w: 16, h: 74, seats: { n: 0, s: 0, e: 0, w: 3 }, type: 'bench', facing: 'left' }), // stools toward bar stem
  makeTable(51, 222, { w: 95, h: 14, seats: { n: 3, s: 0, e: 0, w: 0 }, type: 'bench', facing: 'up' }),  // stools toward bar foot
];

const FURNITURE = [...BAR_SEGMENTS, ...TABLES, ...BENCHES];

// Every chair and bar stool as its own y-sorted item, a hair behind its seat
// point: whoever sits there always draws over the cushion, while anyone
// walking past in front of it still draws over the chair. Wall benches are
// single pieces of furniture and are not listed here.
const CHAIRS = [...TABLES, ...BENCHES.filter(b => b.seatStyle !== 'bench')].flatMap(t =>
  getTableSeats(t).map((seat, index) => ({ ...seat, table: t, index, sortY: seat.y - 0.25 })));

// `reserved` is set once at load for the regulars' chairs and never cleared —
// generic customers must never be seated there, restart included.
const SEATS = [...TABLES, ...BENCHES].flatMap(t => getTableSeats(t).map(seat => ({
  ...seat, table: t, occupied: false, reserved: false, regularId: null,
})));

const REGULARS_TABLE = TABLES[0];
for (const cfg of REGULARS) {
  const seat = SEATS.find(s => s.table === REGULARS_TABLE && s.side === cfg.seatSide);
  if (!seat) throw new Error('No ' + cfg.seatSide + ' chair at the regulars table for ' + cfg.name);
  seat.reserved = true;
  seat.regularId = cfg.id;
}

// Customers walk in from this point at the bottom wall.
const DOOR = { x: WORLD_W / 2, y: WORLD_H - 3 };

// The bathroom, for the bladder mechanic below: no extra floor space, just a
// marked spot in the existing gap on the right side of the room — the open
// floor right of TABLES[3] (bottom edge y=293.5) and short of the back wall,
// the first thing on the right after walking in through DOOR. Clear of every
// collider in that pocket.
const BATHROOM = { x: 180, y: 320 };
