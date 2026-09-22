// ============================================================================
// Le Pub — scenery: palette, deterministic layout noise, and prebaked lighting
// Pure helpers with no game state. game.js owns the floor plan, so it builds
// the actual decor lists; this file supplies the colours they're painted in
// and the offscreen canvases the lighting pass blits.
// ============================================================================

// Corner Booth Stories: a warm neighborhood-pub palette built around forest
// green, tomato red, honey yellow, muted blue and charcoal. The ramps remain
// explicit so every shaded pixel belongs to the same compact color family.
const PUB = {
  // Floor: dark walnut boards receive their honey colour from local lamps,
  // matching the reference's contrast instead of washing the whole room tan.
  floor: ['#563827', '#62402b', '#70492f', '#4a3024', '#7a5032'],
  floorSeam: '#2b1b17',
  floorEdge: '#9a6338',
  floorGrain: 'rgba(235,161,79,0.22)',
  floorStain: 'rgba(30,18,17,0.38)',

  // Walls and rear architecture.
  wallDark: '#171817',
  wall: '#2e251f',
  wallLit: '#5d3d28',
  wainscot: '#35241d',
  wainscotLit: '#68432a',
  baseboard: '#110f0f',

  // Bar.
  barTop: '#754324',
  barTopLit: '#a86632',
  barTopHi: '#e1a052',
  barFront: '#42271f',
  barFrontLit: '#704029',
  barFrontDark: '#241714',
  brass: '#d99a38',

  // Tables and chairs.
  tableTop: '#6b3f27',
  tableTopLit: '#985c32',
  tableTopHi: '#d48b45',
  tableEdge: '#321d18',
  tableShadow: 'rgba(13,10,10,0.52)',
  chair: '#652b2b',
  chairLit: '#a14439',
  chairAlt: '#263d43',
  chairAltLit: '#42636a',

  // Accents.
  amber: '#f0b84c',
  amberDim: '#b87524',
  midnight: '#102a3a',
  cool: '#326685',
  coolPale: '#8ec8d4',
  green: '#294936',
  greenLit: '#4f7654',
  burgundy: '#8d342f',
  tomato: '#bd4938',
  cream: '#f1d9a8',
  creamDim: '#bfa579',
  paper: '#e5c78d',
  glass: '#d8eef0',
  bottleGreen: '#376a4c',
  bottleAmber: '#a86822',
  bottleClear: '#8bb0b8',
  rugRed: '#6d2a2c',
  rugGold: '#b77e32',
  rugGreen: '#1e3c34',
  ink: '#181515',
};

// Deterministic layout noise. Clutter should be in the same place on every
// load — a bar whose coasters teleport on refresh reads as broken, not random.
function makeSeededRandom(seed) {
  let s = seed >>> 0;
  return function next() {
    // xorshift32: tiny, no dependencies, plenty random for scattering props.
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// Bakes one radial light pool into an offscreen canvas. Built once per size at
// load and then blitted. Continuous alpha preserves the artwork underneath:
// a coarse Bayer mask was stamping a checkerboard over faces and clothing.
function makeGlowCanvas(radius, rgb, maxAlpha) {
  const size = radius * 2;
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const c = cv.getContext('2d');
  const img = c.createImageData(size, size);
  const data = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - radius + 0.5;
      const dy = y - radius + 0.5;
      const d = Math.sqrt(dx * dx + dy * dy) / radius;
      if (d >= 1) continue;
      const falloff = Math.pow(1 - d, 1.7);
      const a = falloff * maxAlpha;
      const i = (y * size + x) * 4;
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      data[i + 3] = Math.round(a * 255);
    }
  }
  c.putImageData(img, 0, 0);
  return cv;
}

// A quiet corner-to-centre darkening, rebuilt whenever the viewport
// changes size. Cheap to blit and keeps the eye on the middle of the room.
function makeVignetteCanvas(w, h, maxAlpha) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, w);
  cv.height = Math.max(1, h);
  const c = cv.getContext('2d');
  const img = c.createImageData(cv.width, cv.height);
  const data = img.data;
  const cx = cv.width / 2;
  const cy = cv.height / 2;
  const maxD = Math.sqrt(cx * cx + cy * cy);

  for (let y = 0; y < cv.height; y++) {
    for (let x = 0; x < cv.width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy) / maxD;
      const t = Math.max(0, (d - 0.45) / 0.55);
      const falloff = Math.pow(t, 1.6);
      const i = (y * cv.width + x) * 4;
      data[i] = 10; data[i + 1] = 20; data[i + 2] = 22;
      data[i + 3] = Math.round(Math.min(1, falloff) * maxAlpha * 255);
    }
  }
  c.putImageData(img, 0, 0);
  return cv;
}
