// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// The two languages must carry the same content, and the text must follow
// the house style.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { en } from '../src/content/en.ts';
import { id } from '../src/content/id.ts';
import { SOURCES } from '../src/content/sources.ts';
import { SPOT_KEYS } from '../src/shared/house.ts';

type Leaf = { path: string; value: string };

function leaves(value: unknown, path = ''): Leaf[] {
  if (typeof value === 'string') return [{ path, value }];
  if (Array.isArray(value)) return value.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  return [];
}

const EN = leaves(en);
const ID = leaves(id);

test('both languages have exactly the same keys and list lengths', () => {
  assert.deepEqual(
    ID.map((l) => l.path),
    EN.map((l) => l.path),
  );
});

test('no text is empty', () => {
  for (const l of [...EN, ...ID]) assert.ok(l.value.trim().length > 0, l.path);
});

test('placeholders match between languages', () => {
  const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
  EN.forEach((l, i) => assert.equal(holes(ID[i]!.value), holes(l.value), l.path));
});

test('links in the copy point to the same places in both languages', () => {
  const links = (s: string) => (s.match(/\]\(([^)]+)\)/g) ?? []).map((m) => m.replace(/\/(en|id)\//, '/LANG/')).join(',');
  EN.forEach((l, i) => assert.equal(links(ID[i]!.value), links(l.value), l.path));
});

test('prose uses no em dashes', () => {
  const dash = String.fromCodePoint(0x2014);
  for (const l of [...EN, ...ID]) assert.ok(!l.value.includes(dash), `${l.path}: ${l.value}`);
});

test('the language code fields are right', () => {
  assert.equal(en.lang, 'en');
  assert.equal(id.lang, 'id');
});

test('every breeding spot has copy in both languages', () => {
  for (const key of SPOT_KEYS) {
    assert.ok(en.house.spots[key].name, key);
    assert.ok(id.house.spots[key].name, key);
  }
});

test('every source has a working-looking link and text in both languages', () => {
  const ids = new Set<string>();
  for (const s of SOURCES) {
    assert.ok(!ids.has(s.id), `duplicate source ${s.id}`);
    ids.add(s.id);
    assert.match(s.url, /^https:\/\//, s.id);
    assert.ok(s.used.en && s.used.id, s.id);
  }
});
