// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BEATS, COURSE, CRITICAL_WINDOW, DAYS, courseAt, dayAt, phaseOf, railIndex } from '../src/shared/course.ts';

test('the day rail has no day 0 and runs from 30 days before to day 10', () => {
  assert.equal(DAYS.length, 40);
  assert.equal(DAYS[0], -30);
  assert.equal(DAYS.at(-1), 10);
  assert.ok(!DAYS.includes(0));
});

test('railIndex and dayAt are inverses on every day of the rail', () => {
  DAYS.forEach((day, i) => {
    assert.equal(railIndex(day), i);
    assert.equal(dayAt(i), day);
  });
});

test('phases follow the course of the story', () => {
  assert.equal(phaseOf(-30), 'egg');
  assert.equal(phaseOf(-20), 'water');
  assert.equal(phaseOf(-17), 'adult');
  assert.equal(phaseOf(-10), 'virus');
  assert.equal(phaseOf(-3), 'incubation');
  assert.equal(phaseOf(1), 'fever');
  assert.equal(phaseOf(4), 'critical');
  assert.equal(phaseOf(8), 'recovery');
});

test('beats move forward in time and start at the hero', () => {
  assert.equal(BEATS[0]!.key, 'hero');
  for (let i = 1; i < BEATS.length; i++) assert.ok(BEATS[i]!.day >= BEATS[i - 1]!.day, `${BEATS[i]!.key} goes back in time`);
  assert.equal(new Set(BEATS.map((b) => b.key)).size, BEATS.length);
});

test('the imagined patient shows the warning pattern the copy describes', () => {
  assert.equal(COURSE.length, 10);
  const base = COURSE[0]!.hct;
  const peak = Math.max(...COURSE.map((d) => d.hct));
  // A rise of 20% or more over baseline is the standard sign of plasma leakage.
  assert.ok(peak >= base * 1.2, 'haematocrit should rise by at least 20%');
  const lowest = COURSE.reduce((a, b) => (b.plt < a.plt ? b : a));
  assert.ok(lowest.day >= CRITICAL_WINDOW.start && lowest.day <= CRITICAL_WINDOW.end, 'platelets bottom out in the critical window');
  // The fever falls to 38 °C or less during the critical days.
  assert.ok(COURSE.filter((d) => d.day >= 4 && d.day <= 6).every((d) => d.temp <= 38));
});

test('courseAt interpolates between days and clamps at the ends', () => {
  assert.deepEqual(courseAt(1), { ...COURSE[0]!, day: 1 });
  assert.equal(courseAt(0).temp, COURSE[0]!.temp);
  assert.equal(courseAt(99).plt, COURSE[9]!.plt);
  const mid = courseAt(4.5);
  assert.ok(mid.plt < COURSE[3]!.plt && mid.plt > COURSE[4]!.plt);
});
