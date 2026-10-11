// Keyboard and analog movement math, with caller-owned held state. Pointer
// capture, layout reads and action buttons stay in the page's event layer.
(function (root) {
  'use strict';
  function create({ keys, touchMove }) {
    function normalizeKey(key) { return key.toLowerCase(); }
    function vector() {
      // Analog input wins on hybrid devices, including partial thumb tilts.
      if (touchMove.x !== 0 || touchMove.y !== 0) return { x: touchMove.x, y: touchMove.y };
      let x = 0, y = 0;
      if (keys.has('arrowleft') || keys.has('a')) x--;
      if (keys.has('arrowright') || keys.has('d')) x++;
      if (keys.has('arrowup') || keys.has('w')) y--;
      if (keys.has('arrowdown') || keys.has('s')) y++;
      if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      return { x, y };
    }
    function stick(clientX, clientY, origin, radius = 46, deadzone = 8) {
      const dx = clientX - origin.x, dy = clientY - origin.y;
      const distance = Math.hypot(dx, dy);
      if (distance < deadzone || distance === 0) {
        return { x: 0, y: 0, knobX: Math.round(dx), knobY: Math.round(dy) };
      }
      const travel = Math.min(distance, radius);
      const nx = dx / distance, ny = dy / distance;
      const strength = travel / radius;
      return { x: nx * strength, y: ny * strength,
        knobX: Math.round(nx * travel), knobY: Math.round(ny * travel) };
    }
    function clear(releasePointer) {
      keys.clear(); touchMove.x = 0; touchMove.y = 0;
      if (releasePointer) releasePointer();
    }
    return { normalizeKey, vector, stick, clear };
  }
  root.Input = { create };
})(globalThis);
