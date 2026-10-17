// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.

import type { Copy } from '../../content/en.ts';
import { MAX_DAY, TEST_KEYS, adviceFor, strength } from '../../shared/tests.ts';
import { attrs, fmt, html, md } from '../html.ts';
import { type Assets, DENGUE_LD, type PageSpec, pageLd, personLd, websiteLd } from '../layout.ts';
import type { Lang } from '../routes.ts';

const DEFAULT_DAY = 3;

export function testingPage(copy: Copy, lang: Lang, assets: Assets): PageSpec {
  const t = copy.testing;
  const c = t.controls;
  const days = Array.from({ length: MAX_DAY }, (_, i) => i + 1);
  const label = (s: number) => (s === 2 ? t.chart.strong : s === 1 ? t.chart.weak : '');
  const advice = t.advice[adviceFor(DEFAULT_DAY)];

  const body = html`<div class="toolpage toolpage--testing" data-testing>
<header class="pagehead wrap">
<h1 class="pagehead__title">${t.title}</h1>
<p class="pagehead__lede">${md(t.lede)}</p>
</header>

<div class="wrap testing">
<form class="panel controls" method="dialog" data-testing-form>
<div class="field field--range">
<label class="field__label" for="t-day">${c.day} <output class="field__output" for="t-day" data-day-output>${fmt(c.dayValue, { n: DEFAULT_DAY })}</output></label>
<input class="range" id="t-day" name="day" type="range" min="1" max="${MAX_DAY}" step="1" value="${DEFAULT_DAY}" aria-valuetext="${fmt(c.dayValue, { n: DEFAULT_DAY })}">
<p class="field__hint" data-from-tracker hidden>${c.fromTracker}</p>
</div>
<fieldset class="seg" data-history>
<legend class="seg__legend">${c.before}</legend>
<div class="seg__options">
<label class="seg__option"><input type="radio" name="history" value="no" checked><span>${c.beforeOptions.no}</span></label>
<label class="seg__option"><input type="radio" name="history" value="yes"><span>${c.beforeOptions.yes}</span></label>
<label class="seg__option"><input type="radio" name="history" value="unknown"><span>${c.beforeOptions.unknown}</span></label>
</div>
</fieldset>
</form>

<figure class="panel testgrid" data-testgrid>
<figcaption class="testgrid__title">${t.chart.title}</figcaption>
<p class="testgrid__key" aria-hidden="true"><span class="testgrid__swatch" data-s="2"></span>${t.chart.strong}<span class="testgrid__swatch" data-s="1"></span>${t.chart.weak}</p>
<div class="testgrid__scroll" tabindex="0" role="region" aria-label="${t.chart.title}">
<table class="testgrid__table">
<thead>
<tr><th scope="col" class="testgrid__corner"><span class="vh">${t.chart.day}</span></th>${days.map((d) => html`<th scope="col"${attrs({ 'data-col': d, 'aria-current': d === DEFAULT_DAY ? 'true' : null })}>${d}</th>`)}</tr>
</thead>
<tbody>
${TEST_KEYS.map(
  (key) => html`<tr data-test="${key}">
<th scope="row"><abbr title="${t.tests[key].full}">${t.tests[key].name}</abbr></th>
${days.map((d) => {
  const s = strength(key, d, 'no');
  return html`<td${attrs({ 'data-col': d, 'data-s': s, 'aria-current': d === DEFAULT_DAY ? 'true' : null })}><span class="vh">${label(s)}</span></td>`;
})}
</tr>`,
)}
</tbody>
</table>
</div>
<p class="testgrid__axis">${t.chart.day}</p>
</figure>

<section class="panel advice" data-advice aria-live="polite" aria-labelledby="advice-title">
<h2 class="panel__title" id="advice-title" data-advice-title>${advice.h}</h2>
<p data-advice-text>${md(advice.p)}</p>
<ul class="tilelist" role="list">
<li data-advice-secondary hidden>${md(t.advice.secondary)}</li>
<li>${md(t.advice.igg)}</li>
<li>${md(t.advice.cbc)}</li>
<li>${md(t.advice.crossReact)}</li>
</ul>
</section>

<p class="testing__note">${md(t.note)}</p>
</div>
</div>`;

  const spec: PageSpec = {
    copy,
    lang,
    key: 'testing',
    title: t.title,
    description: t.description,
    body,
    entry: 'testing',
    bodyClass: 'page-tool page-testing',
    data: {
      strings: {
        dayValue: c.dayValue,
        advice: t.advice,
        strong: t.chart.strong,
        weak: t.chart.weak,
      },
    },
  };
  spec.jsonLd = [
    websiteLd(copy, assets),
    personLd(copy),
    pageLd(spec, assets, 'MedicalWebPage', { about: DENGUE_LD }),
  ];
  return spec;
}
