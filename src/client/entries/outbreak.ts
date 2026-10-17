// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Outbreak simulator. The controls post to a worker that solves the model;
// the answer is drawn as weekly bars against the no-action run, a mosquito
// curve, and a neighbourhood of 1,000 tiles that can be played day by day.

import { type Controls, DAYS, NO_ACTION, PARAMS, type Result, simulate } from '../../shared/model.ts';
import { $, $$, clamp, fmt, h, must, pageData, setText, svg } from '../core/dom.ts';
import { onFrame } from '../core/motion.ts';
import { onPrefs, reducedMotion } from '../core/prefs.ts';
import { initPage } from '../core/ui.ts';
import type { SimRequest, SimResponse } from '../sim/worker.ts';

initPage();

interface Strings {
  peakValue: string;
  none: string;
  fogged: string;
  baseline: string;
  current: string;
  week: string;
  play: string;
  pause: string;
  dayLabel: string;
  counts: string;
}

const data = pageData<Strings>();
const S = data.strings;
const locale = data.lang === 'id' ? 'id-ID' : 'en-GB';
const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const root = must('[data-outbreak]');
const form = must<HTMLFormElement>('[data-outbreak-form]', root);

const PRESETS: Record<string, Partial<Controls>> = {
  nothing: {},
  fog: { fog: [35, 42, 49] },
  psn: { breeding: 0.6 },
  wolbachia: { wolbachia: 0.8 },
  all: { breeding: 0.5, wolbachia: 0.6, vaccine: 0.4 },
};

let controls: Controls = { ...NO_ACTION, fog: [] };
let latest: SimResponse | null = null;
let requestId = 0;

// Worker, with an in-page fallback if workers are unavailable.
let worker: Worker | null = null;
try {
  worker = new Worker(__SIM_WORKER__);
  worker.onmessage = (event: MessageEvent<SimResponse>) => {
    if (event.data.id === requestId) show(event.data);
  };
  worker.onerror = () => {
    worker = null;
    run();
  };
} catch {
  worker = null;
}

function run(): void {
  requestId += 1;
  const request: SimRequest = { id: requestId, controls: { ...controls, fog: [...controls.fog] } };
  if (worker) {
    worker.postMessage(request);
    return;
  }
  show({ id: requestId, current: simulate(request.controls), baseline: simulate({ ...NO_ACTION, season: controls.season }) });
}

function readForm(): void {
  const fd = new FormData(form);
  controls = {
    breeding: Number(fd.get('breeding') ?? 0) / 100,
    wolbachia: Number(fd.get('wolbachia') ?? 0) / 100,
    vaccine: Number(fd.get('vaccine') ?? 0) / 100,
    season: fd.get('season') === 'dry' ? 'dry' : 'rainy',
    fog: controls.fog,
  };
  for (const name of ['breeding', 'wolbachia', 'vaccine'] as const) {
    const input = must<HTMLInputElement>(`#o-${name}`, form);
    const value = Number(input.value);
    setText($(`[data-output="${name}"]`, form), `${value}%`);
    input.setAttribute('aria-valuetext', `${value}%`);
    input.style.setProperty('--fill', `${(value / Number(input.max)) * 100}%`);
  }
}

function markPreset(key: string | null): void {
  $$<HTMLButtonElement>('[data-preset]', form).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.preset === key)));
}

form.addEventListener('input', () => {
  readForm();
  markPreset(null);
  run();
});

form.addEventListener('reset', () => {
  window.setTimeout(() => {
    controls = { ...NO_ACTION, fog: [] };
    readForm();
    renderFog();
    markPreset('nothing');
    run();
  });
});

$$<HTMLButtonElement>('[data-preset]', form).forEach((button) => {
  button.addEventListener('click', () => {
    const preset = PRESETS[button.dataset.preset ?? 'nothing'] ?? {};
    const next: Controls = { ...NO_ACTION, fog: [], ...preset, season: controls.season };
    for (const name of ['breeding', 'wolbachia', 'vaccine'] as const) {
      must<HTMLInputElement>(`#o-${name}`, form).value = String(Math.round(next[name] * 100));
    }
    controls = next;
    readForm();
    controls.fog = [...(preset.fog ?? [])];
    renderFog();
    markPreset(button.dataset.preset ?? null);
    run();
  });
});

function renderFog(): void {
  const label = controls.fog.map((d) => fmt(S.fogged, { n: d })).join(', ');
  setText($('[data-fogged]', form), label);
}

$('[data-fog]', form)?.addEventListener('click', () => {
  // Fog on the day the city is showing, or when the outbreak first becomes noticeable.
  const current = latest?.current;
  let day = scrubDay < DAYS ? Math.round(scrubDay) : 28;
  if (scrubDay >= DAYS && current) {
    const found = current.days.find((d) => d.cumulative >= 10);
    day = found ? found.day : 28;
  }
  if (!controls.fog.includes(day)) controls.fog = [...controls.fog, day].sort((a, b) => a - b);
  renderFog();
  markPreset(null);
  run();
});

// Rendering

function show(response: SimResponse): void {
  latest = response;
  const { current, baseline } = response;
  const total = Math.round(current.total);
  setText($('[data-stat="infected"]', root), nf.format(total));
  setText($('[data-stat="peak"]', root), current.peakWeek ? fmt(S.peakValue, { n: current.peakWeek }) : S.none);
  const r = $('[data-stat="r"]', root);
  setText(r, nf1.format(current.r));
  r?.toggleAttribute('data-alarm', current.r >= 1);
  drawCases(current, baseline);
  drawMosquitoes(current, baseline);
  renderTable(current, baseline);
  prepareCity(current);
  drawCity(scrubDay);
  announce();
}

// The results are read out once the reader stops moving a slider, not on
// every step of it.
const status = must('[data-outbreak-status]', root);
let announceTimer = 0;
function announce(): void {
  window.clearTimeout(announceTimer);
  announceTimer = window.setTimeout(() => {
    const lines = $$('[data-stats] .stat', root).map((stat) => `${$('dt', stat)?.textContent?.trim()}: ${$('dd', stat)?.textContent?.trim()}`);
    setText(status, lines.join('. ') + '.');
  }, 700);
}

const chartTip = h('div', { class: 'chart-tip', 'aria-hidden': 'true' });

function drawCases(current: Result, baseline: Result): void {
  const plot = must('[data-epichart-plot]', root);
  const W = 720;
  const H = 260;
  const pad = { l: 44, r: 8, t: 12, b: 26 };
  const weeks = current.weekly.length;
  const max = Math.max(10, ...baseline.weekly, ...current.weekly);
  const niceMax = Math.ceil(max / 20) * 20;
  const x = (i: number) => pad.l + (i / weeks) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / niceMax) * (H - pad.t - pad.b);
  const band = (W - pad.l - pad.r) / weeks;
  const bar = Math.min(16, band - 2);
  const chart = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${S.current}, ${S.baseline}` });
  for (let v = 0; v <= niceMax; v += niceMax / 4) {
    chart.append(svg('line', { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v), stroke: 'var(--c-grout)', 'stroke-width': 1 }));
    const t = svg('text', { x: pad.l - 8, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 12, fill: 'var(--c-ink-3)' });
    t.textContent = nf.format(v);
    chart.append(t);
  }
  current.weekly.forEach((v, i) => {
    if (v < 0.05) return;
    const top = y(v);
    const height = Math.max(1, y(0) - top);
    const r = Math.min(4, height / 2, bar / 2);
    const x0 = x(i) + (band - bar) / 2;
    chart.append(
      svg('path', {
        d: `M${x0} ${y(0)}V${top + r}Q${x0} ${top} ${x0 + r} ${top}H${x0 + bar - r}Q${x0 + bar} ${top} ${x0 + bar} ${top + r}V${y(0)}Z`,
        fill: 'var(--s-temp)',
      }),
    );
  });
  const line = baseline.weekly.map((v, i) => `${i ? 'L' : 'M'}${(x(i) + band / 2).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  chart.append(svg('path', { d: line, fill: 'none', stroke: 'var(--c-ink-3)', 'stroke-width': 2, 'stroke-linejoin': 'round' }));
  for (let i = 0; i < weeks; i += 5) {
    const t = svg('text', { x: x(i) + band / 2, y: H - 6, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--c-ink-3)' });
    t.textContent = String(i + 1);
    chart.append(t);
  }
  // Hover layer: one hit column per week.
  const cursor = svg('line', { x1: 0, x2: 0, y1: pad.t, y2: y(0), stroke: 'var(--c-ink)', 'stroke-width': 1, opacity: 0 });
  chart.append(cursor);
  for (let i = 0; i < weeks; i++) {
    const hit = svg('rect', { x: x(i), y: pad.t, width: band, height: y(0) - pad.t, fill: 'transparent' });
    const enter = () => {
      cursor.setAttribute('x1', String(x(i) + band / 2));
      cursor.setAttribute('x2', String(x(i) + band / 2));
      cursor.setAttribute('opacity', '0.5');
      chartTip.replaceChildren(
        h('strong', {}, `${S.week} ${i + 1}`),
        h('br'),
        `${S.current}: ${nf.format(current.weekly[i] ?? 0)}`,
        h('br'),
        `${S.baseline}: ${nf.format(baseline.weekly[i] ?? 0)}`,
      );
      chartTip.setAttribute('data-on', '');
      const rect = plot.getBoundingClientRect();
      const left = ((x(i) + band / 2) / W) * rect.width;
      chartTip.style.transform = `translate(${clamp(left - 90, 0, Math.max(0, rect.width - 180))}px, -3.6rem)`;
    };
    hit.addEventListener('pointerenter', enter);
    hit.addEventListener('pointerleave', () => {
      cursor.setAttribute('opacity', '0');
      chartTip.removeAttribute('data-on');
    });
    chart.append(hit);
  }
  plot.replaceChildren(chart, chartTip);
}

function drawMosquitoes(current: Result, baseline: Result): void {
  const plot = must('[data-mosqchart-plot]', root);
  const W = 720;
  const H = 150;
  const pad = { l: 44, r: 8, t: 10, b: 22 };
  const max = Math.max(...baseline.days.map((d) => d.mosquitoes), ...current.days.map((d) => d.mosquitoes), 1);
  const niceMax = Math.ceil(max / 500) * 500;
  const x = (d: number) => pad.l + (d / DAYS) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / niceMax) * (H - pad.t - pad.b);
  const chart = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': S.current });
  for (let v = 0; v <= niceMax; v += niceMax / 2) {
    chart.append(svg('line', { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v), stroke: 'var(--c-grout)', 'stroke-width': 1 }));
    const t = svg('text', { x: pad.l - 8, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 12, fill: 'var(--c-ink-3)' });
    t.textContent = nf.format(v);
    chart.append(t);
  }
  const path = (r: Result) => r.days.map((d, i) => `${i ? 'L' : 'M'}${x(d.day).toFixed(1)} ${y(d.mosquitoes).toFixed(1)}`).join('');
  chart.append(svg('path', { d: path(baseline), fill: 'none', stroke: 'var(--c-ink-3)', 'stroke-width': 1.5 }));
  chart.append(svg('path', { d: path(current), fill: 'none', stroke: 'var(--s-hct)', 'stroke-width': 2, 'stroke-linejoin': 'round' }));
  for (const f of controls.fog) {
    chart.append(svg('line', { x1: x(f), x2: x(f), y1: pad.t, y2: y(0), stroke: 'var(--c-ink-2)', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
  }
  plot.replaceChildren(chart);
}

function renderTable(current: Result, baseline: Result): void {
  const body = $('[data-epitable]', root);
  if (!body) return;
  body.replaceChildren(
    ...current.weekly.map((v, i) =>
      h('tr', {}, h('th', { scope: 'row' }, String(i + 1)), h('td', {}, nf.format(v)), h('td', {}, nf.format(baseline.weekly[i] ?? 0))),
    ),
  );
}

// The neighbourhood: 1,000 tiles, each one person.

const city = must<HTMLCanvasElement>('[data-city-canvas]', root);
const cityCtx = city.getContext('2d');
const COLS = 40;
const ROWS = 25;
const PEOPLE = COLS * ROWS;
const order = Array.from({ length: PEOPLE }, (_, i) => i);
// A fixed shuffle (mulberry32), so the same person is the same tile on every run.
{
  let seed = 0x9e3779b9;
  const rand = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
}

// slotOf[tile] is the tile's place in the shuffled order.
const slotOf = new Int32Array(PEOPLE);
order.forEach((tile, slot) => {
  slotOf[tile] = slot;
});

let infectedOn = new Float32Array(PEOPLE).fill(Number.POSITIVE_INFINITY);
let protectedCount = 0;
let scrubDay = DAYS;
let playing: (() => void) | null = null;

function prepareCity(result: Result): void {
  protectedCount = Math.round(result.days[0]!.protected);
  infectedOn = new Float32Array(PEOPLE).fill(Number.POSITIVE_INFINITY);
  // The k-th person (in shuffled order, after the protected) is infected on
  // the first day the model's cumulative count reaches k + 1.
  let k = 0;
  for (const day of result.days) {
    while (k < PEOPLE - protectedCount && day.cumulative >= k + 1 - 1e-6) {
      infectedOn[order[protectedCount + k]!] = day.day;
      k++;
    }
  }
}

function colors(): Record<string, string> {
  const style = getComputedStyle(document.documentElement);
  const get = (name: string) => style.getPropertyValue(name).trim();
  return { s: get('--st-s'), e: get('--st-e'), i: get('--st-i'), r: get('--st-r'), p: get('--st-p'), bg: get('--c-surface') };
}

let palette = colors();
onPrefs(() => {
  palette = colors();
  drawCity(scrubDay);
});

function drawCity(day: number): void {
  if (!cityCtx) return;
  const rect = city.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.round((width * ROWS) / COLS);
  if (city.width !== width || city.height !== height) {
    city.width = width;
    city.height = height;
  }
  const cell = width / COLS;
  const gap = Math.max(1, cell * 0.12);
  cityCtx.fillStyle = palette.bg ?? '#fff';
  cityCtx.fillRect(0, 0, width, height);
  const latent = PARAMS.iip;
  const sick = PARAMS.infectious;
  const count = { s: 0, e: 0, i: 0, r: 0, p: 0 };
  for (let i = 0; i < PEOPLE; i++) {
    const slot = slotOf[i]!;
    const t = infectedOn[i]!;
    let state: keyof typeof count = 's';
    if (slot < protectedCount) state = 'p';
    else if (day >= t + latent + sick) state = 'r';
    else if (day >= t + latent) state = 'i';
    else if (day >= t) state = 'e';
    count[state]++;
    cityCtx.fillStyle = palette[state] ?? '#ccc';
    const cx = (i % COLS) * cell;
    const cy = Math.floor(i / COLS) * cell;
    cityCtx.fillRect(cx + gap / 2, cy + gap / 2, cell - gap, cell - gap);
  }
  const n = Math.round(day);
  setText($('[data-city-day]', root), fmt(S.dayLabel, { n }));
  // The same picture in words, for anyone who cannot tell the colours apart.
  setText($('[data-city-counts]', root), fmt(S.counts, { n, s: nf.format(count.s), e: nf.format(count.e), i: nf.format(count.i), r: nf.format(count.r), p: nf.format(count.p) }));
}

const scrub = must<HTMLInputElement>('[data-city-scrub]', root);
const playButton = must<HTMLButtonElement>('[data-city-play]', root);
const playLabel = must('[data-city-play-label]', root);
setText(playLabel, S.play);

function setScrub(day: number): void {
  scrubDay = clamp(day, 0, DAYS);
  scrub.value = String(Math.round(scrubDay));
  scrub.setAttribute('aria-valuetext', fmt(S.dayLabel, { n: Math.round(scrubDay) }));
  scrub.style.setProperty('--fill', `${(scrubDay / DAYS) * 100}%`);
  drawCity(scrubDay);
}

scrub.addEventListener('input', () => {
  stopPlaying();
  setScrub(Number(scrub.value));
});

function stopPlaying(): void {
  playing?.();
  playing = null;
  setText(playLabel, S.play);
}

playButton.addEventListener('click', () => {
  if (playing) {
    stopPlaying();
    return;
  }
  if (reducedMotion()) {
    setScrub(DAYS);
    return;
  }
  if (scrubDay >= DAYS) setScrub(0);
  setText(playLabel, S.pause);
  playing = onFrame((dt) => {
    setScrub(scrubDay + dt * 22);
    if (scrubDay >= DAYS) {
      playing = null;
      setText(playLabel, S.play);
      return false;
    }
    return true;
  });
});

new ResizeObserver(() => drawCity(scrubDay)).observe(city);

readForm();
markPreset('nothing');
setScrub(DAYS);
run();
