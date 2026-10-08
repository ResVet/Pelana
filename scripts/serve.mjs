// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// A static server for dist/ that behaves like Netlify where it matters for
// testing: pretty URLs, the _headers file (including the CSP), the language
// redirect at "/" and the per-language 404 pages from _redirects. In
// development it can also tell open pages to reload after a rebuild.
//
// Usage: node scripts/serve.mjs [port]

import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'dist');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.ics': 'text/calendar',
};

const RELOAD_JS = `new EventSource('/__dev/events').addEventListener('change', () => location.reload());`;

async function parseHeaders() {
  const rules = [];
  let text = '';
  try {
    text = await readFile(join(ROOT, '_headers'), 'utf8');
  } catch {
    return rules;
  }
  let current = null;
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      current = { pattern: line.trim(), headers: {} };
      rules.push(current);
    } else if (current) {
      const i = line.indexOf(':');
      current.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return rules;
}

function matches(pattern, path) {
  if (pattern.endsWith('*')) return path.startsWith(pattern.slice(0, -1));
  if (pattern.startsWith('/*.')) return path.endsWith(pattern.slice(2));
  return path === pattern;
}

async function resolveFile(path) {
  let decoded;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return null;
  }
  const file0 = normalize(join(ROOT, decoded));
  // Never serve anything outside dist/.
  if (file0 !== ROOT && !file0.startsWith(ROOT + sep)) return null;
  let file = file0;
  try {
    const info = await stat(file);
    if (info.isDirectory()) {
      if (!path.endsWith('/')) return { redirect: path + '/' };
      file = join(file, 'index.html');
      await stat(file);
    }
    return { file };
  } catch {
    try {
      await stat(file + '.html');
      return { file: file + '.html' };
    } catch {
      return null;
    }
  }
}

function pickLanguage(req) {
  const cookie = req.headers.cookie ?? '';
  if (/(?:^|;\s*)pelana_en=/.test(cookie)) return 'en';
  if (/(?:^|;\s*)pelana_id=/.test(cookie)) return 'id';
  const first = (req.headers['accept-language'] ?? '').split(',')[0]?.trim().toLowerCase() ?? '';
  return first.startsWith('id') ? 'id' : 'en';
}

/**
 * Starts the server. With `dev`, HTML pages get a small script that reloads
 * them when `notify()` is called. Returns { server, notify, reloadRules }.
 */
export async function startServer({ port = 4173, dev = false, quiet = false } = {}) {
  let headerRules = await parseHeaders();
  const clients = new Set();

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);
    const path = url.pathname;
    const apply = (status, type) => {
      const headers = { 'Content-Type': type };
      for (const rule of headerRules) if (matches(rule.pattern, path)) Object.assign(headers, rule.headers);
      // Local testing runs over plain http, where upgrading requests would break them.
      if (headers['Content-Security-Policy']) {
        headers['Content-Security-Policy'] = headers['Content-Security-Policy'].replace(/;\s*upgrade-insecure-requests/, '');
      }
      if (dev) headers['Cache-Control'] = 'no-store';
      res.writeHead(status, headers);
    };

    if (dev && path === '/__dev/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(': connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    if (dev && path === '/__dev/reload.js') {
      res.writeHead(200, { 'Content-Type': TYPES['.js'], 'Cache-Control': 'no-store' });
      res.end(RELOAD_JS);
      return;
    }
    if (path === '/') {
      res.writeHead(302, { Location: `/${pickLanguage(req)}/` });
      res.end();
      return;
    }

    const found = await resolveFile(path);
    if (found?.redirect) {
      res.writeHead(301, { Location: found.redirect + url.search });
      res.end();
      return;
    }
    const send = async (status, file) => {
      const type = TYPES[extname(file)] ?? 'application/octet-stream';
      apply(status, type);
      if (dev && type.startsWith('text/html')) {
        const htmlText = await readFile(file, 'utf8');
        res.end(htmlText.replace('</body>', '<script src="/__dev/reload.js"></script></body>'));
        return;
      }
      createReadStream(file).pipe(res);
    };
    if (found?.file) {
      await send(200, found.file);
      return;
    }
    const lang = path.startsWith('/id/') ? 'id' : 'en';
    await send(404, join(ROOT, lang, '404', 'index.html'));
  });

  // Only this machine can reach the preview server.
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  if (!quiet) console.log(`Serving dist/ on http://localhost:${port}`);
  return {
    server,
    async notify() {
      headerRules = await parseHeaders();
      for (const res of clients) res.write('event: change\ndata: 1\n\n');
    },
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  await startServer({ port: Number(process.argv[2] ?? process.env.PORT ?? 4173) });
}
