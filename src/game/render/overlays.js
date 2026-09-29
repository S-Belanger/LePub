// Cover-fits a splash image into the internal resolution and drops a tint
// over it so the board on top stays the brightest thing on screen.
function drawSplashImage(img, tint) {
  if (img.complete && img.naturalWidth > 0) {
    const scale = Math.max(viewW / img.naturalWidth, viewH / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, (viewW - dw) / 2, (viewH - dh) / 2, dw, dh);
    ctx.fillStyle = tint;
  } else {
    ctx.fillStyle = 'rgba(10,6,4,0.8)';
  }
  ctx.fillRect(0, 0, viewW, viewH);
}

function drawCenteredText(text, y, color, scale, shadow) {
  const s = scale || 1;
  fontDrawTextShadow(ctx, text, Math.round((viewW - fontTextWidth(text) * s) / 2), y, color, shadow || UI.ink, s);
}

const BOARD_ROW_H = 8;
const BOARD_TITLE_SCALE = 3;

function drawCaughtOverlay() {
  drawSplashImage(caughtImage, 'rgba(12,6,4,0.5)');

  // The newest line, not the oldest: the reaction to being caught is the one
  // worth showing, even if an earlier bubble is still on its way out. It goes
  // on a parchment note pinned under the ledger.
  const active = Dialogue.getActive();
  const reaction = active.length ? active[active.length - 1] : null;
  const speaker = reaction ? regularById.get(reaction.who) : null;
  const boardW = clamp(Math.min(viewW - 8, 210), 120, viewW - 8);
  const innerW = boardW - 12;
  const quipRows = reaction
    ? fontWrapText((speaker ? speaker.name + ': ' : '') + reaction.text.toUpperCase(), innerW - 6)
    : null;

  // Below the score line the board shows one of two things: the name field
  // while a score is being filed, or the ledger it was filed into. Both are
  // built as rows first so the board can be sized to fit them.
  const rows = [];
  if (enteringName) {
    const cursor = Math.floor(performance.now() / 400) % 2 === 0 ? '_' : ' ';
    rows.push({ text: 'NEW BEST - SIGN THE LEDGER', color: PUB.amber });
    rows.push({ text: nameInput.toUpperCase() + cursor, color: UI.ink, field: true });
    rows.push({ text: usesTouch() ? 'TYPE BELOW, THEN SIGN' : 'ENTER TO CONFIRM   ESC TO SKIP', color: PUB.creamDim });
  } else {
    rows.push({ text: usesTouch() ? 'TAP RESTART FOR ANOTHER SHIFT' : 'PRESS SPACE FOR ANOTHER SHIFT', color: PUB.amber });
    const highScores = loadHighScores();
    if (highScores.length) {
      rows.push({ text: 'BEST TIPS', color: PUB.creamDim, rule: true });
      for (let i = 0; i < highScores.length; i++) {
        rows.push({
          text: (i + 1) + '. ' + String(highScores[i].name).toUpperCase() + '  ' + highScores[i].score,
          color: PUB.cream,
        });
      }
    }
  }

  const titleH = FONT_H * BOARD_TITLE_SCALE;
  const quipH = quipRows ? quipRows.length * (FONT_H + 2) + 4 + 4 : 0;
  const boardH = 6 + titleH + 4 + 2 + 4 + FONT_H + 5 + rows.length * BOARD_ROW_H + quipH + 4;
  const bx = Math.round((viewW - boardW) / 2);
  const by = Math.round(clamp(viewH / 2 - boardH / 2, 2, Math.max(2, viewH - boardH - 2)));
  drawWalnutPlate(bx, by, boardW, boardH, { rail: true });

  let y = by + 6;
  drawCenteredText('CHARBONNEAU!', y, PUB.tomato, BOARD_TITLE_SCALE);
  y += titleH + 4;
  drawBrassRule(bx + 6, y, boardW - 12);
  y += 2 + 4;
  drawCenteredText('SHIFT ' + getLevel() + '   TIPS ' + score, y, PUB.cream);
  y += FONT_H + 5;

  for (const row of rows) {
    if (row.field) {
      // The name field is a parchment strip on the board; ink on paper reads
      // as writing in the ledger rather than typing into a form.
      const fw = Math.min(innerW, Math.max(fontTextWidth(row.text) + 12, 70));
      const fx = Math.round((viewW - fw) / 2);
      drawParchmentPlate(fx, y - 2, fw, FONT_H + 4, UI.brassDark);
      fontDrawText(ctx, row.text, Math.round((viewW - fontTextWidth(row.text)) / 2), y, row.color);
    } else {
      if (row.rule) {
        const tw = fontTextWidth(row.text);
        const rx = Math.round((viewW - tw) / 2);
        const flank = Math.max(0, Math.floor((innerW - tw - 8) / 2));
        if (flank > 3) {
          drawBrassRule(rx - 4 - flank, y + 2, flank);
          drawBrassRule(rx + tw + 4, y + 2, flank);
        }
      }
      drawCenteredText(row.text, y, row.color);
    }
    y += BOARD_ROW_H;
  }

  if (quipRows) {
    const qw = innerW;
    const qx = Math.round((viewW - qw) / 2);
    const qh = quipRows.length * (FONT_H + 2) + 4;
    drawParchmentPlate(qx, y + 2, qw, qh, speaker ? speaker.cfg.accent : UI.brassDark);
    for (let k = 0; k < quipRows.length; k++) {
      fontDrawText(ctx, quipRows[k], Math.round((viewW - fontTextWidth(quipRows[k])) / 2),
        y + 2 + 2 + k * (FONT_H + 2), UI.ink);
    }
  }
}

// The end-of-shift tally: what the shift paid, what it cost, and a prompt
// for the next one. This is the run's natural pause, so it waits for a press.
function drawShiftTallyOverlay() {
  const t = shiftTally;
  drawSplashImage(levelDoneImageFor(t.shift), 'rgba(7,12,18,0.34)');
  const st = t.stats;
  const title = 'SHIFT ' + t.shift + (t.madeTarget ? ' DONE' : ' OVER');
  const rows = [
    { text: 'TIPS ' + t.tips + ' OF ' + t.target + '   TOTAL ' + t.total, color: PUB.amber },
    { text: 'SERVED ' + st.deliveries + '   FORGOTTEN ' + st.forgotten, color: PUB.cream },
    { text: 'CLUTCH ' + st.clutch + '   DOUBLES ' + st.doubles + '   ROUNDS ' + st.rounds, color: PUB.cream },
    { text: 'HITS TAKEN ' + st.hits + '   BEST SHIFT ' + bestShiftTips, color: PUB.creamDim },
    { text: usesTouch() ? 'TAP FOR SHIFT ' + (t.shift + 1) : 'SPACE FOR SHIFT ' + (t.shift + 1), color: PUB.amber, gap: 3 },
  ];
  const titleScale = 2;
  let boardW = fontTextWidth(title) * titleScale;
  for (const row of rows) boardW = Math.max(boardW, fontTextWidth(row.text));
  boardW = clamp(boardW + 20, 100, viewW - 8);
  let boardH = 6 + FONT_H * titleScale + 4 + 2 + 4 + 6;
  for (const row of rows) boardH += BOARD_ROW_H + (row.gap || 0);
  const bx = Math.round((viewW - boardW) / 2);
  const by = Math.round(clamp(viewH / 2 - boardH / 2, 2, Math.max(2, viewH - boardH - 2)));
  drawWalnutPlate(bx, by, boardW, boardH, { rail: true });
  let y = by + 6;
  drawCenteredText(title, y, t.madeTarget ? PUB.cream : PUB.tomato, titleScale);
  y += FONT_H * titleScale + 4;
  drawBrassRule(bx + 6, y, boardW - 12);
  y += 2 + 4;
  for (const row of rows) {
    y += row.gap || 0;
    drawCenteredText(row.text, y, row.color);
    y += BOARD_ROW_H;
  }
}
