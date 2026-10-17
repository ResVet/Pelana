// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Development: builds the site, serves it, and rebuilds when a source file
// changes, then reloads the pages that are open.
//
// Usage: npm run dev [-- port]

import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const port = Number(process.argv[2] ?? process.env.PORT ?? 4173);

function build() {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.execPath, [join(ROOT, 'scripts', 'build.mjs'), '--dev'], { stdio: ['ignore', 'ignore', 'inherit'] });
    child.on('close', (code) => {
      console.log(code === 0 ? `Built in ${Date.now() - started} ms` : 'Build failed');
      resolve(code === 0);
    });
  });
}

await build();
const site = await startServer({ port, dev: true });

let timer = null;
let running = false;
let again = false;
const rebuild = async () => {
  if (running) {
    again = true;
    return;
  }
  running = true;
  if (await build()) await site.notify();
  running = false;
  if (again) {
    again = false;
    void rebuild();
  }
};
for (const dir of ['src', 'public', 'scripts']) {
  watch(join(ROOT, dir), { recursive: true }, (_, file) => {
    if (file && /(^|[\\/])\./.test(file)) return;
    clearTimeout(timer);
    timer = setTimeout(rebuild, 120);
  });
}
console.log('Watching src/, public/ and scripts/ for changes.');
