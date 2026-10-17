// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DAYS, NO_ACTION, PARAMS, reproductionNumber, simulate } from '../src/shared/model.ts';

const baseline = simulate(NO_ACTION);

test('with nothing done, dengue spreads through most of the neighbourhood', () => {
  assert.ok(baseline.r > 3 && baseline.r < 4, `R is ${baseline.r}`);
  assert.ok(baseline.total > 850 && baseline.total < 1000, `total is ${baseline.total}`);
  assert.ok(baseline.peakWeek > 10 && baseline.peakWeek < 30);
  assert.equal(baseline.days.length, DAYS + 1);
});

test('people are neither created nor lost', () => {
  for (const d of baseline.days) {
    const sum = d.susceptible + d.exposed + d.infectious + d.recovered + d.protected;
    assert.ok(Math.abs(sum - PARAMS.people) < 1e-6, `day ${d.day}: ${sum}`);
    for (const v of Object.values(d)) assert.ok(v >= 0);
  }
});

test('every measure lowers the number infected', () => {
  const measures = [
    { ...NO_ACTION, breeding: 0.5 },
    { ...NO_ACTION, wolbachia: 0.6 },
    { ...NO_ACTION, vaccine: 0.5 },
    { ...NO_ACTION, season: 'dry' as const },
    { ...NO_ACTION, fog: [35, 42, 49] },
  ];
  for (const m of measures) assert.ok(simulate(m).total < baseline.total, JSON.stringify(m));
});

test('more of a measure never makes things worse', () => {
  let last = Infinity;
  for (const breeding of [0, 0.25, 0.5, 0.75]) {
    const total = simulate({ ...NO_ACTION, breeding }).total;
    assert.ok(total <= last + 1e-6);
    last = total;
  }
});

test('combining the measures stops the outbreak', () => {
  const all = simulate({ ...NO_ACTION, breeding: 0.5, wolbachia: 0.6, vaccine: 0.4 });
  assert.ok(all.r < 1, `R is ${all.r}`);
  assert.ok(all.total < 20, `total is ${all.total}`);
});

test('the reproduction number scales with the share of people who can be infected', () => {
  const full = reproductionNumber(PARAMS, NO_ACTION, 1);
  const half = reproductionNumber(PARAMS, NO_ACTION, 0.5);
  assert.ok(Math.abs(half / full - 0.5) < 1e-12);
});
