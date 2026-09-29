// ---- Furniture --------------------------------------------------------------
// A counter: dark front panel with vertical slats, a lit top surface with a
// highlight along its back edge, and the glassware standing on it.
function drawBar(bar, camX, camY) {
  const c = bar.collider;
  const x = Math.round(c.x - camX);
  const y = Math.round(c.y - camY);
  const horizontal = c.w >= c.h;
  // High overhead camera: the counter top dominates; a shallow front lip
  // and a thin side face carry the depth (docs/VISUAL-SYSTEM.md).
  const front = 4;
  const side = horizontal ? 0 : 2;

  ctx.fillStyle = PUB.tableShadow;
  ctx.fillRect(x + 2, y + c.h + 1, c.w, 4);

  ctx.fillStyle = PUB.ink;
  ctx.fillRect(x + 1, y, c.w - 2, c.h + 1);
  ctx.fillRect(x, y + 1, c.w, c.h - 1);

  // Worktop.
  const topH = c.h - front;
  const topW = c.w - side;
  ctx.fillStyle = PUB.tableEdge;
  ctx.fillRect(x, y, topW + 1, topH + 1);
  ctx.fillStyle = PUB.barTop;
  ctx.fillRect(x + 1, y + 1, topW - 1, topH - 1);
  ctx.fillStyle = PUB.barTopLit;
  ctx.fillRect(x + 1, y + 1, topW - 1, 1.5);
  ctx.fillRect(x + 1, y + 1, 1, topH - 1);
  ctx.fillStyle = PUB.barTopHi;
  ctx.fillRect(x + 2, y + 1, topW - 3, 0.5);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = PUB.tableTopHi;
  for (let py = y + 4; py < y + topH - 2; py += 3) {
    for (let px = x + 3 + ((py * 3) % 7); px < x + topW - 4; px += 11) {
      ctx.fillRect(px, py, Math.min(5, x + topW - px - 3), 0.5);
    }
  }
  ctx.globalAlpha = 1;

  // Front face: panelled walnut with a lit top lip and a dark base.
  const fy = y + topH;
  ctx.fillStyle = PUB.barFront;
  ctx.fillRect(x + 1, fy, c.w - 2, front);
  ctx.fillStyle = PUB.barFrontLit;
  ctx.fillRect(x + 1, fy, c.w - 2, 1);
  ctx.fillStyle = PUB.barFrontDark;
  for (let px = x + 4; px < x + c.w - 3; px += 8) ctx.fillRect(px, fy + 1, 0.5, front - 2);
  ctx.fillRect(x + 1, fy + front - 1, c.w - 2, 1);
  // Brass foot rail along the lip.
  ctx.fillStyle = PUB.brass;
  ctx.fillRect(x + 2, fy + front - 1.5, c.w - 4, 0.5);

  // Side face on the stem.
  if (side) {
    ctx.fillStyle = PUB.barFrontDark;
    ctx.fillRect(x + topW, y + 1, side, c.h - 1);
    ctx.fillStyle = PUB.barFront;
    ctx.fillRect(x + topW, y + 1, 1, topH);
  }

  for (const prop of DECOR.barProps) {
    if (prop.seg !== bar) continue;
    drawBarProp(prop, camX, camY);
  }
  if (bar.station === 'taps') drawTapRow(x, y, topW);
  if (bar.station === 'shelf') drawBottleRows(x, y, topW, topH);
  if (bar.station === 'hatch') drawKitchenHatch(x, y, topW);
  drawStationTag(bar, x, y);
}

// A row of brass tap handles along the back edge of the taps counter.
function drawTapRow(x, y, topW) {
  // Brass fonts seen from above: a round base plate, a short body and the
  // handle pointing toward the customer side; a drip tray in front.
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(x + 8, y + 9, topW - 16, 3);
  ctx.fillStyle = '#4a4642';
  ctx.fillRect(x + 8.5, y + 9.5, topW - 17, 2);
  for (let px = x + 12; px < x + topW - 12; px += 9) {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(px - 2.5, y + 3, 6, 6);
    ctx.fillStyle = PUB.brassDark || '#7d521a';
    ctx.fillRect(px - 2, y + 3.5, 5, 5);
    ctx.fillStyle = PUB.brass;
    ctx.fillRect(px - 1.5, y + 4, 3, 3);
    ctx.fillStyle = '#f6d688';
    ctx.fillRect(px - 1, y + 4, 1, 1);
    // Handle: a coloured knob on a short stem toward the front.
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(px - 0.5, y + 6.5, 1.5, 3);
    ctx.fillStyle = [PUB.burgundy, PUB.bottleGreen, PUB.ink][((px / 9) | 0) % 3];
    ctx.fillRect(px - 1, y + 8, 2.5, 2);
  }
}

// The back-bar as an island gantry down the middle of the stem: two shelves
// of lit bottles under a brass rail, hanging glasses along the top. This is
// the reference's glowing bottle wall, moved onto the counter so the bar
// stays free-standing.
// Bottles standing on the stem counter, seen from above: a cap disc on a
// short body, in two staggered rows, with a few glasses and an ice bucket.
// The concept keeps the bar's glass where the light catches it, and from
// this camera that is the counter top, not a gantry.
function drawBottleRows(x, y, topW, topH) {
  const colours = [PUB.bottleAmber, PUB.bottleGreen, PUB.tomato, PUB.bottleClear, PUB.amber, PUB.burgundy, '#5a2e6a'];
  let i = 0;
  for (let py = y + 6; py < y + topH - 8; py += 6, i++) {
    for (let col = 0; col < 2; col++) {
      const px = x + 5 + col * 9 + ((i & 1) ? 2 : 0);
      const c = colours[(i * 3 + col * 5) % colours.length];
      ctx.fillStyle = PUB.ink;
      ctx.fillRect(px - 0.5, py - 0.5, 4, 5);
      ctx.fillStyle = c;
      ctx.fillRect(px, py, 3, 4);
      ctx.fillStyle = '#fff2c8';
      ctx.fillRect(px, py, 1, 1.5);                       // shoulder catchlight
      ctx.fillStyle = PUB.ink;
      ctx.fillRect(px + 1, py + 0.5, 1, 1);               // cap
    }
    if (i % 4 === 3) {
      // A glass: a pale ring.
      ctx.fillStyle = PUB.glass;
      ctx.fillRect(x + topW - 7, py, 3, 3);
      ctx.fillStyle = PUB.barTop;
      ctx.fillRect(x + topW - 6, py + 1, 1, 1);
    }
  }
  // Ice bucket near the far end.
  const bx = x + Math.round(topW / 2) - 3, by = y + topH - 9;
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(bx - 0.5, by - 0.5, 7, 7);
  ctx.fillStyle = '#8a8f93';
  ctx.fillRect(bx, by, 6, 6);
  ctx.fillStyle = '#e6f2f6';
  ctx.fillRect(bx + 1, by + 1, 4, 4);
  ctx.fillStyle = PUB.bottleGreen;
  ctx.fillRect(bx + 2, by + 1.5, 1.5, 2.5);
}

// The kitchen hatch: a warm serving window with plates under a heat lamp.
function drawKitchenHatch(x, y, topW) {
  // From above the hatch is a brass heat-lamp bar along the back edge with
  // plates waiting under it: round plates, food on them, a chopping board.
  const hx = x + Math.round(topW / 2) - 16;
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(hx - 1, y + 1.5, 34, 2.5);
  ctx.fillStyle = PUB.brass;
  ctx.fillRect(hx, y + 2, 32, 1.5);
  ctx.fillStyle = '#ffd27a';
  for (let px = hx + 3; px < hx + 30; px += 7) ctx.fillRect(px, y + 2, 2, 1.5);
  for (let px = hx + 2; px < hx + 30; px += 8) {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(px - 0.5, y + 5.5, 6, 6);
    ctx.fillStyle = '#e9e2d0';
    ctx.fillRect(px, y + 6, 5, 5);
    ctx.fillStyle = '#c9c2b0';
    ctx.fillRect(px + 0.5, y + 6.5, 4, 4);
    ctx.fillStyle = [PUB.bottleAmber, '#5a8a3a', PUB.tomato, '#a9622f'][((px / 8) | 0) % 4];
    ctx.fillRect(px + 1.5, y + 7.5, 2, 2);
  }
  ctx.fillStyle = PUB.barFrontDark;                        // chopping board
  ctx.fillRect(hx + 34, y + 5, 8, 6);
  ctx.fillStyle = PUB.tableTopLit;
  ctx.fillRect(hx + 34.5, y + 5.5, 7, 5);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = 'rgb(255,200,110)';
  ctx.fillRect(hx - 3, y + 1, 46, 12);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

// A small parchment tag on the counter naming the station, so the player can
// read the bar's map from across the room.
// A small brass plaque with the station name on the counter's front lip:
// enough to teach the map, quiet enough not to be furniture.
// Where a counter's plaque sits, in world units. Left end of a horizontal
// counter, top end of the stem: away from the stools and the props. Shared
// with the waiting-count badge (render/guidance.js).
const STATION_SWATCH_W = 3;
function stationTagRect(bar) {
  const station = BAR_STATIONS[bar.station];
  const c = bar.collider;
  const w = fontTextWidth(station.label) + 4 + STATION_SWATCH_W + 1;
  const h = FONT_H + 2;
  const horizontal = c.w >= c.h;
  const x = horizontal ? c.x + 3 : c.x + Math.round(c.w / 2 - w / 2);
  const y = horizontal ? c.y + Math.round((c.h - 4) / 2 - h / 2) + 1 : c.y + 3;
  return { x, y, w, h };
}

function drawStationTag(bar, x, y) {
  const station = BAR_STATIONS[bar.station];
  if (!station) return;
  const r = stationTagRect(bar);
  const tx = x + (r.x - bar.collider.x);
  const ty = y + (r.y - bar.collider.y);
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(tx - 0.5, ty - 0.5, r.w + 1, r.h + 1);
  ctx.fillStyle = PUB.brassDark || '#7d521a';
  ctx.fillRect(tx, ty, r.w, r.h);
  ctx.fillStyle = PUB.brass;
  ctx.fillRect(tx + 0.5, ty + 0.5, r.w - 1, 0.5);
  // The station's colour, as a little enamel chip before its name.
  ctx.fillStyle = station.color;
  ctx.fillRect(tx + 1.5, ty + 1.5, STATION_SWATCH_W, r.h - 3);
  fontDrawText(ctx, station.label, tx + 2 + STATION_SWATCH_W + 1, ty + 1, PUB.cream);
}

function drawCounterPlant(x, y) {
  ctx.fillStyle = PUB.tableShadow;
  ctx.fillRect(x - 2, y + 1, 5, 2);
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(x - 2, y - 1, 5, 3);
  ctx.fillStyle = PUB.barTop;
  ctx.fillRect(x - 1.5, y - 0.5, 4, 2);
  ctx.fillStyle = PUB.green;
  ctx.fillRect(x, y - 6, 0.5, 5.5);
  ctx.fillRect(x - 3, y - 5, 3, 1.5);
  ctx.fillRect(x + 0.5, y - 4.5, 3, 1.5);
  ctx.fillRect(x - 2, y - 7, 2.5, 2);
  ctx.fillRect(x + 0.5, y - 7.5, 2.5, 2);
  ctx.fillStyle = PUB.greenLit;
  ctx.fillRect(x - 2.5, y - 5, 1, 0.5);
  ctx.fillRect(x + 1, y - 7, 1, 0.5);
}

function drawBarProp(prop, camX, camY) {
  const x = Math.round(prop.x - camX);
  const y = Math.round(prop.y - camY);
  if (prop.kind === 'bottle') {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x - 0.5, y - 6.5, 3, 6.5);
    ctx.fillStyle = (prop.x & 1) ? PUB.bottleGreen : PUB.bottleAmber;
    ctx.fillRect(x, y - 5.5, 2, 5);
    ctx.fillStyle = PUB.glass;
    ctx.globalAlpha = 0.75;
    ctx.fillRect(x, y - 5, 0.5, 3);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PUB.paper;
    ctx.fillRect(x, y - 3.5, 2, 1);
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x + 0.5, y - 7.5, 1, 2);
  } else if (prop.kind === 'glass') {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x - 0.5, y - 4.5, 3, 4.5);
    ctx.fillStyle = PUB.bottleClear;
    ctx.fillRect(x, y - 4, 2, 3.5);
    ctx.fillStyle = PUB.amber;
    ctx.fillRect(x, y - 2, 2, 1.5);
    ctx.fillStyle = PUB.cream;
    ctx.fillRect(x, y - 4, 0.5, 2);
  } else {
    ctx.fillStyle = PUB.brass;
    ctx.fillRect(x, y - 5, 1.5, 5);
    ctx.fillRect(x + 1.5, y - 5, 2.5, 0.5);
    ctx.fillStyle = PUB.barTopHi;
    ctx.fillRect(x + 0.5, y - 5, 0.5, 3.5);
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x - 0.5, y - 1, 2.5, 1);
  }
}

// One chair per seat point (CHAIRS), so the chairs can never drift away from
// where getTableSeats actually puts people. Shared by tables and stool rows.
function drawChair(seat, camX, camY) {
  const table = seat.table;
  const i = seat.index;
  const centerX = Math.round((seat.x - camX) * 2) / 2;
  const centerY = Math.round((seat.y - camY) * 2) / 2;
  const alternate = (Math.round(table.x + table.y) + i * 3) % 7 < 2;
  const base = alternate ? PUB.chairAlt : PUB.chair;
  const lit = alternate ? PUB.chairAltLit : PUB.chairLit;
  const w = 8;
  const cx = centerX - w / 2;
  const seatY = centerY - 2;          // cushion
  // Shadow and legs.
  ctx.fillStyle = PUB.tableShadow;
  ctx.fillRect(cx + 1, seatY + 4, w, 2.5);
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(cx + 0.5, seatY + 3, 1, 3.5);
  ctx.fillRect(cx + w - 1.5, seatY + 3, 1, 3.5);
  // Back rail: away from the table. North chairs show it behind the
  // cushion, south chairs in front (it will sit over the sitter's legs, as
  // it should), side chairs to the outside.
  const backOnTop = seat.side === 'n';
  const backBottom = seat.side === 's';
  if (backOnTop) {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(cx, seatY - 2.5, w, 3);
    ctx.fillStyle = PUB.tableEdge;
    ctx.fillRect(cx + 0.5, seatY - 2, w - 1, 2);
    ctx.fillStyle = PUB.barTopLit;
    ctx.fillRect(cx + 1, seatY - 2, w - 2, 0.5);
  }
  // Cushion with a lit top edge and tufting.
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(cx, seatY - 0.5, w, 5);
  ctx.fillStyle = base;
  ctx.fillRect(cx + 0.5, seatY, w - 1, 4);
  ctx.fillStyle = lit;
  ctx.fillRect(cx + 1, seatY, w - 2, 1);
  ctx.fillRect(cx + 2.5, seatY + 2, 0.5, 0.5);
  ctx.fillRect(cx + 5, seatY + 2, 0.5, 0.5);
  ctx.fillStyle = PUB.barFrontDark;
  ctx.fillRect(cx + 0.5, seatY + 3.5, w - 1, 0.5);
  if (backBottom) {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(cx, seatY + 3.5, w, 3);
    ctx.fillStyle = PUB.tableEdge;
    ctx.fillRect(cx + 0.5, seatY + 4, w - 1, 2);
    ctx.fillStyle = PUB.barTopLit;
    ctx.fillRect(cx + 1, seatY + 4, w - 2, 0.5);
  } else if (seat.side === 'w' || seat.side === 'e') {
    const bx = seat.side === 'e' ? cx + w - 1.5 : cx;
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(bx - 0.5, seatY - 1.5, 2.5, 6.5);
    ctx.fillStyle = PUB.tableEdge;
    ctx.fillRect(bx, seatY - 1, 1.5, 5.5);
    ctx.fillStyle = PUB.barTopLit;
    ctx.fillRect(bx, seatY - 1, 1.5, 0.5);
  }
}

// A bench is seating with no tabletop, unlike drawTable: either one long
// wall seat, or a row of bare stools at the bar.
function drawBench(bench, camX, camY) {
  if (bench.seatStyle !== 'bench') return; // a stool row: its stools are CHAIRS
  // A wall bench reads as one long seat, not a row of separate chairs.
  const x = Math.round(bench.x - bench.w / 2 - camX);
  const y = Math.round(bench.y - bench.h / 2 - camY);
  ctx.fillStyle = PUB.tableShadow;
  ctx.fillRect(x + 1.5, y + bench.h, bench.w, 2.5);
  ctx.fillStyle = PUB.ink;
  ctx.fillRect(x + 0.5, y, bench.w - 1, bench.h);
  ctx.fillRect(x, y + 0.5, bench.w, bench.h - 1);
  ctx.fillStyle = PUB.chair;
  ctx.fillRect(x + 1, y + 1, bench.w - 2, bench.h - 2);
  ctx.fillStyle = PUB.chairLit;
  ctx.fillRect(x + 1.5, y + 1, bench.w - 3, 0.5);
  ctx.fillRect(x + 1, y + 1.5, 0.5, bench.h - 3);
  // A padded back along the wall side, buttoned, so it reads as a booth.
  if (bench.w > bench.h) {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x, y - 2.5, bench.w, 3);
    ctx.fillStyle = PUB.chair;
    ctx.fillRect(x + 0.5, y - 2, bench.w - 1, 2);
    ctx.fillStyle = PUB.chairLit;
    ctx.fillRect(x + 1, y - 2, bench.w - 2, 0.5);
    ctx.fillStyle = PUB.tableEdge;
    for (let px = x + 4; px < x + bench.w - 3; px += 6) ctx.fillRect(px, y - 1, 1, 0.5);
  }
  ctx.fillStyle = PUB.tableEdge;
  ctx.fillRect(x + 1, y + bench.h - 2, bench.w - 2, 1.5);
  for (let px = x + 4; px < x + bench.w - 3; px += 8) {
    ctx.fillRect(px, y + Math.floor(bench.h / 2), 1, 1);
    ctx.fillStyle = PUB.chairLit;
    ctx.fillRect(px + 0.5, y + Math.floor(bench.h / 2), 0.5, 0.5);
    ctx.fillStyle = PUB.tableEdge;
  }
  ctx.fillStyle = PUB.barFrontDark;
  for (let px = x + 7; px < x + bench.w - 4; px += 12) {
    ctx.fillRect(px, y + 1, 0.5, bench.h - 3);
  }
}

// A table: contact shadow, dark edge, lit top, a highlight along the back
// edge, and whatever was left on it.
function drawTable(table, camX, camY) {
  const sx = Math.round(table.x - camX);
  const sy = Math.round(table.y - camY);
  const halfW = Math.round(table.w / 2);
  const halfH = Math.round(table.h / 2);

  ctx.fillStyle = PUB.tableShadow;
  ctx.fillRect(sx - halfW + 2, sy + halfH + 1, table.w, 3);

  const x = sx - halfW;
  const y = sy - halfH;
  // High overhead: the top dominates; a shallow front lip is the depth cue.
  const front = 3;
  ctx.fillStyle = PUB.tableEdge;
  ctx.fillRect(x + 1, y, table.w - 2, table.h);
  ctx.fillRect(x, y + 1, table.w, table.h - 2);
  ctx.fillStyle = PUB.barFront;
  ctx.fillRect(x + 1, y + table.h - front, table.w - 2, front - 1);
  ctx.fillStyle = PUB.barFrontLit;
  ctx.fillRect(x + 1, y + table.h - front, table.w - 2, 1);
  ctx.fillStyle = PUB.barFrontDark;
  ctx.fillRect(x + 1, y + table.h - 1, table.w - 2, 1);

  ctx.fillStyle = PUB.tableTop;
  ctx.fillRect(x + 1, y + 1, table.w - 2, table.h - front - 1);
  ctx.fillStyle = PUB.tableTopLit;
  ctx.fillRect(x + 1.5, y + 1.5, table.w - 3, table.h - front - 2);
  ctx.fillStyle = PUB.tableTopHi;
  ctx.fillRect(x + 2, y + 1.5, table.w - 4, 0.5);
  ctx.fillRect(x + 1.5, y + 2, 0.5, table.h - front - 3);
  // Narrow boards and fine grain across the tabletop.
  for (let gy = y + 5; gy < y + table.h - front - 1; gy += 4.5) {
    ctx.fillStyle = PUB.tableTop;
    ctx.fillRect(x + 2, gy, table.w - 4, 0.5);
    ctx.fillStyle = PUB.tableTopHi;
    ctx.globalAlpha = 0.34;
    for (let gx = x + 5 + ((gy * 2) & 3); gx < x + table.w - 4; gx += 13) {
      ctx.fillRect(gx, gy + 1, Math.min(6, x + table.w - gx - 3), 0.5);
    }
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = PUB.barTopHi;
  ctx.fillRect(x + 2, y + table.h - front - 0.5, table.w - 4, 0.5);

  const items = DECOR.clutter.get(table);
  if (items) for (const it of items) drawTableProp(it, sx, sy, camX, camY);
}

function drawTableProp(item, tableSX, tableSY, camX, camY) {
  const x = tableSX + item.ox;
  const y = tableSY + item.oy;
  if (item.kind === 'coaster') {
    ctx.fillStyle = PUB.tableShadow;
    ctx.fillRect(x - 1.5, y + 0.5, 3.5, 1.5);
    ctx.fillStyle = (item.ox & 1) ? PUB.rugRed : PUB.creamDim;
    ctx.fillRect(x - 1.5, y, 3, 1.5);
    ctx.fillStyle = PUB.cream;
    ctx.fillRect(x - 0.5, y, 1, 0.5);
  } else if (item.kind === 'glass') {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x - 1.5, y - 3.5, 3, 4);
    ctx.fillStyle = PUB.bottleClear;
    ctx.fillRect(x - 1, y - 3, 2, 3);
    ctx.fillStyle = PUB.amber;
    ctx.fillRect(x - 1, y - 1.5, 2, 1);
    ctx.fillStyle = PUB.cream;
    ctx.fillRect(x - 1, y - 3, 0.5, 1.5);
  } else if (item.kind === 'mug') {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x - 2, y - 3.5, 3.5, 4);
    ctx.fillRect(x + 1.5, y - 2.5, 1.5, 2.5);
    ctx.fillStyle = PUB.bottleAmber;
    ctx.fillRect(x - 1.5, y - 2.5, 2.5, 2.5);
    ctx.fillStyle = PUB.cream;
    ctx.fillRect(x - 1.5, y - 3, 2.5, 0.5);
    ctx.fillRect(x - 1, y - 2.5, 0.5, 1.5);
  } else if (item.kind === 'candle') {
    ctx.fillStyle = PUB.tableShadow;
    ctx.fillRect(x - 2, y, 4, 1);
    ctx.fillStyle = PUB.creamDim;
    ctx.fillRect(x - 0.5, y - 3, 1.5, 3);
    ctx.fillStyle = PUB.cream;
    ctx.fillRect(x - 0.5, y - 3, 0.5, 2.5);
    ctx.fillStyle = PUB.tomato;
    ctx.fillRect(x, y - 4, 0.5, 1);
    ctx.fillStyle = PUB.amber;
    ctx.fillRect(x - 0.5, y - 4.5, 1.5, 1);
    ctx.fillStyle = PUB.cream;
    ctx.fillRect(x, y - 4.5, 0.5, 0.5);
  } else if (item.kind === 'bottle') {
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x - 1, y - 5, 2.5, 5.5);
    ctx.fillStyle = (item.oy & 1) ? PUB.bottleGreen : PUB.bottleAmber;
    ctx.fillRect(x - 0.5, y - 4, 1.5, 4);
    ctx.fillStyle = PUB.glass;
    ctx.fillRect(x - 0.5, y - 3.5, 0.5, 2);
    ctx.fillStyle = PUB.ink;
    ctx.fillRect(x, y - 6, 0.5, 1.5);
  } else if (item.kind === 'plate') {
    ctx.fillStyle = PUB.tableShadow;
    ctx.fillRect(x - 2.5, y, 5.5, 2);
    ctx.fillStyle = PUB.creamDim;
    ctx.fillRect(x - 2.5, y - 0.5, 5, 1.5);
    ctx.fillStyle = PUB.cream;
    ctx.fillRect(x - 1.5, y - 0.5, 3, 0.5);
    ctx.fillStyle = PUB.greenLit;
    ctx.fillRect(x - 0.5, y, 1, 0.5);
  } else {
    ctx.fillStyle = PUB.tableShadow;
    ctx.fillRect(x - 1.5, y, 5, 3);
    ctx.fillStyle = PUB.paper;
    ctx.fillRect(x - 2, y - 1.5, 5, 3);
    ctx.fillStyle = PUB.cream;
    ctx.fillRect(x - 1.5, y - 1, 4, 0.5);
    ctx.fillStyle = PUB.tomato;
    ctx.fillRect(x - 1, y, 3, 0.5);
  }
}

function drawFurnitureItem(item, camX, camY) {
  if (item.type === 'wall') return; // collision-only — baked into roomCanvas by drawArchitecture
  if (item.type === 'alex') return; // collision-only — Alex himself draws in the y-sorted entity pass
  if (item.type === 'bar') drawBar(item, camX, camY);
  else if (item.type === 'bench') drawBench(item, camX, camY);
  else drawTable(item, camX, camY);
}
