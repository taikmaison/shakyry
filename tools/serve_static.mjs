/**
 * Serves ./dist as a plain static host — no proxy, no rewrites.
 *
 * `vite preview` applies the proxy rules from vite.config.js, which hides the
 * one failure mode that actually bites in production: a host that just serves
 * files. Use this to reproduce what Render/GitHub Pages/S3 will do.
 *
 * Usage: node tools/serve_static.mjs [port]
 */
import http from 'http';
import fs from 'fs';
import path from 'path';

const root = path.join(process.cwd(), 'dist');
const port = Number(process.argv[2] || 4174);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(root, url);
    if (url.endsWith('/')) file = path.join(file, 'index.html');

    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`plain static server on http://localhost:${port} (root: ${root})`));
