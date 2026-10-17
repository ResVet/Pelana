// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.

import type { Copy } from '../../content/en.ts';
import { DAYS, NO_ACTION, PARAMS, simulate } from '../../shared/model.ts';
import { formatNumber } from '../components.ts';
import { Html, fmt, html, md, raw } from '../html.ts';
import { icon } from '../icons.ts';
import { type Assets, type PageSpec, pageLd, personLd, websiteLd } from '../layout.ts';
import { type Lang, href } from '../routes.ts';

// The model equations in MathML, so they render as real mathematics and are
// read out properly by screen readers.
const MI = (s: string) => `<mi>${s}</mi>`;
const SUB = (base: string, sub: string) => `<msub><mi>${base}</mi><mi>${sub}</mi></msub>`;
const FRAC = (a: string, b: string) => `<mfrac><mrow>${a}</mrow><mrow>${b}</mrow></mfrac>`;
const D = (v: string) => FRAC(`<mi>d</mi>${v}`, '<mi>d</mi><mi>t</mi>');
const EQ = (lhs: string, rhs: string) => `<mtr><mtd>${lhs}</mtd><mtd><mo>=</mo></mtd><mtd columnalign="left">${rhs}</mtd></mtr>`;

const FORCE_H = `<mi>a</mi>${SUB('b', 'h')}${FRAC(SUB('I', 'v'), MI('N'))}`;
const FORCE_V = `<mi>a</mi>${SUB('b', 'v')}<mo>(</mo><mn>1</mn><mo>−</mo><mi>ε</mi><mi>w</mi><mo>)</mo>${FRAC(MI('I'), MI('N'))}`;

const EQUATIONS = raw(
  `<math display="block" class="equations"><mtable>` +
    EQ(D(MI('S')), `<mo>−</mo>${FORCE_H}<mi>S</mi>`) +
    EQ(D(MI('E')), `${FORCE_H}<mi>S</mi><mo>−</mo>${FRAC('<mi>E</mi>', SUB('τ', 'h'))}`) +
    EQ(D(MI('I')), `${FRAC('<mi>E</mi>', SUB('τ', 'h'))}<mo>−</mo>${FRAC('<mi>I</mi>', '<mi>δ</mi>')}`) +
    EQ(D(MI('R')), FRAC('<mi>I</mi>', '<mi>δ</mi>')) +
    EQ(D(MI('A')), `<mi>φ</mi>${SUB('N', 'v')}<mo>(</mo><mn>1</mn><mo>−</mo>${FRAC('<mi>A</mi>', '<mi>K</mi>')}<mo>)</mo><mo>−</mo><mo>(</mo><mi>σ</mi><mo>+</mo>${SUB('μ', 'A')}<mo>)</mo><mi>A</mi>`) +
    EQ(D(SUB('S', 'v')), `<mi>σ</mi><mi>A</mi><mo>−</mo>${FORCE_V}${SUB('S', 'v')}<mo>−</mo><mi>μ</mi>${SUB('S', 'v')}`) +
    EQ(D(SUB('E', 'v')), `${FORCE_V}${SUB('S', 'v')}<mo>−</mo><mo>(</mo>${FRAC('<mn>1</mn>', SUB('τ', 'v'))}<mo>+</mo><mi>μ</mi><mo>)</mo>${SUB('E', 'v')}`) +
    EQ(D(SUB('I', 'v')), `${FRAC(SUB('E', 'v'), SUB('τ', 'v'))}<mo>−</mo><mi>μ</mi>${SUB('I', 'v')}`) +
    `</mtable></math>`,
);

export function outbreakPage(copy: Copy, lang: Lang, assets: Assets): PageSpec {
  const o = copy.outbreak;
  const c = o.controls;
  const r = o.results;
  const m = o.model;
  const baseline = simulate(NO_ACTION);
  const n = (v: number, d = 0) => formatNumber(lang, v, d);

  const slider = (name: string, label: string, hint: string, max: number, value: number) =>
    html`<div class="field field--range">
<label class="field__label" for="o-${name}">${label} <output class="field__output" for="o-${name}" data-output="${name}">${value}%</output></label>
<input class="range" id="o-${name}" name="${name}" type="range" min="0" max="${max}" step="5" value="${value}" aria-describedby="o-${name}-hint">
<p class="field__hint" id="o-${name}-hint">${hint}</p>
</div>`;

  const rows: [string, string, Html | string][] = [
    [m.params.biting, `${n(PARAMS.biting, 1)} ${m.units.perDay}`, `Andraud 2012 (${n(0.3, 1)}–1)`],
    [m.params.bh, n(PARAMS.bh, 1), `Andraud 2012 (${n(0.1, 1)}–${n(0.75, 2)})`],
    [m.params.bv, n(PARAMS.bv, 1), `Andraud 2012 (${n(0.5, 1)}–1)`],
    [m.params.eip, `${PARAMS.eip} ${m.units.day}`, 'WHO 2009 (8–12)'],
    [m.params.iip, `${PARAMS.iip} ${m.units.day}`, 'WHO 2009 (4–10)'],
    [m.params.infectious, `${PARAMS.infectious} ${m.units.day}`, 'Andraud 2012 (3–14)'],
    [m.params.lifespan, `${PARAMS.lifespan} ${m.units.day}`, 'Andraud 2012 (4–50)'],
    [m.params.development, `${n(PARAMS.development, 1)} ${m.units.day}`, 'CDC (7–10)'],
    [m.params.wolbachia, `${PARAMS.wolbachiaBlock * 100}%`, 'Ferguson 2015 (66–75%)'],
    [m.params.vaccine, `${PARAMS.vaccineEfficacy * 100}%`, fmt(m.vaccineSource, { pct: `${n(80.2, 1)}%` })],
    [m.params.density, n(PARAMS.mosquitoesPerPerson, 1), m.chosen],
    [m.params.dry, m.dryValue, m.chosen],
    [m.params.fog, m.fogValue, m.chosen],
  ];

  const presets = Object.entries(c.presetList) as [string, string][];

  const body = html`<div class="toolpage toolpage--outbreak" data-outbreak>
<header class="pagehead wrap">
<h1 class="pagehead__title">${o.title}</h1>
<p class="pagehead__lede">${md(o.lede)}</p>
</header>

<div class="wrap outbreak">
<form class="panel controls outbreak__controls" method="dialog" data-outbreak-form>
<h2 class="panel__title">${c.h}</h2>
<div class="presets" role="group" aria-labelledby="presets-label">
<p class="presets__label" id="presets-label">${c.presets}</p>
<div class="presets__list">${presets.map(([key, label]) => html`<button class="chip" type="button" data-preset="${key}" aria-pressed="${key === 'nothing' ? 'true' : 'false'}">${label}</button>`)}</div>
</div>
${slider('breeding', c.breeding, c.breedingHint, 90, 0)}
${slider('wolbachia', c.wolbachia, c.wolbachiaHint, 100, 0)}
${slider('vaccine', c.vaccine, c.vaccineHint, 80, 0)}
<fieldset class="seg">
<legend class="seg__legend">${c.season}</legend>
<div class="seg__options">
<label class="seg__option"><input type="radio" name="season" value="rainy" checked><span>${c.seasons.rainy}</span></label>
<label class="seg__option"><input type="radio" name="season" value="dry"><span>${c.seasons.dry}</span></label>
</div>
</fieldset>
<div class="fogrow">
<button class="btn btn--quiet" type="button" data-fog aria-describedby="fog-hint">${icon('fog')}<span>${c.fog}</span></button>
<p class="field__hint" id="fog-hint">${c.fogHint}</p>
<p class="fogrow__done" data-fogged></p>
</div>
<button class="btn btn--quiet" type="reset" data-reset>${icon('reset')}<span>${c.reset}</span></button>
<noscript><p class="panel__note">${copy.common.noScript}</p></noscript>
</form>

<section class="outbreak__results" aria-labelledby="results-title">
<h2 class="vh" id="results-title">${r.h}</h2>
<dl class="stats" data-stats>
<div class="stat"><dt>${r.infected}</dt><dd data-stat="infected">${n(Math.round(baseline.total))}</dd></div>
<div class="stat"><dt>${r.peak}</dt><dd data-stat="peak">${fmt(r.peakValue, { n: baseline.peakWeek })}</dd></div>
<div class="stat"><dt><span>${r.r0}</span></dt><dd data-stat="r">${n(baseline.r, 1)}</dd><p class="stat__hint">${r.r0Hint}</p></div>
</dl>
<p class="vh" data-outbreak-status role="status" aria-live="polite"></p>

<figure class="panel epichart" data-epichart>
<figcaption class="epichart__title">${r.chartCases}</figcaption>
<p class="epichart__legend" aria-hidden="true"><span class="key key--current"></span>${r.current}<span class="key key--baseline"></span>${r.baseline}</p>
<div class="epichart__plot" data-epichart-plot></div>
<p class="epichart__axis">${r.week}</p>
<details class="datatable">
<summary>${copy.common.showNumbers}</summary>
<div class="datatable__scroll" tabindex="0" role="region" aria-label="${r.chartCases}"><table>
<caption>${r.chartCases}</caption>
<thead><tr><th scope="col">${r.week}</th><th scope="col">${r.current}</th><th scope="col">${r.baseline}</th></tr></thead>
<tbody data-epitable>${baseline.weekly.map((v, i) => html`<tr><th scope="row">${i + 1}</th><td>${n(v)}</td><td>${n(v)}</td></tr>`)}</tbody>
</table></div>
</details>
</figure>

<figure class="panel city" data-city>
<figcaption class="city__title">${o.city.label} <span class="city__day" data-city-day></span></figcaption>
<canvas class="city__canvas" data-city-canvas aria-hidden="true"></canvas>
<ul class="city__legend" role="list">
<li><span class="key" data-state="susceptible"></span>${o.city.susceptible}</li>
<li><span class="key" data-state="exposed"></span>${o.city.exposed}</li>
<li><span class="key" data-state="infectious"></span>${o.city.infectious}</li>
<li><span class="key" data-state="recovered"></span>${o.city.recovered}</li>
<li><span class="key" data-state="protected"></span>${o.city.protected}</li>
</ul>
<p class="city__counts" data-city-counts></p>
<div class="city__play">
<button class="btn btn--quiet" type="button" data-city-play>${icon('play')}<span data-city-play-label>${o.city.play}</span></button>
<input class="range" type="range" min="0" max="${DAYS}" value="${DAYS}" step="1" data-city-scrub aria-label="${o.city.scrub}">
</div>
</figure>

<figure class="panel epichart epichart--mosq" data-mosqchart>
<figcaption class="epichart__title">${r.chartMosquitoes}</figcaption>
<div class="epichart__plot" data-mosqchart-plot></div>
</figure>
</section>
</div>

<div class="wrap">
<section class="panel model" aria-labelledby="model-title">
<h2 class="panel__title" id="model-title">${m.h}</h2>
${m.p.map((p) => html`<p>${md(p)}</p>`)}
<details class="model__eq">
<summary>${m.equations}</summary>
${EQUATIONS}
</details>
<div class="datatable__scroll" tabindex="0" role="region" aria-label="${m.h}">
<table class="paramtable">
<thead><tr><th scope="col">${m.table.parameter}</th><th scope="col">${m.table.value}</th><th scope="col">${m.table.source}</th></tr></thead>
<tbody>${rows.map(([name, value, source]) => html`<tr><th scope="row">${name}</th><td>${value}</td><td>${source}</td></tr>`)}</tbody>
</table>
</div>
<p class="model__limits">${md(m.limits)}</p>
<p><a class="textlink" href="${href(lang, 'sources', 'model')}">${copy.sources.groups.model}</a></p>
</section>
</div>
</div>`;

  const spec: PageSpec = {
    copy,
    lang,
    key: 'outbreak',
    title: o.title,
    description: o.description,
    body,
    entry: 'outbreak',
    bodyClass: 'page-tool page-outbreak',
    data: {
      days: DAYS,
      strings: {
        peakValue: r.peakValue,
        none: r.none,
        fogged: c.fogged,
        baseline: r.baseline,
        current: r.current,
        week: r.week,
        play: o.city.play,
        pause: o.city.pause,
        dayLabel: o.city.day,
        counts: o.city.counts,
      },
    },
  };
  spec.jsonLd = [
    websiteLd(copy, assets),
    personLd(copy),
    pageLd(spec, assets, 'WebApplication', {
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Any',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'IDR' },
    }),
  ];
  return spec;
}
