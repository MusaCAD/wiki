// A static file server for dist/, for the audits and the link check. No dependencies.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
  '.pf_meta': 'application/octet-stream',
  '.pf_index': 'application/octet-stream',
  '.pf_fragment': 'application/octet-stream',
  '.musa': 'application/octet-stream',
};

export function serve(dir, port = 0) {
  const server = createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let file = join(dir, path);
      let s = await stat(file).catch(() => null);
      if (s?.isDirectory()) {
        file = join(file, 'index.html');
        s = await stat(file).catch(() => null);
      }
      if (!s) {
        file = join(dir, '404.html');
        res.statusCode = 404;
      }
      const body = await readFile(file);
      res.setHeader('content-type', TYPES[extname(file)] ?? 'application/octet-stream');
      res.setHeader('cache-control', 'no-store');
      res.end(body);
    } catch {
      res.statusCode = 500;
      res.end('error');
    }
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port, url: `http://127.0.0.1:${server.address().port}` }));
  });
}
