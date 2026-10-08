// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.

import type { Copy } from '../../content/en.ts';
import { groupBList, homeCareList, warningPanel } from '../components.ts';
import { html, md, plain } from '../html.ts';
import { icon } from '../icons.ts';
import { type Assets, DENGUE_LD, type PageSpec, pageLd, personLd, websiteLd } from '../layout.ts';
import type { Lang } from '../routes.ts';

export function trackerPage(copy: Copy, lang: Lang, assets: Assets): PageSpec {
  const t = copy.tracker;
  const f = t.form;
  const times = f.times;
  const phases = t.result.phases;

  const body = html`<div class="toolpage toolpage--tracker" data-tracker>
<header class="pagehead wrap">
<h1 class="pagehead__title">${t.title}</h1>
<p class="pagehead__lede">${md(t.lede)}</p>
<p class="pagehead__note">${md(t.disclaimer)}</p>
</header>

<div class="wrap tracker">
<div class="tracker__main">
<div class="people" data-people hidden>
<p class="people__label" id="people-label">${t.people.label}</p>
<div class="people__list" role="group" aria-labelledby="people-label" data-people-list></div>
<button class="btn btn--quiet" type="button" data-person-add>${icon('plus')}<span>${t.people.add}</span></button>
</div>

<form class="panel form" method="dialog" data-tracker-form novalidate>
<fieldset class="form__set">
<legend class="form__legend">${f.legend}</legend>
<div class="field">
<label class="field__label" for="t-name">${f.name}</label>
<input class="input" id="t-name" name="name" type="text" maxlength="40" autocomplete="off" placeholder="${f.namePlaceholder}" aria-describedby="t-name-hint">
<p class="field__hint" id="t-name-hint">${f.nameHint}</p>
</div>
<div class="form__row">
<div class="field">
<label class="field__label" for="t-date">${f.date}</label>
<input class="input" id="t-date" name="date" type="date" required aria-describedby="t-error">
</div>
<div class="field">
<label class="field__label" for="t-time">${f.time}</label>
<select class="input" id="t-time" name="time">
<option value="morning">${times.morning}</option>
<option value="afternoon">${times.afternoon}</option>
<option value="evening">${times.evening}</option>
<option value="night">${times.night}</option>
</select>
</div>
</div>
<p class="field__error" id="t-error" data-error role="alert" hidden></p>
<button class="btn btn--solid" type="submit">${f.submit}</button>
</fieldset>
<noscript><p class="panel__note">${copy.common.noScript}</p></noscript>
</form>

<section class="result panel" data-result hidden aria-labelledby="result-title">
<div class="result__top">
<div class="result__count">
<canvas class="result__mosaic" data-mosaic aria-hidden="true"></canvas>
<h2 class="result__title" id="result-title" data-result-title tabindex="-1"></h2>
</div>
<p class="result__since" data-since></p>
</div>
<div class="phasebox" data-phasebox>
<h3 class="phasebox__title" data-phase-title></h3>
<p class="phasebox__text" data-phase-text></p>
</div>
<div class="daystrip" data-daystrip>
<p class="daystrip__label" id="daystrip-label">${t.result.calendarLabel}</p>
<ol class="daystrip__list" aria-labelledby="daystrip-label" data-daystrip-list></ol>
</div>
<p class="result__window" data-window></p>
</section>

${warningPanel(copy, { id: 'signs', headingLevel: 2, checklist: true })}

<section class="panel phases" aria-labelledby="phases-title">
<h2 class="panel__title" id="phases-title">${t.usual.h}</h2>
<ol class="phaselist" role="list">
<li class="phaselist__item" data-phase="fever"><p class="phaselist__days">${md(t.usual.early)}</p><h3>${phases.early.h}</h3><p>${md(phases.early.p)}</p></li>
<li class="phaselist__item" data-phase="critical"><p class="phaselist__days">${md(t.usual.critical)}</p><h3>${phases.critical.h}</h3><p>${md(phases.critical.p)}</p></li>
<li class="phaselist__item" data-phase="recovery"><p class="phaselist__days">${md(t.usual.late)}</p><h3>${phases.late.h}</h3><p>${md(phases.late.p)}</p></li>
</ol>
</section>

<section class="panel log" data-log hidden aria-labelledby="log-title">
<h2 class="panel__title" id="log-title">${t.log.h}</h2>
<p>${md(t.log.p)}</p>
<form class="form form--inline" method="dialog" data-log-form novalidate>
<div class="form__row form__row--3">
<div class="field">
<label class="field__label" for="l-temp">${t.log.temp}</label>
<input class="input" id="l-temp" name="temp" type="text" inputmode="decimal" placeholder="${t.log.tempPlaceholder}" aria-describedby="l-error">
</div>
<div class="field">
<label class="field__label" for="l-when">${t.log.when}</label>
<input class="input" id="l-when" name="when" type="datetime-local">
</div>
<div class="field">
<label class="field__label" for="l-drank">${t.log.drank}</label>
<select class="input" id="l-drank" name="drank">
<option value="">${t.log.drankOptions.none}</option>
<option value="little">${t.log.drankOptions.little}</option>
<option value="some">${t.log.drankOptions.some}</option>
<option value="plenty">${t.log.drankOptions.plenty}</option>
</select>
</div>
</div>
<div class="form__row">
<label class="check"><input type="checkbox" name="urine"><span>${t.log.urine}</span></label>
</div>
<div class="field">
<label class="field__label" for="l-note">${t.log.note}</label>
<input class="input" id="l-note" name="note" type="text" maxlength="140" autocomplete="off">
</div>
<p class="field__error" id="l-error" data-log-error role="alert" hidden></p>
<button class="btn" type="submit">${icon('plus')}<span>${t.log.add}</span></button>
</form>
<figure class="tempchart" data-tempchart hidden>
<figcaption class="tempchart__title">${t.log.chartTitle}</figcaption>
<div class="tempchart__plot" data-tempchart-plot></div>
</figure>
<ul class="loglist" data-loglist role="list"></ul>
<p class="loglist__empty" data-log-empty>${t.log.empty}</p>
<p class="vh" data-log-status role="status" aria-live="polite"></p>
</section>

<section class="panel export" data-export hidden aria-labelledby="export-title">
<h2 class="panel__title" id="export-title">${t.export.h}</h2>
<div class="export__actions">
<button class="btn" type="button" data-export-ics>${icon('calendar')}<span>${t.export.calendar}</span></button>
<button class="btn" type="button" data-export-copy>${icon('copy')}<span>${t.export.copy}</span></button>
<a class="btn" href="https://wa.me/" data-export-wa rel="noopener" target="_blank">${icon('chat')}<span>${t.export.whatsapp}</span></a>
<button class="btn" type="button" data-export-print>${icon('print')}<span>${t.export.print}</span></button>
</div>
<p class="export__hint">${t.export.calendarHint}</p>
<p class="toast" data-toast role="status" aria-live="polite"></p>
</section>
</div>

<aside class="tracker__side">
${groupBList(copy, 2)}
${homeCareList(copy, 2)}
<section class="panel privacy" aria-labelledby="privacy-title">
<h2 class="panel__title" id="privacy-title">${t.privacy.h}</h2>
<p>${t.privacy.p}</p>
<button class="btn btn--quiet" type="button" data-clear>${icon('trash')}<span>${t.privacy.clear}</span></button>
</section>
</aside>
</div>
</div>`;

  const spec: PageSpec = {
    copy,
    lang,
    key: 'tracker',
    title: t.title,
    description: t.description,
    body,
    entry: 'tracker',
    bodyClass: 'page-tool page-tracker',
    data: {
      strings: {
        form: { future: f.future, tooOld: f.tooOld, missing: f.missing },
        result: t.result,
        log: { remove: t.log.remove, added: t.log.added, removed: t.log.removed, invalidTemp: t.log.invalidTemp, drank: t.log.drankOptions, urine: t.log.urine, chartTitle: t.log.chartTitle },
        export: t.export,
        privacy: { confirm: t.privacy.confirm, cleared: t.privacy.cleared },
        people: t.people,
        copied: copy.common.copied,
        warningAction: plain(copy.common.warning.action),
        warningItems: copy.common.warning.items.map(plain),
        times: f.times,
      },
    },
  };
  spec.jsonLd = [
    websiteLd(copy, assets),
    personLd(copy),
    pageLd(spec, assets, 'WebApplication', {
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'IDR' },
      about: DENGUE_LD,
    }),
  ];
  return spec;
}
