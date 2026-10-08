// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Which test, which day. The table is rendered at build time for day 3 and a
// first infection; this script redraws it when the day or the history changes.

import { feverDay, onsetFrom, type TimeOfDay } from '../../shared/dates.ts';
import { type AdviceKey, type History, MAX_DAY, type TestKey, adviceFor, strength } from '../../shared/tests.ts';
import { $, $$, fmt, must, pageData, setText } from '../core/dom.ts';
import { readJSON } from '../core/storage.ts';
import { initPage } from '../core/ui.ts';

initPage();

interface Strings {
  dayValue: string;
  advice: Record<AdviceKey, { h: string; p: string }> & { secondary: string };
  strong: string;
  weak: string;
}

const S = pageData<Strings>().strings;
const root = must('[data-testing]');
const form = must<HTMLFormElement>('[data-testing-form]', root);
const range = must<HTMLInputElement>('#t-day', form);
const output = must('[data-day-output]', form);

function history(): History {
  const checked = $<HTMLInputElement>('input[name="history"]:checked', form);
  return (checked?.value as History) ?? 'no';
}

function update(): void {
  const day = Number(range.value);
  const hist = history();
  const label = fmt(S.dayValue, { n: day });
  setText(output, label);
  range.setAttribute('aria-valuetext', label);
  range.style.setProperty('--fill', `${((day - 1) / (MAX_DAY - 1)) * 100}%`);

  $$<HTMLTableRowElement>('tr[data-test]', root).forEach((row) => {
    const test = row.dataset.test as TestKey;
    const cells = $$<HTMLTableCellElement>('td', row);
    const values = cells.map((_, i) => strength(test, i + 1, hist));
    cells.forEach((cell, i) => {
      const s = values[i]!;
      cell.dataset.s = String(s);
      cell.toggleAttribute('data-run-start', s > 0 && values[i - 1] !== s);
      cell.toggleAttribute('data-run-end', s > 0 && values[i + 1] !== s);
      const text = s === 2 ? S.strong : s === 1 ? S.weak : '';
      const vh = cell.querySelector('.vh');
      setText(vh, text);
    });
  });
  $$<HTMLElement>('[data-col]', root).forEach((el) => {
    if (Number(el.dataset.col) === day) el.setAttribute('aria-current', 'true');
    else el.removeAttribute('aria-current');
  });

  const advice = S.advice[adviceFor(day)];
  setText($('[data-advice-title]', root), advice.h);
  setText($('[data-advice-text]', root), advice.p);
  $('[data-advice-secondary]', root)?.toggleAttribute('hidden', hist === 'no');
}

form.addEventListener('input', update);
form.addEventListener('change', update);

// If a fever is being counted on this device, start at its day.
interface SavedPerson {
  id: string;
  date: string;
  time: TimeOfDay;
}
const saved = readJSON<{ active?: unknown; people?: unknown }>('tracker', {});
const person = Array.isArray(saved.people)
  ? (saved.people as unknown[]).find((p): p is SavedPerson => !!p && typeof p === 'object' && (p as SavedPerson).id === saved.active)
  : undefined;
if (person && typeof person.date === 'string' && person.date) {
  const onset = onsetFrom(person.date, ['morning', 'afternoon', 'evening', 'night'].includes(person.time) ? person.time : 'morning');
  if (onset) {
    const day = feverDay(onset, new Date());
    if (day >= 1 && day <= MAX_DAY) {
      range.value = String(day);
      $('[data-from-tracker]', root)?.removeAttribute('hidden');
    }
  }
}

update();
