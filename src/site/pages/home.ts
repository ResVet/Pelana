// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// The story page. The text is ordinary HTML in reading order, so it works as
// a long article without JavaScript. With JavaScript, a sticky stage behind
// the text turns the scroll position into a day count and drives the 3D
// scenes, the mosaic counter and the fever chart.

import type { Copy } from '../../content/en.ts';
import { BEATS, type Beat, type BeatKey, DAYS, phaseOf } from '../../shared/course.ts';
import { dayLabel, feverChart, labSlip, toolsIndex, warningPanel } from '../components.ts';
import { Html, attrs, html, md, plain } from '../html.ts';
import { icon } from '../icons.ts';
import { type Assets, DENGUE_LD, type PageSpec, pageLd, personLd, websiteLd } from '../layout.ts';
import { type Lang, href } from '../routes.ts';

type BeatCopy = { h: string; p: string[] };

function paragraphs(list: string[]): Html {
  return html`${list.map((p) => html`<p>${md(p)}</p>`)}`;
}

/** Days covered by each beat on the rail: from its own day up to the next beat's. */
function railSegments(): { beat: Beat; days: number[] }[] {
  const segments: { beat: Beat; days: number[] }[] = [];
  const seen = new Set<number>();
  BEATS.forEach((beat, i) => {
    const next = BEATS[i + 1];
    const days = DAYS.filter((d) => d >= beat.day && (next ? d < next.day : true) && !seen.has(d));
    days.forEach((d) => seen.add(d));
    if (days.length) segments.push({ beat, days });
  });
  return segments;
}

function titleOf(copy: Copy, key: BeatKey): string {
  if (key === 'hero') return copy.home.hero.title;
  if (key === 'breaks') return copy.home.beats.breaks.h;
  return (copy.home.beats[key as Exclude<BeatKey, 'hero'>] as BeatCopy).h;
}

/** The tiles along the edge of the stage: one per day, grouped by chapter. Decorative; the chapter list below is the accessible way to jump. */
function rail(): Html {
  return html`<div class="dayrail" data-rail aria-hidden="true">
${railSegments().map(
  ({ beat, days }) => html`<span class="dayrail__seg" data-rail-beat="${beat.key}">${days.map(
    (d) => html`<span class="dayrail__tile"${attrs({ 'data-day': d, 'data-phase': phaseOf(d) })}></span>`,
  )}</span>`,
)}
</div>`;
}

/** The drag hint with buttons that do the same, for anyone who cannot drag. Shown once the 3D runs. */
function turnControls(copy: Copy, hint: string): Html {
  return html`<div class="turn" data-needs-gl hidden>
<p class="beat__hint">${hint}</p>
<div class="turn__buttons">
<button class="iconbtn" type="button" data-turn-by="-1">${icon('turnLeft')}<span class="vh">${copy.common.turnLeft}</span></button>
<button class="iconbtn" type="button" data-turn-by="1">${icon('turnRight')}<span class="vh">${copy.common.turnRight}</span></button>
</div>
</div>`;
}

function chaptersSheet(copy: Copy): Html {
  return html`<dialog class="sheet" id="chapters" aria-labelledby="chapters-title">
<div class="sheet__inner">
<div class="sheet__head">
<h2 class="sheet__title" id="chapters-title">${copy.day.railLabel}</h2>
<form method="dialog"><button class="iconbtn" type="submit" value="close">${icon('close')}<span class="vh">${copy.nav.close}</span></button></form>
</div>
<ol class="chapters" role="list">
${BEATS.filter((b) => b.key !== 'again').map(
  (beat) => html`<li><a class="chapters__link" href="#${beat.key === 'hero' ? 'story' : beat.key}" data-chapter="${beat.key}"><span class="chapters__day"${attrs({ 'data-phase': phaseOf(beat.day) })}>${dayLabel(copy, beat.day)}</span><span class="chapters__title">${plain(titleOf(copy, beat.key))}</span></a></li>`,
)}
<li><a class="chapters__link" href="#prevention"><span class="chapters__day">${copy.day.labelAfter}</span><span class="chapters__title">${copy.home.prevention.h}</span></a></li>
<li><a class="chapters__link" href="#tools"><span class="chapters__day">${copy.nav.tools}</span><span class="chapters__title">${copy.home.toolsSection.h}</span></a></li>
</ol>
</div>
</dialog>`;
}

function stage(copy: Copy, lang: Lang): Html {
  return html`<div class="stage" data-stage>
<div class="stage__fallback" aria-hidden="true"><div class="stage__water"></div></div>
<canvas class="stage__gl" data-gl aria-hidden="true"></canvas>
<div class="stage__scrim" aria-hidden="true"></div>
<div class="stage__overlay" data-overlay="chart" aria-hidden="true">${feverChart(copy, lang, { decorative: true, id: 'stage-chart' })}</div>
<div class="stage__tube" data-overlay="tube" aria-hidden="true">
<svg class="tube" viewBox="0 0 60 220" aria-hidden="true" focusable="false">
<rect class="tube__glass" x="14" y="6" width="32" height="208" rx="16"/>
<rect class="tube__plasma" x="18" y="10" width="24" height="200" rx="12"/>
<rect class="tube__cells" data-tube-cells x="18" y="130" width="24" height="80" rx="12"/>
<rect class="tube__buffy" data-tube-buffy x="18" y="127" width="24" height="3"/>
</svg>
<p class="tube__label"><span>${copy.home.beats.platelets.slipRows.hct}</span> <strong data-tube-value>40%</strong></p>
</div>
${rail()}
<div class="counter" data-counter aria-hidden="true">
<p class="counter__label" data-counter-label>${copy.day.before}</p>
<p class="counter__value"><canvas class="counter__mosaic" data-mosaic></canvas><span class="counter__text" data-counter-text>30</span></p>
<p class="counter__phase" data-counter-phase>${copy.day.phases.egg}</p>
</div>
</div>`;
}

function beatSection(copy: Copy, lang: Lang, beat: Beat): Html {
  const b = copy.home.beats;
  const label = dayLabel(copy, beat.day);
  const head = (h: string, extra: Html | string = '') =>
    html`<h2 class="beat__title" id="${beat.key}-title"><span class="beat__day">${label}</span><span class="vh">. </span><span class="beat__h">${md(h)}</span></h2>${extra}`;
  const open = (body: Html, variant = '', tools?: Html) =>
    html`<section class="beat${variant}${tools ? ' beat--tools' : ''}" id="${beat.key}"${attrs({ 'data-beat': beat.key, 'data-day': beat.day, 'data-scene': beat.scene, 'data-phase': phaseOf(beat.day) })}>
<div class="beat__text">${body}</div>
${tools ? html`<div class="beat__tools">${tools}</div>` : ''}
</section>`;

  switch (beat.key) {
    case 'hero':
      return html``;
    case 'week':
      return open(html`${head(b.week.h)}${paragraphs(b.week.p)}
<div class="beat__action" data-drain>
<button class="btn btn--water" type="button" data-action="drain">${icon('drop')}<span>${b.week.drain}</span></button>
<p class="beat__aside" id="drained-note" data-drained hidden>${md(b.week.drained)}</p>
<button class="btn btn--quiet" type="button" data-action="refill" aria-describedby="drained-note" hidden>${b.week.refill}</button>
</div>`);
    case 'adult': {
      const parts = b.adult.parts;
      const keys = ['lyre', 'legs', 'proboscis', 'wings'] as const;
      return open(html`${head(b.adult.h)}${paragraphs(b.adult.p)}`, '', html`<div class="parts" data-parts>
<p class="parts__title" id="parts-title">${b.adult.look}</p>
<div class="parts__buttons" role="group" aria-labelledby="parts-title">
${keys.map((k) => html`<button class="chip" type="button" aria-pressed="false" data-part="${k}">${parts[k].label}</button>`)}
</div>
<p class="parts__note" data-part-note aria-live="polite"></p>
<dl class="parts__list">
${keys.map((k) => html`<div><dt>${parts[k].label}</dt><dd>${md(parts[k].note)}</dd></div>`)}
</dl>
${turnControls(copy, b.adult.rotate)}
</div>`);
    }
    case 'virion': {
      const v = b.virion;
      return open(html`${head(v.h)}${paragraphs(v.p)}`, '', html`<div class="explode" data-explode data-needs-gl hidden>
<label class="explode__label" for="explode">${v.explode}</label>
<input class="range" id="explode" type="range" min="0" max="3" step="1" value="0" data-explode-input${attrs({ 'aria-valuetext': v.layers[0] })}>
<ol class="explode__steps" aria-hidden="true">${v.layers.map((l) => html`<li>${l}</li>`)}</ol>
</div>
<p class="beat__small">${md(v.domains)}</p>
<p class="beat__small">${md(v.model)}</p>
${turnControls(copy, v.rotate)}`);
    }
    case 'breaks':
      return html`<section class="beat beat--takeover" id="breaks"${attrs({ 'data-beat': 'breaks', 'data-day': beat.day, 'data-scene': beat.scene })}>
<p class="takeover" aria-hidden="true" data-takeover>${b.breaks.big}</p>
<div class="beat__text">
<h2 class="beat__title" id="breaks-title"><span class="beat__day">${label}</span><span class="vh">. </span><span class="beat__h">${b.breaks.h}</span></h2>
${paragraphs(b.breaks.p)}
</div>
</section>`;
    case 'platelets':
      return open(html`${head(b.platelets.h)}${paragraphs(b.platelets.p)}${labSlip(copy, lang, [3, 4, 5, 7])}`);
    case 'warning':
      return open(
        html`${head(b.warning.h)}${paragraphs(b.warning.p)}${warningPanel(copy, { id: 'signs' })}
<p class="beat__cta"><a class="btn btn--alert" href="${href(lang, 'tracker')}">${icon('thermometer')}<span>${b.warning.cta}</span></a></p>`,
        ' beat--alert',
      );
    case 'saddle':
      return open(html`${head(b.saddle.h)}${paragraphs(b.saddle.p)}${feverChart(copy, lang, { decorative: false, id: 'fever-chart' })}`, ' beat--wide');
    case 'again':
      return html`<section class="beat beat--again" id="again"${attrs({ 'data-beat': 'again', 'data-day': beat.day, 'data-scene': beat.scene })}>
<div class="beat__text">
<h2 class="beat__title" id="again-title"><span class="beat__day">${copy.day.labelAfter}</span><span class="vh">. </span><span class="beat__h">${b.again.h}</span></h2>
${paragraphs(b.again.p)}
</div>
</section>`;
    default: {
      const c = b[beat.key] as BeatCopy;
      return open(html`${head(c.h)}${paragraphs(c.p)}`);
    }
  }
}

function prevention(copy: Copy, lang: Lang): Html {
  const p = copy.home.prevention;
  return html`<section class="prevention" id="prevention" aria-labelledby="prevention-title">
<div class="wrap">
<h2 class="section-title" id="prevention-title">${p.h}</h2>
<div class="prevention__grid">
<article class="prevention__item" aria-labelledby="psn-title">
<h3 id="psn-title">${p.psn.h}</h3>
${paragraphs(p.psn.p)}
<p><a class="textlink" href="${href(lang, 'house')}">${p.psn.cta}</a></p>
</article>
<article class="prevention__item" aria-labelledby="wolbachia-title">
<h3 id="wolbachia-title">${p.wolbachia.h}</h3>
${paragraphs(p.wolbachia.p)}
<p><a class="textlink" href="${href(lang, 'outbreak')}">${p.wolbachia.cta}</a></p>
</article>
<article class="prevention__item" aria-labelledby="vaccine-title">
<h3 id="vaccine-title">${p.vaccine.h}</h3>
${paragraphs(p.vaccine.p)}
</article>
</div>
</div>
</section>`;
}

export function homePage(copy: Copy, lang: Lang, assets: Assets): PageSpec {
  const h = copy.home;
  const beats = BEATS.filter((b) => b.key !== 'hero');
  const body = html`<section class="story" id="story" aria-labelledby="story-title" data-story>
${stage(copy, lang)}
<div class="beats">
<header class="beat beat--hero"${attrs({ 'data-beat': 'hero', 'data-day': -30, 'data-scene': 'tub-wide' })}>
<div class="beat__text">
<h1 class="hero__title" id="story-title">${h.hero.title}</h1>
<p class="hero__lede">${md(h.hero.lede)}</p>
<p class="hero__cue">${icon('down')}<span>${h.hero.scroll}</span></p>
<p class="hero__skip"><a class="textlink" href="${href(lang, 'tracker')}">${h.hero.skip}</a></p>
</div>
</header>
${beats.map((beat) => beatSection(copy, lang, beat))}
</div>
<div class="story__dock"><button class="story__chapters btn" type="button" data-open="chapters" aria-haspopup="dialog" aria-controls="chapters">${icon('tile')}<span>${copy.day.jump}</span></button></div>
</section>
${chaptersSheet(copy)}
${prevention(copy, lang)}
<section class="tools" id="tools" aria-labelledby="tools-title">
<div class="wrap">
<h2 class="section-title" id="tools-title">${h.toolsSection.h}</h2>
<p class="section-lede">${h.toolsSection.p}</p>
${toolsIndex(copy, lang, 3)}
</div>
</section>`;

  const spec: PageSpec = {
    copy,
    lang,
    key: 'home',
    title: h.title,
    description: h.description,
    body,
    entry: 'home',
    bodyClass: 'page-home',
    data: {
      beats: BEATS,
      strings: {
        before: copy.day.before,
        during: copy.day.during,
        after: copy.day.labelAfter,
        phases: copy.day.phases,
        parts: Object.fromEntries(Object.entries(h.beats.adult.parts).map(([k, v]) => [k, plain(v.note)])),
        layers: h.beats.virion.layers,
      },
    },
  };
  spec.jsonLd = [
    websiteLd(copy, assets),
    personLd(copy),
    pageLd(spec, assets, 'MedicalWebPage', {
      about: DENGUE_LD,
      audience: [
        { '@type': 'PeopleAudience', audienceType: lang === 'id' ? 'Masyarakat umum' : 'General public' },
        { '@type': 'MedicalAudience', audienceType: lang === 'id' ? 'Mahasiswa kedokteran' : 'Medical students' },
      ],
    }),
  ];
  return spec;
}
