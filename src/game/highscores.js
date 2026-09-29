// ---- High scores ------------------------------------------------------------
// Kept in localStorage so a table survives a page reload. Every read and
// write is wrapped, because localStorage can throw outright (private
// browsing, storage disabled) — losing the list isn't worth a crash over.
const HIGH_SCORE_KEY = 'lepub_highscores';
const HIGH_SCORE_MAX = 5;

function loadHighScores() {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    const scores = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(scores)) return [];
    // Normalize entries saved before names were tracked (plain numbers) so an
    // older list can't break the table.
    return scores
      .map(s => (typeof s === 'number' ? { name: '???', score: s } : s))
      .filter(s => s && typeof s.score === 'number');
  } catch {
    return [];
  }
}

function saveHighScore(name, value) {
  if (value <= 0) return;
  const scores = loadHighScores();
  scores.push({ name: name || '???', score: value });
  scores.sort((a, b) => b.score - a.score);
  scores.length = Math.min(scores.length, HIGH_SCORE_MAX);
  try {
    localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(scores));
  } catch {
    // ignore — storage unavailable
  }
}

// While true, the caught screen asks for a name instead of offering the
// restart prompt. Gameplay is already frozen by `caught`, so this just borrows
// the keyboard until the run's score has been filed under something.
let enteringName = false;
let nameInput = '';
const NAME_MAX_LEN = 12;

// A keyboard types straight into the canvas field. A touch device has no
// keyboard to borrow, so it gets a real DOM text field (#name-entry) that can
// bring up the phone's own keyboard; see syncCaughtDom.
function usesTouch() { return document.body.classList.contains('touch'); }

// Letters, digits and a little punctuation, uppercased: what the pixel font
// can draw, whichever way the name arrived.
function cleanName(text) {
  return String(text).toUpperCase().replace(/[^A-Z0-9 '_-]/g, '').slice(0, NAME_MAX_LEN);
}

function beginNameEntry() {
  nameInput = '';
  enteringName = score > 0;
}

function finishNameEntry(save) {
  if (!enteringName) return;
  if (save) saveHighScore(nameInput.trim() || 'ANONYMOUS', score);
  enteringName = false;
  syncCaughtDom();
}
