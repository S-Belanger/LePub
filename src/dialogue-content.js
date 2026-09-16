// ============================================================================
// Le Pub — dialogue content
// Authored lines only. No selection logic, no timers, no rendering: that all
// lives in src/dialogue.js, so writing more material never means touching the
// scheduler.
//
// A line is:
//   { who, text, weight?, stage?, nazim?, rare? }
//     who    — 'nazim' | 'sam' | 'gerald'
//     weight — relative selection weight (default 1)
//     stage  — Nazim lines only: which intoxication stages this line fits
//     nazim  — gate on Nazim's CURRENT stage; how Gerald escalates without
//              ever calling a sober man drunk
//     rare   — flavour, given a low weight by the scheduler
//
// An exchange is a short back-and-forth:
//   { category, lines: [{ who, text, delay }], stage?, nazim?, weight?, rare? }
// `delay` is seconds after the exchange starts, so replies land while the
// player keeps moving — nothing here ever blocks the chase.
//
// Categories are the gameplay events in src/dialogue.js's CATEGORY_PRIORITY.
// Lines are kept to roughly 3-12 words so they can be read on the move.
// ============================================================================

const DIALOGUE_LINES = [
  // ---------------------------------------------------------------- NAZIM
  // Sober: relaxed, observant, understated. He is not a joke yet.
  { who: 'nazim', category: 'served', stage: ['sober'], text: "Perfect. No notes." },
  { who: 'nazim', category: 'served', stage: ['sober'], text: "Take your time. I've nowhere to be." },
  { who: 'nazim', category: 'ambient', stage: ['sober'], text: "Good table. Good sightlines." },
  { who: 'nazim', category: 'ambient', stage: ['sober'], text: "The guy in the hat. He always here?" },
  { who: 'nazim', category: 'hunterNear', stage: ['sober'], text: "He walks like he's paid by the lap." },
  { who: 'nazim', category: 'lateOrder', stage: ['sober'], text: "It's fine. I'll want another anyway." },
  { who: 'nazim', category: 'idle', stage: ['sober'], text: "Standing is also a strategy." },

  // Warmed up: more talkative, playful.
  { who: 'nazim', category: 'served', stage: ['warm'], text: "That one went down easy." },
  { who: 'nazim', category: 'served', stage: ['warm'], text: "Second one tastes like the first. Bold." },
  { who: 'nazim', category: 'ambient', stage: ['warm'], text: "You know what? I like it here." },
  { who: 'nazim', category: 'ambient', stage: ['warm'], text: "Gerald. Smile. It's free." },
  { who: 'nazim', category: 'nearMiss', stage: ['warm'], text: "Ooh. That was close enough to feel." },
  { who: 'nazim', category: 'levelUp', stage: ['warm'], text: "Busier. Good. I hate a quiet room." },

  // Buzzed: sharper sarcasm, more confidence than is warranted.
  { who: 'nazim', category: 'served', stage: ['buzzed'], text: "I've done the math. The math is fine." },
  { who: 'nazim', category: 'served', stage: ['buzzed'], text: "You're the best waiter here. Also the only one." },
  { who: 'nazim', category: 'ambient', stage: ['buzzed'], text: "I peaked at drink two. Enjoying the descent." },
  { who: 'nazim', category: 'ambient', stage: ['buzzed'], text: "Gerald's face is doing something new." },
  { who: 'nazim', category: 'hunterNear', stage: ['buzzed'], text: "Hat guy's on a schedule. Respect." },
  { who: 'nazim', category: 'lateOrder', stage: ['buzzed'], text: "Forgotten. Like my twenties." },
  { who: 'nazim', category: 'nearMiss', stage: ['buzzed'], text: "I'd have taken that hit for you. Probably." },

  // Drunk: crass, dark, blunt, highly reactive.
  { who: 'nazim', category: 'served', stage: ['drunk'], text: "Everyone in here dies eventually. Anyway. Cheers." },
  { who: 'nazim', category: 'served', stage: ['drunk'], text: "My liver filed a complaint. Denied." },
  { who: 'nazim', category: 'ambient', stage: ['drunk'], text: "I've made peace with being the joke." },
  { who: 'nazim', category: 'ambient', stage: ['drunk'], text: "Gerald, you're why coasters were invented." },
  { who: 'nazim', category: 'hunterNear', stage: ['drunk'], text: "If he takes you, can I have your shift?" },
  { who: 'nazim', category: 'nearMiss', stage: ['drunk'], text: "I'd fight him. I'd lose. I'd still go." },
  { who: 'nazim', category: 'lateOrder', stage: ['drunk'], text: "You forgot me. Get in line." },
  { who: 'nazim', category: 'caught', stage: ['drunk'], text: "He got you. I'm not surprised. I'm sad." },

  // Gone: chaotic, strangely philosophical, brutally sarcastic.
  { who: 'nazim', category: 'served', stage: ['gone'], text: "Time is a flat pint and I'm the bottom." },
  { who: 'nazim', category: 'served', stage: ['gone'], text: "Bring me water. No. Bring me the opposite." },
  { who: 'nazim', category: 'ambient', stage: ['gone'], text: "We're all orders someone forgot to deliver." },
  { who: 'nazim', category: 'ambient', stage: ['gone'], text: "I can see the floor. It's judging me." },
  { who: 'nazim', category: 'ambient', stage: ['gone'], text: "Tell my table I loved it.", rare: true },
  { who: 'nazim', category: 'idle', stage: ['gone'], text: "If I stop talking I've achieved something." },
  { who: 'nazim', category: 'caught', stage: ['gone'], text: "Do it again. I wasn't watching the first time." },

  // Food is food. He says so at every stage.
  { who: 'nazim', category: 'nazimFood', stage: ['sober', 'warm'], text: "Something to build a foundation on." },
  { who: 'nazim', category: 'nazimFood', stage: ['buzzed'], text: "Food. For balance. I'm a professional." },
  { who: 'nazim', category: 'nazimFood', stage: ['drunk', 'gone'], text: "Bread. The original sponge." },

  // ------------------------------------------------------------------ SAM
  // Meta-humour aimed squarely at systems that actually exist in this game.
  { who: 'sam', category: 'served', text: "Ten points a drink. That's not a wage." },
  { who: 'sam', category: 'served', text: "Straight to the table. No door for that one." },
  { who: 'sam', category: 'ambient', text: "There are two floor textures. I counted." },
  { who: 'sam', category: 'ambient', text: "Everyone arrives by the same door. Suspicious." },
  { who: 'sam', category: 'ambient', text: "One server. One hunter. Zero management." },
  { who: 'sam', category: 'ambient', text: "Same walk cycle since I got here." },
  { who: 'sam', category: 'ambient', text: "Nobody has paid for anything tonight." },
  { who: 'sam', category: 'ambient', text: "I like that we sit in exactly four spots." },
  { who: 'sam', category: 'ambient', text: "I checked. There is no upstairs.", rare: true },
  { who: 'sam', category: 'ambient', text: "The door doesn't go anywhere. I've tried.", rare: true },
  { who: 'sam', category: 'ambient', text: "Somebody's reading our state in a console.", rare: true },
  { who: 'sam', category: 'hunterNear', text: "He does laps. Like a shark in a hat." },
  { who: 'sam', category: 'hunterNear', text: "He's aiming better than an hour ago." },
  { who: 'sam', category: 'nearMiss', text: "His aim improves. Yours doesn't. Interesting." },
  { who: 'sam', category: 'nearMiss', text: "That's the closest the maths has ever been." },
  { who: 'sam', category: 'idle', text: "You could stand still. See what happens." },
  { who: 'sam', category: 'idle', text: "The camera follows you. Must be nice." },
  { who: 'sam', category: 'whiffed', text: "Nothing there. Confirmed. Repeatedly." },
  { who: 'sam', category: 'whiffed', text: "You're interacting with the concept of a table." },
  { who: 'sam', category: 'carryingLong', text: "That drink has seen more of the pub than me." },
  { who: 'sam', category: 'carryingLong', text: "It's warm now. That's a texture choice." },
  { who: 'sam', category: 'levelUp', text: "New level. Nothing levels up but the danger." },
  { who: 'sam', category: 'levelUp', text: "More customers. Same one of you." },
  { who: 'sam', category: 'abandoned', text: "Minus fifteen. Brutal economy in here." },
  { who: 'sam', category: 'abandoned', text: "They gave up. The bar didn't even notice." },
  { who: 'sam', category: 'lateOrder', text: "My patience bar went an unpleasant colour." },
  { who: 'sam', category: 'twoWaiting', text: "Two bubbles. One of you. I've done the math." },
  { who: 'sam', category: 'caught', text: "Everything resets now. Even my hangover." },
  { who: 'sam', category: 'restart', text: "Back at the top. I remember none of it." },
  { who: 'sam', category: 'restart', text: "Fresh shift. Same four of us. Same door." },
  { who: 'sam', category: 'ordered', text: "Watch the route. It's always the same route." },

  // --------------------------------------------------------------- GERALD
  // Dry, impatient, judgmental, fond of a pun, extremely literal.
  { who: 'gerald', category: 'served', text: "Finally. A drink I'd stopped describing from memory." },
  { who: 'gerald', category: 'served', text: "Cold. Correct. Don't make it a habit." },
  { who: 'gerald', category: 'served', text: "There. Was that so hard? Don't answer." },
  { who: 'gerald', category: 'ordered', text: "I ordered. That was the fun part." },
  { who: 'gerald', category: 'ambient', text: "This is a bar. Bar the service." },
  { who: 'gerald', category: 'ambient', text: "Ask me if I'm having fun. Go on." },
  { who: 'gerald', category: 'ambient', text: "The table is sticky. So is my patience." },
  { who: 'gerald', category: 'ambient', text: "Nice antlers. Deer god." },
  { who: 'gerald', category: 'ambient', text: "I came for a quiet pint. I got a documentary." },
  { who: 'gerald', category: 'idle', text: "Take your time. I'm only aging." },
  { who: 'gerald', category: 'idle', text: "Standing there isn't a service model." },
  { who: 'gerald', category: 'whiffed', text: "You had one job. It had one handle." },
  { who: 'gerald', category: 'whiffed', text: "Press it again. Maybe the wood softens." },
  { who: 'gerald', category: 'carryingLong', text: "I asked for a beer, not a pilgrimage." },
  { who: 'gerald', category: 'lateOrder', text: "Forgotten. By a man in a deer costume." },
  { who: 'gerald', category: 'lateOrder', text: "If I wanted a wait I'd visit a hospital." },
  { who: 'gerald', category: 'hunterNear', text: "Him again. Walking like rent's due." },
  { who: 'gerald', category: 'nearMiss', text: "You call that running? Glaciers commit harder." },
  { who: 'gerald', category: 'levelUp', text: "Busier. Wonderful. My favourite." },
  { who: 'gerald', category: 'abandoned', text: "They left. Sensible. I'd follow if I could stand." },
  { who: 'gerald', category: 'twoWaiting', text: "Two of us waiting. Pick a favourite. Wrongly." },
  { who: 'gerald', category: 'caught', text: "Caught. Predictable. Slightly satisfying." },
  { who: 'gerald', category: 'restart', text: "Again. Marvellous. I'd cleared my whole evening." },
  { who: 'gerald', category: 'served', text: "You want a tip? Walk faster." },

  // Gerald on Nazim — gated on Nazim's ACTUAL stage, so he never calls a sober
  // man drunk. Tolerance first, then it curdles.
  { who: 'gerald', category: 'ambient', nazim: ['sober'], text: "Nazim. Quiet. Keep it that way." },
  { who: 'gerald', category: 'ambient', nazim: ['sober'], text: "He's fine. Highest praise I give." },
  { who: 'gerald', category: 'ambient', nazim: ['warm'], text: "He's warming up. Everyone's a critic soon." },
  { who: 'gerald', category: 'stageChanged', nazim: ['warm'], text: "One drink and the opinions arrive early." },
  { who: 'gerald', category: 'stageChanged', nazim: ['buzzed'], text: "Two in, and already an authority." },
  { who: 'gerald', category: 'ambient', nazim: ['buzzed'], text: "Nazim's volume knob has no numbers left." },
  { who: 'gerald', category: 'ambient', nazim: ['buzzed'], text: "He's not wrong. He's just loud near the truth." },
  { who: 'gerald', category: 'stageChanged', nazim: ['drunk'], text: "That's not a personality. That's a reading." },
  { who: 'gerald', category: 'ambient', nazim: ['drunk'], text: "Nazim, your face has left without you." },
  { who: 'gerald', category: 'ambient', nazim: ['drunk'], text: "He's a cautionary tale with a tab." },
  { who: 'gerald', category: 'ambient', nazim: ['drunk'], text: "Not slurring. Pronouncing badly. Quickly." },
  { who: 'gerald', category: 'stageChanged', nazim: ['gone'], text: "He came in a man. He'll leave in a wheelbarrow." },
  { who: 'gerald', category: 'ambient', nazim: ['gone'], text: "Put a coaster under his head. He's a spill." },
  { who: 'gerald', category: 'ambient', nazim: ['gone'], text: "He's achieved the consistency of soup." },
  // Rare, understated decency — always immediately after the cruelty.
  { who: 'gerald', category: 'ambient', nazim: ['drunk', 'gone'], rare: true, text: "Idiot. ...Bring him a water, would you." },
  { who: 'gerald', category: 'ambient', nazim: ['gone'], rare: true, text: "He's insufferable. Don't let him walk home." },
  // ---------------------------------------------------------- THE HUNTER
  // He walks in, he looks around, he loses the thread, he gets bought a pint.
  { who: 'gerald', category: 'hunterArrives', text: "Here he comes. Shake the rain off, mate." },
  { who: 'sam', category: 'hunterArrives', text: "Door. Orange hat. That's your evening sorted." },
  { who: 'nazim', category: 'hunterArrives', stage: ['sober', 'warm'], text: "He's back. He always comes back." },
  { who: 'nazim', category: 'hunterArrives', stage: ['drunk', 'gone'], text: "Is that... he's got a hat on." },
  { who: 'sam', category: 'hunterSpotted', text: "He's clocked you. Move." },
  { who: 'gerald', category: 'hunterSpotted', text: "Eyes on. Stop admiring the floorboards." },
  { who: 'nazim', category: 'hunterSpotted', stage: ['sober', 'warm', 'buzzed'], text: "Run. Politely, but run." },
  { who: 'gerald', category: 'hunterLost', text: "He's looking at the coat rack. You're a coat now." },
  { who: 'sam', category: 'hunterLost', text: "Lost him. Don't get cocky." },
  { who: 'nazim', category: 'hunterLost', stage: ['drunk', 'gone'], text: "I lost him too. Where am I." },
  { who: 'gerald', category: 'hunterOrdered', text: "The hunter wants a pint. Of course he does." },
  { who: 'sam', category: 'hunterOrdered', text: "He's ordering. Bold of you to serve him." },
  { who: 'nazim', category: 'hunterOrdered', stage: ['buzzed', 'drunk', 'gone'], text: "Put it on my tab. No. Don't." },
  { who: 'sam', category: 'hunterServed', text: "You bought the man a pint. Stockholm, but a round." },
  { who: 'gerald', category: 'hunterServed', text: "Bribery. Finally some proper hospitality." },
  { who: 'nazim', category: 'hunterServed', stage: ['sober', 'warm'], text: "He drinks like a man with a plan." },
  { who: 'nazim', category: 'hunterServed', stage: ['drunk', 'gone'], text: "Cheers, hunter. No. Not cheers." },
  // ------------------------------------------------- NAZIM'S NIGHT, PAID FOR
  { who: 'gerald', category: 'spill', text: "That's a pint on the floor. Mind it." },
  { who: 'sam', category: 'spill', text: "He's watering the boards again." },
  { who: 'nazim', category: 'spill', stage: ['gone'], text: "The glass moved. I saw it." },
  { who: 'sam', category: 'nazimUp', text: "He's up. Nobody make eye contact." },
  { who: 'gerald', category: 'nazimUp', text: "Sit down, Nazim. That's a lane." },
  { who: 'nazim', category: 'nazimUp', stage: ['gone'], text: "Just stretching. Legs. Both." },
  { who: 'gerald', category: 'roundMissed', text: "That wasn't a round. That was three drinks." },
  { who: 'sam', category: 'roundMissed', text: "Staggered arrivals. Like a bad wedding." },
  // ------------------------------------------------------------- LAST CALL
  { who: 'gerald', category: 'lastCall', text: "Last call. Don't make it weird." },
  { who: 'sam', category: 'lastCall', text: "Bell's gone. Everybody wants everything now." },
  { who: 'nazim', category: 'lastCall', stage: ['sober', 'warm', 'buzzed'], text: "Already? The night was just getting good." },
  { who: 'nazim', category: 'lastCall', stage: ['drunk', 'gone'], text: "Last call is a state of mind." },
  { who: 'sam', category: 'hunterSpooked', text: "Did he just flinch at nothing?" },
  { who: 'gerald', category: 'hunterSpooked', text: "Big man. Scared of a draught." },
  { who: 'nazim', category: 'hunterSpooked', stage: ['drunk', 'gone'], text: "I saw it too. The see-through fella." },
];

// ---- Multi-character exchanges ---------------------------------------------
// Two or three lines with delays. The scheduler queues them and lets the game
// run underneath; if a restart happens mid-exchange the queue is dropped.
const DIALOGUE_EXCHANGES = [
  {
    category: 'hunterNear',
    lines: [
      { who: 'sam', text: "He's improving.", delay: 0 },
      { who: 'gerald', text: "He's aiming. Different thing.", delay: 1.5 },
    ],
  },
  {
    category: 'ambient', nazim: ['sober'],
    lines: [
      { who: 'gerald', text: "Nazim. Quiet tonight.", delay: 0 },
      { who: 'nazim', text: "I'm pacing myself.", delay: 1.4 },
    ],
  },
  {
    category: 'nearMiss', nazim: ['buzzed', 'drunk'],
    lines: [
      { who: 'nazim', text: "I could take him.", delay: 0 },
      { who: 'gerald', text: "You couldn't take stairs.", delay: 1.4 },
      { who: 'sam', text: "I'd watch that, though.", delay: 2.9 },
    ],
  },
  {
    category: 'served', nazim: ['buzzed'],
    lines: [
      { who: 'sam', text: "You've had two.", delay: 0 },
      { who: 'nazim', text: "I've had enough to be right.", delay: 1.4 },
    ],
  },
  {
    category: 'ambient',
    lines: [
      { who: 'gerald', text: "Why do you narrate everything?", delay: 0 },
      { who: 'sam', text: "Somebody has to. Nobody else is.", delay: 1.5 },
    ],
  },
  {
    category: 'levelUp',
    lines: [
      { who: 'sam', text: "Level went up.", delay: 0 },
      { who: 'gerald', text: "So did the noise.", delay: 1.3 },
      { who: 'nazim', text: "So did I.", delay: 2.6 },
    ],
  },
  {
    category: 'served', nazim: ['drunk'],
    lines: [
      { who: 'nazim', text: "Gerald. I love you.", delay: 0 },
      { who: 'gerald', text: "Noted. Denied.", delay: 1.4 },
    ],
  },
  {
    category: 'ambient', nazim: ['gone'],
    lines: [
      { who: 'gerald', text: "He's gone.", delay: 0 },
      { who: 'nazim', text: "I'm here.", delay: 1.2 },
      { who: 'gerald', text: "He's gone.", delay: 2.5 },
    ],
  },
  {
    category: 'ambient',
    lines: [
      { who: 'sam', text: "Same door. Every customer.", delay: 0 },
      { who: 'gerald', text: "Same complaint. Every night.", delay: 1.5 },
    ],
  },
  {
    category: 'stageChanged', nazim: ['warm'],
    lines: [
      { who: 'nazim', text: "This is nice.", delay: 0 },
      { who: 'sam', text: "Give it three drinks.", delay: 1.3 },
    ],
  },
  {
    category: 'ambient', nazim: ['sober', 'warm'],
    lines: [
      { who: 'sam', text: "Nazim. Do you ever leave?", delay: 0 },
      { who: 'nazim', text: "I left once. I came back.", delay: 1.5 },
    ],
  },
  {
    category: 'ambient', nazim: ['drunk'],
    lines: [
      { who: 'gerald', text: "Sit up.", delay: 0 },
      { who: 'nazim', text: "I am up.", delay: 1.1 },
      { who: 'gerald', text: "You're a puddle with a name.", delay: 2.3 },
    ],
  },
  {
    category: 'ambient', nazim: ['gone'],
    lines: [
      { who: 'nazim', text: "What if the pub is inside me?", delay: 0 },
      { who: 'sam', text: "That's the beer.", delay: 1.5 },
      { who: 'gerald', text: "That's the problem.", delay: 2.8 },
    ],
  },
  {
    category: 'abandoned',
    lines: [
      { who: 'sam', text: "Nobody's paid tonight.", delay: 0 },
      { who: 'gerald', text: "I never do.", delay: 1.3 },
    ],
  },
  {
    category: 'stageChanged', nazim: ['buzzed'],
    lines: [
      { who: 'gerald', text: "You're louder.", delay: 0 },
      { who: 'nazim', text: "I'm clearer.", delay: 1.2 },
    ],
  },
  {
    category: 'twoWaiting',
    lines: [
      { who: 'gerald', text: "Two orders. One deer.", delay: 0 },
      { who: 'sam', text: "I've seen this episode.", delay: 1.4 },
    ],
  },
  {
    category: 'ambient', rare: true,
    lines: [
      { who: 'sam', text: "Somebody's watching us.", delay: 0 },
      { who: 'nazim', text: "Wave.", delay: 1.2 },
      { who: 'gerald', text: "No.", delay: 2.2 },
    ],
  },
  {
    category: 'restart',
    lines: [
      { who: 'gerald', text: "Round two. Try the walking this time.", delay: 0 },
      { who: 'sam', text: "He can't hear you. He's new again.", delay: 1.6 },
    ],
  },
  {
    category: 'waterOrdered',
    lines: [
      { who: 'gerald', text: "Water for him. Now. On me.", delay: 0 },
      { who: 'nazim', text: "I ordered no water.", delay: 1.5 },
    ],
  },
  {
    category: 'waterOrdered',
    lines: [
      { who: 'gerald', text: "Cut him off. Water. Tall one.", delay: 0 },
      { who: 'sam', text: "He'll drink it and call it a cocktail.", delay: 1.6 },
    ],
  },
  {
    category: 'sobered',
    lines: [
      { who: 'nazim', text: "That's... wet. Thank you.", delay: 0 },
      { who: 'gerald', text: "Now sit up straight.", delay: 1.4 },
    ],
  },
  {
    category: 'roundCalled',
    lines: [
      { who: 'gerald', text: "A round. Three. Go.", delay: 0 },
      { who: 'sam', text: "Together, mind. It's a round, not a queue.", delay: 1.6 },
    ],
  },
  {
    category: 'roundCalled',
    lines: [
      { who: 'sam', text: "Round's on Gerald tonight.", delay: 0 },
      { who: 'gerald', text: "Round's on whoever's slowest.", delay: 1.4 },
    ],
  },
  {
    category: 'roundDone',
    lines: [
      { who: 'sam', text: "Three at once. That's a proper pub.", delay: 0 },
      { who: 'gerald', text: "Fine. That was competent.", delay: 1.5 },
    ],
  },
  {
    category: 'roundDone', nazim: ['drunk', 'gone'],
    lines: [
      { who: 'nazim', text: "To the deer!", delay: 0 },
      { who: 'gerald', text: "Quietly, Nazim.", delay: 1.2 },
    ],
  },
];
