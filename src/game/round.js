// ---- The round: now and then the three of them order together, and landing
// all three inside the window pays a bonus on top of the tips. --------------
const ROUND_INTERVAL = [90, 150];
const ROUND_WINDOW = 20;
const ROUND_BONUS = 25;
const ROUND_PATIENCE = 32;
let roundTimer = 0;
let round = null;   // { deadline, served, servedIds }

function tryCallRound() {
  for (const r of regulars) if (r.orderType || r.wander) return false;
  for (const r of regulars) {
    r.orderCooldown = 0;
    regularPlaceOrder(r);
    r.sitTimer = ROUND_PATIENCE;
    r.patienceDuration = ROUND_PATIENCE;
  }
  round = { deadline: gameTime + ROUND_WINDOW, served: 0, servedIds: new Set() };
  Dialogue.trigger('roundCalled', null);
  return true;
}

function noteRoundDelivery(r) {
  if (!round || !r.isRegular) return;
  // Count people, not deliveries: a fast-reordering Nazim served twice must
  // not stand in for a regular still waiting on his round.
  if (!round.servedIds) round.servedIds = new Set();
  if (round.servedIds.has(r.id)) return;
  round.servedIds.add(r.id);
  round.served++;
  if (round.served >= regulars.length) {
    earnTips(ROUND_BONUS);
    shiftStats.rounds++;
    addFloatingText(REGULARS_TABLE.x, REGULARS_TABLE.y - 16, 'ROUND +' + ROUND_BONUS, PUB.amber);
    Sound.play('levelUp');
    Dialogue.trigger('roundDone', null);
    round = null;
    roundTimer = randomInRange(ROUND_INTERVAL);
  }
}

function updateRound(dt) {
  if (round) {
    if (gameTime > round.deadline) {
      round = null;
      roundTimer = randomInRange(ROUND_INTERVAL);
      Dialogue.trigger('roundMissed', null);
    }
    return;
  }
  roundTimer -= dt;
  if (roundTimer <= 0) {
    if (!tryCallRound()) roundTimer = 8;   // somebody's mid-order; try again shortly
  }
}
