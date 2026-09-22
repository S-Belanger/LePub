// Local-only, dependency-free preview: node tools/serve.js [port]
const { startServer } = require('./browser-session');
startServer(Number(process.argv[2]) || 8917).then(server => {
  console.log('LePub: http://127.0.0.1:' + server.address().port);
}).catch(error => { console.error(error.message); process.exitCode = 1; });
