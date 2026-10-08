// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// A small iCalendar (RFC 5545) writer for the reminders the tools hand out.
// Times are "floating" local times, so a reminder set for 08:00 rings at
// 08:00 wherever the phone happens to be.

export interface CalendarEvent {
  uid: string;
  start: Date;
  minutes: number;
  title: string;
  description?: string;
  /** RRULE value without the "RRULE:" prefix, e.g. "FREQ=WEEKLY;BYDAY=FR". */
  rrule?: string;
  /** Minutes before the start to alert. 0 alerts at the start. */
  alarm?: number;
}

/**
 * Escapes a TEXT value. Every kind of line break becomes "\n" and other
 * control characters are dropped, so no input can start a new property.
 */
export function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|[\r\n\u0085\u2028\u2029]/g, '\\n')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, '');
}

/** A UID keeps letters, digits and a few separators only. */
function uidToken(value: string): string {
  return value.replace(/[^\w@.-]/g, '');
}

/** An RRULE keeps its own syntax only: names, values, = ; and , separators. */
function ruleToken(value: string): string {
  return value.replace(/[^\w=;,+-]/g, '');
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

/** Local floating date-time: 20261010T080000. */
export function floating(date: Date): string {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

/** UTC date-time for DTSTAMP: 20261007T130000Z. */
export function utc(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

const encoder = new TextEncoder();

/**
 * Folds a content line so no physical line exceeds 75 octets of UTF-8, as the
 * RFC requires. Continuation lines start with a single space. Multi-byte
 * characters are never split.
 */
export function fold(line: string): string {
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  const limit = () => (parts.length === 0 ? 75 : 74);
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (bytes + size > limit()) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function calendar(events: CalendarEvent[], now: Date = new Date(), name = 'Pelana'): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Raffa Gamadan Rifandi//Pelana//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
  ];
  for (const event of events) {
    const end = new Date(event.start.getTime() + event.minutes * 60000);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uidToken(event.uid)}`,
      `DTSTAMP:${utc(now)}`,
      `DTSTART:${floating(event.start)}`,
      `DTEND:${floating(end)}`,
      `SUMMARY:${escapeText(event.title)}`,
    );
    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    if (event.rrule) lines.push(`RRULE:${ruleToken(event.rrule)}`);
    if (event.alarm !== undefined) {
      const minutes = Math.max(0, Math.round(event.alarm) || 0);
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeText(event.title)}`,
        `TRIGGER:${minutes === 0 ? 'PT0M' : `-PT${minutes}M`}`,
        'END:VALARM',
      );
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;

/** Next date (from `from`, inclusive) that falls on weekday index 0=Monday ... 6=Sunday, at hh:mm. */
export function nextWeekday(from: Date, weekday: number, hours: number, minutes: number): Date {
  const target = new Date(from.getFullYear(), from.getMonth(), from.getDate(), hours, minutes, 0, 0);
  const jsDay = (weekday + 1) % 7; // JS: 0=Sunday
  let delta = (jsDay - target.getDay() + 7) % 7;
  if (delta === 0 && target.getTime() < from.getTime()) delta = 7;
  target.setDate(target.getDate() + delta);
  return target;
}
