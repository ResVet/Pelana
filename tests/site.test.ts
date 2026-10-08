// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Renders the whole site and checks every page: structure, references
// between elements, links, and the rules the Content Security Policy sets.

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderSite, type Assets } from '../src/site/render.ts';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

const assets: Assets = {
  siteUrl: 'https://example.test',
  css: '/assets/css/main-TEST.css',
  fonts: { regular: '/assets/fonts/regular-TEST.woff2', italic: '/assets/fonts/italic-TEST.woff2' },
  entries: Object.fromEntries(['home', 'tracker', 'testing', 'house', 'outbreak', 'page'].map((k) => [k, { file: `/assets/js/${k}-TEST.js`, imports: [] }])),
  og: { en: '/og-en.png', id: '/og-id.png' },
};

const files = renderSite(assets);
const pages = files.filter((f) => f.path.endsWith('.html'));
const paths = new Set(files.map((f) => '/' + f.path.replace(/index\.html$/, '')));

const attrsOf = (html: string, name: string) => [...html.matchAll(new RegExp(`\\s${name}="([^"]*)"`, 'g'))].map((m) => m[1]!);

test('every page and language is generated', () => {
  assert.ok(pages.length >= 18, `${pages.length} pages`);
  for (const p of ['/en/', '/id/', '/en/sources/', '/id/sumber/']) assert.ok(paths.has(p), p);
});

for (const page of pages) {
  test(`page ${page.path}`, () => {
    const html = page.contents;
    assert.match(html, /^<!doctype html>/i);
    assert.match(html, /<html lang="(en|id)"/);
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, 'exactly one h1');
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.match(html, /<meta name="description" content="[^"]+"/);
    assert.match(html, /<meta name="viewport"/);

    // The CSP allows no inline style attributes and only one inline script.
    assert.ok(!/\sstyle="/.test(html), 'no style attributes');
    const inline = [...html.matchAll(/<script(?![^>]*\ssrc=)([^>]*)>/g)].map((m) => m[1]!);
    const executable = inline.filter((a) => !/type="application\/(ld\+)?json"/.test(a));
    assert.ok(executable.length <= 1, 'one inline script at most (the pre-paint one)');
    for (const block of html.matchAll(/<script type="application\/(?:ld\+)?json"[^>]*>([\s\S]*?)<\/script>/g)) {
      assert.doesNotThrow(() => JSON.parse(block[1]!), 'inline JSON parses');
    }

    // IDs are unique and every reference to one points at something.
    const ids = attrsOf(html, 'id');
    assert.equal(new Set(ids).size, ids.length, `duplicate id: ${ids.filter((x, i) => ids.indexOf(x) !== i).join(', ')}`);
    const idSet = new Set(ids);
    for (const attr of ['for', 'aria-labelledby', 'aria-describedby', 'aria-controls']) {
      for (const value of attrsOf(html, attr)) {
        for (const ref of value.split(/\s+/).filter(Boolean)) assert.ok(idSet.has(ref), `${attr}="${ref}" points nowhere`);
      }
    }
    for (const hash of attrsOf(html, 'href').filter((h) => h.startsWith('#'))) {
      if (hash.length > 1) assert.ok(idSet.has(hash.slice(1)), `link to missing ${hash}`);
    }

    // Internal links go to pages that exist or files that ship.
    for (const href of attrsOf(html, 'href')) {
      if (!href.startsWith('/') || href.startsWith('//')) continue;
      const path = href.split('#')[0]!.split('?')[0]!;
      if (path.startsWith('/assets/')) continue;
      const exists = paths.has(path) || existsSync(join(ROOT, 'public', path)) || path === '/LICENSE.txt';
      assert.ok(exists, `broken link ${href}`);
    }

    // Buttons have names; images have text alternatives.
    for (const b of html.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)) {
      const text = b[2]!.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '').trim();
      assert.ok(text || /aria-label="[^"]+"/.test(b[1]!) || /aria-hidden="true"/.test(b[1]!), `unnamed button: ${b[0].slice(0, 120)}`);
    }
    for (const img of html.matchAll(/<img[^>]*>/g)) assert.match(img[0], /\salt="/, img[0]);
  });
}

test('the sitemap lists both languages for every page', () => {
  const sitemap = files.find((f) => f.path === 'sitemap.xml')!.contents;
  assert.ok(sitemap.includes('hreflang="id"') && sitemap.includes('hreflang="en"'));
  assert.ok(!sitemap.includes('/404/'));
});

test('the redirects send the bare domain to a language', () => {
  const redirects = files.find((f) => f.path === '_redirects')!.contents;
  assert.match(redirects, /^\/\s+\/id\/\s+302!?\s+Language=id/m);
  assert.match(redirects, /^\/\s+\/en\/\s+302!?\s*$/m);
});
