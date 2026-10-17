// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Checks over the source tree: every file carries the copyright line, and
// nothing hides invisible or direction-changing characters.

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const CODE = [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'scripts')), ...walk(join(ROOT, 'tests'))].filter((f) =>
  /\.(ts|mjs|css|py)$/.test(f),
);

test('every source file starts with the copyright line', () => {
  for (const file of CODE) {
    const head = readFileSync(file, 'utf8').slice(0, 200);
    assert.ok(head.includes('Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.'), relative(ROOT, file));
  }
});

// Written as code point ranges, so this file does not contain the characters it looks for.
const HIDDEN: [number, number][] = [
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2060, 0x2064],
  [0x2066, 0x2069],
  [0xfeff, 0xfeff],
  [0x00a0, 0x00a0],
];

test('no zero-width, no-break, byte-order or bidirectional control characters', () => {
  for (const file of [...CODE, join(ROOT, 'README.md'), join(ROOT, 'LICENSE'), join(ROOT, 'NOTICE')]) {
    let text = '';
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    let line = 1;
    for (const ch of text) {
      if (ch === '\n') line++;
      const cp = ch.codePointAt(0)!;
      const hit = HIDDEN.some(([a, b]) => cp >= a && cp <= b);
      assert.ok(!hit, `${relative(ROOT, file)}:${line} contains U+${cp.toString(16).toUpperCase().padStart(4, '0')}`);
    }
  }
});
