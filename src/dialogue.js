// ============================================================================
// Le Pub — dialogue scheduling
// Selection, cooldowns, queueing and repetition control for the regulars'
// chatter. Content lives in src/dialogue-content.js; rendering lives in
// game.js. This layer never touches the simulation: it cannot pause the chase,
// block input, or hold up a frame.
//
// game.js calls Dialogue.bind() once, then Dialogue.trigger(category, opts)
// whenever something happens, Dialogue.update(dt) each frame, and
// Dialogue.getActive() when it wants bubbles to draw.
// ============================================================================

const Dialogue = (function () {
  // Higher wins. A high-priority gameplay reaction is allowed to jump an
  // ambient line that's still cooling down, and to drop queued ambient chatter.
  const CATEGORY_PRIORITY = {
    caught: 5,
    wetPants: 4,
    jameson: 4,
    stageChanged: 4,
    nearMiss: 4,
    served: 3,
    lateOrder: 3,
    nazimFood: 3,
    restart: 3,
    bladderFull: 2,
    bathroomRelief: 2,
    hunterNear: 2,
    lastCall: 3,
    hunterSpooked: 2,
    waterOrdered: 3,
    sobered: 3,
    roundCalled: 3,
    roundDone: 3,
    roundMissed: 1,
    spill: 2,
    nazimUp: 2,
    hunterSpotted: 2,
    hunterArrives: 3,
    hunterServed: 3,
    hunterLost: 1,
    hunterOrdered: 1,
    twoWaiting: 2,
    levelUp: 2,
    abandoned: 1,
    carryingLong: 1,
    whiffed: 1,
    idle: 1,
    ordered: 1,
    ambient: 0,
  };

  const MAX_ACTIVE = 2;          // simultaneous bubbles on screen
  const GLOBAL_COOLDOWN = 1.7;   // seconds between ordinary lines
  const GLOBAL_COOLDOWN_HIGH = 0.4; // a real reaction shouldn't have to wait
  const CHAR_COOLDOWN = 3.4;     // per-character, so nobody monologues
  const AMBIENT_MIN = 14;        // seconds of quiet before ambient chatter
  const AMBIENT_MAX = 26;
  const HISTORY_GLOBAL = 18;     // bounded: never grows with session length
  const HISTORY_CHAR = 6;
  const RARE_WEIGHT = 0.18;

  // Bubble lifetime scales with how much there is to read.
  function readTime(text) {
    const words = text.split(' ').length;
    return Math.max(1.9, Math.min(4.6, 1.5 + words * 0.28));
  }

  let bound = null;              // { getRegular, getNazimStageId, getReactionDelay, onSpeak }
  let queue = [];                // { at, who, text, priority }
  let active = [];               // { who, text, ttl, life, priority }
  let recent = [];               // recently spoken texts, globally
  let sinceLastLine = 99;      // seconds since anything was scheduled
  let ambientTimer = AMBIENT_MIN;
  let clock = 0;

  function bind(hooks) { bound = hooks; }

  // Called from resetGame(): everything queued or on screen is dropped, so a
  // restart can never deliver last run's punchline into the new one.
  function reset() {
    queue.length = 0;
    active.length = 0;
    recent.length = 0;
    sinceLastLine = 99;
    ambientTimer = AMBIENT_MIN + Math.random() * (AMBIENT_MAX - AMBIENT_MIN);
    clock = 0;
  }

  function priorityOf(category) {
    const p = CATEGORY_PRIORITY[category];
    return p === undefined ? 0 : p;
  }

  // A line is eligible if the speaker exists, isn't mid-cooldown, the line
  // hasn't just been used, and every stage gate it declares is satisfied.
  function eligible(entry, who, nazimStage) {
    if (who && entry.who && entry.who !== who) return false;
    if (entry.stage && entry.stage.indexOf(nazimStage) === -1) return false;
    if (entry.nazim && entry.nazim.indexOf(nazimStage) === -1) return false;
    const speaker = bound.getRegular(entry.who);
    if (!speaker || speaker.dialogueCooldown > 0) return false;
    if (recent.indexOf(entry.text) !== -1) return false;
    if (speaker.recentLines.indexOf(entry.text) !== -1) return false;
    return true;
  }

  function exchangeEligible(ex, who, nazimStage) {
    if (ex.stage && ex.stage.indexOf(nazimStage) === -1) return false;
    if (ex.nazim && ex.nazim.indexOf(nazimStage) === -1) return false;
    // An exchange is only offered if every speaker in it is free to talk and
    // its opening line isn't stale — otherwise half of it would be swallowed.
    for (const l of ex.lines) {
      const speaker = bound.getRegular(l.who);
      if (!speaker || speaker.dialogueCooldown > 0) return false;
    }
    if (who && ex.lines[0].who !== who) return false;
    return recent.indexOf(ex.lines[0].text) === -1;
  }

  function weightOf(entry) {
    if (entry.weight != null) return entry.weight;
    return entry.rare ? RARE_WEIGHT : 1;
  }

  function pickWeighted(candidates) {
    let total = 0;
    for (const c of candidates) total += weightOf(c);
    let roll = Math.random() * total;
    for (const c of candidates) {
      roll -= weightOf(c);
      if (roll <= 0) return c;
    }
    return candidates[candidates.length - 1];
  }

  // Strong feelings, in either direction, make a regular more vocal; a merely
  // content one waits their turn.
  function charCooldownFor(speaker) {
    return CHAR_COOLDOWN * (1 - Math.abs(speaker.mood || 0) * 0.2);
  }

  function remember(text, speaker) {
    recent.push(text);
    if (recent.length > HISTORY_GLOBAL) recent.shift();
    speaker.recentLines.push(text);
    if (speaker.recentLines.length > HISTORY_CHAR) speaker.recentLines.shift();
  }

  function enqueue(who, text, delay, priority) {
    queue.push({ at: clock + delay, who, text, priority });
  }

  // The single entry point for "something happened, say something about it".
  // Returns true if anything was scheduled. Never throws if a category has no
  // matching content — silence is a valid outcome.
  function trigger(category, opts) {
    if (!bound) return false;
    const who = (opts && opts.who) || null;
    const priority = priorityOf(category);

    // Ordinary chatter waits its turn; a real reaction only waits a beat.
    const needed = priority >= 3 ? GLOBAL_COOLDOWN_HIGH : GLOBAL_COOLDOWN;
    if (sinceLastLine < needed) return false;

    const nazimStage = bound.getNazimStageId();

    // A high-priority reaction clears queued ambient filler so the important
    // line isn't stuck behind three seconds of small talk.
    if (priority >= 3 && queue.length) {
      queue = queue.filter(q => q.priority >= priority);
    }

    const singles = [];
    for (const l of DIALOGUE_LINES) {
      if (l.category !== category) continue;
      if (eligible(l, who, nazimStage)) singles.push(l);
    }
    const exchanges = [];
    for (const ex of DIALOGUE_EXCHANGES) {
      if (ex.category !== category) continue;
      if (exchangeEligible(ex, who, nazimStage)) exchanges.push(ex);
    }
    if (!singles.length && !exchanges.length) return false;

    // Exchanges are the treat, not the default: bias toward single lines so
    // three-way banter stays special.
    const wantExchange = exchanges.length && (!singles.length || Math.random() < 0.28);
    if (wantExchange) {
      const ex = pickWeighted(exchanges);
      for (const l of ex.lines) {
        const speaker = bound.getRegular(l.who);
        const delay = (l.delay || 0) + bound.getReactionDelay(l.who);
        enqueue(l.who, l.text, delay, priority);
        remember(l.text, speaker);
        // Reserve every speaker for the length of the exchange plus their own
        // cooldown, so nothing else interrupts partway through.
        speaker.dialogueCooldown = delay + charCooldownFor(speaker);
      }
    } else {
      const line = pickWeighted(singles);
      const speaker = bound.getRegular(line.who);
      const delay = bound.getReactionDelay(line.who);
      enqueue(line.who, line.text, delay, priority);
      remember(line.text, speaker);
      speaker.dialogueCooldown = delay + charCooldownFor(speaker);
    }

    sinceLastLine = 0;
    ambientTimer = AMBIENT_MIN + Math.random() * (AMBIENT_MAX - AMBIENT_MIN);
    return true;
  }

  function speak(item) {
    const speaker = bound.getRegular(item.who);
    if (!speaker) return;
    const life = readTime(item.text);
    active.push({ who: item.who, text: item.text, ttl: life, life, priority: item.priority });
    // Oldest bubble goes when the screen is full; two is already a lot of
    // reading for someone being chased.
    while (active.length > MAX_ACTIVE) active.shift();
    if (bound.onSpeak) bound.onSpeak(speaker, life);
  }

  function update(dt) {
    if (!bound) return;
    clock += dt;
    sinceLastLine += dt;

    // Release anything whose delay has elapsed. Walked back-to-front so
    // splicing is safe, then sorted isn't needed — order barely matters at
    // sub-second granularity and this avoids an allocation per frame.
    for (let i = queue.length - 1; i >= 0; i--) {
      if (queue[i].at <= clock) {
        speak(queue[i]);
        queue.splice(i, 1);
      }
    }

    for (let i = active.length - 1; i >= 0; i--) {
      active[i].ttl -= dt;
      if (active[i].ttl <= 0) active.splice(i, 1);
    }

    // Rare ambient exchange, only when the room has been quiet for a while.
    ambientTimer -= dt;
    if (ambientTimer <= 0) {
      ambientTimer = AMBIENT_MIN + Math.random() * (AMBIENT_MAX - AMBIENT_MIN);
      if (!active.length && !queue.length) trigger('ambient', null);
    }
  }

  function getActive() { return active; }

  // Development helpers, used by window.__debug.
  function clearCooldowns() {
    sinceLastLine = 99;
    recent.length = 0;
    ambientTimer = 0.1;
  }
  function stats() {
    return { active: active.length, queued: queue.length, recent: recent.length, sinceLastLine: +sinceLastLine.toFixed(2) };
  }

  return { bind, reset, trigger, update, getActive, clearCooldowns, stats, CATEGORY_PRIORITY };
})();
