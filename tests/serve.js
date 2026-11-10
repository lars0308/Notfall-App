// Minimaler statischer Server fuer die Web-Oberflaeche (nur fuer Tests)
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'app/src/main/assets/www');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
function start(port = 8123) {
  return new Promise(res => {
    const s = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
      const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f)) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); rsp.end(fs.readFileSync(f));
    }).listen(port, () => res(s));
  });
}
module.exports = { start };
if (require.main === module) start().then(() => console.log('http://localhost:8123'));
