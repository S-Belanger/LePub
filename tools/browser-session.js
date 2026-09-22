// Shared local Edge harness for art imports and visual review. No dependencies
// are installed into the game; use an existing playwright-core installation.
const fs = require('fs');
const path = require('path');
const http = require('http');
const ROOT = path.resolve(__dirname, '..');

function playwright() {
  try { return require('playwright-core'); } catch {}
  const cache = path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx');
  for (const dir of fs.existsSync(cache) ? fs.readdirSync(cache) : []) {
    const candidate = path.join(cache, dir, 'node_modules', 'playwright-core');
    if (fs.existsSync(candidate)) return require(candidate);
  }
  throw new Error('Install playwright-core or make it available in the npm cache.');
}

function startServer(port = 0) {
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml' };
  const server = http.createServer((req, res) => {
    const file = path.resolve(ROOT, '.' + new URL(req.url, 'http://localhost').pathname.replace(/\/$/, '/index.html'));
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (error, bytes) => {
      res.writeHead(error ? 404 : 200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
      res.end(error ? '' : bytes);
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function session(run) {
  const server = await startServer();
  let browser;
  try {
    browser = await playwright().chromium.launch({ channel: 'msedge', headless: true });
    await run(browser, 'http://127.0.0.1:' + server.address().port);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
module.exports = { ROOT, session, startServer };
