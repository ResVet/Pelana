// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Builds the static site into dist/:
//   1. bundles and minifies the CSS (fonts get hashed names on the way)
//   2. bundles the background worker that runs the outbreak model
//   3. bundles the page scripts with code splitting
//   4. renders every page in Indonesian and English
//   5. writes the service worker, security headers and the asset report
//
// Usage: node scripts/build.mjs [--dev]

import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import * as esbuild from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const CACHE = join(ROOT, '.cache');
const DEV = process.argv.includes('--dev');

const SITE_URL = (process.env.URL || process.env.SITE_URL || 'https://raffagmd-pelana.netlify.app').replace(/\/$/, '');

const BROWSERS = ['chrome100', 'edge100', 'firefox100', 'safari15.4', 'ios15.4'];
const BANNER = '/*! Pelana (c) 2026 Raffa Gamadan Rifandi. All rights reserved. See /LICENSE.txt */';

const ENTRIES = ['home', 'tracker', 'testing', 'house', 'outbreak', 'page'];

function hash(data, length = 10) {
  return createHash('sha256').update(data).digest('hex').slice(0, length);
}

function cspHash(source) {
  return `'sha256-${createHash('sha256').update(source, 'utf8').digest('base64')}'`;
}

function urlOf(file) {
  return '/' + relative(DIST, file).split('\\').join('/');
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

async function buildCss() {
  const result = await esbuild.build({
    entryPoints: [join(ROOT, 'src/styles/main.css')],
    bundle: true,
    minify: !DEV,
    sourcemap: DEV ? 'inline' : false,
    target: BROWSERS,
    outdir: join(DIST, 'assets'),
    entryNames: 'css/[name]-[hash]',
    assetNames: 'fonts/[name]-[hash]',
    loader: { '.woff2': 'file', '.svg': 'file' },
    publicPath: '/assets',
    metafile: true,
    banner: { css: BANNER },
    logLevel: 'warning',
  });
  const outputs = Object.keys(result.metafile.outputs).map((p) => join(ROOT, p));
  const css = outputs.find((p) => p.endsWith('.css'));
  const fonts = outputs.filter((p) => p.endsWith('.woff2'));
  const regular = fonts.find((p) => /plus-jakarta-sans-[A-Z0-9]+\.woff2$/i.test(p) && !p.includes('italic'));
  const italic = fonts.find((p) => p.includes('italic'));
  if (!css || !regular || !italic) throw new Error('CSS build did not emit the stylesheet and both fonts');
  return { css: urlOf(css), fonts: { regular: urlOf(regular), italic: urlOf(italic) } };
}

async function buildWorker() {
  const result = await esbuild.build({
    entryPoints: { 'sim-worker': join(ROOT, 'src/client/sim/worker.ts') },
    bundle: true,
    minify: !DEV,
    sourcemap: DEV ? 'inline' : false,
    format: 'iife',
    target: BROWSERS,
    outdir: join(DIST, 'assets/js'),
    entryNames: '[name]-[hash]',
    metafile: true,
    banner: { js: BANNER },
    logLevel: 'warning',
  });
  const file = Object.keys(result.metafile.outputs).find((p) => p.endsWith('.js'));
  return urlOf(join(ROOT, file));
}

async function buildScripts(workerUrl) {
  const result = await esbuild.build({
    entryPoints: Object.fromEntries(ENTRIES.map((name) => [name, join(ROOT, `src/client/entries/${name}.ts`)])),
    bundle: true,
    splitting: true,
    format: 'esm',
    minify: !DEV,
    sourcemap: DEV ? 'inline' : false,
    target: BROWSERS,
    outdir: join(DIST, 'assets/js'),
    entryNames: '[name]-[hash]',
    chunkNames: 'chunk-[hash]',
    metafile: true,
    banner: { js: BANNER },
    define: {
      __SIM_WORKER__: JSON.stringify(workerUrl),
      __DEV__: JSON.stringify(DEV),
    },
    legalComments: 'none',
    logLevel: 'warning',
  });
  const entries = {};
  for (const [out, meta] of Object.entries(result.metafile.outputs)) {
    if (!meta.entryPoint) continue;
    const name = ENTRIES.find((e) => meta.entryPoint.endsWith(`entries/${e}.ts`));
    if (!name) continue;
    entries[name] = {
      file: urlOf(join(ROOT, out)),
      imports: meta.imports.filter((i) => i.kind === 'import-statement').map((i) => urlOf(join(ROOT, i.path))),
    };
  }
  return { entries, metafile: result.metafile };
}

async function loadRenderer() {
  const outfile = join(CACHE, 'render.mjs');
  await esbuild.build({
    entryPoints: [join(ROOT, 'src/site/render.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile,
    logLevel: 'warning',
  });
  return import(pathToFileURL(outfile).href + `?t=${Date.now()}`);
}

function headers(prepaintHash) {
  const csp = [
    "default-src 'self'",
    `script-src 'self' ${prepaintHash}`,
    "style-src 'self'",
    "img-src 'self'",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
  return `# Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
/*
  Content-Security-Policy: ${csp}
  Strict-Transport-Security: max-age=31536000
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/sw.js
  Cache-Control: no-cache

/*.webmanifest
  Content-Type: application/manifest+json
  Cache-Control: public, max-age=3600

/llms.txt
  Content-Type: text/plain; charset=utf-8
`;
}

async function serviceWorker(version, precache) {
  const out = join(DIST, 'sw.js');
  await esbuild.build({
    entryPoints: [join(ROOT, 'src/client/sw.ts')],
    bundle: true,
    minify: !DEV,
    format: 'iife',
    target: BROWSERS,
    outfile: out,
    define: { __VERSION__: JSON.stringify(version), __PRECACHE__: JSON.stringify(precache) },
    banner: { js: BANNER },
    logLevel: 'warning',
  });
}

function kb(bytes) {
  return (bytes / 1024).toFixed(1).padStart(7) + ' kB';
}

async function report() {
  const files = (await walk(join(DIST, 'assets'))).sort();
  let total = { raw: 0, gz: 0, br: 0 };
  const rows = [];
  for (const file of files) {
    const data = await readFile(file);
    const gz = gzipSync(data, { level: 9 }).length;
    const br = file.endsWith('.woff2') ? data.length : brotliCompressSync(data).length;
    total.raw += data.length;
    total.gz += gz;
    total.br += br;
    rows.push(`${kb(data.length)} ${kb(gz)} gz ${kb(br)} br  ${urlOf(file)}`);
  }
  rows.push(`${kb(total.raw)} ${kb(total.gz)} gz ${kb(total.br)} br  total`);
  return rows.join('\n');
}

async function main() {
  const started = Date.now();
  await rm(DIST, { recursive: true, force: true });
  await mkdir(join(DIST, 'assets'), { recursive: true });
  await mkdir(CACHE, { recursive: true });

  await cp(join(ROOT, 'public'), DIST, {
    recursive: true,
    filter: (src) => !src.includes(`${join('public', 'fonts')}`),
  });
  await cp(join(ROOT, 'LICENSE'), join(DIST, 'LICENSE.txt'));

  const style = await buildCss();
  await cp(join(ROOT, 'fonts-src/OFL.txt'), join(DIST, 'assets/fonts/OFL.txt'));
  const workerUrl = await buildWorker();
  const { entries } = await buildScripts(workerUrl);

  const renderer = await loadRenderer();
  const assets = {
    siteUrl: SITE_URL,
    css: style.css,
    fonts: style.fonts,
    entries,
    og: { en: '/og-en.png', id: '/og-id.png' },
  };
  const files = renderer.renderSite(assets);
  for (const file of files) {
    const out = join(DIST, file.path);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, file.contents);
  }
  await writeFile(join(DIST, '_headers'), headers(cspHash(renderer.PREPAINT_SCRIPT)));

  // Every page in both languages is cached with the assets of the same build,
  // so the site works offline from the first visit and a cached page never
  // points at files from an older build.
  const assetUrls = (await walk(join(DIST, 'assets'))).map(urlOf).filter((u) => !u.endsWith('.txt'));
  const pageUrls = files
    .map((f) => f.path)
    .filter((p) => p.endsWith('index.html') && p.includes('/') && !p.includes('404'))
    .map((p) => '/' + p.replace(/index\.html$/, ''));
  const precache = [...assetUrls, ...pageUrls, '/manifest.webmanifest', '/favicon.svg', '/icon-192.png'];
  // The cache name follows the content, so the same source always builds the
  // same service worker and readers download the site again only when
  // something in it has changed.
  const digest = createHash('sha256');
  for (const url of precache) {
    digest.update(url).update(await readFile(join(DIST, url.endsWith('/') ? `${url}index.html` : url)));
  }
  await serviceWorker(digest.digest('hex').slice(0, 10), precache);

  const pages = files.filter((f) => f.path.endsWith('.html')).length;
  console.log(`Pelana built ${pages} pages in ${Date.now() - started} ms (${DEV ? 'dev' : 'production'}, ${SITE_URL})`);
  if (!DEV) console.log(await report());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

export { main as build };
