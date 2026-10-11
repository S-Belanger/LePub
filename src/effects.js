// Haze is composited over the scene before bubbles/HUD. Dependencies are
// supplied by the game, so this module never reads game state or the DOM.
(function (root) {
  'use strict';
  function createHazeRenderer({ canvas, context: ctx, artScale, createCanvas,
    getView, getReducedMotion, now, maxStrips = 64 }) {
    let backing = null, g = null, gradient = null;
    let gradientWidth = 0, gradientHeight = 0, gradientTop = -1;
    // A hard bounded budget survives tall screens and future viewport changes.
    const budget = Math.max(1, Math.min(64, Math.floor(maxStrips)));
    const half = value => Math.round(value * 2) / 2;
    function draw(intensity) {
      if (intensity <= 0.01) return;
      const k = Math.min(1, intensity);
      const { width, height, top = 0 } = getView();
      const sceneHeight = height - top;
      if (width <= 0 || sceneHeight <= 0) return;
      if (!backing) { backing = createCanvas(); g = backing.getContext('2d'); }
      const sw = Math.round(width * artScale), sh = Math.round(sceneHeight * artScale);
      if (backing.width !== sw || backing.height !== sh) {
        backing.width = sw; backing.height = sh;
      }
      if (gradientWidth !== width || gradientHeight !== height || gradientTop !== top) {
        gradientWidth = width; gradientHeight = height; gradientTop = top;
        // Match the full-viewport vignette's original center and falloff.
        gradient = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.3,
          width / 2, height / 2, Math.max(width, height) * 0.7);
        gradient.addColorStop(0, 'rgba(60,80,30,0)');
        gradient.addColorStop(1, 'rgba(60,80,30,0.8)');
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, sw, sh);
      g.drawImage(canvas, 0, Math.round(top * artScale), sw, sh, 0, 0, sw, sh);
      const calm = getReducedMotion();
      const t = calm ? 0 : now() / 1000;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, top, width, sceneHeight); ctx.clip();
      if (!calm) {
        // Keep the old sine/half-unit motion while grouping a bounded number
        // of taller bands. Adjacent identical offsets become one submission.
        const step = Math.max(2, Math.ceil(sceneHeight / budget * 2) / 2);
        let runStart = top, previous = null;
        for (let y = top; y < height; y += step) {
          const dx = half(Math.sin(y * 0.12 + t * 3) * 1.5 * k);
          if (previous !== null && dx !== previous) {
            strip(runStart, y, previous); runStart = y;
          }
          previous = dx;
        }
        strip(runStart, height, previous);
      }
      const off = half((1 + 2.5 * k) * (calm ? 1 : 0.7 + 0.3 * Math.sin(t * 2.3)));
      const bob = calm ? 0 : half(Math.sin(t * 1.7) * k);
      ctx.globalAlpha = 0.33 * k;
      ctx.drawImage(backing, 0, 0, sw, sh, -off, top + bob, width, sceneHeight);
      ctx.drawImage(backing, 0, 0, sw, sh, off, top - bob, width, sceneHeight);
      ctx.globalAlpha = 0.17 * k * (calm ? 1 : 0.85 + 0.15 * Math.sin(t * 2));
      ctx.fillStyle = '#8fa23a'; ctx.fillRect(0, top, width, sceneHeight);
      ctx.globalAlpha = 0.5 * k;
      ctx.fillStyle = gradient; ctx.fillRect(0, top, width, sceneHeight);
      ctx.restore();
      function strip(y, end, dx) {
        const h = end - y;
        ctx.drawImage(backing, 0, (y - top) * artScale, sw, h * artScale, dx, y, width, h);
      }
    }
    function reset() {
      gradientWidth = 0; gradientHeight = 0; gradientTop = -1; gradient = null;
      if (g) g.clearRect(0, 0, backing.width, backing.height);
    }
    return { draw, reset };
  }
  root.Effects = { createHazeRenderer };
})(globalThis);
