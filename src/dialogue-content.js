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

  // ---------------------------------------------------------------- JAMESON
  // A customer has just handed the deer a shot and he's briefly untouchable.
  // The booth watches it happen, so these are reactions to the room, not
  // explanations of the mechanic: nobody here says "invincible".
  { who: 'nazim', category: 'jameson', stage: ['sober', 'warm'], text: "A free one. For him. Naturally." },
  { who: 'nazim', category: 'jameson', stage: ['buzzed'], text: "Whiskey. The good kind of decision." },
  { who: 'nazim', category: 'jameson', stage: ['drunk'], text: "He gets Jameson. I get patience." },
  { who: 'nazim', category: 'jameson', stage: ['gone'], text: "Pour one for the antlers. They've earned it." },
  { who: 'sam', category: 'jameson', text: "Somebody tipped. In whiskey." },
  { who: 'sam', category: 'jameson', text: "He's glowing. That's not the lamps." },
  { who: 'sam', category: 'jameson', text: "Go on then. Run at the hat." },
  { who: 'sam', category: 'jameson', rare: true, text: "Irish courage. Literally.", weight: 0.8 },
  { who: 'gerald', category: 'jameson', text: "One shot and he thinks he's immortal." },
  { who: 'gerald', category: 'jameson', text: "That's not a tip. That's an enabler." },
  { who: 'gerald', category: 'jameson', nazim: ['drunk', 'gone'], text: "Wrong man got the Jameson." },
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
    category: 'jameson',
    lines: [
      { who: 'sam', text: "He drank it in one.", delay: 0 },
      { who: 'gerald', text: "On shift. Marvellous.", delay: 1.3 },
    ],
  },
  {
    category: 'jameson', nazim: ['buzzed', 'drunk', 'gone'],
    lines: [
      { who: 'nazim', text: "Where's mine?", delay: 0 },
      { who: 'gerald', text: "Behind you. Five of them.", delay: 1.4 },
    ],
  },
];
