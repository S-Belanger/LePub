// ---- Pub UI material kit -----------------------------------------------------
// Every piece of interface — the hanging HUD sign, order tickets, dialogue
// placards and the end-of-shift boards — is built from the same three
// materials as the room: walnut boards, brass fittings and parchment. One
// palette and two plate painters keep them reading as things the pub owns
// rather than a layer floated on top of it. The DOM shell (style.css) uses the
// same hexes so the start overlay and touch controls match.
const UI = {
  walnut: '#3b2219',
  walnutLit: '#5c3626',
  walnutDark: '#22130f',
  walnutGrain: 'rgba(12,6,4,0.28)',
  brass: PUB.brass,
  brassLit: '#f6d688',
  brassDark: '#7d521a',
  parchment: PUB.paper,
  parchmentLit: '#f5e3b9',
  parchmentDark: '#c8a66c',
  ink: PUB.ink,
  shadow: PUB.tableShadow,
};

// A filled rectangle with its four corner pixels knocked off. Clipped corners
// are what keep the plates reading as cut boards and card rather than as
// generic rounded UI.
function fillClipped(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillRect(x, y + 1, w, h - 2);
}

function drawRivet(x, y) {
  ctx.fillStyle = UI.brassDark;
  ctx.fillRect(x, y, 2, 2);
  ctx.fillStyle = UI.brass;
  ctx.fillRect(x, y, 1.5, 1.5);
  ctx.fillStyle = UI.brassLit;
  ctx.fillRect(x, y, 0.5, 0.5);
}

// A walnut board: ink outline, lit top-left bevel, dark bottom-right bevel,
// faint horizontal grain, and a brass rivet in each corner. `rail` adds brass
// strips along the top and bottom edges — the trim the wide end-of-shift
// boards get — and `chains` hangs the board from the top of the frame on two
// brass chains, which is how the HUD sign is mounted.
function drawWalnutPlate(x, y, w, h, opts) {
  const rail = !!(opts && opts.rail);
  const chains = opts ? opts.chains | 0 : 0;
  if (chains > 0) {
    for (const cx of [x + 5, x + w - 6]) {
      for (let cy = y - chains; cy < y; cy++) {
        ctx.fillStyle = (cy - y) % 2 === 0 ? UI.brass : UI.brassDark;
        ctx.fillRect(cx, cy, 1, 1);
      }
    }
  }
  ctx.fillStyle = UI.shadow;
  ctx.fillRect(x + 1, y + 2, w, h);
  fillClipped(x, y, w, h, UI.ink);
  fillClipped(x + 1, y + 1, w - 2, h - 2, UI.walnut);
  // Grain: half-pixel dark lines, staggered so they don't read as ruled paper.
  ctx.fillStyle = UI.walnutGrain;
  for (let gy = y + 4; gy < y + h - 3; gy += 3) {
    const inset = 3 + ((gy - y) % 2) * 3;
    ctx.fillRect(x + inset, gy, w - inset * 2, 0.5);
  }
  ctx.fillStyle = UI.walnutLit;
  ctx.fillRect(x + 2, y + 1, w - 4, 1);
  ctx.fillRect(x + 1, y + 2, 1, h - 4);
  ctx.fillStyle = UI.walnutDark;
  ctx.fillRect(x + 2, y + h - 2, w - 4, 1);
  ctx.fillRect(x + w - 2, y + 2, 1, h - 4);
  if (rail) {
    ctx.fillStyle = UI.brass;
    ctx.fillRect(x + 2, y + 1, w - 4, 1);
    ctx.fillRect(x + 2, y + h - 2, w - 4, 1);
    ctx.fillStyle = UI.brassLit;
    ctx.fillRect(x + 3, y + 1, w - 6, 0.5);
    ctx.fillRect(x + 3, y + h - 2, w - 6, 0.5);
  }
  drawRivet(x + 2, y + 2);
  drawRivet(x + w - 4, y + 2);
  drawRivet(x + 2, y + h - 4);
  drawRivet(x + w - 4, y + h - 4);
}

// A parchment card with a coloured stitched frame: order tickets and dialogue
// placards. The accent is semantic (whose order, who's talking, what you're
// carrying), so it is a parameter rather than a material.
function drawParchmentPlate(x, y, w, h, accent, stitch) {
  ctx.fillStyle = UI.shadow;
  ctx.fillRect(x + 1, y + 2, w, h);
  fillClipped(x, y, w, h, accent);
  fillClipped(x + 1, y + 1, w - 2, h - 2, UI.parchment);
  if (h < 7 || w < 7) return;
  // Aged bottom/right edge, lit top/left edge, then a stitch of dots along
  // the top so the card reads as a torn ticket rather than a flat fill.
  ctx.fillStyle = UI.parchmentDark;
  ctx.fillRect(x + 2, y + h - 2, w - 4, 0.5);
  ctx.fillRect(x + w - 2, y + 2, 0.5, h - 4);
  ctx.fillStyle = UI.parchmentLit;
  ctx.fillRect(x + 1, y + 2, 0.5, h - 4);
  ctx.fillStyle = stitch || UI.parchmentLit;
  ctx.fillRect(x + 3, y + 1, w - 6, 1);
  ctx.fillStyle = accent;
  for (let px = x + 4; px < x + w - 4; px += 2) ctx.fillRect(px, y + 1, 0.5, 0.5);
}

// The little pointer from a placard back to whoever it belongs to. `y` is the
// plate edge the tail grows from.
function drawPlateTail(tailX, y, accent, pointingDown) {
  ctx.fillStyle = accent;
  if (pointingDown) {
    ctx.fillRect(tailX, y, 3, 2);
    ctx.fillRect(tailX + 1, y + 2, 1, 1);
    ctx.fillStyle = UI.parchment;
    ctx.fillRect(tailX + 1, y, 1, 1);
  } else {
    ctx.fillRect(tailX, y - 2, 3, 2);
    ctx.fillRect(tailX + 1, y - 3, 1, 1);
    ctx.fillStyle = UI.parchment;
    ctx.fillRect(tailX + 1, y - 1, 1, 1);
  }
}

// A short brass rule with a dark underline; the divider used on the boards.
function drawBrassRule(x, y, w) {
  ctx.fillStyle = UI.brassDark;
  ctx.fillRect(x, y + 1, w, 0.5);
  ctx.fillStyle = UI.brass;
  ctx.fillRect(x, y, w, 1);
  ctx.fillStyle = UI.brassLit;
  ctx.fillRect(x + 1, y, w - 2, 0.5);
}
