// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Regenerates the committed images in public/: the app icons (from the
// brand mark, with sharp) and the social preview images (a frame of the
// real story page rendered with WebGL, with Playwright). This is a
// development tool. The site build does not run it and neither package is
// a dependency of the project; install them separately to use it:
//
//   npm i --no-save sharp playwright && npx playwright install chromium
//   npm run build && node scripts/assets.mjs

import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');

const TILE = '#1d6a71';
const LINE = '#f4f8f7';
const CURVE = 'M6 21.5C8 12 10.5 8.5 13 12.5s3.2 9.5 5.6 7.6S22.8 13 26 15';

/** The mark on a transparent background, as in the favicon. */
const tileSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="1.5" y="1.5" width="29" height="29" rx="5" fill="${TILE}"/><path d="${CURVE}" fill="none" stroke="${LINE}" stroke-width="2.6" stroke-linecap="round"/></svg>`;

/** Full-bleed square for platforms that round the corners themselves; `inset` keeps the curve inside their safe zone. */
const bleedSvg = (inset) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${TILE}"/><g transform="translate(16 16) scale(${inset}) translate(-16 -17)"><path d="${CURVE}" fill="none" stroke="${LINE}" stroke-width="2.6" stroke-linecap="round"/></g></svg>`;

async function icons() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.warn('sharp is not installed; skipping icons.');
    return;
  }
  const out = [
    ['favicon-32.png', tileSvg, 32],
    ['icon-192.png', tileSvg, 192],
    ['icon-512.png', tileSvg, 512],
    ['apple-touch-icon.png', bleedSvg(0.86), 180],
    ['icon-maskable-512.png', bleedSvg(0.66), 512],
  ];
  for (const [name, svg, size] of out) {
    const png = await sharp(Buffer.from(svg), { density: Math.ceil((72 * size) / 32) }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
    await writeFile(join(PUBLIC, name), png);
    console.log(`${name.padEnd(24)} ${size}x${size}  ${(png.length / 1024).toFixed(1)} kB`);
  }
}

async function previews() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.warn('playwright is not installed; skipping social previews.');
    return;
  }
  const port = 4199;
  const server = spawn(process.execPath, [join(ROOT, 'scripts', 'serve.mjs'), String(port)], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 600));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    for (const lang of ['en', 'id']) {
      // The page's CSP forbids injected styles; this throwaway context may ignore it.
      const context = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, reducedMotion: 'reduce', colorScheme: 'light', bypassCSP: true });
      const page = await context.newPage();
      await page.goto(`http://localhost:${port}/${lang}/?gl=software`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-stage][data-gl-ready]', { timeout: 30000 });
      // Keep the brand, the title, the tub and the day counter; hide the rest.
      await page.addStyleTag({
        content: `.masthead__nav,.masthead__actions,.story__dock,.dayrail,.hero__lede,.hero__cue,.hero__skip,.skiplink{display:none!important}
          .beat--hero .beat__text{max-width:36rem}`,
      });
      await page.waitForTimeout(3000);
      let png = await page.screenshot({ type: 'png' });
      // Social sites only need a good preview; a palette PNG keeps the file small.
      try {
        const sharp = (await import('sharp')).default;
        png = await sharp(png).png({ palette: true, quality: 92, effort: 10 }).toBuffer();
      } catch {
        // Without sharp the full-colour screenshot is kept.
      }
      await writeFile(join(PUBLIC, `og-${lang}.png`), png);
      console.log(`og-${lang}.png  1200x630  ${(png.length / 1024).toFixed(1)} kB`);
      await context.close();
    }
  } finally {
    await browser.close();
    server.kill();
  }
}

await icons();
await previews();
