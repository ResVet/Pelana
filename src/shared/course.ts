// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// The timeline of the story, and the illustrative course of one imagined
// patient. Shared by the page generator (which draws the chart into the HTML)
// and the browser code (which animates it).
//
// Day numbering follows the clinical habit: day 1 is the first day of fever.
// Days before the fever are negative and there is no day 0.

export type Phase = 'egg' | 'water' | 'adult' | 'virus' | 'incubation' | 'fever' | 'critical' | 'recovery';

/** Every day shown on the rail, in order: -30 ... -1, 1 ... 10. */
export const DAYS: number[] = [
  ...Array.from({ length: 30 }, (_, i) => i - 30),
  ...Array.from({ length: 10 }, (_, i) => i + 1),
];

export function phaseOf(day: number): Phase {
  if (day <= -25) return 'egg';
  if (day <= -18) return 'water';
  if (day <= -16) return 'adult';
  if (day <= -6) return 'virus';
  if (day <= -1) return 'incubation';
  if (day <= 3) return 'fever';
  if (day <= 6) return 'critical';
  return 'recovery';
}

/** Position of a day on the rail, 0 ... DAYS.length - 1. Fractions interpolate. */
export function railIndex(day: number): number {
  if (day < 0) return Math.max(0, day + 30);
  if (day < 1) return 29 + Math.max(0, day);
  return Math.min(DAYS.length - 1, day + 29);
}

/** Inverse of railIndex. */
export function dayAt(index: number): number {
  if (index <= 29) return index - 30;
  return index - 29;
}

export type SceneId =
  | 'tub-wide'
  | 'tub-eggs'
  | 'tub-larvae'
  | 'tub-pupae'
  | 'tub-emerge'
  | 'flight'
  | 'feed'
  | 'inside'
  | 'virion'
  | 'swarm'
  | 'chart'
  | 'leak'
  | 'heal'
  | 'chart-full'
  | 'tub-again';

export type BeatKey =
  | 'hero'
  | 'eggs'
  | 'hatch'
  | 'week'
  | 'adult'
  | 'habits'
  | 'neighbour'
  | 'inside'
  | 'virion'
  | 'you'
  | 'fever'
  | 'breaks'
  | 'platelets'
  | 'warning'
  | 'recovery'
  | 'saddle'
  | 'again';

export interface Beat {
  key: BeatKey;
  day: number;
  scene: SceneId;
}

export const BEATS: Beat[] = [
  { key: 'hero', day: -30, scene: 'tub-wide' },
  { key: 'eggs', day: -29, scene: 'tub-eggs' },
  { key: 'hatch', day: -24, scene: 'tub-larvae' },
  { key: 'week', day: -21, scene: 'tub-pupae' },
  { key: 'adult', day: -17, scene: 'tub-emerge' },
  { key: 'habits', day: -16, scene: 'flight' },
  { key: 'neighbour', day: -15, scene: 'feed' },
  { key: 'inside', day: -14, scene: 'inside' },
  { key: 'virion', day: -10, scene: 'virion' },
  { key: 'you', day: -5, scene: 'swarm' },
  { key: 'fever', day: 1, scene: 'chart' },
  { key: 'breaks', day: 4, scene: 'leak' },
  { key: 'platelets', day: 5, scene: 'leak' },
  { key: 'warning', day: 6, scene: 'chart' },
  { key: 'recovery', day: 7, scene: 'heal' },
  { key: 'saddle', day: 10, scene: 'chart-full' },
  { key: 'again', day: 10, scene: 'tub-again' },
];

/** One imagined patient. Values are illustrative, chosen to match the course the WHO guidelines describe. */
export interface CourseDay {
  day: number;
  /** Highest temperature that day, °C. */
  temp: number;
  /** Haematocrit, %. A baseline of 40 rises to 48 (+20%) on day 5. */
  hct: number;
  /** Platelets, thousands per µL. */
  plt: number;
  /** White cells, thousands per µL. */
  wbc: number;
}

export const COURSE: CourseDay[] = [
  { day: 1, temp: 39.6, hct: 40, plt: 210, wbc: 5.2 },
  { day: 2, temp: 40.1, hct: 41, plt: 165, wbc: 3.4 },
  { day: 3, temp: 39.4, hct: 42, plt: 112, wbc: 2.6 },
  { day: 4, temp: 37.7, hct: 45, plt: 71, wbc: 2.3 },
  { day: 5, temp: 37.2, hct: 48, plt: 38, wbc: 2.9 },
  { day: 6, temp: 37.9, hct: 44, plt: 54, wbc: 4.0 },
  { day: 7, temp: 37.0, hct: 41, plt: 88, wbc: 5.1 },
  { day: 8, temp: 36.8, hct: 39, plt: 131, wbc: 6.0 },
  { day: 9, temp: 36.7, hct: 38, plt: 176, wbc: 6.3 },
  { day: 10, temp: 36.7, hct: 39, plt: 221, wbc: 6.4 },
];

/** The general window in which the critical phase can start, per WHO: days 3 to 7. */
export const CRITICAL_WINDOW = { start: 3, end: 7 } as const;

/** Linear interpolation of the course at a fractional day. */
export function courseAt(day: number): CourseDay {
  const first = COURSE[0]!;
  const last = COURSE[COURSE.length - 1]!;
  if (day <= first.day) return { ...first, day };
  if (day >= last.day) return { ...last, day };
  const i = Math.floor(day) - 1;
  const a = COURSE[i]!;
  const b = COURSE[i + 1]!;
  const t = day - a.day;
  const mix = (x: number, y: number) => x + (y - x) * t;
  return { day, temp: mix(a.temp, b.temp), hct: mix(a.hct, b.hct), plt: mix(a.plt, b.plt), wbc: mix(a.wbc, b.wbc) };
}
