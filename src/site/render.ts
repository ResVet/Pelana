// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Build-time entry point. Given the hashed asset names from the bundler, it
// returns every HTML page in both languages plus the text files that describe
// the site to browsers, crawlers and answer engines.

import { en, type Copy } from '../content/en.ts';
import { id } from '../content/id.ts';
import { SOURCES } from '../content/sources.ts';
import { type Assets, type PageSpec, document } from './layout.ts';
import { aboutPage, notFoundPage, offlinePage, sourcesPage } from './pages/static.ts';
import { homePage } from './pages/home.ts';
import { housePage } from './pages/house.ts';
import { outbreakPage } from './pages/outbreak.ts';
import { testingPage } from './pages/testing.ts';
import { trackerPage } from './pages/tracker.ts';
import { type Lang, LANGS, PAGE_KEYS, ROUTES, fileFor } from './routes.ts';
import { escape, plain } from './html.ts';

export type { Assets } from './layout.ts';
export { PREPAINT_SCRIPT } from './inline.ts';

export interface OutputFile {
  path: string;
  contents: string;
}

const COPY: Record<Lang, Copy> = { en, id };

function pagesFor(lang: Lang, assets: Assets): PageSpec[] {
  const copy = COPY[lang];
  return [
    homePage(copy, lang, assets),
    trackerPage(copy, lang, assets),
    testingPage(copy, lang, assets),
    housePage(copy, lang, assets),
    outbreakPage(copy, lang, assets),
    sourcesPage(copy, lang, assets),
    aboutPage(copy, lang, assets),
  ];
}

function sitemap(assets: Assets): string {
  const base = assets.siteUrl.replace(/\/$/, '');
  const urls = PAGE_KEYS.flatMap((key) =>
    LANGS.map((lang) => {
      const alternates = LANGS.map(
        (alt) => `    <xhtml:link rel="alternate" hreflang="${alt}" href="${base}${ROUTES[key][alt]}"/>`,
      ).join('\n');
      return `  <url>\n    <loc>${base}${ROUTES[key][lang]}</loc>\n    <lastmod>2026-10-07</lastmod>\n${alternates}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${base}${ROUTES[key].en}"/>\n  </url>`;
    }),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

/** Crawlers that collect pages to train AI models, which the licence does not allow. */
const TRAINING_CRAWLERS = ['GPTBot', 'ClaudeBot', 'anthropic-ai', 'CCBot', 'Google-Extended', 'Applebot-Extended', 'Bytespider', 'meta-externalagent'];

function robots(assets: Assets): string {
  return [
    '# Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.',
    '# Licence: /LICENSE.txt. Search is welcome; training AI models on this site is not.',
    'User-agent: *',
    'Allow: /',
    'Disallow: /en/404/',
    'Disallow: /id/404/',
    'Disallow: /en/offline/',
    'Disallow: /id/offline/',
    '',
    ...TRAINING_CRAWLERS.map((bot) => `User-agent: ${bot}`),
    'Disallow: /',
    '',
    `Sitemap: ${assets.siteUrl.replace(/\/$/, '')}/sitemap.xml`,
    '',
  ].join('\n');
}

function manifest(): string {
  return JSON.stringify(
    {
      name: 'Pelana',
      short_name: 'Pelana',
      description: plain(id.site.description),
      lang: 'id',
      dir: 'ltr',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#e7eeec',
      theme_color: '#1d6a71',
      categories: ['health', 'medical', 'education'],
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
      shortcuts: [
        { name: id.tools.tracker.name, short_name: id.tools.tracker.short, url: ROUTES.tracker.id },
        { name: en.tools.tracker.name, short_name: en.tools.tracker.short, url: ROUTES.tracker.en },
        { name: id.tools.house.name, short_name: id.tools.house.short, url: ROUTES.house.id },
      ],
    },
    null,
    2,
  );
}

/** A plain-text summary for language models and answer engines (llms.txt). */
function llms(assets: Assets): string {
  const base = assets.siteUrl.replace(/\/$/, '');
  const e = en.home;
  const w = en.common.warning;
  const lines = [
    '# Pelana',
    '',
    `> ${plain(en.site.description)} By ${en.site.author}, ${en.site.authorRole}. Available in Indonesian and English. Copyright 2026 Raffa Gamadan Rifandi, all rights reserved.`,
    '',
    '## Key facts, with sources',
    '',
    `- ${plain(e.beats.breaks.p[1]!)} (WHO 2009 dengue guidelines)`,
    `- ${plain(e.beats.breaks.p[2]!)} (WHO 2009)`,
    `- ${plain(e.beats.week.p[0]!)} (CDC)`,
    `- ${plain(e.beats.inside.p[0]!)} (WHO fact sheet)`,
    `- ${plain(e.beats.fever.p[0]!)} (WHO)`,
    '',
    `## ${w.title}`,
    '',
    ...w.items.map((item) => `- ${plain(item)}`),
    '',
    plain(w.action),
    '',
    '## Pages',
    '',
    ...PAGE_KEYS.map((key) => {
      const title = key === 'home' ? e.title : key === 'sources' ? en.sources.title : key === 'about' ? en.about.title : en.tools[key].name;
      return `- [${title}](${base}${ROUTES[key].en}) · Bahasa Indonesia: ${base}${ROUTES[key].id}`;
    }),
    '',
    '## Sources',
    '',
    ...SOURCES.map((s) => `- ${s.cite} ${s.url}`),
    '',
  ];
  return lines.join('\n');
}

function redirects(): string {
  return [
    '# Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.',
    '# The root picks a language: a choice the visitor made earlier (the',
    '# language switch sets a pelana_en or pelana_id cookie), then the browser',
    '# language, then the visitor country, then English.',
    '/  /en/  302!  Cookie=pelana_en',
    '/  /id/  302!  Cookie=pelana_id',
    '/  /id/  302!  Language=id',
    '/  /id/  302!  Country=id',
    '/  /en/  302!',
    '',
    '# Short links.',
    '/demam  /id/hitung-hari/  301',
    '/fever  /en/count-the-days/  301',
    '',
    '# Not found, in the language of the path. Only applies to paths with no file.',
    '/id/*  /id/404/index.html  404',
    '/en/*  /en/404/index.html  404',
    '/*  /en/404/index.html  404',
    '',
  ].join('\n');
}

/** Root fallback for hosts without redirect rules: two links, no script. */
function rootIndex(assets: Assets): string {
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pelana</title>
<meta name="description" content="${escape(plain(id.site.description))}">
<link rel="canonical" href="${assets.siteUrl.replace(/\/$/, '')}/en/">
<link rel="alternate" hreflang="id" href="${assets.siteUrl.replace(/\/$/, '')}/id/">
<link rel="alternate" hreflang="en" href="${assets.siteUrl.replace(/\/$/, '')}/en/">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${assets.css}">
</head>
<body class="page-root">
<main class="rootpick">
<h1>Pelana</h1>
<p><a class="btn btn--solid" href="/id/" hreflang="id" lang="id">Bahasa Indonesia</a> <a class="btn" href="/en/" hreflang="en" lang="en">English</a></p>
</main>
</body>
</html>
`;
}

export function renderSite(assets: Assets): OutputFile[] {
  const files: OutputFile[] = [];
  for (const lang of LANGS) {
    for (const spec of pagesFor(lang, assets)) {
      const path = fileFor(ROUTES[spec.key!][lang]);
      files.push({ path, contents: document(spec, assets) });
    }
    files.push({ path: `${lang}/404/index.html`, contents: document(notFoundPage(COPY[lang], lang), assets) });
    files.push({ path: `${lang}/offline/index.html`, contents: document(offlinePage(COPY[lang], lang), assets) });
  }
  files.push({ path: '404.html', contents: document(notFoundPage(en, 'en'), assets) });
  files.push({ path: 'index.html', contents: rootIndex(assets) });
  files.push({ path: 'sitemap.xml', contents: sitemap(assets) });
  files.push({ path: 'robots.txt', contents: robots(assets) });
  files.push({ path: 'manifest.webmanifest', contents: manifest() });
  files.push({ path: 'llms.txt', contents: llms(assets) });
  files.push({ path: '_redirects', contents: redirects() });
  return files;
}
