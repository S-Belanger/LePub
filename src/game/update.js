// ---- Update -----------------------------------------------------------------
function update(dt) {
  // Bubbles keep resolving after a catch — nothing else simulates — so the
  // caught screen can show the room's reaction.
  Dialogue.update(dt);
  if (caught) return;
  gameTime += dt;
  updateHints(dt);
  updateGuidance(dt);

  // The tally board freezes the floor until the player starts the next shift.
  // gameTime still runs (bubble timing reads it), so a live round's deadline
  // is carried forward with it rather than expiring behind the board.
  if (shiftTally) { if (round) round.deadline += dt; return; }
  // Hit-stop: a few frames of nothing so a hit reads as an impact.
  if (hitStopTimer > 0) { hitStopTimer -= dt; return; }
  if (pintKnockTimer > 0) pintKnockTimer -= dt;

  // Player movement (slides along furniture/walls via per-axis collision).
  const input = getInputVector();
  player.speed = (player.tray.length >= TRAY_MAX ? TRAY_SPEED : PLAYER_SPEED) * spillSlowAt(player.x, player.y);
  player.moving = input.x !== 0 || input.y !== 0;
  if (input.x !== 0) player.flip = input.x < 0;
  faceToward(player, input.x, input.y);
  const playerMove = tryMove(player, input.x * player.speed * dt, input.y * player.speed * dt);
  player.x = playerMove.x;
  player.y = playerMove.y;

  const hunterLvl = Math.min(getLevel(), EFFECTIVE_LEVEL_CAP) - 1;
  hunter.speed = Math.min(60, 40 + hunterLvl * 2.5) * spillSlowAt(hunter.x, hunter.y);

  if (hunterSmokeState === 'leaving') {
    // Walking himself out the door. The catch check below stands down for
    // this whole break, so there's no risk in him crossing right past the
    // player on the way.
    hunterSmokeTravelTimer += dt;
    if (hunterFollowSmokePath(dt) || hunterSmokeTravelTimer > HUNTER_SMOKE_STUCK_TIMEOUT) {
      // Either he actually made it, or the walk stalled (see
      // HUNTER_SMOKE_STUCK_TIMEOUT) — either way he's outside now.
      hunter.x = DOOR.x;
      hunter.y = DOOR.y;
      hunterSmokeState = 'outside';
      hunterSmokeOutsideTimer = SMOKE_BREAK_DURATION;
      hunter.moving = false;
    }
  } else if (hunterSmokeState === 'outside') {
    // Off the floor entirely — render/collision both skip him for this state
    // (see render() and the catch check below).
    hunter.moving = false;
    hunterSmokeOutsideTimer -= dt;
    if (hunterSmokeOutsideTimer <= 0) {
      hunterSmokeOutsideTimer = 0;
      hunterSmokeState = 'returning';
      hunterSmokeTravelTimer = 0;
      hunter.x = DOOR.x;
      hunter.y = DOOR.y;
      const spot = hunterSmokeReturnSpot || reachablePoint(hunter, { x: WORLD_W / 2, y: WORLD_H / 2 });
      hunter.path = computeCustomerPath(DOOR, spot, null, HUNTER_FOOTPRINT);
      hunter.pathIndex = 0;
      Sound.play('smokeBreakEnd');
    }
  } else if (hunterSmokeState === 'returning') {
    hunterSmokeTravelTimer += dt;
    if (hunterFollowSmokePath(dt) || hunterSmokeTravelTimer > HUNTER_SMOKE_STUCK_TIMEOUT) {
      // Same stuck fallback as above: snap him the rest of the way in rather
      // than leaving him parked at the door forever.
      const spot = hunterSmokeReturnSpot || reachablePoint(hunter, { x: WORLD_W / 2, y: WORLD_H / 2 });
      hunter.x = spot.x;
      hunter.y = spot.y;
      hunterSmokeState = null;
      hunterSmokeReturnSpot = null;
      setHunterState('scanning');
      hunterRouteTo(pickClearSpawn(hunter));
      hunterChangeTimer = 0; // back on the hunt without waiting out the timer
    }
  } else {
    updateHunter(dt);
  }

  // Dropped packs: cleared out either by the hunter stepping on one, or by
  // simply running out the clock on a pack nobody found in time.
  for (let i = cigarettePacks.length - 1; i >= 0; i--) {
    const cig = cigarettePacks[i];
    if (!hunterOnSmokeBreak() && hunterState !== 'arriving' && hunterState !== 'drinking' && Math.hypot(hunter.x - cig.x, hunter.y - cig.y) < CIGARETTE_PICKUP_RADIUS) {
      cigarettePacks.splice(i, 1);
      grantSmokeBreak();
      continue;
    }
    cig.ttl -= dt;
    if (cig.ttl <= 0) cigarettePacks.splice(i, 1);
  }

  // Customers: trickle in, sit at a free table, then leave. Both the seating
  // cap and how fast new customers arrive ramp up with level.
  const customerLvl = Math.min(getLevel(), EFFECTIVE_LEVEL_CAP) - 1;
  const maxCustomers = Math.min(BASE_MAX_CUSTOMERS + customerLvl, 14);
  customerSpawnTimer -= dt;
  if (customerSpawnTimer <= 0) {
    const spawnMin = Math.max(1, 2.5 - customerLvl * 0.15);
    const spawnRange = Math.max(1, 3 - customerLvl * 0.2);
    customerSpawnTimer = spawnMin + Math.random() * spawnRange;
    if (customers.length < maxCustomers && !isLastCall()) spawnCustomer();
  }
  for (let i = customers.length - 1; i >= 0; i--) {
    const c = customers[i];
    tickOrderExit(c, dt);
    if (updateCustomer(c, dt) === 'remove') customers.splice(i, 1);
  }

  // Every puddle on the floor is disgusting enough to clear the room around
  // it — any walk-in still nearby (entering, waiting, or already seated)
  // bails, which is what actually costs the player customers, not just the
  // score hit from the accident itself. Regulars hold their booth regardless.
  // Puddles don't fade, so this keeps checking for the rest of the run.
  if (wetPantsPuddles.length) {
    for (const c of customers) {
      if (c.state === 'leaving') continue;
      const scared = wetPantsPuddles.some(p => Math.hypot(c.x - p.x, c.y - p.y) < WET_PANTS_SCARE_RADIUS);
      if (scared) {
        scareOffCustomer(c);
      }
    }
  }

  updateRegulars(dt);
  updateRound(dt);
  updateSpills(dt);
  updateGhost(dt);
  updateWaiter(dt);
  updateBusboy(dt);
  updateAlex(dt);
  updateDialogueTriggers(dt, input);
  updateAmbient(dt);

  // Keep a carried order's target valid: if the customer it was picked up
  // for has given up and left (or somehow got served another way), hand it
  // off to anyone else currently waiting on the same drink instead of
  // wasting the trip. If nobody else wants it either, drop the order
  // entirely rather than leaving the player stuck "carrying" a drink with
  // no possible delivery target, which would block grabbing a new one.
  for (let i = player.tray.length - 1; i >= 0; i--) {
    const item = player.tray[i];
    const target = item.customer;
    // `orderType` is also checked because a regular's order can lapse while
    // they stay in their seat — for a walk-in, leaving is the only way out.
    if (!stillWantsOrder(target, item.type)) {
      // Deliberately only walk-ins: silently re-pointing a drink at a
      // different *named* regular would make "whose pint is this" ambiguous,
      // and Gerald being handed Nazim's beer is a bug, not a feature. A
      // regular's order always has to be picked up for them on purpose.
      const replacement = customers.find(c =>
        c.state === 'sitting' && !c.served && !c.beingCarried && c.orderType === item.type
      );
      if (replacement) {
        item.customer = replacement;
        replacement.beingCarried = true;
      } else {
        player.tray.splice(i, 1);
        doubleArmed = false;   // one of the pair evaporated; no double for a single
      }
    }
  }

  // Floating score/penalty texts: drift up and fade out.
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const t = floatingTexts[i];
    t.ttl -= dt;
    t.y -= 10 * dt;
    if (t.ttl <= 0) floatingTexts.splice(i, 1);
  }

  // Leg animation timers, and the reaction timers that ride on them.
  for (const e of [player, hunter, ...customers]) tickLegs(e, dt);
  tickReactions(dt);
  if (waiter) tickLegs(waiter, dt);
  if (busboy) tickLegs(busboy, dt);
  if (alex) tickLegs(alex, dt);

  // The Jameson counting itself down. Sliding is dropped for its duration so
  // the wall-following that exists to close distance can't be used to keep it.
  if (jamesonBounceTimer > 0) jamesonBounceTimer -= dt;
  if (jamesonTimer > 0) {
    jamesonTimer -= dt;
    hunterSlide = null;
    if (jamesonTimer <= 0) {
      jamesonTimer = 0;
      Sound.play('jamesonEnd');
      hunterChangeTimer = 0;   // back on the hunt without waiting out the timer
    }
  }

  // The bladder, once full: reaching the bathroom clears it, running out the
  // clock doesn't. Independent of the Jameson countdown above — drinking
  // through the timer buys no extra time to get there.
  if (wetPantsTimer > 0) wetPantsTimer -= dt;
  if (bladderUrgentTimer > 0) {
    if (Math.hypot(player.x - BATHROOM.x, player.y - BATHROOM.y) < BLADDER_REACH_RADIUS) {
      bladderUrgentTimer = 0;
      bladderLevel = 0;
      Sound.play('bathroomRelief');
      addFloatingText(player.x, player.y - player.h - 4, 'RELIEF!', PUB.coolPale);
      Dialogue.trigger('bathroomRelief', null);
    } else {
      bladderUrgentTimer -= dt;
      if (bladderUrgentTimer <= 0) {
        bladderUrgentTimer = 0;
        bladderLevel = 0;
        wetPantsTimer = WET_PANTS_DURATION;
        wetPantsPuddles.push({ x: player.x, y: player.y });
        loseTips(WET_PANTS_PENALTY);
        Sound.play('wetPants');
        addFloatingText(player.x, player.y - player.h - 10, 'OOPS!', '#e84c3d');
        addFloatingText(player.x, player.y - player.h - 2, '-' + WET_PANTS_PENALTY, '#e84c3d');
        Dialogue.trigger('wetPants', null);
      }
    }
  }

  // Life regen: only once a few hit-free seconds have passed, and never
  // while already fully caught (game over).
  if (hitInvulnTimer > 0) hitInvulnTimer -= dt;
  if (!caught) {
    if (regenDelayTimer > 0) {
      regenDelayTimer -= dt;
    } else if (life < LIFE_MAX) {
      life = Math.min(LIFE_MAX, life + dt / LIFE_REGEN_DURATION);
    }
  }

  // Catch detection: each touch costs a third of the life bar rather than
  // ending the game outright. A short invulnerability window (and a shove
  // away from the hunter) gives the player room to escape after a hit.
  const dx = player.x - hunter.x;
  const dy = player.y - hunter.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const hunterCanCatch = hunterState !== 'arriving' && hunterState !== 'drinking';
  const touching = hunterCanCatch && !hunterOnSmokeBreak() && dist < (player.w + hunter.w) / 2.4;

  // On a Jameson the collision still happens, it just runs the other way:
  // the hunter is the one shoved clear, and the player walks through.
  if (touching && jamesonActive()) {
    if (jamesonBounceTimer <= 0) {
      jamesonBounceTimer = JAMESON_BOUNCE_COOLDOWN;
      const away = dist > 0.001 ? Math.atan2(-dy, -dx) : Math.random() * Math.PI * 2;
      const knock = tryMove(hunter, Math.cos(away) * JAMESON_BOUNCE_FORCE, Math.sin(away) * JAMESON_BOUNCE_FORCE);
      hunter.x = knock.x;
      hunter.y = knock.y;
      hunterSlide = null;
      hunterChangeTimer = 0;
      Sound.play('jamesonBounce');
    }
  } else if (hitInvulnTimer <= 0 && touching) {
    if (hunterState !== 'chase') hunterNoticesPlayer();
    life = Math.max(0, life - LIFE_HIT_FRACTION);
    hitInvulnTimer = LIFE_HIT_INVULN;
    regenDelayTimer = LIFE_REGEN_DELAY;
    doubleHitFree = false;
    shiftStats.hits++;
    hitStopTimer = HIT_STOP;
    pintKnockTimer = PINT_KNOCK_TIME;
    react(player, 'hit');
    pintKnockIndex = Math.min(LIFE_SEGMENT_COUNT - 1, Math.floor(life * LIFE_SEGMENT_COUNT + 1e-6));

    if (life <= 1e-9) {
      caught = true;
      hasPlayedBefore = true;
      beginNameEntry();
      Sound.play('caught');
      Dialogue.trigger('caught', null);
    } else {
      // Push the player clear so one collision reads as one hit and there is
      // room to use the invulnerability window to escape.
      const angle = dist > 0.001 ? Math.atan2(dy, dx) : Math.random() * Math.PI * 2;
      const shove = tryMove(player, Math.cos(angle) * 24, Math.sin(angle) * 24);
      player.x = shove.x;
      player.y = shove.y;
      addFloatingText(player.x, player.y - player.h - 4, '-LIFE', '#e8620c');
      Sound.play('penalty');
    }
  }

  // Shift clock and target, checked last so it catches every way tips could
  // have changed this frame. Freezes gameplay on the next frame via the guard
  // above. Not once the run is over: a final hit on the same frame as the
  // clock or target would otherwise open a tally board behind the caught one.
  if (!caught) updateShift(dt);
}
