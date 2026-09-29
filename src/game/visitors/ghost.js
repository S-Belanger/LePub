// ---- Ghost: a purely aesthetic apparition. Every few minutes it drifts in
// a straight line across the pub, through walls and furniture alike (no
// collision, no interaction with score/hunter/player), and vanishes off the
// far side. `ghost` is null whenever none is currently on screen.
let ghost = null;
const GHOST_INTERVAL_MIN = 35;
const GHOST_INTERVAL_MAX = 80;
let ghostSpawnTimer = GHOST_INTERVAL_MIN + Math.random() * (GHOST_INTERVAL_MAX - GHOST_INTERVAL_MIN);

function spawnGhost() {
  const y = 20 + Math.random() * (WORLD_H - 40);
  const margin = 24;
  const fromLeft = Math.random() < 0.5;
  ghost = makeEntity('ghost', fromLeft ? -margin : WORLD_W + margin, y);
  ghost.targetX = fromLeft ? WORLD_W + margin : -margin;
  ghost.moving = true;
}

function updateGhost(dt) {
  ghostSpawnTimer -= dt;
  if (!ghost && ghostSpawnTimer <= 0) {
    spawnGhost();
    ghostSpawnTimer = GHOST_INTERVAL_MIN + Math.random() * (GHOST_INTERVAL_MAX - GHOST_INTERVAL_MIN);
  }
  if (ghost) {
    const dir = ghost.targetX > ghost.x ? 1 : -1;
    ghost.x += dir * ghost.speed * dt;
    ghost.flip = dir < 0;
    // Drifting through the hunter gives him a turn: he stops dead for a
    // second, which is the one thing the ghost does to the chase. Once per
    // apparition, so it can't be farmed by standing him in its path.
    if (!ghost.spooked && (hunterState === 'chase' || hunterState === 'scanning') &&
      Math.hypot(ghost.x - hunter.x, ghost.y - hunter.y) < 14) {
      ghost.spooked = true;
      setHunterState('lost', 1.2);
      showHunterAlert('?!', 1.2);
      Sound.play('lost');
      Dialogue.trigger('hunterSpooked', null);
    }
    if ((dir > 0 && ghost.x >= ghost.targetX) || (dir < 0 && ghost.x <= ghost.targetX)) ghost = null;
  }
}
