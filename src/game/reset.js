function pickClearSpawn(e) {
  for (let i = 0; i < 30; i++) {
    const x = clamp(WORLD_W / 2 + (Math.random() < 0.5 ? 1 : -1) * Math.random() * WORLD_W * 0.4, e.w / 2, WORLD_W - e.w / 2);
    const y = clamp(WORLD_H / 2 + (Math.random() < 0.5 ? 1 : -1) * Math.random() * WORLD_H * 0.4, e.h / 2, WORLD_H - e.h / 2);
    if (!collidesAt(e, x, y)) return { x, y };
  }
  return { x: 125, y: 150 }; // fallback: open floor between the bar and the long table
}

function resetGame() {
  gameTime = 0;
  const playerSpawn = pickClearSpawn(player);
  player.x = playerSpawn.x;
  player.y = playerSpawn.y;
  // He starts outside: at the door, unseen, until his arrival timer runs out.
  const doorSpot = reachablePoint(hunter, DOOR);
  hunter.x = doorSpot.x;
  hunter.y = doorSpot.y;
  hunterDir = { x: 0, y: 0 };
  hunterChangeTimer = 0;
  hunterRubTimer = 0;
  hunterSlide = null;
  hunterFacing = { x: 1, y: 0 };
  hunterAlert = null;
  hunterLastSeenTimer = 0;
  hunterScanLookTimer = 0;
  hunterOrderTimer = randomInRange(HUNTER_ORDER_INTERVAL);
  hunter.orderType = null;
  hunter.orderExit = null;
  hunter.served = false;
  hunter.beingCarried = false;
  setHunterState('arriving', hasPlayedBefore ? HUNTER_ARRIVAL_RETRY : HUNTER_ARRIVAL_FIRST);
  caught = false;
  enteringName = false;
  nameInput = '';
  life = LIFE_MAX;
  hitInvulnTimer = 0;
  regenDelayTimer = 0;
  hitStopTimer = 0;
  pintKnockTimer = 0;
  pintKnockIndex = -1;
  player.reaction = null;
  hunter.reaction = null;
  shift = 1;
  shiftClock = 0;
  shiftTips = 0;
  lastCallArmed = false;
  shiftTally = null;
  bestShiftTips = 0;
  resetShiftStats();
  jamesonTimer = 0;
  jamesonBounceTimer = 0;
  bladderLevel = 0;
  bladderUrgentTimer = 0;
  wetPantsTimer = 0;
  wetPantsPuddles.length = 0;
  cigarettePacks.length = 0;
  deliveriesSinceCigarette = 0;
  cigaretteReserve = 0;
  hunterSmokeState = null;
  hunterSmokeOutsideTimer = 0;
  hunterSmokeReturnSpot = null;
  hunterSmokeTravelTimer = 0;
  score = 0;
  customers.length = 0;
  for (const seat of SEATS) seat.occupied = false;
  customerSpawnTimer = 3;
  player.tray.length = 0;
  doubleArmed = false;
  doubleHitFree = true;
  floatingTexts.length = 0;
  ghost = null;
  ghostSpawnTimer = GHOST_INTERVAL_MIN + Math.random() * (GHOST_INTERVAL_MAX - GHOST_INTERVAL_MIN);
  waiter = null;
  waiterLevel = 0;
  waiterDelay = WAITER_DELAY_MIN + Math.random() * (WAITER_DELAY_MAX - WAITER_DELAY_MIN);
  busboy = null;
  busboyDispatchDelay = BUSBOY_DISPATCH_DELAY_MIN + Math.random() * (BUSBOY_DISPATCH_DELAY_MAX - BUSBOY_DISPATCH_DELAY_MIN);
  // A restart mid-split would otherwise leave his blocker stuck in FURNITURE
  // forever with nothing left to clear it.
  if (alex && alex.blocker) {
    const idx = FURNITURE.indexOf(alex.blocker);
    if (idx !== -1) FURNITURE.splice(idx, 1);
  }
  alex = null;
  alexDelay = ALEX_FIRST_MIN + Math.random() * (ALEX_FIRST_MAX - ALEX_FIRST_MIN);
  alexLastVisitShift = 0;
  // The regulars persist across restarts as characters, but every scrap of
  // their run state — orders, patience, mood, dialogue history and Nazim's
  // drink count — is wiped.
  if (!regulars.length) buildRegulars();
  else for (const r of regulars) resetRegular(r);
  dynamicBlockers.length = 0;
  spills.length = 0;
  round = null;
  roundTimer = randomInRange(ROUND_INTERVAL);
  Dialogue.reset();
  resetDialogueTriggers();
  resetHints();
  resetGuidance();
  // Deliberately no Assets.reset(): the atlases load once per page, and
  // staling them on a restart would drop any still decoding for good.
  if (hasPlayedBefore) {
    Sound.play('start');
    Dialogue.trigger('restart', null);
  }
  clearHeldInputs();
  syncCaughtDom();
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
