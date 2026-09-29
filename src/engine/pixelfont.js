// ============================================================================
// Le Pub — 3x5 bitmap font
// Canvas `ctx.fillText` at 6px renders differently on every platform and goes
// soft the moment the canvas is scaled, which fights the whole pixel-art look.
// Dialogue needs a lot of small text, so it gets a real bitmap font instead:
// fixed 5px tall, variable width, drawn one filled pixel at a time by the same
// integer-rect method as every sprite.
//
// Glyphs are uppercase only; lowercase input is upcased on the way in.
// ============================================================================

const FONT_H = 5;
const FONT_TRACKING = 1; // blank columns between glyphs
const FONT_SPACE_W = 2;

// Each glyph is 5 strings of '#' (ink) and '.' (blank). Width is taken from
// the strings, so a glyph can be any width without extra bookkeeping.
const FONT_GLYPHS = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['#', '#', '#', '#', '#'],
  J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  N: ['#.#', '###', '###', '###', '#.#'],
  O: ['###', '#.#', '#.#', '#.#', '###'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  Q: ['###', '#.#', '#.#', '###', '..#'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  Z: ['###', '..#', '.#.', '#..', '###'],
  0: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  1: ['.#.', '##.', '.#.', '.#.', '###'],
  2: ['##.', '..#', '.#.', '#..', '###'],
  3: ['##.', '..#', '.#.', '..#', '##.'],
  4: ['#.#', '#.#', '###', '..#', '..#'],
  5: ['###', '#..', '##.', '..#', '##.'],
  6: ['.##', '#..', '##.', '#.#', '.#.'],
  7: ['###', '..#', '.#.', '#..', '#..'],
  8: ['.#.', '#.#', '.#.', '#.#', '.#.'],
  9: ['.#.', '#.#', '.##', '..#', '##.'],
  '.': ['.', '.', '.', '.', '#'],
  ',': ['..', '..', '..', '.#', '#.'],
  '!': ['#', '#', '#', '.', '#'],
  '?': ['##.', '..#', '.#.', '...', '.#.'],
  "'": ['#', '#', '.', '.', '.'],
  '-': ['...', '...', '###', '...', '...'],
  ':': ['.', '#', '.', '#', '.'],
  ';': ['..', '.#', '..', '.#', '#.'],
  '+': ['...', '.#.', '###', '.#.', '...'],
  '/': ['..#', '..#', '.#.', '#..', '#..'],
  '(': ['.#', '#.', '#.', '#.', '.#'],
  ')': ['#.', '.#', '.#', '.#', '#.'],
  '"': ['#.#', '#.#', '...', '...', '...'],
  '&': ['.#.', '#.#', '.#.', '#.#', '.##'],
  '%': ['#.#', '..#', '.#.', '#..', '#.#'],
  '*': ['#.#', '.#.', '#.#', '...', '...'],
  '<': ['..#', '.#.', '#..', '.#.', '..#'],
  '>': ['#..', '.#.', '..#', '.#.', '#..'],
  '=': ['...', '###', '...', '###', '...'],
};

// Accented characters that show up in French get folded onto their base glyph
// rather than each needing their own 3x5 drawing.
const FONT_FOLD = {
  'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
  'À': 'A', 'Â': 'A', 'Ä': 'A',
  'Î': 'I', 'Ï': 'I',
  'Ô': 'O', 'Ö': 'O',
  'Ù': 'U', 'Û': 'U', 'Ü': 'U',
  'Ç': 'C', '’': "'", '‘': "'", '“': '"', '”': '"', '–': '-', '—': '-',
};

function fontGlyph(ch) {
  const up = ch.toUpperCase();
  return FONT_GLYPHS[up] || FONT_GLYPHS[FONT_FOLD[up]] || null;
}

function fontCharWidth(ch) {
  if (ch === ' ') return FONT_SPACE_W;
  const g = fontGlyph(ch);
  return g ? g[0].length : FONT_SPACE_W;
}

// Width in pixels, including the gap after every glyph but the last.
function fontTextWidth(text) {
  let w = 0;
  for (let i = 0; i < text.length; i++) {
    w += fontCharWidth(text[i]);
    if (i < text.length - 1) w += FONT_TRACKING;
  }
  return w;
}

// Draws `text` with its top-left at (x, y). Coordinates are rounded once here
// so callers can pass fractional world-to-screen values. `scale` (default 1)
// draws every font pixel as a scale×scale block: that is how the end-of-shift
// plates get a headline without falling back to a platform font that would
// go soft the moment the canvas is scaled.
function fontDrawText(ctx, text, x, y, color, scale) {
  const s = scale || 1;
  ctx.fillStyle = color;
  let cx = Math.round(x);
  const cy = Math.round(y);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ' ') { cx += (FONT_SPACE_W + FONT_TRACKING) * s; continue; }
    const g = fontGlyph(ch);
    if (!g) { cx += (FONT_SPACE_W + FONT_TRACKING) * s; continue; }
    for (let ry = 0; ry < FONT_H; ry++) {
      const row = g[ry];
      for (let rx = 0; rx < row.length; rx++) {
        if (row[rx] === '#') ctx.fillRect(cx + rx * s, cy + ry * s, s, s);
      }
    }
    cx += (g[0].length + FONT_TRACKING) * s;
  }
}

// Same text with a dark offset behind it, so it stays legible over the
// floor, furniture or a photo. The offset grows with the scale so a headline
// gets a proportionate drop shadow rather than a hairline.
function fontDrawTextShadow(ctx, text, x, y, color, shadow, scale) {
  const s = scale || 1;
  fontDrawText(ctx, text, x + s, y + s, shadow || '#000', s);
  fontDrawText(ctx, text, x, y, color, s);
}

// Greedy word wrap to a pixel width. Returns an array of lines; a single word
// longer than maxWidth is left on its own line rather than being cut.
function fontWrapText(text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? line + ' ' + word : word;
    if (line && fontTextWidth(candidate) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}
