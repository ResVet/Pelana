// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { feverDay, isoDate, onsetFrom, parseLocalDate, phaseForDay, startOfDay, validateOnset } from '../src/shared/dates.ts';

test('parseLocalDate accepts real dates only', () => {
  assert.deepEqual(parseLocalDate('2026-10-07'), { y: 2026, m: 10, d: 7 });
  assert.equal(parseLocalDate('2026-02-30'), null);
  assert.equal(parseLocalDate('07/10/2026'), null);
  assert.equal(parseLocalDate(''), null);
});

test('day 1 is the first 24 hours of fever', () => {
  const onset = onsetFrom('2026-10-06', 'evening')!;
  assert.equal(feverDay(onset, new Date(2026, 9, 6, 22)), 1);
  assert.equal(feverDay(onset, new Date(2026, 9, 7, 20)), 1);
  assert.equal(feverDay(onset, new Date(2026, 9, 7, 21)), 2);
  assert.equal(startOfDay(onset, 3).getTime(), new Date(2026, 9, 8, 21).getTime());
});

test('the tracker phase follows the usual course', () => {
  assert.equal(phaseForDay(1), 'early');
  assert.equal(phaseForDay(3), 'critical');
  assert.equal(phaseForDay(7), 'critical');
  assert.equal(phaseForDay(8), 'late');
  assert.equal(phaseForDay(15), 'over');
});

test('validateOnset rejects the future and the distant past', () => {
  const now = new Date(2026, 9, 7, 15, 0);
  assert.deepEqual(validateOnset('', 'morning', now), { ok: false, reason: 'missing' });
  assert.deepEqual(validateOnset('2026-10-08', 'morning', now), { ok: false, reason: 'future' });
  // "This evening" said in the afternoon counts as starting now.
  const sameDay = validateOnset('2026-10-07', 'evening', now);
  assert.equal(sameDay.ok && sameDay.day, 1);
  assert.deepEqual(validateOnset('2026-09-01', 'morning', now), { ok: false, reason: 'tooOld' });
  const ok = validateOnset('2026-10-04', 'morning', now);
  assert.equal(ok.ok && ok.day, 4);
});

test('isoDate pads months and days', () => {
  assert.equal(isoDate(new Date(2026, 0, 5)), '2026-01-05');
});
