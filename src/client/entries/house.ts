// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// House check. The list works on its own; the 3D house is an extra view of
// the same state, loaded when the browser can draw it.

import { SPOTS, SPOT_KEYS, type SpotKey } from '../../shared/house.ts';
import { WEEKDAYS, calendar, nextWeekday } from '../../shared/ics.ts';
import { $, $$, download, fmt, must, pageData, setText, whenIdle } from '../core/dom.ts';
import { readJSON, writeJSON } from '../core/storage.ts';
import { tick } from '../core/sound.ts';
import { initPage } from '../core/ui.ts';
import type { HouseStage } from '../stage/house-types.ts';

initPage();

type Action = 'drain' | 'cover' | 'recycle' | 'plus';

interface Strings {
  progress: string;
  done: string;
  mark: string;
  unmark: string;
  actions: Record<Action, string>;
  rooms: Record<string, string>;
  spots: Record<SpotKey, { name: string; action: Action; text: string }>;
  reminder: { days: string[]; eventTitle: string };
}

const S = pageData<Strings>().strings;
const root = must('[data-house]');
const progress = must('[data-progress]', root);
const card = must('[data-spotcard]', root);
const toggle = must<HTMLButtonElement>('[data-spot-toggle]', card);

const done = new Set<SpotKey>(readJSON<unknown[]>('house', []).filter((k): k is SpotKey => typeof k === 'string' && SPOT_KEYS.includes(k as SpotKey)));
let selected: SpotKey | null = null;
let stage: HouseStage | null = null;

function save(): void {
  writeJSON('house', Array.from(done));
}

function render(): void {
  const total = SPOTS.length;
  const n = done.size;
  setText(progress, n === total ? S.done : fmt(S.progress, { n, total }));
  $$<HTMLInputElement>('[data-done]', root).forEach((box) => {
    box.checked = done.has(box.dataset.done as SpotKey);
  });
  $$<HTMLElement>('[data-spot]', root).forEach((item) => {
    const key = item.dataset.spot as SpotKey;
    item.toggleAttribute('data-done', done.has(key));
    if (key === selected) item.setAttribute('aria-current', 'true');
    else item.removeAttribute('aria-current');
  });
  if (selected) {
    const spot = S.spots[selected];
    const room = SPOTS.find((s) => s.key === selected)?.room ?? '';
    card.removeAttribute('hidden');
    setText($('[data-spot-room]', card), S.rooms[room] ?? '');
    setText($('[data-spot-name]', card), spot.name);
    const chip = must('[data-spot-action]', card);
    chip.dataset.action = spot.action;
    setText(chip, S.actions[spot.action]);
    setText($('[data-spot-text]', card), spot.text);
    const isDone = done.has(selected);
    setText($('span', toggle), isDone ? S.unmark : S.mark);
    toggle.classList.toggle('btn--solid', !isDone);
  }
  stage?.update({ done: new Set(done), selected });
}

function select(key: SpotKey | null, focusCard = true): void {
  selected = key;
  render();
  stage?.focus(key);
  if (key && focusCard) $<HTMLElement>('[data-spot-name]', card)?.focus({ preventScroll: false });
}

function setDone(key: SpotKey, value: boolean): void {
  if (value) {
    done.add(key);
    tick(1.15);
  } else done.delete(key);
  save();
  render();
}

$$<HTMLButtonElement>('[data-open-spot]', root).forEach((button) => {
  button.addEventListener('click', () => select(button.dataset.openSpot as SpotKey));
});

$$<HTMLInputElement>('[data-done]', root).forEach((box) => {
  box.addEventListener('change', () => setDone(box.dataset.done as SpotKey, box.checked));
});

toggle.addEventListener('click', () => {
  if (selected) setDone(selected, !done.has(selected));
});

$('[data-reset]', root)?.addEventListener('click', () => {
  done.clear();
  save();
  render();
});

const reminder = $<HTMLFormElement>('[data-reminder-form]', root);
reminder?.addEventListener('submit', (event) => {
  event.preventDefault();
  const fd = new FormData(reminder);
  const weekday = Number(fd.get('day') ?? 4);
  const [hh, mm] = String(fd.get('time') || '08:00').split(':').map(Number);
  const start = nextWeekday(new Date(), weekday, hh ?? 8, mm ?? 0);
  const checklist = SPOTS.map((s) => `- ${S.spots[s.key].name}: ${S.spots[s.key].text}`).join('\n');
  const ics = calendar([
    {
      uid: `weekly-psn-${WEEKDAYS[weekday]}@pelana`,
      start,
      minutes: 30,
      title: S.reminder.eventTitle,
      description: checklist,
      rrule: `FREQ=WEEKLY;BYDAY=${WEEKDAYS[weekday]}`,
      alarm: 0,
    },
  ]);
  download('pelana-psn-3m-plus.ics', ics, 'text/calendar;charset=utf-8');
});

$('[data-print]', root)?.addEventListener('click', () => window.print());

render();

// The 3D house.
const canvas = $<HTMLCanvasElement>('[data-gl]', root);
const stageEl = $('[data-house-stage]', root);
const hotspots = $('[data-hotspots]', root);
$$<HTMLButtonElement>('[data-turn-by]', root).forEach((button) => {
  button.addEventListener('click', () => stage?.turn(Number(button.dataset.turnBy)));
});
const supportsGL = (() => {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
})();
if (canvas && stageEl && hotspots && supportsGL) {
  const load = async () => {
    try {
      const { createHouseStage } = await import('../stage/house-stage.ts');
      stage = createHouseStage(canvas, hotspots, {
        labels: Object.fromEntries(SPOTS.map((s) => [s.key, S.spots[s.key].name])) as Record<SpotKey, string>,
        onSelect: (key) => select(key, false),
      });
      if (!stage) return;
      stageEl.setAttribute('data-gl-ready', '');
      render();
      new IntersectionObserver(([entry]) => stage?.setActive(!!entry?.isIntersecting)).observe(stageEl);
    } catch (error) {
      if (__DEV__) console.error(error);
    }
  };
  whenIdle(() => void load(), 1500);
}
