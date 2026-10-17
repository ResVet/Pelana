// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// End-to-end checks in a real browser against the built site: every page in
// both languages loads without errors or CSP violations and without
// sideways scrolling on a small phone, and each tool does its job.
//
// Needs Playwright, which is not a dependency of the project:
//   npm i --no-save playwright && npx playwright install chromium
//   npm run build && npm run e2e

import { startServer } from '../scripts/serve.mjs';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('Playwright is not installed. Run: npm i --no-save playwright && npx playwright install chromium');
  process.exit(2);
}

const PORT = 4231;
const BASE = `http://localhost:${PORT}`;
const PAGES = {
  en: ['/en/', '/en/count-the-days/', '/en/testing/', '/en/house-check/', '/en/outbreak/', '/en/sources/', '/en/about/', '/en/offline/'],
  id: ['/id/', '/id/hitung-hari/', '/id/tes-darah/', '/id/cek-rumah/', '/id/simulasi-wabah/', '/id/sumber/', '/id/tentang/', '/id/offline/'],
};

const results = [];
const check = async (name, fn) => {
  const started = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - started });
    console.log(`  ok    ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error });
    console.log(`  FAIL  ${name}\n        ${String(error?.message ?? error).split('\n').join('\n        ')}`);
  }
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** Opens a page and records console errors, uncaught exceptions and CSP violations. */
async function open(context, path) {
  const page = await context.newPage();
  const problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`exception: ${e.message}`));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => console.error(`CSP ${e.violatedDirective} ${e.blockedURI}`));
  });
  const response = await page.goto(BASE + path, { waitUntil: 'networkidle' });
  return { page, problems, status: response?.status() ?? 0 };
}

const site = await startServer({ port: PORT, quiet: true });
const browser = await chromium.launch();

try {
  console.log('\nEvery page, both languages, phone width');
  for (const lang of ['en', 'id']) {
    const context = await browser.newContext({ viewport: { width: 360, height: 740 }, locale: lang === 'id' ? 'id-ID' : 'en-GB' });
    for (const path of PAGES[lang]) {
      await check(`${path} loads cleanly`, async () => {
        const { page, problems, status } = await open(context, path);
        assert(status === 200, `status ${status}`);
        const info = await page.evaluate(() => ({
          lang: document.documentElement.lang,
          h1: document.querySelectorAll('h1').length,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          unlabeled: [...document.querySelectorAll('input, select, textarea')].filter((el) => {
            if (el.type === 'hidden') return false;
            const id = el.id;
            return !(el.closest('label') || (id && document.querySelector(`label[for="${id}"]`)) || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'));
          }).length,
        }));
        assert(info.lang === lang, `lang is ${info.lang}`);
        assert(info.h1 === 1, `${info.h1} h1 elements`);
        assert(info.overflow <= 1, `scrolls sideways by ${info.overflow}px`);
        assert(info.unlabeled === 0, `${info.unlabeled} form controls without a label`);
        assert(problems.length === 0, problems.join('\n'));
        await page.close();
      });
    }
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, locale: 'en-GB', acceptDownloads: true });

  console.log('\nLanguage and redirects');
  await check('"/" goes to Indonesian for Indonesian browsers', async () => {
    const ctx = await browser.newContext({ locale: 'id-ID', extraHTTPHeaders: { 'Accept-Language': 'id-ID,id;q=0.9' } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/');
    assert(new URL(page.url()).pathname === '/id/', `landed on ${page.url()}`);
    await ctx.close();
  });
  await check('the language switch keeps the reader on the same page', async () => {
    const { page } = await open(context, '/en/count-the-days/');
    await page.click('[data-lang-switch]');
    await page.waitForURL('**/id/hitung-hari/');
    await page.close();
  });
  await check('unknown pages answer 404 in the right language', async () => {
    const { page, status } = await open(context, '/id/tidak-ada/');
    assert(status === 404, `status ${status}`);
    assert((await page.getAttribute('html', 'lang')) === 'id', 'not Indonesian');
    await page.close();
  });

  console.log('\nStory');
  await check('scrolling moves the day counter from 30 days before to day 10', async () => {
    const { page, problems } = await open(context, '/en/');
    const first = await page.textContent('[data-counter-text]');
    assert(first?.trim() === '30', `starts at ${first}`);
    await page.evaluate(() => window.scrollTo(0, document.getElementById('saddle').offsetTop));
    await page.waitForTimeout(1200);
    const later = await page.textContent('[data-counter-text]');
    assert(Number(later) >= 9, `counter shows ${later}`);
    assert(problems.length === 0, problems.join('\n'));
    await page.close();
  });
  await check('the chapter list jumps to a chapter and moves focus there', async () => {
    const { page } = await open(context, '/en/');
    await page.click('[data-open="chapters"]');
    await page.click('#chapters [data-chapter="virion"]');
    await page.waitForTimeout(1500);
    const focused = await page.evaluate(() => document.activeElement?.id);
    assert(focused === 'virion-title', `focus is on ${focused}`);
    await page.close();
  });
  await check('the story reads in order without JavaScript', async () => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(BASE + '/en/');
    const titles = await page.$$eval('.beat__h', (els) => els.length);
    assert(titles >= 15, `${titles} chapter titles`);
    const visible = await page.isVisible('#warning');
    assert(visible, 'warning signs hidden without JS');
    await ctx.close();
  });

  console.log('\nTools');
  await check('fever tracker: counts days, logs a temperature, exports a calendar', async () => {
    const { page, problems } = await open(context, '/en/count-the-days/');
    const d = new Date();
    d.setDate(d.getDate() - 3);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await page.fill('#t-date', iso);
    await page.selectOption('#t-time', 'morning');
    await page.click('[data-tracker-form] [type="submit"]');
    await page.waitForSelector('[data-result]:not([hidden])');
    const title = await page.textContent('[data-result-title]');
    assert(/Day 4/.test(title ?? ''), `result says ${title}`);
    await page.fill('#l-temp', '38.6');
    await page.click('[data-log-form] [type="submit"]');
    await page.waitForSelector('[data-loglist] li');
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-export-ics]')]);
    assert(download.suggestedFilename().endsWith('.ics'), download.suggestedFilename());
    await page.reload();
    await page.waitForSelector('[data-result]:not([hidden])');
    assert((await page.$$('[data-loglist] li')).length === 1, 'log not kept after reload');
    assert(problems.length === 0, problems.join('\n'));
    await page.click('[data-clear]');
    await page.close();
  });
  await check('which test: the advice follows the day', async () => {
    const { page } = await open(context, '/en/testing/');
    await page.fill('#t-day', '2');
    await page.dispatchEvent('#t-day', 'input');
    const early = await page.textContent('[data-advice-title]');
    await page.fill('#t-day', '10');
    await page.dispatchEvent('#t-day', 'input');
    const late = await page.textContent('[data-advice-title]');
    assert(early && late && early !== late, `advice did not change: ${early} / ${late}`);
    await page.close();
  });
  await check('house check: marking spots counts them and a reminder downloads', async () => {
    const { page } = await open(context, '/en/house-check/');
    await page.check('[data-done="tub"]');
    await page.check('[data-done="tyre"]');
    const progress = await page.textContent('[data-progress]');
    assert(/2 of 13/.test(progress ?? ''), `progress says ${progress}`);
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-reminder-form] [type="submit"]')]);
    assert(download.suggestedFilename().endsWith('.ics'), download.suggestedFilename());
    await page.click('[data-reset]');
    await page.close();
  });
  await check('outbreak model: measures lower the number infected', async () => {
    const { page, problems } = await open(context, '/en/outbreak/');
    const read = async () => Number((await page.textContent('[data-stat="infected"]'))?.replace(/[^\d]/g, ''));
    await page.waitForFunction(() => /\d/.test(document.querySelector('[data-stat="infected"]')?.textContent ?? ''));
    const before = await read();
    await page.click('[data-preset="all"]');
    await page.waitForTimeout(600);
    const after = await read();
    assert(after < before, `infected went from ${before} to ${after}`);
    assert(problems.length === 0, problems.join('\n'));
    await page.close();
  });

  console.log('\nSettings and offline');
  await check('dark theme is applied and remembered', async () => {
    const { page } = await open(context, '/en/sources/');
    await page.click('[data-open="settings"]');
    await page.click('[data-pref="theme"] label:has(input[value="dark"])');
    assert((await page.getAttribute('html', 'data-theme')) === 'dark', 'not dark');
    await page.reload();
    assert((await page.getAttribute('html', 'data-theme')) === 'dark', 'not remembered');
    await page.evaluate(() => localStorage.clear());
    await page.close();
  });
  await check('the text size setting makes the text larger', async () => {
    const { page } = await open(context, '/en/sources/');
    const size = () => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    const before = await size();
    await page.click('[data-open="settings"]');
    await page.click('[data-pref="text"] label:has(input[value="larger"])');
    const after = await size();
    assert(after >= before * 1.2, `root font size went from ${before}px to ${after}px`);
    await page.evaluate(() => localStorage.clear());
    await page.close();
  });
  await check('without JavaScript, forms never put what was typed into the address', async () => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(BASE + '/en/count-the-days/');
    await page.fill('#t-name', 'Budi');
    await page.press('#t-name', 'Enter');
    await page.waitForTimeout(400);
    assert(!page.url().includes('Budi'), `navigated to ${page.url()}`);
    await ctx.close();
  });
  await check('after one visit, pages never opened before still read offline', async () => {
    const ctx = await browser.newContext({ locale: 'en-GB' });
    const page = await ctx.newPage();
    await page.goto(BASE + '/en/');
    await page.evaluate(() => navigator.serviceWorker?.ready);
    await page.waitForTimeout(800);
    await ctx.setOffline(true);
    for (const [path, title] of [
      ['/en/house-check/', /house/i],
      ['/id/hitung-hari/', /demam/i],
    ]) {
      await page.goto(BASE + path).catch(() => {});
      const h1 = (await page.textContent('h1')) ?? '';
      assert(title.test(h1), `${path} offline shows "${h1}"`);
      const styled = await page.evaluate(() => getComputedStyle(document.body).fontFamily.includes('Jakarta'));
      assert(styled, `${path} offline has no stylesheet`);
    }
    await ctx.close();
  });
  await context.close();
} finally {
  await browser.close();
  site.server.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
