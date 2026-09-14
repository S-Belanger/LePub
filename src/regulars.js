// ============================================================================
// Le Pub — named regulars: configuration and pure rules
// Nazim, Sam and Gerald are permanent seated NPCs at the corner booth. This
// file holds *what they are* (identity, seat, palette, ordering habits, how
// intoxication progresses); game.js holds the runtime instances and wires them
// into the existing customer/order systems.
//
// Everything here is data or a pure function, so behaviour is configured in
// one place rather than scattered as `if (name === 'Nazim')` checks.
// ============================================================================

// Only drinks move Nazim's needle. Food is food.
const ALCOHOL_ORDER_TYPES = ['beer-dark', 'beer-red', 'beer-blond', 'cocktail', 'wine'];
function isAlcoholicOrder(type) { return ALCOHOL_ORDER_TYPES.indexOf(type) !== -1; }

// ---- Intoxication ----------------------------------------------------------
// Ordered low to high; `minDrinks` is inclusive and the last matching entry
// wins, so the ladder is walked top-down exactly once. The progression is
// deliberately gradual: one drink is "warmed up", not "hammered".
const INTOX_STAGES = [
  { id: 'sober', label: 'Sober', minDrinks: 0 },
  { id: 'warm', label: 'Warmed up', minDrinks: 1 },
  { id: 'buzzed', label: 'Buzzed', minDrinks: 2 },
  { id: 'drunk', label: 'Drunk', minDrinks: 3 },
  { id: 'gone', label: 'Gone', minDrinks: 5 },
];

function intoxStageForDrinks(drinks) {
  let stage = INTOX_STAGES[0];
  for (const s of INTOX_STAGES) if (drinks >= s.minDrinks) stage = s;
  return stage;
}

// How each stage looks and behaves. Read by game.js when picking Nazim's pose,
// palette and idle timings — kept out of the render code so the whole
// progression is legible in one table.
//   pose         — sprite pose key in SPRITES.nazim
//   blush        — colour for the 'r' cheek pixels (null = leave as skin)
//   eye          — colour for the open eye; the lean/slump poses use 'v'
//   blink        — [min, max] seconds between blinks; slower/heavier over time
//   sway         — horizontal seated sway in pixels (0 = still)
//   swaySpeed    — radians/sec of that sway
//   reactionDelay— seconds added before his dialogue fires, so he gets slower
const NAZIM_STAGE_VISUALS = {
  sober: { pose: 'idle', blush: null, eye: '#f5efe0', blink: [3.5, 6.5], sway: 0, swaySpeed: 0, reactionDelay: 0.25 },
  warm: { pose: 'idle', blush: '#c9866c', eye: '#f5efe0', blink: [3.0, 5.5], sway: 0, swaySpeed: 0, reactionDelay: 0.3 },
  buzzed: { pose: 'idle', blush: '#cf7d63', eye: '#efe3cf', blink: [2.4, 4.2], sway: 1, swaySpeed: 1.4, reactionDelay: 0.5 },
  drunk: { pose: 'lean', blush: '#d4705a', eye: '#e6d5bd', blink: [1.6, 3.0], sway: 1, swaySpeed: 1.9, reactionDelay: 0.8 },
  gone: { pose: 'slump', blush: '#dc6a52', eye: '#d8c4a8', blink: [1.1, 2.2], sway: 1, swaySpeed: 2.5, reactionDelay: 1.3 },
};

// ---- Cast ------------------------------------------------------------------
// `seatSide` picks which of the booth's four chairs each one owns; the fourth
// (north) chair is deliberately left to generic customers. Order weights are
// relative, not percentages.
const REGULARS = [
  {
    id: 'nazim',
    name: 'NAZIM',
    spriteKey: 'nazim',
    accent: '#7a9450',             // dialogue-bubble frame colour
    seatSide: 's',                 // front of the booth, closest to the camera
    // Genuinely chill: he waits a long time and orders steadily.
    patience: [40, 60],
    orderDelay: [6, 14],           // seconds between finishing one and wanting the next
    firstOrderDelay: [4, 9],
    orderWeights: {
      'beer-blond': 4, 'beer-red': 3, 'beer-dark': 3,
      cocktail: 2, wine: 2, food: 3,
    },
  },
  {
    id: 'sam',
    name: 'SAM',
    spriteKey: 'sam',
    accent: '#5b7fae',
    seatSide: 'w',
    patience: [34, 52],
    orderDelay: [9, 18],
    firstOrderDelay: [7, 13],
    orderWeights: {
      'beer-blond': 3, cocktail: 3, food: 3,
      wine: 1, 'beer-dark': 2, 'beer-red': 1,
    },
  },
  {
    id: 'gerald',
    name: 'GERALD',
    spriteKey: 'gerald',
    accent: '#a8434f',
    seatSide: 'e',                 // directly across the table from Nazim
    // Impatient by construction: the shortest fuse of the three.
    patience: [26, 40],
    orderDelay: [7, 15],
    firstOrderDelay: [3, 8],
    orderWeights: {
      'beer-dark': 5, food: 3, wine: 2,
      'beer-red': 1, 'beer-blond': 1, cocktail: 1,
    },
  },
];

// Weighted pick over an { orderType: weight } map.
function pickWeightedOrderType(weights) {
  let total = 0;
  for (const k in weights) total += weights[k];
  let roll = Math.random() * total;
  for (const k in weights) {
    roll -= weights[k];
    if (roll <= 0) return k;
  }
  return Object.keys(weights)[0];
}

function randomInRange(range) { return range[0] + Math.random() * (range[1] - range[0]); }

// ---- Mood ------------------------------------------------------------------
// A single number per regular in [-1, 1], pushed up by a delivery and down by
// a forgotten order. The dialogue layer reads it to scale how often each of
// them pipes up: someone who feels strongly either way talks more than someone
// who is merely fine. Recovery goes back toward each character's own baseline
// rather than toward neutral, so Gerald recovering means returning to grumpy.
const MOOD_BASELINE = { nazim: 0.3, sam: 0.2, gerald: -0.5 };
const MOOD_RECOVERY = 0.04; // per second, toward baseline

function clampMood(v) { return Math.max(-1, Math.min(1, v)); }
