// Local review server for the UnionSuite finance trial and theme documentation.
// Original bundled finance prototypes are deliberately outside this allowlist.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const entry = '/prototypes/Finance Dashboard/Finance Dashboard - UnionSuite.html';
const allow = new Set([entry, '/prototypes/Finance Dashboard/finance-unionsuite.css', '/prototypes/Finance Dashboard/finance-unionsuite.js']);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml'};
http.createServer((req,res) => {
  let url;
  try { url=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname); } catch { res.writeHead(400);res.end();return; }
  if(url==='/') {res.writeHead(302,{Location:encodeURI(entry)});res.end();return;}
  if(!allow.has(url) && !url.startsWith('/Theme/UnionSuite/') && !url.startsWith('/Theme/UnionSuite-Client/')) {res.writeHead(404);res.end('Not found');return;}
  const file=path.resolve(root,'.'+url);
  if(!file.startsWith(root+path.sep)) {res.writeHead(403);res.end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});
}).listen(4606,'127.0.0.1',()=>console.log('Finance trial preview ready at http://127.0.0.1:4606'));
