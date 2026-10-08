// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// The document shell shared by every page: head, header, settings sheet,
// mobile menu and footer.

import type { Copy } from '../content/en.ts';
import { Html, attrs, html, md, plain, raw, jsonScript } from './html.ts';
import { icon, mark } from './icons.ts';
import { PREPAINT_SCRIPT } from './inline.ts';
import { type Lang, type PageKey, ROUTES, TOOL_KEYS, href, other } from './routes.ts';

export interface EntryAsset {
  /** URL of the entry module. */
  file: string;
  /** URLs of the chunks it imports statically, for modulepreload. */
  imports: string[];
}

export interface Assets {
  siteUrl: string;
  css: string;
  fonts: { regular: string; italic: string };
  entries: Record<string, EntryAsset>;
  og: Record<Lang, string>;
}

export interface PageSpec {
  copy: Copy;
  lang: Lang;
  /** Route key, or null for pages outside the route table (404, offline). */
  key: PageKey | null;
  title: string;
  description: string;
  body: Html;
  entry: string;
  bodyClass?: string;
  data?: Record<string, unknown>;
  jsonLd?: Record<string, unknown>[];
  noindex?: boolean;
  /** Path used for canonical and alternates when key is null. */
  path?: string;
}

const GITHUB = 'https://github.com/ResVet/pelana';

function absolute(assets: Assets, path: string): string {
  return assets.siteUrl.replace(/\/$/, '') + path;
}

function head(spec: PageSpec, assets: Assets): Html {
  const { copy, lang, key } = spec;
  const path = key ? ROUTES[key][lang] : (spec.path ?? '/');
  const canonical = absolute(assets, path);
  const entry = assets.entries[spec.entry];
  if (!entry) throw new Error(`Unknown entry "${spec.entry}"`);
  const fullTitle = key === 'home' ? spec.title : `${spec.title} | ${copy.site.name}`;
  const alternates = key
    ? html`<link rel="alternate" hreflang="id" href="${absolute(assets, ROUTES[key].id)}">
<link rel="alternate" hreflang="en" href="${absolute(assets, ROUTES[key].en)}">
<link rel="alternate" hreflang="x-default" href="${absolute(assets, ROUTES[key].en)}">`
    : '';
  const ogImage = absolute(assets, assets.og[lang]);

  return html`<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${fullTitle}</title>
<meta name="description" content="${plain(spec.description)}">
<meta name="author" content="${copy.site.author}">
<meta name="copyright" content="${copy.footer.rights}">
${spec.noindex ? raw('<meta name="robots" content="noindex">') : ''}
<link rel="license" href="/LICENSE.txt">
<link rel="canonical" href="${canonical}">
${alternates}
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#e7eeec" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b1d21" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${copy.site.name}">
<meta property="og:title" content="${fullTitle}">
<meta property="og:description" content="${plain(spec.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${copy.site.name}: ${copy.site.tagline}">
<meta property="og:locale" content="${lang === 'id' ? 'id_ID' : 'en_GB'}">
<meta property="og:locale:alternate" content="${lang === 'id' ? 'en_GB' : 'id_ID'}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preload" href="${assets.fonts.regular}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${assets.css}">
<script>${raw(PREPAINT_SCRIPT)}</script>
<script type="module" src="${entry.file}"></script>
${entry.imports.map((url) => html`<link rel="modulepreload" href="${url}">`)}
${spec.jsonLd?.length ? raw(`<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': spec.jsonLd }).replace(/</g, '\\u003c')}</script>`) : ''}
</head>`;
}

function langSwitch(spec: PageSpec, className: string): Html {
  const { copy, lang, key } = spec;
  const target = other(lang);
  const url = key ? ROUTES[key][target] : ROUTES.home[target];
  return html`<a class="${className}" href="${url}" hreflang="${target}" lang="${target}" data-lang-switch="${target}">${copy.nav.languageShort}<span class="vh">, ${copy.nav.languageLabel}</span></a>`;
}

function masthead(spec: PageSpec): Html {
  const { copy, lang, key } = spec;
  const current = (page: PageKey) => attrs({ 'aria-current': key === page ? 'page' : null });
  const toolsCurrent = key !== null && (TOOL_KEYS as readonly string[]).includes(key);
  return html`<header class="masthead" data-masthead>
<div class="masthead__inner">
<a class="brand" href="${href(lang, 'home')}"${attrs({ 'aria-label': copy.nav.home })}>${mark()}<span class="brand__name" aria-hidden="true">Pelana</span></a>
<nav class="masthead__nav" aria-label="${copy.nav.primary}">
<ul class="navlist">
<li><a href="${href(lang, 'home')}"${current('home')}>${copy.nav.story}</a></li>
<li class="navlist__tools">
<details class="disclosure" data-disclosure>
<summary${attrs({ 'data-current': toolsCurrent ? 'true' : null })}>${copy.nav.tools}</summary>
<ul class="disclosure__panel">
${TOOL_KEYS.map(
  (tool) => html`<li><a href="${href(lang, tool)}"${current(tool)}><span class="disclosure__name">${copy.tools[tool].name}</span></a></li>`,
)}
</ul>
</details>
</li>
<li><a href="${href(lang, 'sources')}"${current('sources')}>${copy.nav.sources}</a></li>
<li><a href="${href(lang, 'about')}"${current('about')}>${copy.nav.about}</a></li>
</ul>
</nav>
<div class="masthead__actions">
${key === 'tracker' ? '' : html`<a class="pill pill--alert" href="${href(lang, 'tracker')}">${icon('thermometer')}<span>${copy.nav.feverNow}</span></a>`}
${langSwitch(spec, 'langswitch')}
<button class="iconbtn" type="button" data-open="settings" aria-haspopup="dialog" aria-controls="settings">${icon('settings')}<span class="vh">${copy.nav.settings}</span></button>
<button class="iconbtn iconbtn--menu" type="button" data-open="menu" aria-haspopup="dialog" aria-controls="menu">${icon('menu')}<span class="iconbtn__label">${copy.nav.menu}</span></button>
<a class="iconbtn iconbtn--menu iconbtn--nojs" href="#site-links">${icon('menu')}<span class="iconbtn__label">${copy.nav.menu}</span></a>
</div>
</div>
</header>`;
}

type Choice = { value: string; label: string };

function segmented(name: string, legend: string, choices: Choice[], note?: string): Html {
  return html`<fieldset class="seg" data-pref="${name}">
<legend class="seg__legend">${legend}</legend>
<div class="seg__options">
${choices.map(
  (choice) => html`<label class="seg__option"><input type="radio" name="pref-${name}" value="${choice.value}"><span>${choice.label}</span></label>`,
)}
</div>
${note ? html`<p class="seg__note">${note}</p>` : ''}
</fieldset>`;
}

function settingsSheet(copy: Copy): Html {
  const s = copy.settings;
  return html`<dialog class="sheet" id="settings" aria-labelledby="settings-title">
<form method="dialog" class="sheet__inner">
<div class="sheet__head">
<h2 class="sheet__title" id="settings-title">${s.title}</h2>
<button class="iconbtn" type="submit" value="close">${icon('close')}<span class="vh">${copy.nav.close}</span></button>
</div>
<p class="sheet__intro">${s.intro}</p>
${segmented('theme', s.theme.label, [
  { value: 'system', label: s.theme.system },
  { value: 'light', label: s.theme.light },
  { value: 'dark', label: s.theme.dark },
])}
${segmented('text', s.text.label, [
  { value: 'normal', label: s.text.normal },
  { value: 'large', label: s.text.large },
  { value: 'larger', label: s.text.larger },
])}
${segmented('contrast', s.contrast.label, [
  { value: 'standard', label: s.contrast.standard },
  { value: 'high', label: s.contrast.high },
])}
${segmented('motion', s.motion.label, [
  { value: 'system', label: s.motion.system },
  { value: 'full', label: s.motion.full },
  { value: 'reduced', label: s.motion.reduced },
])}
${segmented(
  'sound',
  s.sound.label,
  [
    { value: 'off', label: s.sound.off },
    { value: 'on', label: s.sound.on },
  ],
  s.sound.note,
)}
<div class="sheet__foot"><button class="btn btn--solid" type="submit" value="done">${s.done}</button></div>
</form>
</dialog>`;
}

function menuSheet(spec: PageSpec): Html {
  const { copy, lang, key } = spec;
  const current = (page: PageKey) => attrs({ 'aria-current': key === page ? 'page' : null });
  return html`<dialog class="sheet sheet--menu" id="menu" aria-labelledby="menu-title">
<div class="sheet__inner">
<div class="sheet__head">
<h2 class="sheet__title" id="menu-title">${copy.nav.menu}</h2>
<form method="dialog"><button class="iconbtn" type="submit" value="close">${icon('close')}<span class="vh">${copy.nav.close}</span></button></form>
</div>
<nav aria-label="${copy.nav.primary}">
<ul class="menulist">
<li><a href="${href(lang, 'home')}"${current('home')}>${copy.nav.story}</a></li>
${TOOL_KEYS.map((tool) => html`<li><a href="${href(lang, tool)}"${current(tool)}>${copy.tools[tool].name}</a></li>`)}
<li><a href="${href(lang, 'sources')}"${current('sources')}>${copy.nav.sources}</a></li>
<li><a href="${href(lang, 'about')}"${current('about')}>${copy.nav.about}</a></li>
</ul>
</nav>
<div class="sheet__foot sheet__foot--split">
${langSwitch(spec, 'btn')}
<button class="btn" type="button" data-open="settings" aria-haspopup="dialog" aria-controls="settings">${icon('settings')}<span>${copy.nav.settings}</span></button>
</div>
</div>
</dialog>`;
}

function colophon(spec: PageSpec): Html {
  const { copy, lang } = spec;
  return html`<footer class="colophon">
<div class="colophon__inner">
<div class="colophon__lead">
<a class="brand brand--footer" href="${href(lang, 'home')}"${attrs({ 'aria-label': copy.nav.home })}>${mark()}<span class="brand__name" aria-hidden="true">Pelana</span></a>
<p class="colophon__about">${md(copy.footer.about)}</p>
<p class="colophon__emergency">${icon('alert')}<span>${copy.footer.emergency}</span></p>
</div>
<nav class="colophon__nav" id="site-links" aria-label="${copy.footer.nav}">
<ul>
${TOOL_KEYS.map((tool) => html`<li><a href="${href(lang, tool)}">${copy.tools[tool].name}</a></li>`)}
</ul>
<ul>
<li><a href="${href(lang, 'home')}">${copy.nav.story}</a></li>
<li><a href="${href(lang, 'sources')}">${copy.footer.sources}</a></li>
<li><a href="${href(lang, 'about')}">${copy.nav.about}</a></li>
<li><a href="${href(lang, 'about', 'license')}">${copy.footer.license}</a></li>
<li><a href="${GITHUB}" rel="noopener">${copy.footer.sourceCode}</a></li>
</ul>
</nav>
<div class="colophon__legal">
<p>${copy.footer.rights}</p>
<p>${copy.footer.updated}</p>
</div>
</div>
</footer>`;
}

export function document(spec: PageSpec, assets: Assets): string {
  const { copy, lang } = spec;
  const doc = html`<!doctype html>
<html lang="${lang}" dir="${copy.dir}" class="no-js"${attrs({ 'data-page': spec.key ?? 'other' })}>
${head(spec, assets)}
<body${attrs({ class: spec.bodyClass ?? null })}>
<a class="skiplink" href="#main">${copy.nav.skip}</a>
${masthead(spec)}
<main id="main" tabindex="-1">
${spec.body}
</main>
${colophon(spec)}
${settingsSheet(copy)}
${menuSheet(spec)}
${jsonScript('page-data', { lang, ...(spec.data ?? {}) })}
</body>
</html>
`;
  return doc.value;
}

// JSON-LD building blocks.

export function personLd(copy: Copy): Record<string, unknown> {
  return {
    '@type': 'Person',
    '@id': '#raffa',
    name: copy.site.author,
    jobTitle: copy.site.authorRole,
    affiliation: { '@type': 'CollegeOrUniversity', name: 'Universitas Sriwijaya', address: 'Palembang, Indonesia' },
    sameAs: ['https://github.com/ResVet'],
  };
}

export function websiteLd(copy: Copy, assets: Assets): Record<string, unknown> {
  return {
    '@type': 'WebSite',
    '@id': `${assets.siteUrl}/#website`,
    url: `${assets.siteUrl}/`,
    name: copy.site.name,
    description: plain(copy.site.description),
    inLanguage: ['id', 'en'],
    author: { '@id': '#raffa' },
    copyrightHolder: { '@id': '#raffa' },
    copyrightYear: 2026,
    copyrightNotice: copy.footer.rights,
    license: `${assets.siteUrl}/LICENSE.txt`,
  };
}

export function pageLd(
  spec: Pick<PageSpec, 'copy' | 'lang' | 'key' | 'title' | 'description'>,
  assets: Assets,
  type: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const path = spec.key ? ROUTES[spec.key][spec.lang] : '/';
  return {
    '@type': type,
    '@id': `${assets.siteUrl}${path}#page`,
    url: `${assets.siteUrl}${path}`,
    name: plain(spec.title),
    description: plain(spec.description),
    inLanguage: spec.lang,
    isPartOf: { '@id': `${assets.siteUrl}/#website` },
    author: { '@id': '#raffa' },
    copyrightHolder: { '@id': '#raffa' },
    copyrightYear: 2026,
    copyrightNotice: spec.copy.footer.rights,
    license: `${assets.siteUrl}/LICENSE.txt`,
    dateModified: '2026-10-08',
    ...extra,
  };
}

export const DENGUE_LD = {
  '@type': 'MedicalCondition',
  name: 'Dengue',
  alternateName: ['Dengue fever', 'Demam berdarah', 'Demam berdarah dengue', 'DBD'],
  sameAs: 'https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue',
  signOrSymptom: [
    { '@type': 'MedicalSignOrSymptom', name: 'High fever' },
    { '@type': 'MedicalSignOrSymptom', name: 'Severe headache' },
    { '@type': 'MedicalSignOrSymptom', name: 'Pain behind the eyes' },
    { '@type': 'MedicalSignOrSymptom', name: 'Muscle and joint pain' },
    { '@type': 'MedicalSignOrSymptom', name: 'Rash' },
  ],
};
