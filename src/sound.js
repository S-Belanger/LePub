// ============================================================================
// Le Pub — tiny synthesized sound system
// Short Web Audio cues keep the game self-contained: there are no audio files
// to download, decode or keep in sync with the action. The context is created
// lazily from a real input gesture so browser autoplay rules are respected.
// ============================================================================

const Sound = (function () {
  const STORAGE_KEY = 'le-pub-muted';
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  const recent = new Map();

  let context = null;
  let master = null;
  let muted = false;

  try {
    muted = window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch (err) {
    // Storage can be unavailable for file:// pages or in privacy modes. The
    // setting still works for the current page in that case.
  }

  function ensureContext() {
    if (muted || !AudioContextCtor) return null;
    if (!context) {
      context = new AudioContextCtor();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
    }
    if (context.state === 'suspended') {
      // `resume` may reject outside a gesture; cues scheduled on a suspended
      // context simply wait for the next unlock instead of breaking gameplay.
      const resumed = context.resume();
      if (resumed && resumed.catch) resumed.catch(function () {});
    }
    return context;
  }

  function tone(frequency, duration, options) {
    const ctx = ensureContext();
    if (!ctx || !master) return;

    const opts = options || {};
    const start = ctx.currentTime + (opts.delay || 0);
    const attack = Math.min(opts.attack || 0.008, duration * 0.35);
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = opts.type || 'square';
    oscillator.frequency.setValueAtTime(frequency, start);
    if (opts.to) oscillator.frequency.exponentialRampToValueAtTime(opts.to, start + duration);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(opts.volume || 0.12, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  // Stops high-frequency automatic events from stacking into a harsh chord
  // when several patrons happen to order or give up in the same frame.
  function allow(name, gap) {
    const now = context ? context.currentTime : performance.now() / 1000;
    const last = recent.get(name);
    if (last != null && now - last < gap) return false;
    recent.set(name, now);
    return true;
  }

  function play(name) {
    if (muted || !AudioContextCtor) return;
    switch (name) {
      case 'start':
        tone(196, 0.12, { type: 'triangle', volume: 0.1 });
        tone(294, 0.16, { type: 'triangle', volume: 0.08, delay: 0.07 });
        break;
      case 'order':
        if (!allow(name, 0.09)) return;
        tone(740, 0.055, { type: 'sine', volume: 0.06 });
        break;
      case 'regularOrder':
        if (!allow(name, 0.09)) return;
        tone(587, 0.07, { type: 'triangle', volume: 0.07 });
        tone(740, 0.08, { type: 'triangle', volume: 0.055, delay: 0.045 });
        break;
      case 'pickup':
        tone(260, 0.09, { to: 440, volume: 0.1 });
        break;
      case 'deliver':
        tone(523, 0.1, { type: 'triangle', volume: 0.12 });
        tone(784, 0.16, { type: 'triangle', volume: 0.1, delay: 0.075 });
        break;
      case 'penalty':
        if (!allow(name, 0.1)) return;
        tone(230, 0.2, { to: 105, type: 'sawtooth', volume: 0.08 });
        break;
      // A shot handed across the table: a bright four-note run, the only
      // fanfare in the game that climbs past the level-up chord — being
      // untouchable should sound like more than another ten points.
      case 'jameson':
        tone(523, 0.08, { type: 'triangle', volume: 0.1 });
        tone(659, 0.08, { type: 'triangle', volume: 0.1, delay: 0.07 });
        tone(880, 0.09, { type: 'triangle', volume: 0.11, delay: 0.14 });
        tone(1047, 0.24, { type: 'triangle', volume: 0.1, delay: 0.22 });
        break;
      // Bouncing the hunter off while untouchable. Rate-limited because the
      // two can stay overlapped for several frames of contact.
      case 'jamesonBounce':
        if (!allow(name, 0.18)) return;
        tone(392, 0.09, { to: 1047, type: 'square', volume: 0.09 });
        break;
      // The shot wearing off: the same run, downward and quieter.
      case 'jamesonEnd':
        tone(880, 0.09, { type: 'triangle', volume: 0.07 });
        tone(587, 0.16, { type: 'triangle', volume: 0.06, delay: 0.08 });
        break;
      case 'levelUp':
        tone(392, 0.1, { type: 'square', volume: 0.08 });
        tone(523, 0.12, { type: 'square', volume: 0.08, delay: 0.09 });
        tone(659, 0.2, { type: 'square', volume: 0.08, delay: 0.18 });
        break;
      case 'whiff':
        if (!allow(name, 0.12)) return;
        tone(115, 0.045, { type: 'square', volume: 0.035 });
        break;
      // A glass goes over on the bar: a sharp high crack followed by a
      // scatter of quieter, detuned clinks as the pieces settle.
      case 'glassBreak':
        if (!allow(name, 0.2)) return;
        tone(1800, 0.05, { to: 900, type: 'square', volume: 0.08 });
        tone(1300, 0.06, { type: 'triangle', volume: 0.05, delay: 0.03 });
        tone(2100, 0.04, { type: 'triangle', volume: 0.04, delay: 0.05 });
        tone(950, 0.08, { type: 'triangle', volume: 0.035, delay: 0.09 });
        break;
      // Making it to the bathroom in time: a quick descending relief, playful
      // rather than triumphant — it's a bodily function, not a delivery.
      case 'bathroomRelief':
        tone(700, 0.07, { to: 420, type: 'sine', volume: 0.09 });
        tone(520, 0.09, { to: 300, type: 'sine', volume: 0.07, delay: 0.06 });
        break;
      // The clock running out: a low, embarrassed sputter.
      case 'wetPants':
        tone(180, 0.06, { type: 'square', volume: 0.08 });
        tone(140, 0.05, { type: 'square', volume: 0.07, delay: 0.05 });
        tone(100, 0.14, { to: 60, type: 'sawtooth', volume: 0.08, delay: 0.1 });
        break;
      // A puddle mopped up: a couple of damp, hollow slaps.
      case 'mop':
        tone(320, 0.06, { to: 220, type: 'sine', volume: 0.06 });
        tone(260, 0.07, { to: 180, type: 'sine', volume: 0.05, delay: 0.09 });
        break;
      case 'caught':
        tone(155, 0.42, { to: 55, type: 'sawtooth', volume: 0.13 });
        tone(78, 0.3, { to: 42, type: 'square', volume: 0.1, delay: 0.13 });
        break;
    }
  }

  function unlock() { ensureContext(); }

  function isMuted() { return muted; }

  function setMuted(next) {
    muted = !!next;
    try { window.localStorage.setItem(STORAGE_KEY, muted ? '1' : '0'); } catch (err) {}

    if (master && context) {
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(muted ? 0.0001 : 0.5, now, 0.015);
    }
    if (!muted) ensureContext();
    return muted;
  }

  return { play, unlock, isMuted, setMuted, supported: !!AudioContextCtor };
})();
