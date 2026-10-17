// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Typical windows in which each dengue test finds the infection, by day of
// illness, for a first infection and a second one. Drawn from the CDC testing
// guidance (NAAT and NS1 in the first 0-7 days, IgM from after day 3 and for
// about three months, IgM as the main test after day 7) and the antibody
// patterns in the WHO guidelines (in a second infection IgG rises early and
// high, IgM can stay low and NS1 is less sensitive). They are typical, not
// exact: individual tests and people vary.

export type TestKey = 'pcr' | 'ns1' | 'igm' | 'igg' | 'cbc';
export type History = 'no' | 'yes' | 'unknown';
export type Strength = 0 | 1 | 2;

export const MAX_DAY = 14;
export const TEST_KEYS: TestKey[] = ['ns1', 'pcr', 'igm', 'igg', 'cbc'];

type Window = [from: number, to: number, strength: 1 | 2];

const FIRST: Record<TestKey, Window[]> = {
  pcr: [[1, 5, 2], [6, 7, 1]],
  ns1: [[1, 5, 2], [6, 8, 1]],
  igm: [[3, 4, 1], [5, 14, 2]],
  igg: [[7, 10, 1], [11, 14, 2]],
  cbc: [[1, 14, 2]],
};

const SECOND: Record<TestKey, Window[]> = {
  pcr: [[1, 4, 2], [5, 7, 1]],
  ns1: [[1, 3, 2], [4, 6, 1]],
  igm: [[3, 14, 1]],
  igg: [[1, 2, 1], [3, 14, 2]],
  cbc: [[1, 14, 2]],
};

function lookup(windows: Window[], day: number): Strength {
  for (const [from, to, strength] of windows) if (day >= from && day <= to) return strength;
  return 0;
}

/** How likely a test is to be positive on a given day: 0 rarely, 1 sometimes, 2 usually. */
export function strength(test: TestKey, day: number, history: History): Strength {
  const a = lookup(FIRST[test], day);
  const b = lookup(SECOND[test], day);
  if (history === 'no') return a;
  if (history === 'yes') return b;
  // Not sure: "usually" only where both patterns agree, "sometimes" where either detects.
  if (a === 2 && b === 2) return 2;
  return a || b ? 1 : 0;
}

export type AdviceKey = 'early' | 'middle' | 'late';

export function adviceFor(day: number): AdviceKey {
  if (day <= 3) return 'early';
  if (day <= 7) return 'middle';
  return 'late';
}
