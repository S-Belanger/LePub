// ---- Canvas setup ----------------------------------------------------------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// The simulation still runs in the original 200x360 logical world, but art is
// backed by four physical pixels per logical unit. Existing gameplay geometry
// therefore stays untouched while refined sprites and half-pixel material
// details get a real pixel of their own instead of being blurred away.
// The illustrated source sheets contain real surface detail: preserve it at
// desktop size rather than reducing to 40px figures then enlarging them again.
const ART_SCALE = 4;

// ---- Adaptive viewport ------------------------------------------------------
// The canvas fills the browser viewport rather than sitting at a fixed size.
// Two numbers are recomputed on every resize/orientation change:
//   * `pixelScale` — an INTEGER css-pixels-per-game-pixel factor, so art is
//     never resampled onto fractional pixels and stays crisp;
//   * `viewW`/`viewH` — the internal (game-pixel) resolution, sized so that
//     viewW*scale x viewH*scale covers as much of the viewport as it can.
// Because the world is portrait (200x360), a portrait viewport gets a portrait
// internal resolution rather than a squashed 16:9 letterbox. Both are clamped
// so an ultrawide monitor can't reveal empty space outside the pub.
// Everything downstream (camera, ground, HUD, overlays) reads `viewW`/`viewH`
// rather than baking the numbers in, so a resize mid-run just works.
const VIEW_BASE_LANDSCAPE = { w: 320, h: 180 };
const VIEW_BASE_PORTRAIT = { w: 180, h: 320 };
const VIEW_MIN = { w: 160, h: 144 };
// Taller than the world so a phone can show the whole pub with room above it
// for the hanging sign (see cameraInsets).
const VIEW_MAX = { w: 320, h: 420 };

let viewW = VIEW_BASE_LANDSCAPE.w;
let viewH = VIEW_BASE_LANDSCAPE.h;
let pixelScale = 1;
let viewIsPortrait = false;

function applyViewport() {
  // Read layout once per resize, never per frame.
  const availW = Math.max(1, Math.floor(window.innerWidth));
  const availH = Math.max(1, Math.floor(window.innerHeight));
  const portrait = availH > availW;
  const base = portrait ? VIEW_BASE_PORTRAIT : VIEW_BASE_LANDSCAPE;
  const scale = Math.max(1, Math.floor(Math.min(availW / base.w, availH / base.h)));
  const w = clamp(Math.floor(availW / scale), VIEW_MIN.w, VIEW_MAX.w);
  const h = clamp(Math.floor(availH / scale), VIEW_MIN.h, VIEW_MAX.h);
  if (w === viewW && h === viewH && scale === pixelScale && portrait === viewIsPortrait) return;

  viewW = w;
  viewH = h;
  pixelScale = scale;
  viewIsPortrait = portrait;

  canvas.width = viewW * ART_SCALE;
  canvas.height = viewH * ART_SCALE;
  canvas.style.width = (viewW * pixelScale) + 'px';
  canvas.style.height = (viewH * pixelScale) + 'px';
  // Resizing the backing store resets 2D context state, so restore it.
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(ART_SCALE, 0, 0, ART_SCALE, 0, 0);
  dustReady = false;   // re-scatter the motes across the new canvas
}

// Resizes are coalesced into the next frame: mobile browsers fire a burst of
// them while the URL bar collapses or the device rotates.
let viewportDirty = true;
function invalidateViewport() { viewportDirty = true; }
window.addEventListener('resize', invalidateViewport);
window.addEventListener('orientationchange', invalidateViewport);
if (window.visualViewport) window.visualViewport.addEventListener('resize', invalidateViewport);

// Splash image shown full-screen when the player is caught.
const caughtImage = new Image();
caughtImage.src = 'assets/caught.jpg';

// Splash images shown full-screen when a shift is completed: one per shift,
// in order, holding on the last for every shift past the end of the list.
const LEVEL_DONE_IMAGES = [
  'assets/LevelDone.png',
  'assets/LevelDone_2.jpg',
  'assets/LevelDone_3.jpg',
  'assets/LevelDone_4.jpg',
  'assets/LevelDone_5.jpg',
  'assets/LevelDone_6.jpg',
].map(src => {
  const img = new Image();
  img.src = src;
  return img;
});

function levelDoneImageFor(shift) {
  const i = Math.min(Math.max(shift, 1), LEVEL_DONE_IMAGES.length) - 1;
  return LEVEL_DONE_IMAGES[i];
}
