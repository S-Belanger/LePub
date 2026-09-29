// ---- Development scaffolding ------------------------------------------------
// Disposable: this is a console handle for manual validation, not an API.
// Nothing in the game reads it, and it can be deleted wholesale.
window.__debug = {
  player, hunter, customers, regulars, regularById, SEATS, TABLES, BAR_SEGMENTS,
  BENCHES, FURNITURE,
  handleInteract, spawnCustomer, DOOR, update, updateCustomer, keys, touchMove,
  computeCustomerPath, findBlockingObstacle, segmentHitsRect, pointBlocked, PATH_MARGIN, PATH_CELL,
  getGhost: () => ghost,
  spawnGhost,
  getWaiter: () => waiter,
  spawnWaiter,
  waiterSchedule: () => ({ visitedThrough: waiterLevel, level: getLevel(), dueIn: +waiterDelay.toFixed(1) }),
  getBusboy: () => busboy,
  spawnBusboy,
  getAlex: () => alex,
  spawnAlex,
  alexSchedule: () => ({ dueIn: +alexDelay.toFixed(1), lastVisitShift: alexLastVisitShift,
    eligible: canScheduleAlex() }),
  wetPantsPuddles,
  loadHighScores, saveHighScore,
  clearHighScores: () => { try { localStorage.removeItem(HIGH_SCORE_KEY); } catch {} },
  getNameEntry: () => ({ entering: enteringName, name: nameInput }),
  SPRITES, DOE_PALETTE, HUNTER_PALETTE, drawSprite, ctx, floatingTexts,
  getScore: () => score,
  getLevel,
  setScore: (v) => { score = v; },
  setShift: (n) => { shift = Math.max(1, n | 0); },
  getLife: () => life,
  setLife: (v) => { life = clamp(v, 0, LIFE_MAX); },
  getShift: () => ({ shift, clock: +shiftClock.toFixed(1), tips: shiftTips, target: shiftTarget(shift), lastCall: isLastCall(), tally: shiftTally, stats: Object.assign({}, shiftStats) }),
  setShiftClock: (t) => { shiftClock = t; },
  endShift,
  startNextShift,
  getHunterState: () => ({ state: hunterState, timer: +hunterStateTimer.toFixed(2), order: hunter.orderType, path: hunterPath, alert: hunterAlert }),
  setHunterState,
  hunterCanSeePlayer: () => hunterCanSeePlayer(hunterSightRange()),
  hunterWantsPint,
  Assets,
  getSpills: () => spills,
  getRound: () => round,
  callRound: tryCallRound,
  startNazimWander: () => startNazimWander(regularById.get('nazim')),
  getJameson: () => ({ active: jamesonActive(), remaining: +jamesonTimer.toFixed(2) }),
  // No delivery needed: hands the shot over as if the player were standing.
  giveJameson: (seconds) => {
    grantJameson(player);
    if (seconds != null) jamesonTimer = Math.max(0, seconds);
    return jamesonTimer;
  },
  getBladder: () => ({ level: bladderLevel, max: BLADDER_MAX, urgent: +bladderUrgentTimer.toFixed(2), wet: +wetPantsTimer.toFixed(2), puddles: wetPantsPuddles.length }),
  cigarettePacks,
  dropCigarette,
  getCigaretteReserve: () => cigaretteReserve,
  fillCigaretteReserve: (n) => { cigaretteReserve = clamp(n ?? CIGARETTE_RESERVE_MAX, 0, CIGARETTE_RESERVE_MAX); return cigaretteReserve; },
  getSmokeBreak: () => ({ state: hunterSmokeState, outsideRemaining: +hunterSmokeOutsideTimer.toFixed(2) }),
  // No pack needed underfoot: hands the hunter the break directly. Still
  // walks him to and from the door like the real thing, unless `instant` skips
  // straight past both walks to just being outside.
  giveSmokeBreak: (seconds, instant) => {
    grantSmokeBreak();
    if (instant) {
      hunterSmokeState = 'outside';
      hunter.x = DOOR.x;
      hunter.y = DOOR.y;
    }
    if (seconds != null) hunterSmokeOutsideTimer = Math.max(0, seconds);
    return hunterSmokeOutsideTimer;
  },
  // Tops the bladder up without a Jameson delivery; fills it to bursting by
  // default, same as giveJameson stands in for a drink.
  fillBladder: (n) => {
    bladderLevel = clamp(n ?? BLADDER_MAX, 0, BLADDER_MAX);
    if (bladderFull() && bladderUrgentTimer <= 0) bladderUrgentTimer = BLADDER_TIME_LIMIT;
    else if (!bladderFull()) bladderUrgentTimer = 0;
    return bladderLevel;
  },
  BATHROOM,
  getViewport: () => ({ viewW, viewH, pixelScale, portrait: viewIsPortrait }),
  getCamera,
  reservedSeats: () => SEATS.filter(s => s.reserved).map(s => ({ who: s.regularId, side: s.side, x: s.x, y: s.y })),
  freeGenericSeats: () => SEATS.filter(s => !s.reserved && !s.occupied).length,
  forceRegularOrder: (id, type) => {
    const r = regularById.get(id);
    if (!r) return null;
    clearRegularOrder(r);
    regularPlaceOrder(r);
    if (type) r.orderType = type;
    return r.orderType;
  },
  setNazimDrinks: (n) => {
    const r = regularById.get('nazim');
    r.drinks = Math.max(0, n | 0);
    const changed = recalcIntoxication(r);
    return { drinks: r.drinks, stage: r.stage.id, changed };
  },
  regularState: () => regulars.map(r => ({
    id: r.id, order: r.orderType, patience: +(r.sitTimer).toFixed(1),
    mood: +r.mood.toFixed(2), drinks: r.drinks, stage: r.stage.id, pose: r.pose,
  })),
  forceCaught: () => {
    life = 0;
    caught = true;
    hasPlayedBefore = true;
    beginNameEntry();
    Sound.play('caught');
    Dialogue.trigger('caught', null);
  },
  triggerDialogue: (category, who) => Dialogue.trigger(category, who ? { who } : null),
  clearDialogueCooldowns: () => {
    Dialogue.clearCooldowns();
    for (const r of regulars) { r.dialogueCooldown = 0; r.recentLines.length = 0; }
  },
  render,                                       // for frame-cost measurement
  dialogueStats: Dialogue.stats,
  activeDialogue: () => Dialogue.getActive().map(a => a.who + ': ' + a.text),
  DIALOGUE_LINES, DIALOGUE_EXCHANGES,
  resetGame,
};
