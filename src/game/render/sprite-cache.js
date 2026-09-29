// ---- Sprite rendering -------------------------------------------------------
// Sprite geometry and palettes live in src/art/sprites.js; this is the single
// generic renderer for that rows+palette format.
//
// The rows are painted a pixel at a time exactly once per (sprite, palette,
// facing) combination and cached as an offscreen canvas; every frame after
// that is a single drawImage. With twenty-odd characters on screen the naive
// version was issuing several thousand fillRect calls a frame for art that
// never changes. The cache is keyed by object identity through WeakMaps, so a
// customer's one-off palette is collected along with the customer.
const spriteCache = new WeakMap();

function bakeSprite(sprite, palette, flipX) {
  const { rows, w, h } = sprite;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d');
  for (let ry = 0; ry < rows.length; ry++) {
    const row = rows[ry];
    for (let rx = 0; rx < row.length; rx++) {
      const color = palette[row[rx]];
      if (!color) continue;
      g.fillStyle = color;
      g.fillRect(flipX ? (w - 1 - rx) : rx, ry, 1, 1);
    }
  }
  return cv;
}

function bakedSprite(sprite, palette, flipX) {
  let byPalette = spriteCache.get(sprite);
  if (!byPalette) { byPalette = new WeakMap(); spriteCache.set(sprite, byPalette); }
  let pair = byPalette.get(palette);
  if (!pair) { pair = { n: null, f: null }; byPalette.set(palette, pair); }
  const key = flipX ? 'f' : 'n';
  if (!pair[key]) pair[key] = bakeSprite(sprite, palette, flipX);
  return pair[key];
}

// `squash` ({x, y} scale factors, optional) is the reaction layer's only
// handle on a sprite: the feet stay put and the body compresses or lifts.
function drawSprite(sprite, palette, screenX, screenY, flipX, squash) {
  const pixelSize = sprite.pixelSize || 1;
  const w = sprite.w * pixelSize;
  const h = sprite.h * pixelSize;
  const sxScale = squash ? squash.x : 1;
  const syScale = squash ? squash.y : 1;
  const x = Math.round((screenX + (w - w * sxScale) / 2) * ART_SCALE) / ART_SCALE;
  const y = Math.round((screenY + (h - h * syScale)) * ART_SCALE) / ART_SCALE;
  ctx.drawImage(bakedSprite(sprite, palette, !!flipX), x, y, w * sxScale, h * syScale);
}

function spriteVisualW(sprite) { return sprite.w * (sprite.pixelSize || 1); }
function spriteVisualH(sprite) { return sprite.h * (sprite.pixelSize || 1); }
function spriteAnchorX(sprite, flipX) {
  const width = spriteVisualW(sprite);
  const anchor = sprite.anchorX == null ? width / 2 : sprite.anchorX;
  return flipX ? width - anchor : anchor;
}
