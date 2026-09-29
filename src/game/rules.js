// ---- House Rules booklet ----------------------------------------------------
// The pause panel's HOW TO PLAY: eight short illustrated pages in the DOM.
// Pictures are the game's own art, not screenshots: any <canvas class="art">
// with data-sprite/data-anim is drawn from that family's atlas, and one with
// data-icon from the order icon of that name, so the booklet can never show
// a drink or a face the game doesn't. A tab strip, prev/next, arrow keys and
// a horizontal swipe all turn pages.
const rulesEl = {
  toggle: document.getElementById('btn-rules'),
  section: document.getElementById('rules'),
  tabs: Array.from(document.querySelectorAll('.rules-tabs [data-page]')),
  pages: Array.from(document.querySelectorAll('.rule-page')),
  card: document.querySelector('.rules-card'),
  prev: document.getElementById('rules-prev'),
  next: document.getElementById('rules-next'),
  count: document.getElementById('rules-count'),
  hints: document.getElementById('btn-hints'),
};
let rulesPage = 0;

function rulesOpen() { return !!rulesEl.section && !rulesEl.section.hidden; }

function showRulesPage(n) {
  const total = rulesEl.pages.length;
  rulesPage = (n + total) % total;
  rulesEl.pages.forEach((page, i) => { page.hidden = i !== rulesPage; });
  rulesEl.tabs.forEach((tab, i) => {
    tab.setAttribute('aria-selected', i === rulesPage ? 'true' : 'false');
    tab.classList.toggle('active', i === rulesPage);
  });
  rulesEl.count.textContent = (rulesPage + 1) + ' / ' + total;
  paintArt(rulesEl.pages[rulesPage]);
}

function setRulesOpen(open) {
  rulesEl.section.hidden = !open;
  rulesEl.toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  rulesEl.toggle.textContent = open ? 'CLOSE RULES' : 'HOW TO PLAY';
  if (open) {
    showRulesPage(rulesPage);
    rulesEl.section.scrollIntoView({ block: 'nearest' });
  }
}

function syncHintsButton() {
  rulesEl.hints.textContent = 'TIP CARDS: ' + (hintsEnabled ? 'ON' : 'OFF');
  rulesEl.hints.setAttribute('aria-pressed', hintsEnabled ? 'true' : 'false');
}

// ---- Art ---------------------------------------------------------------------
// Draws one art canvas; returns false while its atlas is still loading.
function paintArtCanvas(cv) {
  if (cv.dataset.painted) return true;
  let source = null;
  let rect = null;
  if (cv.dataset.icon) {
    const icon = ORDER_ICONS[cv.dataset.icon];
    if (!icon) return true;
    source = bakedSprite(icon.sprite, icon.palette, false);
    rect = { x: 0, y: 0, width: source.width, height: source.height };
  } else if (cv.dataset.sprite) {
    const frame = Assets.frameFor(cv.dataset.sprite, cv.dataset.anim || 'idle.down', 0);
    if (!frame) return false;
    source = frame.image;
    rect = frame.rect;
  }
  if (!source) return true;
  cv.width = rect.width;
  cv.height = rect.height;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = !cv.dataset.icon;   // painted art smooth, pixel icons crisp
  g.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
  cv.dataset.painted = '1';
  cv.classList.add(cv.dataset.icon ? 'pixel' : 'painted');
  return true;
}

let artRetry = null;
function paintArt(root) {
  let pending = false;
  for (const cv of root.querySelectorAll('canvas.art')) if (!paintArtCanvas(cv)) pending = true;
  // Atlases decode asynchronously; try again shortly rather than leaving a hole.
  if (pending && !artRetry) {
    artRetry = setTimeout(() => { artRetry = null; paintArt(root); }, 350);
  }
}

// ---- Wiring --------------------------------------------------------------------
if (rulesEl.section) {
  rulesEl.toggle.addEventListener('click', () => setRulesOpen(!rulesOpen()));
  rulesEl.tabs.forEach((tab, i) => tab.addEventListener('click', () => showRulesPage(i)));
  rulesEl.prev.addEventListener('click', () => showRulesPage(rulesPage - 1));
  rulesEl.next.addEventListener('click', () => showRulesPage(rulesPage + 1));
  rulesEl.hints.addEventListener('click', () => { setHintsEnabled(!hintsEnabled); syncHintsButton(); });

  // Swipe between pages on a phone.
  let swipeX = null;
  rulesEl.card.addEventListener('pointerdown', (e) => { swipeX = e.clientX; });
  rulesEl.card.addEventListener('pointerup', (e) => {
    if (swipeX == null) return;
    const dx = e.clientX - swipeX;
    swipeX = null;
    if (Math.abs(dx) > 40) showRulesPage(rulesPage + (dx < 0 ? 1 : -1));
  });
  rulesEl.card.addEventListener('pointercancel', () => { swipeX = null; });

  // Arrow keys turn pages while the booklet is open on the pause panel.
  window.addEventListener('keydown', (e) => {
    if (!paused || !rulesOpen()) return;
    if (e.key === 'ArrowRight') { showRulesPage(rulesPage + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { showRulesPage(rulesPage - 1); e.preventDefault(); }
  });

  syncHintsButton();
  paintArt(el.overlay);
}
