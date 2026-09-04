// ============================================================================
// Le Pub — scenery: palette, deterministic layout noise, and prebaked lighting
// Pure helpers with no game state. game.js owns the floor plan, so it builds
// the actual decor lists; this file supplies the colours they're painted in
// and the offscreen canvases the lighting pass blits.
// ============================================================================

// A 32-bit neo-noir pub: burgundy, tobacco brown, warm amber, midnight blue,
// muted green and dirty cream. Ramps are authored as explicit steps rather
// than interpolated, so shading always lands on a colour that belongs here.
const PUB = {
  // Floor: tobacco planks, four steps of one ramp so a board reads as a board.
  floor: ['#6d4629', '#784d2e', '#5f3d24', '#835538'],
  floorSeam: '#3b2415',
  floorGrain: 'rgba(38,22,12,0.16)',
  floorStain: 'rgba(30,16,8,0.30)',

  // Walls and rear architecture.
  wallDark: '#2a1720',
  wall: '#3a1f2a',
  wallLit: '#4d2833',
  wainscot: '#4a2f1c',
  wainscotLit: '#6b4527',
  baseboard: '#231409',

  // Bar.
  barTop: '#8a5730',
  barTopLit: '#b57c46',
  barTopHi: '#d8a367',
  barFront: '#4a2c17',
  barFrontLit: '#5d3a1f',
  barFrontDark: '#2c1809',
  brass: '#c9962f',

  // Tables and chairs.
  tableTop: '#7c4c2b',
  tableTopLit: '#9c6438',
  tableTopHi: '#c08b52',
  tableEdge: '#3a2213',
  tableShadow: 'rgba(20,10,6,0.32)',
  chair: '#432a19',
  chairLit: '#5f3d23',

  // Accents.
  amber: '#e8a13a',
  amberDim: '#a86f22',
  midnight: '#16203a',
  cool: '#4a6d9e',
  coolPale: '#9dc0e0',
  green: '#3f6049',
  burgundy: '#5c2030',
  cream: '#e8ddc0',
  creamDim: '#b9ad91',
  glass: '#cfe0e8',
  bottleGreen: '#2f5138',
  bottleAmber: '#8a5a1e',
  bottleClear: '#8fa6ad',
  ink: '#180f14',
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

// 4x4 Bayer matrix. Used to break the banding in the light pools into an
// ordered dither instead of a smooth blur, which is what keeps them looking
// drawn rather than filtered.
const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// Bakes one radial light pool into an offscreen canvas. Built once per size at
// load and then blitted, so the frame loop never touches per-pixel work.
// `steps` quantises the falloff into visible bands; the Bayer threshold
// scatters the pixels that fall between two bands.
function makeGlowCanvas(radius, rgb, maxAlpha, steps) {
  const size = radius * 2;
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const c = cv.getContext('2d');
  const img = c.createImageData(size, size);
  const data = img.data;
  const bands = steps || 5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - radius + 0.5;
      const dy = y - radius + 0.5;
      const d = Math.sqrt(dx * dx + dy * dy) / radius;
      if (d >= 1) continue;
      const falloff = Math.pow(1 - d, 1.7);
      const scaled = falloff * bands;
      let level = Math.floor(scaled);
      // Dither the fractional part so the band edges interlock instead of
      // drawing as hard rings.
      if ((scaled - level) * 16 > BAYER4[y & 3][x & 3]) level += 1;
      if (level <= 0) continue;
      const a = Math.min(1, (level / bands)) * maxAlpha;
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

// A dithered corner-to-centre darkening, rebuilt whenever the viewport
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
      const scaled = Math.pow(t, 1.6) * 5;
      let level = Math.floor(scaled);
      if ((scaled - level) * 16 > BAYER4[y & 3][x & 3]) level += 1;
      if (level <= 0) continue;
      const i = (y * cv.width + x) * 4;
      data[i] = 8; data[i + 1] = 5; data[i + 2] = 12;
      data[i + 3] = Math.round(Math.min(1, level / 5) * maxAlpha * 255);
    }
  }
  c.putImageData(img, 0, 0);
  return cv;
}
