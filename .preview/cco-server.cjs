// Restricted loopback preview: serves only the generated comparison and guide.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pages = new Map([
 ['/references/Contact-Lists-Preview.html', 'references/Contact-Lists-Preview.html'],
 ['/references/Home-Preview.html', 'references/Home-Preview.html'],
 ['/references/Bulletin-Cards-Preview.html', 'references/Bulletin-Cards-Preview.html'],
 ['/references/Utility-Navigation.html', 'references/Utility-Navigation.html'],
 ['/references/Query-Template-Structure.html', 'references/Query-Template-Structure.html'],
 ['/references/List-Templates.html', 'references/List-Templates.html'],
 ["/references/CCO-Sticky-Tabs.html", "references/CCO-Sticky-Tabs.html"],
  ["/references/Action-Menu-Approved.html", "references/Action-Menu-Approved.html"],
  ['/references/Action-Menu-Comparison.html', 'references/Action-Menu-Comparison.html'],
  ['/', 'references/CCO-Tabs-Comparison.html'],
  ['/references/CCO-Tabs-Comparison.html', 'references/CCO-Tabs-Comparison.html'],
  ['/references/Data-Panel-Comparison.html', 'references/Data-Panel-Comparison.html'],
  ['/references/index.html', 'references/index.html'],
  ['/Theme/UnionSuite/Usage-Guide.html', 'Theme/UnionSuite/Usage-Guide.html']
]);
http.createServer((req, res) => {
  const file = pages.get(new URL(req.url, 'http://127.0.0.1').pathname);
  if (req.method !== 'GET' || !file) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(path.join(root, file), (error, data) => {
    if (error) { res.writeHead(500); res.end('Preview unavailable'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(Number(process.argv[2] || 4607), '127.0.0.1', () => console.log('Reference preview ready on port ' + (process.argv[2] || 4607)));
