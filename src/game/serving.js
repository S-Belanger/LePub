// ---- Serving: 'E' grabs the oldest waiting order from the bar, or (while
// already carrying one) delivers it if standing next to its customer. ------
const INTERACT_RANGE = 14;

function nearRect(x, y, rect, margin) {
  return x > rect.x - margin && x < rect.x + rect.w + margin &&
    y > rect.y - margin && y < rect.y + rect.h + margin;
}

// The oldest unclaimed order across both walk-ins and regulars. Ordering by
// age rather than by array position keeps the queue fair now that two
// populations feed it, and makes "who does this drink belong to" deterministic
// even when several people want the same thing.
// `types`, when given, restricts the search to what one station can make.
function findOldestPendingOrder(types) {
  let best = null;
  const wants = t => !types || types.indexOf(t) !== -1;
  for (const c of customers) {
    if (c.state !== 'sitting' || !c.orderType || c.served || c.beingCarried || !wants(c.orderType)) continue;
    if (!best || c.orderPlacedAt < best.orderPlacedAt) best = c;
  }
  for (const r of regulars) {
    if (!r.orderType || r.served || r.beingCarried || !wants(r.orderType)) continue;
    if (!best || r.orderPlacedAt < best.orderPlacedAt) best = r;
  }
  if (hunter.orderType && !hunter.served && !hunter.beingCarried && wants(hunter.orderType)) {
    if (!best || hunter.orderPlacedAt < best.orderPlacedAt) best = hunter;
  }
  return best;
}

// Whether `target` still wants an order of `type`. A walk-in has to be in
// their seat; a regular's order can lapse while they stay put; the hunter is
// wherever he is.
function stillWantsOrder(target, type) {
  if (!target || target.served || target.orderType !== type) return false;
  return target === hunter || target.state === 'sitting';
}

function removeFromTray(target) {
  for (let i = player.tray.length - 1; i >= 0; i--) {
    if (player.tray[i].customer === target) player.tray.splice(i, 1);
  }
}

// An item taken off the tray without being delivered: same as the retarget
// loop's drop, one of the pair evaporated, so there is no double for a single.
function dropFromTray(target) {
  const before = player.tray.length;
  removeFromTray(target);
  if (player.tray.length < before) doubleArmed = false;
}

// The customer pushes a shot back across the table. Refresh, not stack: the
// clock restarts at full, and `hunterSlide` is dropped so the hunter re-aims
// on the next frame and turns tail immediately rather than finishing a wall
// follow it committed to while it was still the one doing the chasing.
function grantJameson(from) {
  jamesonTimer = JAMESON_DURATION;
  jamesonBounceTimer = 0;
  hunterSlide = null;
  hunterChangeTimer = 0;
  Sound.play('jameson');
  addFloatingText(from.x, from.y - from.h - 4, 'JAMESON!', PUB.amber);
  Dialogue.trigger('jameson', null);

  // Every shot tops up the bladder. Filling it is what starts the clock —
  // topping off an already-full one (another Jameson while already racing
  // for the bathroom) doesn't restart the timer, same as it doesn't for the
  // Jameson effect itself.
  if (!bladderFull()) {
    bladderLevel = Math.min(BLADDER_MAX, bladderLevel + 1);
    if (bladderFull()) {
      bladderUrgentTimer = BLADDER_TIME_LIMIT;
      Dialogue.trigger('bladderFull', null);
    }
  }
}

// A delivery that actually landed. Everything a completed order awards happens
// here and nowhere else — notably Nazim's drink count, so mashing the interact
// button can never advance his night without a trip to the bar.
function completeDelivery(target) {
  const type = target.orderType;
  target.served = true;
  target.beingCarried = false;
  removeFromTray(target);
  const { tip, clutch } = deliveryTip(target);
  earnTips(tip);
  react(player, 'serve');
  shiftStats.deliveries++;
  if (clutch) shiftStats.clutch++;
  Sound.play('deliver');
  addFloatingText(target.x, target.y - target.h - 4, '+' + tip + (clutch ? ' CLUTCH' : ''), clutch ? PUB.amber : '#3ddc61');
  // Both tray orders landed with no hit in between: the tray bet paid off.
  if (doubleArmed && player.tray.length === 0) {
    if (doubleHitFree) {
      earnTips(DOUBLE_BONUS);
      shiftStats.doubles++;
      addFloatingText(player.x, player.y - player.h - 12, 'DOUBLE +' + DOUBLE_BONUS, PUB.amber);
    }
    doubleArmed = false;
  }

  if (target === hunter) {
    hunterServed();
    return;
  }
  // Every CIGARETTES_EVERY deliveries — walk-in or regular, one shared
  // counter — the player pockets another pack, up to the reserve cap.
  // Counted here, not in the per-type branches below, so both populations
  // feed the same clock. Held back (not reset) while the reserve is already
  // full, so the very next delivery past the cap grants one the moment a
  // dropped pack frees up a slot, instead of being silently lost.
  deliveriesSinceCigarette++;
  if (deliveriesSinceCigarette >= CIGARETTES_EVERY && cigaretteReserve < CIGARETTE_RESERVE_MAX) {
    deliveriesSinceCigarette = 0;
    cigaretteReserve++;
    addFloatingText(target.x, target.y - target.h - 12, '+1 PACK', '#c9c2b3');
  }

  // Rolled here, alongside the points, so it can only ever come from a trip
  // that actually landed — and for regulars as well as walk-ins, since a
  // grateful Nazim buying a round is the whole joke.
  if (isAlcoholicOrder(type) && Math.random() < JAMESON_CHANCE) grantJameson(target);
  if (!target.isRegular) {
    noteOrderCleared(target);
    target.sitTimer = randomInRange(SERVED_CUSTOMER_STAY);
    return;
  }

  target.mood = clampMood(target.mood + 0.35);
  let stageChanged = false;
  let sobered = false;
  if (target.id === 'nazim') {
    if (isAlcoholicOrder(type)) {
      // Drunk money: he over-tips, and once he's gone the pint may not make
      // it to the table.
      if (nazimIsFarGone(target)) {
        const extra = tip * (NAZIM_TIP_MULT - 1);
        earnTips(extra);
        addFloatingText(target.x, target.y - target.h - 12, 'X' + NAZIM_TIP_MULT + ' +' + extra, PUB.amber);
      }
      if (target.stage.id === 'gone' && Math.random() < NAZIM_SPILL_CHANCE) {
        addSpill(target.x + (Math.random() - 0.5) * 8, target.y + 12);
        Dialogue.trigger('spill', null);
      }
      target.drinks += 1;
      stageChanged = recalcIntoxication(target);
      if (stageChanged && target.stage.id === 'gone') target.waterOwed = true;
    } else if (type === 'water') {
      target.waterOwed = false;
      target.drinks = Math.max(0, target.drinks - NAZIM_WATER_SOBERS);
      stageChanged = recalcIntoxication(target);
      sobered = true;
    }
  }
  noteRoundDelivery(target);
  clearRegularOrder(target);   // they'll want the next one after a cooldown
  if (sobered) {
    setRegularTalking(target, 1.0);
    Dialogue.trigger('sobered', null);
  } else {
    onRegularServed(target, type, stageChanged);
  }
}

// Counts an interact press that accomplished nothing, and lets the regulars
// notice once it's clearly a pattern rather than one mistimed tap.
function registerWhiff() {
  Sound.play('whiff');
  whiffCount++;
  whiffDecay = 6;
  if (whiffCount >= 3) {
    whiffCount = 0;
    Dialogue.trigger('whiffed', null);
  }
}

// Delivery works either right next to the customer, or anywhere near the
// table they're seated at — with several seats per side on the bigger tables,
// walking all the way around to their exact chair isn't fair.
function canDeliverTo(target) {
  if (!target || target.served) return false;
  // The hunter is handed his pint at arm's length: the catch radius is about
  // 15px, so an ordinary interact range would mean getting hit to serve him.
  if (target === hunter) return Math.hypot(player.x - hunter.x, player.y - hunter.y) < HUNTER_SERVE_RANGE;
  if (target.state !== 'sitting') return false;
  const nearCustomer = Math.hypot(player.x - target.x, player.y - target.y) < INTERACT_RANGE;
  const nearTheirTable = target.seat && target.seat.table &&
    nearRect(player.x, player.y, target.seat.table.collider, INTERACT_RANGE);
  return nearCustomer || nearTheirTable;
}

// The segment the player is standing at, or null. Where the foot meets the
// stem a spot can be in reach of both, so the closer counter wins rather
// than whichever is listed first.
function nearestBarSegment() {
  let best = null;
  let bestDist = Infinity;
  for (const b of BAR_SEGMENTS) {
    if (!nearRect(player.x, player.y, b.collider, INTERACT_RANGE)) continue;
    const r = b.collider;
    const dx = Math.max(r.x - player.x, 0, player.x - (r.x + r.w));
    const dy = Math.max(r.y - player.y, 0, player.y - (r.y + r.h));
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; best = b; }
  }
  return best;
}

function handleInteract() {
  if (caught) return;

  // Deliver first: whichever tray order belongs to someone in reach. Each
  // item's customer is kept valid (or reassigned) by the per-frame check in
  // update(), which drops an order entirely once nobody wants it.
  for (const item of player.tray) {
    if (canDeliverTo(item.customer)) {
      completeDelivery(item.customer);
      return;
    }
  }

  const seg = nearestBarSegment();
  if (seg) {
    if (player.tray.length >= TRAY_MAX) {
      addFloatingText(player.x, player.y - player.h - 4, 'TRAY FULL', PUB.creamDim);
      registerWhiff();
      return;
    }
    const pending = findOldestPendingOrder(BAR_STATIONS[seg.station].types);
    if (pending) {
      pending.beingCarried = true;
      player.tray.push({ type: pending.orderType, customer: pending });
      // Refilling a tray that is still armed keeps its hit record: an item
      // already carried through a hit can't be laundered by a fresh pickup.
      if (player.tray.length === TRAY_MAX && !doubleArmed) {
        doubleArmed = true;
        doubleHitFree = true;
      }
      Sound.play('pickup');
      return;
    }
    // Nothing this station makes is wanted. Point at the one that has the
    // oldest order, so a wrong-counter press teaches the map instead of
    // just buzzing.
    const elsewhere = findOldestPendingOrder();
    if (elsewhere) {
      const station = BAR_STATIONS[stationForType(elsewhere.orderType)];
      if (station) addFloatingText(player.x, player.y - player.h - 4, station.label + ' >', PUB.amber);
      Sound.play('whiff');
      return;
    }
  }
  registerWhiff();
}
