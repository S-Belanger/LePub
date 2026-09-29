// Runs every check the project has, in the order CI does:
//   1. syntax: `node --check` on every script index.html loads, plus tools/tests
//   2. the character-art contract, the asset registry, the smoke run, Alex
// Usage: node tests/run.js      (exit code 1 on the first failure)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const listed = new Set(scripts);
const onDisk = dir => fs.readdirSync(path.join(ROOT, dir), { recursive: true })
  .filter(f => f.endsWith('.js')).map(f => (dir + '/' + f).split(path.sep).join('/'));

// Every game source must be loaded by the page: a file that exists but isn't
// in index.html is dead code (or a forgotten <script> tag).
const orphans = onDisk('src').filter(f => !listed.has(f));
if (orphans.length) {
  console.error('Not loaded by index.html: ' + orphans.join(', '));
  process.exit(1);
}

const syntax = [...scripts, ...onDisk('tools'), ...onDisk('tests')];
for (const file of syntax) execFileSync(process.execPath, ['--check', path.join(ROOT, file)], { stdio: 'inherit' });
console.log('Syntax OK: ' + syntax.length + ' files.');

for (const test of ['character-art.js', 'assets.js', 'smoke.js', 'alex.js']) {
  execFileSync(process.execPath, [path.join(__dirname, test)], { stdio: 'inherit', cwd: ROOT });
}
