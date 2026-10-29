// Local-only review server; serves only the review artifacts listed below.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const allowed = new Set(['/references/Taskbar-Dark-Mode.html', '/references/Taskbar-Preview.html', '/references/Utility-Navigation.html', '/references/Object-Browser-Dark-Mode.html', '/Theme/UnionSuite/Usage-Guide.html']);
http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  if (!allowed.has(pathname)) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(path.join(root, pathname), (error, data) => {
    res.writeHead(error ? 404 : 200, {'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store'});
    res.end(error ? 'Not found' : data);
  });
}).listen(4614, '127.0.0.1', () => console.log('Dark mode trial: http://127.0.0.1:4614/references/Taskbar-Dark-Mode.html'));
