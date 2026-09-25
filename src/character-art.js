// Shared production art contract. See docs/VISUAL-SYSTEM.md before adding art.
// Browser classic script + Node tools; no gameplay dimensions live here.
const CharacterArt = (() => {
  const directions = ['down', 'right', 'up', 'left'];
  const walk = ['walkA', 'idle', 'walkB', 'idle'];
  function person(name, kind, specialPose, extra = {}) {
    return Object.assign({ name, kind, height: 21,
      rows: ['idle', 'walkA', 'walkB', 'special'],
      animations: { idle: ['idle'], walk, [specialPose]: ['special'] },
    }, extra);
  }
  const families = {
    doe: person('The Doe', 'doe', 'carry', { height: 24,
      animations: { idle: ['idle'], walk, carry: ['special'], carryWalk: ['special'] } }),
    hunter: person('The Hunter', 'hunter', 'drink', { height: 24,
      animations: { idle: ['idle'], walk, gun: ['idle'], gunWalk: walk, drink: ['special'] } }),
    nazim: person('Nazim', 'nazim', 'lean', {
      rows: ['idle', 'walkA', 'lean', 'slump'],
      animations: { idle: ['idle'], walk: ['walkA', 'idle'], lean: ['lean'], slump: ['slump'] } }),
    sam: person('Sam', 'sam', 'talk'),
    gerald: person('Gerald', 'gerald', 'talk'),
    waiter: person('Jay', 'waiter', 'spray'),
    'customer-teal': person('Teal sweater', 'customer', 'talk'),
    'customer-ochre': person('Ochre jacket', 'customer', 'talk'),
    'customer-blue': person('Blue shirt', 'customer', 'talk'),
    alex: person('Alex', 'alex', 'split', {
      // Shoe/hip floor contact, measured from this source's horizontal split.
      // Move the floor anchor 1.5 world units above the silhouette bottom.
      // Gameplay uses split.down to align the legs with the horizontal blocker.
      floorOffsets: { special: 1.5 },
    }),
  };
  const proceduralExceptions = {
    ghost: 'Intentional translucent apparition; keep its procedural material.',
    busboy: 'Legacy art debt from the gameplay merge; needs a dedicated illustrated idle/walk/mop sheet. Do not copy for new people.',
  };
  return { directions, families, proceduralExceptions, minSourceDensity: 4 };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CharacterArt;
