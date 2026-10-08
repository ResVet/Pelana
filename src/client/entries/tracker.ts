// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Count the fever days. Everything stays in this browser: the people being
// looked after, the onset of each fever, and the notes for the doctor.

import { type TimeOfDay, type TrackerPhase, feverDay, isoDate, phaseForDay, startOfDay, validateOnset } from '../../shared/dates.ts';
import { type CalendarEvent, calendar } from '../../shared/ics.ts';
import { $, $$, copyText, download, fmt, h, must, pageData, setText, svg } from '../core/dom.ts';
import { Mosaic, fontReady } from '../core/mosaic.ts';
import { isDark, onPrefs, reducedMotion } from '../core/prefs.ts';
import { readJSON, remove, writeJSON } from '../core/storage.ts';
import { initPage } from '../core/ui.ts';

initPage();

interface LogEntry {
  at: string;
  temp: number | null;
  drank: '' | 'little' | 'some' | 'plenty';
  urine: boolean;
  note: string;
}

interface Person {
  id: string;
  name: string;
  date: string;
  time: TimeOfDay;
  log: LogEntry[];
}

interface Saved {
  active: string;
  people: Person[];
}

interface Strings {
  form: { future: string; tooOld: string; missing: string };
  result: {
    heading: string;
    headingNamed: string;
    since: string;
    phases: Record<TrackerPhase, { h: string; p: string }>;
    window: string;
    windowPast: string;
    today: string;
  };
  log: { remove: string; added: string; removed: string; invalidTemp: string; drank: Record<string, string>; urine: string; chartTitle: string };
  export: {
    summaryTitle: string;
    summaryStart: string;
    summaryDay: string;
    summaryNotes: string;
    eventTitle: string;
    eventBody: string;
  };
  privacy: { confirm: string; cleared: string };
  people: { label: string; add: string; untitled: string };
  copied: string;
  warningAction: string;
  warningItems: string[];
  times: Record<TimeOfDay, string>;
}

const data = pageData<Strings>();
const S = data.strings;
const locale = data.lang === 'id' ? 'id-ID' : 'en-GB';

const root = must('[data-tracker]');
const form = must<HTMLFormElement>('[data-tracker-form]', root);
const error = must('[data-error]', root);
const result = must('[data-result]', root);
const logSection = must('[data-log]', root);
const exportSection = must('[data-export]', root);
const toast = must('[data-toast]', root);

const dateFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' });
const shortFmt = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
const numFmt = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const TIMES: readonly TimeOfDay[] = ['morning', 'afternoon', 'evening', 'night'];
const DRANK: readonly LogEntry['drank'][] = ['', 'little', 'some', 'plenty'];

function cleanEntry(raw: unknown): LogEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (typeof e.at !== 'string' || Number.isNaN(new Date(e.at).getTime())) return null;
  const temp = typeof e.temp === 'number' && Number.isFinite(e.temp) ? e.temp : null;
  return {
    at: e.at,
    temp,
    drank: DRANK.includes(e.drank as LogEntry['drank']) ? (e.drank as LogEntry['drank']) : '',
    urine: e.urine === true,
    note: typeof e.note === 'string' ? e.note.slice(0, 140) : '',
  };
}

/** Rebuilds what was stored, keeping only well-formed people and notes, so a damaged entry cannot break the page. */
function cleanSaved(raw: unknown): Saved {
  const out: Saved = { active: '', people: [] };
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  for (const item of Array.isArray(r.people) ? r.people : []) {
    if (!item || typeof item !== 'object') continue;
    const q = item as Record<string, unknown>;
    if (typeof q.id !== 'string' || !/^[a-z0-9]{1,16}$/.test(q.id)) continue;
    out.people.push({
      id: q.id,
      name: typeof q.name === 'string' ? q.name.slice(0, 40) : '',
      date: typeof q.date === 'string' ? q.date : '',
      time: TIMES.includes(q.time as TimeOfDay) ? (q.time as TimeOfDay) : 'morning',
      log: (Array.isArray(q.log) ? q.log : []).map(cleanEntry).filter((e): e is LogEntry => e !== null),
    });
  }
  if (typeof r.active === 'string' && out.people.some((p) => p.id === r.active)) out.active = r.active;
  return out;
}

let saved: Saved = cleanSaved(readJSON<unknown>('tracker', {}));

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function active(): Person | undefined {
  return saved.people.find((p) => p.id === saved.active);
}

function persist(): void {
  writeJSON('tracker', saved);
}

let mosaic: Mosaic | null = null;

function phaseColor(phase: TrackerPhase): string {
  const name = phase === 'critical' ? '--ph-critical' : phase === 'early' ? '--ph-fever' : '--ph-recovery';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

async function initMosaic(): Promise<void> {
  const canvas = $<HTMLCanvasElement>('[data-mosaic]', result);
  if (!canvas) return;
  await fontReady();
  mosaic = new Mosaic(canvas, { rows: 9, cols: 4, align: 'left', still: reducedMotion });
  const colors = () => mosaic?.setColors(phaseColor((result.dataset.phase as TrackerPhase) || 'early'), isDark() ? 'rgba(220,233,230,0.08)' : 'rgba(15,44,50,0.07)');
  colors();
  onPrefs(colors);
  const holder = canvas.parentElement;
  if (holder) new ResizeObserver(() => mosaic?.resize()).observe(holder);
  render();
}

function onsetOf(p: Person): Date | null {
  const check = validateOnset(p.date, p.time, new Date());
  return check.ok ? check.onset : null;
}

function showError(reason: 'missing' | 'future' | 'tooOld' | null): void {
  const dateInput = must<HTMLInputElement>('#t-date', form);
  if (!reason) {
    error.setAttribute('hidden', '');
    dateInput.removeAttribute('aria-invalid');
    return;
  }
  setText(error, S.form[reason]);
  error.removeAttribute('hidden');
  dateInput.setAttribute('aria-invalid', 'true');
  dateInput.focus();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const fd = new FormData(form);
  const date = String(fd.get('date') ?? '');
  const time = (String(fd.get('time') ?? 'morning') as TimeOfDay) || 'morning';
  const name = String(fd.get('name') ?? '').trim().slice(0, 40);
  const check = validateOnset(date, time, new Date());
  if (!check.ok) {
    showError(check.reason);
    return;
  }
  showError(null);
  let person = active();
  if (!person) {
    person = { id: newId(), name, date, time, log: [] };
    saved.people.push(person);
    saved.active = person.id;
  } else {
    person.name = name;
    person.date = date;
    person.time = time;
  }
  persist();
  render();
  const heading = $<HTMLElement>('[data-result-title]', result);
  heading?.focus();
  heading?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
});

function fillForm(p: Person | undefined): void {
  must<HTMLInputElement>('#t-name', form).value = p?.name ?? '';
  must<HTMLInputElement>('#t-date', form).value = p?.date ?? '';
  must<HTMLSelectElement>('#t-time', form).value = p?.time ?? 'morning';
}

function renderPeople(): void {
  const box = must('[data-people]', root);
  const list = must('[data-people-list]', box);
  // The list is rebuilt, so remember which chip had focus and give it back.
  const focused = list.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.person : undefined;
  list.replaceChildren();
  const named = saved.people.filter((p) => p.date);
  box.toggleAttribute('hidden', named.length === 0);
  for (const p of named) {
    const button = h('button', { class: 'chip', type: 'button', 'aria-pressed': String(p.id === saved.active), 'data-person': p.id }, p.name || S.people.untitled);
    button.addEventListener('click', () => {
      saved.active = p.id;
      persist();
      fillForm(p);
      render();
    });
    list.append(button);
    if (p.id === focused) button.focus();
  }
}

// "Someone else" only clears the form. The new person is saved when the
// form is first submitted, so an abandoned blank entry never replaces the
// fever that is being counted.
$('[data-person-add]', root)?.addEventListener('click', () => {
  saved.active = '';
  fillForm(undefined);
  render();
  must<HTMLInputElement>('#t-name', form).focus();
});

/** Day shown on screen, so the minute check only redraws when it changes. */
let shownDay: number | null = null;

function render(): void {
  renderPeople();
  const p = active();
  const onset = p ? onsetOf(p) : null;
  const day = p && onset ? feverDay(onset, new Date()) : null;
  shownDay = day;
  if (!p || !onset || day === null) {
    result.setAttribute('hidden', '');
    logSection.setAttribute('hidden', '');
    exportSection.setAttribute('hidden', '');
    return;
  }
  result.removeAttribute('hidden');
  logSection.removeAttribute('hidden');
  exportSection.removeAttribute('hidden');
  const phase = phaseForDay(day);
  result.dataset.phase = phase;
  const title = p.name ? fmt(S.result.headingNamed, { name: p.name, n: day }) : fmt(S.result.heading, { n: day });
  setText($('[data-result-title]', result), title);
  setText($('[data-since]', result), fmt(S.result.since, { date: `${dateFmt.format(onset)}, ${timeFmt.format(onset)}` }));
  setText($('[data-phase-title]', result), S.result.phases[phase].h);
  setText($('[data-phase-text]', result), S.result.phases[phase].p);
  mosaic?.set(String(day), phaseColor(phase));

  const strip = must('[data-daystrip-list]', result);
  strip.replaceChildren();
  for (let n = 1; n <= 10; n++) {
    const start = startOfDay(onset, n);
    const item = h(
      'li',
      {
        class: 'daystrip__day',
        'data-critical': n >= 3 && n <= 7 ? '' : null,
        'data-today': n === day ? '' : null,
        'data-past': n < day ? '' : null,
        'aria-current': n === day ? 'date' : null,
      },
      h('strong', {}, String(n)),
      h('span', {}, shortFmt.format(start)),
    );
    if (n === day) item.append(h('span', { class: 'vh' }, ` (${S.result.today})`));
    strip.append(item);
  }
  // Day 3 starts, and day 7 ends, at the hour the fever began.
  const at = (d: Date) => `${shortFmt.format(d)}, ${timeFmt.format(d)}`;
  setText($('[data-window]', result), fmt(day > 7 ? S.result.windowPast : S.result.window, { start: at(startOfDay(onset, 3)), end: at(startOfDay(onset, 8)) }));
  $('[data-export-ics]', root)?.toggleAttribute('hidden', reminders(p, onset, new Date()).length === 0);
  renderLog(p);
}

// Notes for the doctor

const logForm = must<HTMLFormElement>('[data-log-form]', root);
const logError = must('[data-log-error]', root);
const logStatus = must('[data-log-status]', root);

function parseTemp(raw: string): number | null {
  const cleaned = raw.trim().replace(',', '.');
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : Number.NaN;
}

function nowLocalInput(): string {
  const d = new Date();
  return `${isoDate(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const whenInput = must<HTMLInputElement>('#l-when', logForm);
/** The time field follows the clock until the reader sets it. */
let whenEdited = false;
whenInput.value = nowLocalInput();
whenInput.addEventListener('input', () => {
  whenEdited = true;
});

logForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const p = active();
  if (!p) return;
  const fd = new FormData(logForm);
  const temp = parseTemp(String(fd.get('temp') ?? ''));
  const tempInput = must<HTMLInputElement>('#l-temp', logForm);
  if (temp !== null && (Number.isNaN(temp) || temp < 34 || temp > 43)) {
    setText(logError, S.log.invalidTemp);
    logError.removeAttribute('hidden');
    tempInput.setAttribute('aria-invalid', 'true');
    tempInput.focus();
    return;
  }
  logError.setAttribute('hidden', '');
  tempInput.removeAttribute('aria-invalid');
  const entry: LogEntry = {
    at: whenEdited && whenInput.value ? whenInput.value : nowLocalInput(),
    temp,
    drank: (String(fd.get('drank') ?? '') as LogEntry['drank']) || '',
    urine: fd.get('urine') === 'on',
    note: String(fd.get('note') ?? '').trim().slice(0, 140),
  };
  if (entry.temp === null && !entry.drank && !entry.urine && !entry.note) return;
  p.log.push(entry);
  p.log.sort((a, b) => a.at.localeCompare(b.at));
  persist();
  logForm.reset();
  whenEdited = false;
  whenInput.value = nowLocalInput();
  renderLog(p);
  setText(logStatus, S.log.added);
});

function describe(entry: LogEntry): string {
  const parts: string[] = [];
  if (entry.drank) parts.push(S.log.drank[entry.drank] ?? entry.drank);
  if (entry.urine) parts.push(S.log.urine);
  if (entry.note) parts.push(entry.note);
  return parts.join('. ');
}

function renderLog(p: Person): void {
  const list = must('[data-loglist]', root);
  list.replaceChildren();
  $('[data-log-empty]', root)?.toggleAttribute('hidden', p.log.length > 0);
  p.log.forEach((entry, index) => {
    const when = new Date(entry.at);
    const stamp = `${shortFmt.format(when)}, ${timeFmt.format(when)}`;
    const removeButton = h('button', { class: 'btn btn--quiet', type: 'button', 'aria-label': `${S.log.remove}: ${stamp}` }, S.log.remove);
    removeButton.addEventListener('click', () => {
      p.log.splice(index, 1);
      persist();
      renderLog(p);
      setText(logStatus, S.log.removed);
      // Focus moves to the next note's button, or the form when none are left.
      const buttons = $$<HTMLButtonElement>('[data-loglist] button', root);
      (buttons[Math.min(index, buttons.length - 1)] ?? must<HTMLInputElement>('#l-temp', logForm)).focus();
    });
    list.append(
      h(
        'li',
        { class: 'loglist__item' },
        h('span', { class: 'loglist__temp', 'data-high': entry.temp !== null && entry.temp >= 38 ? '' : null }, entry.temp === null ? '–' : `${numFmt.format(entry.temp)}\u00a0°C`),
        h('span', { class: 'loglist__meta' }, `${stamp}${describe(entry) ? `. ${describe(entry)}` : ''}`),
        removeButton,
      ),
    );
  });
  renderTempChart(p);
}

function renderTempChart(p: Person): void {
  const figure = must('[data-tempchart]', root);
  const plot = must('[data-tempchart-plot]', root);
  const points = p.log.filter((e) => e.temp !== null).map((e) => ({ t: new Date(e.at).getTime(), v: e.temp as number }));
  figure.toggleAttribute('hidden', points.length < 2);
  plot.replaceChildren();
  if (points.length < 2) return;
  const W = 600;
  const H = 180;
  const pad = { l: 34, r: 12, t: 10, b: 22 };
  const t0 = Math.min(...points.map((q) => q.t));
  const t1 = Math.max(...points.map((q) => q.t));
  const vMin = Math.min(36, ...points.map((q) => q.v));
  const vMax = Math.max(40, ...points.map((q) => q.v));
  const x = (t: number) => pad.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - vMin) / (vMax - vMin)) * (H - pad.t - pad.b);
  const chart = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': S.log.chartTitle });
  for (let v = Math.ceil(vMin); v <= Math.floor(vMax); v++) {
    chart.append(svg('line', { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v), stroke: 'var(--c-grout)', 'stroke-width': 1 }));
    const label = svg('text', { x: pad.l - 6, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--c-ink-3)' });
    label.textContent = String(v);
    chart.append(label);
  }
  chart.append(svg('line', { x1: pad.l, x2: W - pad.r, y1: y(38), y2: y(38), stroke: 'var(--s-temp)', 'stroke-width': 1, 'stroke-dasharray': '4 4' }));
  const d = points.map((q, i) => `${i ? 'L' : 'M'}${x(q.t).toFixed(1)} ${y(q.v).toFixed(1)}`).join('');
  chart.append(svg('path', { d, fill: 'none', stroke: 'var(--s-temp)', 'stroke-width': 2, 'stroke-linejoin': 'round' }));
  for (const q of points) {
    chart.append(svg('circle', { cx: x(q.t), cy: y(q.v), r: 6, fill: 'var(--c-surface)' }));
    chart.append(svg('circle', { cx: x(q.t), cy: y(q.v), r: 4, fill: 'var(--s-temp)' }));
  }
  plot.append(chart);
}

// Warning signs: any ticked box turns the action line into an alarm.

const alert = $('[data-alert="checklist"]', root);
alert?.addEventListener('change', () => {
  const any = $$<HTMLInputElement>('[data-sign]', alert).some((c) => c.checked);
  const was = alert.hasAttribute('data-triggered');
  alert.toggleAttribute('data-triggered', any);
  // Read the action out once, when the first sign is ticked.
  if (any && !was) setText($('[data-alert-live]', alert), S.warningAction);
  if (!any) setText($('[data-alert-live]', alert), '');
});

// Export

function summary(p: Person): string {
  const onset = onsetOf(p);
  if (!onset) return '';
  const day = feverDay(onset, new Date());
  const lines = [
    `${S.export.summaryTitle}${p.name ? `: ${p.name}` : ''}`,
    fmt(S.export.summaryStart, { date: `${dateFmt.format(onset)}, ${timeFmt.format(onset)}` }),
    fmt(S.export.summaryDay, { n: day }),
  ];
  if (p.log.length) {
    lines.push('', S.export.summaryNotes);
    for (const entry of p.log) {
      const when = new Date(entry.at);
      const temp = entry.temp === null ? '' : `${numFmt.format(entry.temp)} °C`;
      lines.push(`- ${shortFmt.format(when)} ${timeFmt.format(when)}: ${[temp, describe(entry)].filter(Boolean).join('. ')}`);
    }
  }
  lines.push('', S.warningAction, '', 'Pelana');
  return lines.join('\n');
}

function showToast(text: string): void {
  setText(toast, text);
  window.setTimeout(() => setText(toast, ''), 3000);
}

$('[data-export-copy]', root)?.addEventListener('click', async () => {
  const p = active();
  if (!p) return;
  if (await copyText(summary(p))) showToast(S.copied);
});

$<HTMLAnchorElement>('[data-export-wa]', root)?.addEventListener('click', (event) => {
  const p = active();
  if (!p) {
    event.preventDefault();
    return;
  }
  (event.currentTarget as HTMLAnchorElement).href = `https://wa.me/?text=${encodeURIComponent(summary(p))}`;
});

$('[data-export-print]', root)?.addEventListener('click', () => window.print());

/**
 * Check-ins for the critical days: 08:00, 14:00 and 20:00 on every calendar
 * day, kept when they fall on fever days 3 to 7 by the same count the page
 * shows, and only those still to come.
 */
function reminders(p: Person, onset: Date, now: Date): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const first = startOfDay(onset, 3);
  const last = startOfDay(onset, 8);
  for (let d = new Date(first.getFullYear(), first.getMonth(), first.getDate()); d.getTime() < last.getTime(); d.setDate(d.getDate() + 1)) {
    for (const hour of [8, 14, 20]) {
      const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, 0, 0);
      const n = feverDay(onset, at);
      if (n < 3 || n > 7 || at.getTime() < now.getTime()) continue;
      events.push({
        uid: `${p.id}-${isoDate(at)}-${hour}@pelana`,
        start: at,
        minutes: 15,
        title: fmt(S.export.eventTitle, { n }),
        description: S.export.eventBody,
        alarm: 0,
      });
    }
  }
  return events;
}

$('[data-export-ics]', root)?.addEventListener('click', () => {
  const p = active();
  const onset = p ? onsetOf(p) : null;
  if (!p || !onset) return;
  const now = new Date();
  const events = reminders(p, onset, now);
  if (!events.length) return;
  download(`pelana-${p.name ? p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'demam'}.ics`, calendar(events, now), 'text/calendar;charset=utf-8');
});

$('[data-clear]', root)?.addEventListener('click', () => {
  if (!window.confirm(S.privacy.confirm)) return;
  remove('tracker');
  saved = { active: '', people: [] };
  fillForm(undefined);
  render();
  showToast(S.privacy.cleared);
});

// Start: restore the last person looked after, if any.
if (!active() && saved.people.length) saved.active = saved.people[saved.people.length - 1]!.id;
fillForm(active());
must<HTMLInputElement>('#t-date', form).max = isoDate(new Date());
render();
void initMosaic();

// The day changes at the same minute it started, so check every minute, but
// redraw only when the number moves, so focus and scroll stay where they are.
window.setInterval(() => {
  if (!whenEdited) whenInput.value = nowLocalInput();
  const p = active();
  const onset = p ? onsetOf(p) : null;
  if (onset && feverDay(onset, new Date()) !== shownDay) render();
}, 60_000);
