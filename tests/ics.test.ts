// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calendar, escapeText, fold, nextWeekday } from '../src/shared/ics.ts';

const bytes = (s: string) => new TextEncoder().encode(s).length;

test('text is escaped as RFC 5545 requires', () => {
  assert.equal(escapeText('a, b; c\\d\ne'), 'a\\, b\\; c\\\\d\\ne');
});

test('no text, identifier or rule can start a property of its own', () => {
  const cr = String.fromCharCode(13);
  const breaks = [cr, '\n', cr + '\n', String.fromCharCode(0x85), String.fromCharCode(0x2028), String.fromCharCode(0x2029)];
  for (const br of breaks) assert.ok(!/[\r\n]|\u0085|\u2028|\u2029/.test(escapeText(`a${br}ATTACH:x`)), JSON.stringify(br));
  assert.equal(escapeText(`a${String.fromCharCode(0)}b${String.fromCharCode(27)}c`), 'abc');
  const ics = calendar([
    { uid: `x${cr}\nATTACH:evil`, start: new Date(2026, 9, 9, 8, 0), minutes: 15, title: 't', rrule: `FREQ=WEEKLY${cr}\nX-EVIL:1`, alarm: 5 },
  ]);
  const lines = ics.split('\r\n');
  assert.ok(!lines.some((l) => l.startsWith('ATTACH') || l.startsWith('X-EVIL')), ics);
});

test('long lines fold at 75 octets without splitting characters', () => {
  const line = 'DESCRIPTION:' + 'Kuras bak mandi — sikat dindingnya ✓ '.repeat(8);
  const folded = fold(line);
  for (const physical of folded.split('\r\n')) assert.ok(bytes(physical) <= 75, `${bytes(physical)} octets`);
  assert.equal(folded.split('\r\n').map((p, i) => (i ? p.slice(1) : p)).join(''), line);
  assert.equal(fold('SHORT:line'), 'SHORT:line');
});

test('a weekly reminder is a complete calendar', () => {
  const ics = calendar(
    [{ uid: 'weekly@pelana', start: new Date(2026, 9, 9, 8, 0), minutes: 30, title: 'Kuras, tutup, daur ulang', description: 'Satu, dua; tiga', rrule: 'FREQ=WEEKLY;BYDAY=FR', alarm: 0 }],
    new Date(Date.UTC(2026, 9, 7, 13, 0, 0)),
  );
  assert.ok(ics.endsWith('\r\n'));
  assert.ok(!/[^\r]\n/.test(ics), 'every line ends in CRLF');
  for (const needed of ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:', 'BEGIN:VEVENT', 'UID:weekly@pelana', 'DTSTAMP:20261007T130000Z', 'DTSTART:20261009T080000', 'DTEND:20261009T083000', 'RRULE:FREQ=WEEKLY;BYDAY=FR', 'BEGIN:VALARM', 'TRIGGER:PT0M', 'END:VCALENDAR']) {
    assert.ok(ics.includes(needed), needed);
  }
  assert.ok(ics.includes('SUMMARY:Kuras\\, tutup\\, daur ulang'));
});

test('nextWeekday finds the next occurrence, never one in the past', () => {
  const wed = new Date(2026, 9, 7, 10, 0);
  const fri = nextWeekday(wed, 4, 8, 0);
  assert.equal(fri.getDay(), 5);
  assert.equal(fri.getDate(), 9);
  const sameDayPast = nextWeekday(wed, 2, 8, 0);
  assert.equal(sameDayPast.getDate(), 14);
  const sameDayLater = nextWeekday(wed, 2, 18, 0);
  assert.equal(sameDayLater.getDate(), 7);
});
