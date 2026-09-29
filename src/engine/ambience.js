// ============================================================================
// Le Pub — the room's sound: crowd murmur, glass clinks and a jukebox
// Everything is synthesized, like the effects in sound.js: no audio files.
//
// - The murmur is a handful of band-passed noise "talkers" whose volume
//   jumps around in syllable-length steps, which the ear reads as distant
//   conversation. It grows with the number of people in the room and rides
//   the effects bus, so the SFX switch silences it.
// - The jukebox is a slow, swung I-vi-IV-V pub loop (soft electric-piano
//   chords, a plucked bass, brushes). It has its own switch and bus. When the
//   hunter is chasing, the bass doubles up and the brushes get busy.
//
// The game calls Ambience.tick(state) once per frame; nothing here touches
// game state. Notes are scheduled a fraction of a second ahead on the audio
// clock, so a slow frame never makes the music stumble.
// ============================================================================

const Ambience = (function () {
  const STORAGE_KEY = 'lepub_music';
  const LOOKAHEAD = 0.25;             // seconds of music scheduled ahead
  const BPM = 92;
  const BEAT = 60 / BPM;
  const SWING = 0.62;                 // where the off-beat eighth lands, 0.5 = straight
  const MUSIC_LEVEL = 0.2;
  const MURMUR_BASE = 0.02;
  const MURMUR_PER_PERSON = 0.0045;
  const MURMUR_MAX = 0.09;

  // Two eight-bar progressions, alternated: the loop is 16 bars before it
  // repeats exactly, long enough not to nag over a three-minute shift.
  // Chords are MIDI note voicings around middle C; bass is the root, low.
  const CHORDS = {
    G:  { keys: [59, 62, 66, 69], bass: 43 },   // Gmaj7(9)
    Em: { keys: [59, 62, 64, 67], bass: 40 },   // Em7
    C:  { keys: [59, 60, 64, 67], bass: 48 },   // Cmaj7
    Am: { keys: [60, 64, 67, 69], bass: 45 },   // Am7
    D:  { keys: [57, 60, 62, 66], bass: 50 },   // D7
    Bm: { keys: [59, 62, 66, 69], bass: 47 },   // Bm7
  };
  const SONG = ['G', 'Em', 'C', 'D', 'G', 'Em', 'Am', 'D',
                'C', 'D', 'Bm', 'Em', 'C', 'Am', 'D', 'D'];

  let musicOn = true;
  try { musicOn = window.localStorage.getItem(STORAGE_KEY) !== '0'; } catch (err) {}

  let ctx = null;
  let musicBus = null;
  let murmurBus = null;
  let noise = null;
  let talkers = [];
  let nextClink = 0;
  let loopStart = 0;                  // audio-clock time of eighth note zero
  let eighthIndex = 0;                // the next eighth note to schedule
  let duck = 1;

  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  function makeNoise(context) {
    const length = context.sampleRate * 2;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      // Brown-ish noise: warmer than white, closer to a room.
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    return buffer;
  }

  function build(audio) {
    ctx = audio.context;
    noise = makeNoise(ctx);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0.0001;
    musicBus.connect(ctx.destination);

    murmurBus = ctx.createGain();
    murmurBus.gain.value = 0.0001;
    murmurBus.connect(audio.effects);

    // A low bed so the room never drops to dead silence between voices.
    const bed = ctx.createBufferSource();
    bed.buffer = noise;
    bed.loop = true;
    const bedFilter = ctx.createBiquadFilter();
    bedFilter.type = 'lowpass';
    bedFilter.frequency.value = 420;
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.5;
    bed.connect(bedFilter).connect(bedGain).connect(murmurBus);
    bed.start();

    talkers = [];
    for (let i = 0; i < 5; i++) {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 350 + i * 170;
      band.Q.value = 4;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(band).connect(gain).connect(murmurBus);
      src.start(0, Math.random() * 2);
      talkers.push({ band, gain, centre: band.frequency.value, next: 0 });
    }
    eighthIndex = 0;
    loopStart = ctx.currentTime + 0.1;
  }

  // ---- Murmur ----------------------------------------------------------------
  function tickMurmur(now, people) {
    const level = Math.min(MURMUR_MAX, MURMUR_BASE + people * MURMUR_PER_PERSON);
    murmurBus.gain.setTargetAtTime(level * 2.2 * duck, now, 0.8);
    for (const t of talkers) {
      if (now < t.next) continue;
      // A syllable, a word gap, or now and then a breath between sentences.
      const r = Math.random();
      const on = r < 0.62;
      t.gain.gain.setTargetAtTime(on ? 0.4 + Math.random() * 0.8 : 0, now, on ? 0.04 : 0.09);
      t.band.frequency.setTargetAtTime(t.centre * (0.85 + Math.random() * 0.3), now, 0.05);
      t.next = now + (r > 0.94 ? 0.8 + Math.random() * 1.6 : 0.09 + Math.random() * 0.28);
    }
    if (now >= nextClink) {
      if (nextClink > 0) clink(now, Math.min(1, 0.3 + people * 0.05));
      nextClink = now + 2.5 + Math.random() * Math.max(2, 9 - people * 0.4);
    }
  }

  function clink(when, strength) {
    const f = 2600 + Math.random() * 1600;
    for (const [mult, delay, vol] of [[1, 0, 0.05], [1.51, 0.004, 0.025], [1, 0.11 + Math.random() * 0.08, 0.02]]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f * mult;
      gain.gain.setValueAtTime(0.0001, when + delay);
      gain.gain.exponentialRampToValueAtTime(vol * strength, when + delay + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + delay + 0.25);
      osc.connect(gain).connect(murmurBus);
      osc.start(when + delay);
      osc.stop(when + delay + 0.3);
    }
  }

  // ---- Jukebox ----------------------------------------------------------------
  function keysNote(when, note, length, vol) {
    // Electric-piano-ish: a sine with a quieter octave and a fast-fading
    // bell partial for the tine.
    for (const [mult, v, decay] of [[1, vol, length], [2, vol * 0.22, length * 0.6], [4.02, vol * 0.08, 0.12]]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = midi(note) * mult;
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(v, when + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + decay);
      osc.connect(gain).connect(musicBus);
      osc.start(when);
      osc.stop(when + decay + 0.05);
    }
  }

  function bassNote(when, note, length, vol) {
    // A plucked, rounded bass. The sawtooth through a low-pass keeps enough
    // upper harmonics that the line survives a phone speaker.
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = midi(note);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, when);
    filter.frequency.exponentialRampToValueAtTime(260, when + length);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(vol, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
    osc.connect(filter).connect(gain).connect(musicBus);
    osc.start(when);
    osc.stop(when + length + 0.05);
  }

  function brush(when, vol) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(vol, when + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.09);
    src.connect(filter).connect(gain).connect(musicBus);
    src.start(when, Math.random() * 1.5, 0.12);
  }

  function scheduleEighth(when, index, chase) {
    const bar = Math.floor(index / 8) % SONG.length;
    const pos = index % 8;                  // eighth within the bar
    const chord = CHORDS[SONG[bar]];
    const next = CHORDS[SONG[(bar + 1) % SONG.length]];
    // Keys: a long chord on the one, a short push on the and-of-two, and a
    // light stab on four.
    if (pos === 0) for (const n of chord.keys) keysNote(when, n, BEAT * 3.2, 0.035);
    if (pos === 3) for (const n of chord.keys) keysNote(when, n, BEAT * 0.9, 0.022);
    if (pos === 6 && !chase) for (const n of chord.keys.slice(1)) keysNote(when, n, BEAT * 0.5, 0.016);
    // Bass: root and fifth on the beats, walking up to the next chord on four.
    // In a chase it drives straight eighths on the root and octave instead.
    if (chase) {
      bassNote(when, chord.bass + (pos % 2 ? 12 : 0), BEAT * 0.45, 0.07);
    } else if (pos % 2 === 0) {
      const beat = pos / 2;
      const note = beat === 0 ? chord.bass : beat === 1 ? chord.bass + 7 : beat === 2 ? chord.bass + 12
        : next.bass + (next.bass > chord.bass ? -1 : 1);
      bassNote(when, note, BEAT * 0.9, 0.075);
    }
    // Brushes: swung off-beats, a touch heavier on two and four.
    if (chase || pos % 2 === 1) brush(when, pos % 2 ? 0.012 : 0.02);
    if (pos === 2 || pos === 6) brush(when, 0.02);
  }

  // Swung eighths: the on-beat lands on the beat, the off-beat SWING of the
  // way through it.
  function eighthTime(i) {
    return loopStart + Math.floor(i / 2) * BEAT + (i % 2 ? BEAT * SWING : 0);
  }

  // Carry on from the next beat, keeping our place in the song.
  function resync(now) {
    if (eighthIndex % 2) eighthIndex++;
    loopStart = now + 0.05 - (eighthIndex / 2) * BEAT;
  }

  function tickMusic(now, chase) {
    musicBus.gain.setTargetAtTime(musicOn ? MUSIC_LEVEL * duck : 0.0001, now, 0.4);
    if (!musicOn) { resync(now); return; }
    // After a long stall (a backgrounded tab) pick the groove back up from
    // now instead of firing every missed note at once.
    if (eighthTime(eighthIndex) < now - 0.5) resync(now);
    while (eighthTime(eighthIndex) < now + LOOKAHEAD) {
      scheduleEighth(eighthTime(eighthIndex), eighthIndex, chase);
      eighthIndex++;
    }
  }

  // state: { people, chase, calm } — people in the room, whether the hunter
  // is chasing, and whether play is on hold (pause, tally, caught), which
  // brings everything down a notch.
  function tick(state) {
    const audio = Sound.audio();
    if (!audio) return;
    if (!ctx) build(audio);
    const now = ctx.currentTime;
    duck = state.calm ? 0.45 : 1;
    tickMurmur(now, state.people);
    tickMusic(now, state.chase && !state.calm);
  }

  function isOn() { return musicOn; }
  function setOn(on) {
    musicOn = !!on;
    try { window.localStorage.setItem(STORAGE_KEY, musicOn ? '1' : '0'); } catch (err) {}
  }

  return { tick, isOn, setOn };
})();
