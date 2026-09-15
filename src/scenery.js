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
  // Floor: honeyed planks stay light enough to make every silhouette readable.
  floor: ['#9b6a43', '#a6754a', '#8e5f3d', '#b17e52'],
  floorSeam: '#5b3824',
  floorGrain: 'rgba(66,39,22,0.18)',
  floorStain: 'rgba(62,36,22,0.22)',

  // Walls and rear architecture.
  wallDark: '#18312f',
  wall: '#24443f',
  wallLit: '#356054',
  wainscot: '#2b4d45',
  wainscotLit: '#416b5c',
  baseboard: '#142622',

  // Bar.
  barTop: '#b97637',
  barTopLit: '#d89c4c',
  barTopHi: '#f1c77a',
  barFront: '#23444d',
  barFrontLit: '#32616a',
  barFrontDark: '#152f36',
  brass: '#e2a43e',

  // Tables and chairs.
  tableTop: '#a56136',
  tableTopLit: '#c47f43',
  tableTopHi: '#e2aa67',
  tableEdge: '#53301f',
  tableShadow: 'rgba(30,25,20,0.28)',
  chair: '#7e322f',
  chairLit: '#b64a3b',
  chairAlt: '#315970',
  chairAltLit: '#4c7990',

  // Accents.
  amber: '#f0b84c',
  amberDim: '#b87524',
  midnight: '#1b3342',
  cool: '#47728e',
  coolPale: '#9fcbd6',
  green: '#315f48',
  greenLit: '#4f8666',
  burgundy: '#a53f32',
  tomato: '#c94f3d',
  cream: '#f3e5bd',
  creamDim: '#cdbb91',
  paper: '#efd9a2',
  glass: '#d8eef0',
  bottleGreen: '#376a4c',
  bottleAmber: '#a86822',
  bottleClear: '#8bb0b8',
  rugRed: '#8e3733',
  rugGold: '#d29b3d',
  rugGreen: '#294d42',
  ink: '#20231f',
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
      data[i] = 10; data[i + 1] = 20; data[i + 2] = 22;
      data[i + 3] = Math.round(Math.min(1, level / 5) * maxAlpha * 255);
    }
  }
  c.putImageData(img, 0, 0);
  return cv;
}
