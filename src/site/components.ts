// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Pieces of markup shared between pages.

import type { Copy } from '../content/en.ts';
import { COURSE, type CourseDay } from '../shared/course.ts';
import { Html, attrs, fmt, html, md } from './html.ts';
import { icon } from './icons.ts';
import { type Lang, TOOL_KEYS, href } from './routes.ts';

export function dayLabel(copy: Copy, day: number): string {
  if (day < 0) return day === -1 ? copy.day.labelBeforeOne : fmt(copy.day.labelBefore, { n: -day });
  return fmt(copy.day.labelDuring, { n: day });
}

export function formatNumber(lang: Lang, value: number, digits = 0): string {
  return new Intl.NumberFormat(lang === 'id' ? 'id-ID' : 'en-GB', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** The list of warning signs, with the action line. Used on the story page and the tracker. */
export function warningPanel(copy: Copy, opts: { id?: string; headingLevel?: 2 | 3; checklist?: boolean } = {}): Html {
  const w = copy.common.warning;
  const level = opts.headingLevel ?? 3;
  const headingId = `${opts.id ?? 'warning'}-title`;
  const heading = level === 2 ? html`<h2 class="alert__title" id="${headingId}">${w.title}</h2>` : html`<h3 class="alert__title" id="${headingId}">${w.title}</h3>`;
  const items = w.items.map((item, i) =>
    opts.checklist
      ? html`<li><label class="alert__check"><input type="checkbox" name="sign" value="${i}" data-sign><span>${md(item)}</span></label></li>`
      : html`<li>${md(item)}</li>`,
  );
  return html`<section class="alert"${attrs({ id: opts.id ?? null, 'aria-labelledby': headingId })}${attrs({ 'data-alert': opts.checklist ? 'checklist' : null })}>
<div class="alert__head">${icon('alert')}${heading}</div>
<ul class="alert__list" role="list">${items}</ul>
<p class="alert__action" data-alert-action>${md(w.action)}</p>
${opts.checklist ? html`<p class="vh" data-alert-live role="alert"></p>` : ''}
</section>`;
}

export function groupBList(copy: Copy, headingLevel: 2 | 3 = 3): Html {
  const g = copy.common.groupB;
  const h = headingLevel === 2 ? html`<h2>${g.title}</h2>` : html`<h3>${g.title}</h3>`;
  return html`<section class="note note--care">${h}<ul class="tilelist" role="list">${g.items.map((item) => html`<li>${md(item)}</li>`)}</ul><p class="note__foot">${g.note}</p></section>`;
}

export function homeCareList(copy: Copy, headingLevel: 2 | 3 = 3): Html {
  const c = copy.common.homeCare;
  const h = headingLevel === 2 ? html`<h2>${c.title}</h2>` : html`<h3>${c.title}</h3>`;
  return html`<section class="note">${h}<ul class="tilelist" role="list">${c.items.map((item) => html`<li>${md(item)}</li>`)}</ul></section>`;
}

// The fever chart: three small panels sharing one day axis (temperature,
// haematocrit, platelets). Each panel has its own scale, so there is never a
// second y-axis. Lines and dots are drawn with non-scaling strokes inside a
// stretched SVG; text lives in HTML so it stays readable at any width.

interface Series {
  key: 'temp' | 'hct' | 'plt';
  min: number;
  max: number;
  value: (d: CourseDay) => number;
  grid: number[];
  reference?: { value: number; label: string };
}

const W = 1000;
const H = 100;

function xOf(day: number): number {
  return ((day - 0.5) / COURSE.length) * W;
}

function yOf(s: Series, v: number): number {
  return H - ((v - s.min) / (s.max - s.min)) * H;
}

export function feverChart(copy: Copy, lang: Lang, opts: { decorative: boolean; id: string }): Html {
  const c = copy.home.beats.saddle.chart;
  const series: Series[] = [
    { key: 'temp', min: 36, max: 41, value: (d) => d.temp, grid: [37, 39, 40], reference: { value: 38, label: '38\u00a0°C' } },
    { key: 'hct', min: 34, max: 50, value: (d) => d.hct, grid: [38, 42, 46], reference: { value: 48, label: '+20%' } },
    {
      key: 'plt',
      min: 0,
      max: 250,
      value: (d) => d.plt,
      grid: [50, 150, 200],
      reference: { value: 100, label: formatNumber(lang, 100000) },
    },
  ];
  const labels = { temp: c.temp, hct: c.hct, plt: c.plt };
  const units = { temp: '\u00a0°C', hct: '%', plt: '' };
  const digits = { temp: 1, hct: 0, plt: 0 };
  // Platelets are stored in thousands per µL and shown in full.
  const pltValue = (v: number) => v * 1000;
  const panels = series.map((s) => {
    const points = COURSE.map((d) => [xOf(d.day), yOf(s, s.value(d))] as const);
    const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
    const dots = points.map(([x, y]) => `M${x.toFixed(1)} ${y.toFixed(1)}h0`).join('');
    const grid = s.grid.map((g) => `M0 ${yOf(s, g).toFixed(1)}H${W}`).join('');
    const first = COURSE[0]!;
    const range =
      s.key === 'plt'
        ? `${formatNumber(lang, 0)}–${formatNumber(lang, pltValue(s.max))}`
        : `${formatNumber(lang, s.min)}–${formatNumber(lang, s.max)}${units[s.key]}`;
    const shown = s.key === 'plt' ? html`${formatNumber(lang, pltValue(first.plt))}` : html`${formatNumber(lang, s.value(first), digits[s.key])}${units[s.key]}`;
    return html`<div class="fpanel" data-series="${s.key}">
<p class="fpanel__head"><span class="fpanel__name"><span class="fpanel__key" aria-hidden="true"></span>${labels[s.key]}</span>${opts.decorative ? html`<span class="fpanel__value" data-value>${shown}</span>` : ''}</p>
<div class="fpanel__plot">
<svg class="fpanel__svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
<rect class="fpanel__band" x="${xOf(3.5).toFixed(1)}" y="-10" width="${(xOf(6.5) - xOf(3.5)).toFixed(1)}" height="${H + 20}"/>
<path class="fpanel__grid" d="${grid}"/>
${s.reference ? html`<path class="fpanel__ref" d="M0 ${yOf(s, s.reference.value).toFixed(1)}H${W}"/>` : ''}
<g class="fpanel__data">
<path class="fpanel__line" d="${line}"/>
<path class="fpanel__ring" d="${dots}"/>
<path class="fpanel__dot" d="${dots}"/>
</g>
</svg>
${s.reference ? html`<span class="fpanel__reflabel" data-ref="${s.key}" aria-hidden="true">${s.reference.label}</span>` : ''}
<span class="fpanel__cursor" aria-hidden="true"></span>
</div>
<p class="fpanel__range" aria-hidden="true">${range}</p>
</div>`;
  });

  const days = COURSE.map((d) => html`<span${attrs({ 'data-day': d.day })}>${d.day}</span>`);
  const table = opts.decorative
    ? ''
    : html`<details class="datatable">
<summary>${copy.common.showNumbers}</summary>
<div class="datatable__scroll" tabindex="0" role="region" aria-label="${c.title}"><table>
<caption>${c.title}. ${copy.common.illustrative}</caption>
<thead><tr><th scope="col">${c.day}</th><th scope="col">${c.temp} (°C)</th><th scope="col">${c.hct} (%)</th><th scope="col">${c.plt} (/µL)</th></tr></thead>
<tbody>${COURSE.map(
        (d) =>
          html`<tr><th scope="row">${d.day}</th><td>${formatNumber(lang, d.temp, 1)}</td><td>${formatNumber(lang, d.hct)}</td><td>${formatNumber(lang, pltValue(d.plt))}</td></tr>`,
      )}</tbody>
</table></div>
</details>`;

  return html`<figure class="feverchart"${attrs({ id: opts.id, 'data-feverchart': true, 'aria-hidden': opts.decorative ? 'true' : null })}>
<figcaption class="feverchart__title">${c.title}<span class="feverchart__note">${copy.common.illustrative}</span></figcaption>
<div class="feverchart__panels">${panels}</div>
<div class="feverchart__axis" aria-hidden="true"><span class="feverchart__axislabel">${c.day}</span><div class="feverchart__days">${days}</div></div>
<p class="feverchart__legend"><span class="feverchart__band" aria-hidden="true"></span>${c.critical}</p>
${table}
</figure>`;
}

export function labSlip(copy: Copy, lang: Lang, days: number[]): Html {
  const p = copy.home.beats.platelets;
  const rows = days.map((day) => COURSE.find((d) => d.day === day)!);
  return html`<figure class="labslip" tabindex="0" aria-label="${p.slip}">
<figcaption class="labslip__title">${p.slip}</figcaption>
<table class="labslip__table">
<thead><tr><th scope="col"><span class="vh">${copy.home.beats.saddle.chart.day}</span></th>${rows.map((r) => html`<th scope="col">${fmt(p.slipDay, { n: r.day })}</th>`)}</tr></thead>
<tbody>
<tr><th scope="row">${p.slipRows.hct}</th>${rows.map((r) => html`<td>${formatNumber(lang, r.hct)}%</td>`)}</tr>
<tr><th scope="row">${p.slipRows.plt}</th>${rows.map((r) => html`<td>${formatNumber(lang, r.plt * 1000)}</td>`)}</tr>
<tr><th scope="row">${p.slipRows.wbc}</th>${rows.map((r) => html`<td>${formatNumber(lang, r.wbc * 1000)}</td>`)}</tr>
</tbody>
</table>
<p class="labslip__note">${copy.common.illustrative}</p>
</figure>`;
}

export function toolsIndex(copy: Copy, lang: Lang, headingLevel: 2 | 3 = 2): Html {
  return html`<ul class="toolsindex" role="list">
${TOOL_KEYS.map((tool) => {
  const t = copy.tools[tool];
  const heading =
    headingLevel === 2
      ? html`<h2 class="toolsindex__name"><a href="${href(lang, tool)}">${t.name}</a></h2>`
      : html`<h3 class="toolsindex__name"><a href="${href(lang, tool)}">${t.name}</a></h3>`;
  return html`<li class="toolsindex__item" data-tool="${tool}">
<span class="toolsindex__glyph" aria-hidden="true" data-glyph="${tool}"></span>
${heading}
<p class="toolsindex__blurb">${md(t.blurb)}</p>
</li>`;
})}
</ul>`;
}
