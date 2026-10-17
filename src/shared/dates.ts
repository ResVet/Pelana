// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Fever-day arithmetic for the tracker. Day 1 is the first 24 hours after the
// fever started; the count moves on every 24 hours from that moment, so a
// fever that began on Tuesday evening reaches day 2 on Wednesday evening.

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

/** Middle of each time band, in local hours. */
export const TIME_HOURS: Record<TimeOfDay, number> = {
  morning: 9,
  afternoon: 15,
  evening: 21,
  night: 3,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parses "YYYY-MM-DD" as a local date. Returns null for anything malformed. */
export function parseLocalDate(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const probe = new Date(y, m - 1, d);
  if (probe.getFullYear() !== y || probe.getMonth() !== m - 1 || probe.getDate() !== d) return null;
  return { y, m, d };
}

export function onsetFrom(date: string, time: TimeOfDay): Date | null {
  const parsed = parseLocalDate(date);
  if (!parsed) return null;
  return new Date(parsed.y, parsed.m - 1, parsed.d, TIME_HOURS[time], 0, 0, 0);
}

/** 1-based day of fever at `now`. Zero or less means the onset is in the future. */
export function feverDay(onset: Date, now: Date): number {
  return Math.floor((now.getTime() - onset.getTime()) / DAY_MS) + 1;
}

/** Moment at which fever day `n` begins. */
export function startOfDay(onset: Date, n: number): Date {
  return new Date(onset.getTime() + (n - 1) * DAY_MS);
}

export type TrackerPhase = 'early' | 'critical' | 'late' | 'over';

/** The general pattern from the WHO guidelines: the critical phase usually falls on days 3 to 7. */
export function phaseForDay(day: number): TrackerPhase {
  if (day <= 2) return 'early';
  if (day <= 7) return 'critical';
  if (day <= 14) return 'late';
  return 'over';
}

export type Validation = { ok: true; onset: Date; day: number } | { ok: false; reason: 'missing' | 'future' | 'tooOld' };

/** Accepts onsets from now back to 21 days ago. */
export function validateOnset(date: string, time: TimeOfDay, now: Date): Validation {
  const onset = onsetFrom(date, time);
  if (!onset) return { ok: false, reason: 'missing' };
  if (onset.getTime() > now.getTime()) {
    // A fever that "started this evening" when it is still afternoon: allow
    // the same calendar day and treat it as starting now.
    const sameDay = onset.toDateString() === now.toDateString();
    if (!sameDay) return { ok: false, reason: 'future' };
    return { ok: true, onset: now, day: 1 };
  }
  const day = feverDay(onset, now);
  if (day > 21) return { ok: false, reason: 'tooOld' };
  return { ok: true, onset, day };
}

/** Today's date as "YYYY-MM-DD" in local time, for <input type="date">. */
export function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
