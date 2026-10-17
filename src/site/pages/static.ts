// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// The text pages: sources, about, not found, offline.

import type { Copy } from '../../content/en.ts';
import { SOURCES, type SourceGroup } from '../../content/sources.ts';
import { attrs, html, md } from '../html.ts';
import { icon } from '../icons.ts';
import { type Assets, type PageSpec, pageLd, personLd, websiteLd } from '../layout.ts';
import { type Lang, href } from '../routes.ts';

const GROUP_ORDER: SourceGroup[] = ['clinical', 'testing', 'mosquito', 'virus', 'prevention', 'local', 'model'];

export function sourcesPage(copy: Copy, lang: Lang, assets: Assets): PageSpec {
  const s = copy.sources;
  const body = html`<div class="textpage">
<header class="pagehead wrap">
<h1 class="pagehead__title">${s.title}</h1>
<p class="pagehead__lede">${md(s.lede)}</p>
</header>
<div class="wrap textpage__body">
${GROUP_ORDER.map((group) => {
  const items = SOURCES.filter((src) => src.group === group);
  return html`<section class="refgroup" id="${group}" aria-labelledby="g-${group}">
<h2 class="refgroup__title" id="g-${group}">${s.groups[group]}</h2>
<ol class="reflist" role="list">
${items.map(
  (src) => html`<li class="ref" id="${src.id}">
<p class="ref__cite"${attrs({ lang: (src.lang ?? 'en') === lang ? null : (src.lang ?? 'en') })}><a href="${src.url}" rel="noopener"${attrs({ hreflang: src.lang ?? 'en' })}>${src.cite}</a></p>
${src.doi ? html`<p class="ref__doi">DOI <a href="https://doi.org/${src.doi}" rel="noopener">${src.doi}</a></p>` : ''}
<p class="ref__used">${src.used[lang]}</p>
</li>`,
)}
</ol>
</section>`;
})}
<section class="refgroup" id="method" aria-labelledby="g-method">
<h2 class="refgroup__title" id="g-method">${s.method.h}</h2>
${s.method.items.map((p) => html`<p>${md(p)}</p>`)}
</section>
<p class="textpage__foot">${s.accessed}</p>
</div>
</div>`;
  const spec: PageSpec = { copy, lang, key: 'sources', title: s.title, description: s.description, body, entry: 'page', bodyClass: 'page-text' };
  spec.jsonLd = [
    websiteLd(copy, assets),
    personLd(copy),
    pageLd(spec, assets, 'CollectionPage', {
      citation: SOURCES.map((src) => ({ '@type': 'CreativeWork', name: src.cite, url: src.url })),
    }),
  ];
  return spec;
}

export function aboutPage(copy: Copy, lang: Lang, assets: Assets): PageSpec {
  const a = copy.about;
  const section = (id: string, h: string, paras: string[]) =>
    html`<section class="prose" id="${id}" aria-labelledby="${id}-title"><h2 id="${id}-title">${h}</h2>${paras.map((p) => html`<p>${md(p)}</p>`)}</section>`;
  const body = html`<div class="textpage">
<header class="pagehead wrap">
<h1 class="pagehead__title">${a.title}</h1>
</header>
<div class="wrap textpage__body">
${section('who', a.who.h, a.who.p)}
${section('how', a.how.h, a.how.p)}
${section('type', a.type.h, [a.type.p])}
${section('license', a.license.h, [a.license.p])}
<section class="prose" id="contact" aria-labelledby="contact-title">
<h2 id="contact-title">${a.contact.h}</h2>
<p>${a.contact.p}</p>
<p><a class="textlink" href="https://github.com/ResVet" rel="noopener">${a.contact.link}</a></p>
</section>
</div>
</div>`;
  const spec: PageSpec = { copy, lang, key: 'about', title: a.title, description: a.description, body, entry: 'page', bodyClass: 'page-text' };
  spec.jsonLd = [websiteLd(copy, assets), personLd(copy), pageLd(spec, assets, 'AboutPage', { mainEntity: { '@id': '#raffa' } })];
  return spec;
}

export function notFoundPage(copy: Copy, lang: Lang): PageSpec {
  const n = copy.notFound;
  const body = html`<div class="textpage textpage--center">
<div class="wrap notfound">
<p class="notfound__code" aria-hidden="true"><canvas class="notfound__mosaic" data-mosaic data-mosaic-text="404"></canvas><span class="notfound__text">404</span></p>
<h1 class="pagehead__title">${n.h}</h1>
<p class="pagehead__lede">${n.p}</p>
<p><a class="btn btn--solid" href="${href(lang, 'home')}">${icon('arrow')}<span>${n.home}</span></a></p>
</div>
</div>`;
  return { copy, lang, key: null, path: `/${lang}/404/`, title: n.title, description: n.description, body, entry: 'page', bodyClass: 'page-text', noindex: true };
}

export function offlinePage(copy: Copy, lang: Lang): PageSpec {
  const o = copy.offline;
  const body = html`<div class="textpage textpage--center">
<div class="wrap notfound">
<h1 class="pagehead__title">${o.h}</h1>
<p class="pagehead__lede">${o.p}</p>
<p><a class="btn btn--solid" href="${href(lang, 'home')}">${copy.notFound.home}</a></p>
</div>
</div>`;
  return { copy, lang, key: null, path: `/${lang}/offline/`, title: o.h, description: o.p, body, entry: 'page', bodyClass: 'page-text', noindex: true };
}
