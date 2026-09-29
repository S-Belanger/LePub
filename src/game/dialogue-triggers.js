// ---- Dialogue wiring --------------------------------------------------------
// The dialogue layer only ever reads state and schedules bubbles; it can't
// pause the chase or block input. Triggers are fired from the moments they
// describe rather than polled, except for the few genuinely time-based ones
// (idle, carrying too long) tracked in update().
Dialogue.bind({
  getRegular: (id) => regularById.get(id) || null,
  getNazimStageId: () => {
    const n = regularById.get('nazim');
    return n ? n.stage.id : 'sober';
  },
  // Nazim's answers arrive later the drunker he is; everyone else is prompt.
  getReactionDelay: (id) => {
    if (id !== 'nazim') return 0;
    const n = regularById.get('nazim');
    return n ? NAZIM_STAGE_VISUALS[n.stage.id].reactionDelay : 0;
  },
  // A speaking regular opens their mouth for as long as the bubble runs,
  // capped so the talking pose doesn't outstay a long line.
  onSpeak: (speaker, life) => setRegularTalking(speaker, Math.min(life, 1.6)),
});

function onRegularOrdered(r) {
  setRegularTalking(r, 0.6);
  if (r.id === 'nazim' && r.orderType === 'water') Dialogue.trigger('waterOrdered', null);
  else if (r.id === 'nazim' && r.orderType === 'food') Dialogue.trigger('nazimFood', { who: 'nazim' });
  else Dialogue.trigger('ordered', { who: r.id });
}

function onRegularGaveUp(r, lapsedType) {
  setRegularTalking(r, 0.8);
  Dialogue.trigger('lateOrder', { who: r.id });
}

function onRegularServed(r, type, stageChanged) {
  setRegularTalking(r, 1.0);
  // A stage change is the bigger news, and outranks the thank-you.
  if (stageChanged) Dialogue.trigger('stageChanged', null);
  else Dialogue.trigger('served', { who: r.id });
}

// Edge/timing state for the triggers that aren't a single moment. All of it is
// cleared by resetGame().
let lastLevelSeen = 1;
let idleTimer = 0;
let whiffCount = 0;
let whiffDecay = 0;
let carryTimer = 0;
let hunterNearArmed = true;
let nearMissCooldown = 0;
let twoWaitingCooldown = 0;
let hasPlayedBefore = false;

function resetDialogueTriggers() {
  lastLevelSeen = getLevel();
  idleTimer = 0;
  whiffCount = 0;
  whiffDecay = 0;
  carryTimer = 0;
  hunterNearArmed = true;
  nearMissCooldown = 0;
  twoWaitingCooldown = 0;
}

// Everything in update() that watches for a dialogue-worthy situation, kept
// together so the simulation above stays readable.
function updateDialogueTriggers(dt, input) {
  const lvl = getLevel();
  if (lvl > lastLevelSeen) {
    lastLevelSeen = lvl;
    Sound.play('levelUp');
    Dialogue.trigger('levelUp', null);
  }

  // The hunter sweeping past the booth. Re-arms only once he's well clear, so
  // one pass is one remark.
  const boothDist = Math.hypot(hunter.x - REGULARS_TABLE.x, hunter.y - REGULARS_TABLE.y);
  if (boothDist < 46 && hunterNearArmed) {
    hunterNearArmed = false;
    Dialogue.trigger('hunterNear', null);
  } else if (boothDist > 72) {
    hunterNearArmed = true;
  }

  // A near miss: inside about twice the catch radius but not caught.
  if (nearMissCooldown > 0) nearMissCooldown -= dt;
  const catchDist = (player.w + hunter.w) / 2.4;
  const hunterDist = Math.hypot(player.x - hunter.x, player.y - hunter.y);
  if (hunterState === 'chase' && hunterDist < catchDist * 2.3 && nearMissCooldown <= 0) {
    nearMissCooldown = 14;
    Dialogue.trigger('nearMiss', null);
  }

  // Standing still while somebody is waiting.
  if (input.x !== 0 || input.y !== 0) {
    idleTimer = 0;
  } else if (findOldestPendingOrder()) {
    idleTimer += dt;
    if (idleTimer > 9) {
      idleTimer = -12;
      Dialogue.trigger('idle', null);
    }
  }

  // Ferrying one drink around the entire pub.
  if (player.tray.length) {
    carryTimer += dt;
    if (carryTimer > 20) {
      carryTimer = -18;
      Dialogue.trigger('carryingLong', null);
    }
  } else {
    carryTimer = 0;
  }

  // Two named regulars waiting at once.
  if (twoWaitingCooldown > 0) twoWaitingCooldown -= dt;
  let waiting = 0;
  for (const r of regulars) if (r.orderType && !r.served) waiting++;
  if (waiting >= 2 && twoWaitingCooldown <= 0) {
    twoWaitingCooldown = 22;
    Dialogue.trigger('twoWaiting', null);
  }

  // Interacting with nothing, repeatedly.
  if (whiffCount > 0) {
    whiffDecay -= dt;
    if (whiffDecay <= 0) whiffCount = 0;
  }
}
