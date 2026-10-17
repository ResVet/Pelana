// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.

import type { Copy } from '../../content/en.ts';
import { ROOMS, SPOTS } from '../../shared/house.ts';
import { attrs, fmt, html, md, plain } from '../html.ts';
import { icon } from '../icons.ts';
import { type Assets, type PageSpec, pageLd, personLd, websiteLd } from '../layout.ts';
import type { Lang } from '../routes.ts';

export function housePage(copy: Copy, lang: Lang, assets: Assets): PageSpec {
  const h = copy.house;
  const total = SPOTS.length;

  const body = html`<div class="toolpage toolpage--house" data-house>
<header class="pagehead wrap">
<h1 class="pagehead__title">${h.title}</h1>
<p class="pagehead__lede">${md(h.lede)}</p>
</header>

<div class="wrap house">
<div class="house__stage" data-house-stage>
<div class="house__fallback" aria-hidden="true"></div>
<canvas class="house__gl" data-gl aria-hidden="true"></canvas>
<div class="house__hotspots" data-hotspots></div>
<p class="house__hint" data-hint>${h.viewHint}</p>
<div class="house__turn">
<button class="iconbtn" type="button" data-turn-by="-1">${icon('turnLeft')}<span class="vh">${copy.common.turnLeft}</span></button>
<button class="iconbtn" type="button" data-turn-by="1">${icon('turnRight')}<span class="vh">${copy.common.turnRight}</span></button>
</div>
</div>

<div class="house__panel">
<p class="house__progress" data-progress role="status">${fmt(h.progress, { n: 0, total })}</p>
<div class="spotcard panel" data-spotcard hidden aria-live="polite">
<p class="spotcard__room" data-spot-room></p>
<h2 class="spotcard__name" data-spot-name tabindex="-1"></h2>
<p class="spotcard__action"><span class="actionchip" data-spot-action></span></p>
<p class="spotcard__text" data-spot-text></p>
<button class="btn btn--solid" type="button" data-spot-toggle>${icon('check')}<span>${h.mark}</span></button>
</div>

<section class="spots" aria-labelledby="spots-title">
<h2 class="spots__title" id="spots-title">${h.listHeading}</h2>
${ROOMS.map((room) => {
  const spots = SPOTS.filter((s) => s.room === room);
  return html`<div class="spots__room">
<h3 class="spots__roomname">${h.rooms[room]}</h3>
<ul class="spotlist" role="list">
${spots.map((s) => {
  const spot = h.spots[s.key];
  return html`<li class="spotlist__item" data-spot="${s.key}">
<label class="spotlist__check"><input type="checkbox" name="done" value="${s.key}" data-done="${s.key}"><span class="vh">${h.mark}: ${spot.name}</span></label>
<button class="spotlist__open" type="button" data-open-spot="${s.key}"${attrs({ 'aria-describedby': `spot-${s.key}-text` })}><span class="spotlist__name">${spot.name}</span><span class="actionchip" data-action="${spot.action}">${h.actions[spot.action as keyof typeof h.actions]}</span></button>
<p class="spotlist__text" id="spot-${s.key}-text">${md(spot.text)}</p>
</li>`;
})}
</ul>
</div>`;
})}
<button class="btn btn--quiet" type="button" data-reset>${icon('reset')}<span>${h.reset}</span></button>
</section>
</div>

<section class="panel reminder" aria-labelledby="reminder-title">
<h2 class="panel__title" id="reminder-title">${h.reminder.h}</h2>
<p>${md(h.reminder.p)}</p>
<form class="form form--inline" method="dialog" data-reminder-form>
<div class="form__row">
<div class="field">
<label class="field__label" for="r-day">${h.reminder.day}</label>
<select class="input" id="r-day" name="day">${h.reminder.days.map((d, i) => html`<option value="${i}"${attrs({ selected: i === 4 })}>${d}</option>`)}</select>
</div>
<div class="field">
<label class="field__label" for="r-time">${h.reminder.time}</label>
<input class="input" id="r-time" name="time" type="time" value="08:00">
</div>
</div>
<div class="reminder__actions">
<button class="btn btn--solid" type="submit">${icon('calendar')}<span>${h.reminder.button}</span></button>
<button class="btn" type="button" data-print>${icon('print')}<span>${h.print}</span></button>
</div>
</form>
</section>
</div>
</div>`;

  const spec: PageSpec = {
    copy,
    lang,
    key: 'house',
    title: h.title,
    description: h.description,
    body,
    entry: 'house',
    bodyClass: 'page-tool page-house',
    data: {
      strings: {
        progress: h.progress,
        done: h.done,
        mark: h.mark,
        unmark: h.unmark,
        actions: h.actions,
        rooms: h.rooms,
        spots: Object.fromEntries(Object.entries(h.spots).map(([k, v]) => [k, { name: v.name, action: v.action, text: plain(v.text) }])),
        reminder: h.reminder,
      },
    },
  };
  spec.jsonLd = [
    websiteLd(copy, assets),
    personLd(copy),
    pageLd(spec, assets, 'WebApplication', {
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Any',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'IDR' },
    }),
  ];
  return spec;
}
