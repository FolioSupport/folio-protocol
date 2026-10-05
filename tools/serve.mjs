// Tiny static server for dist/ that applies the same headers Cloudflare will (from dist/_headers).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.env.DIST ? path.resolve(process.env.DIST) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.xml': 'application/xml' };

function globalHeaders() {
  const out = {};
  try {
    const lines = fs.readFileSync(path.join(root, '_headers'), 'utf8').split(/\r?\n/);
    let inGlobal = false;
    for (const l of lines) {
      if (/^\S/.test(l)) inGlobal = l.trim() === '/*';
      else if (inGlobal && l.trim()) { const i = l.indexOf(':'); out[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }
    }
  } catch { /* no headers file yet */ }
  return out;
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(root, rel);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    const h = { ...globalHeaders() };
    delete h['Strict-Transport-Security'];
    delete h['upgrade-insecure-requests'];
    if (h['Content-Security-Policy']) h['Content-Security-Policy'] = h['Content-Security-Policy'].replace('; upgrade-insecure-requests', '');
    if (err) {
      res.writeHead(404, { ...h, 'content-type': 'text/html; charset=utf-8' });
      return res.end(fs.existsSync(path.join(root, '404.html')) ? fs.readFileSync(path.join(root, '404.html')) : 'not found');
    }
    res.writeHead(200, { ...h, 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  });
}).listen(port, () => console.log(`serving dist on http://localhost:${port}`));
