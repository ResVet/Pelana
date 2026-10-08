// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Text colours meet WCAG 2.2 contrast in every theme: 4.5:1 for body text
// and 3:1 for large text and the edges of controls.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const css = readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8');

/** The custom properties declared in the block that starts at `marker`. */
function block(marker: string): Record<string, string> {
  const start = css.indexOf(marker);
  assert.ok(start >= 0, `no block ${marker}`);
  const open = css.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) {
      end = i;
      break;
    }
  }
  const out: Record<string, string> = {};
  for (const m of css.slice(open, end).matchAll(/(--c-[\w-]+|--s-[\w-]+|--ph-[\w-]+):\s*(#[0-9a-fA-F]{6})/g)) out[m[1]!] = m[2]!;
  return out;
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}

function ratio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

const THEMES: [string, string][] = [
  ['light', ':root {'],
  ['dark', ":root[data-theme='dark']"],
  ['high contrast light', ":root[data-contrast='high']"],
];

for (const [name, marker] of THEMES) {
  test(`${name} theme text contrast`, () => {
    const base = block(':root {');
    const t = { ...base, ...block(marker) };
    const backgrounds = ['--c-bg', '--c-surface', '--c-surface-2'];
    for (const bg of backgrounds) {
      for (const fg of ['--c-ink', '--c-ink-2', '--c-ink-3']) {
        const r = ratio(t[fg]!, t[bg]!);
        assert.ok(r >= 4.5, `${fg} on ${bg}: ${r.toFixed(2)}`);
      }
      for (const fg of ['--c-water', '--c-blood']) {
        const r = ratio(t[fg]!, t[bg]!);
        assert.ok(r >= 4.5, `${fg} on ${bg}: ${r.toFixed(2)}`);
      }
    }
    // White or dark text on filled buttons.
    for (const fill of ['--c-water-fill', '--c-blood-fill']) {
      const r = ratio(t['--c-on-fill']!, t[fill]!);
      assert.ok(r >= 4.5, `on-fill on ${fill}: ${r.toFixed(2)}`);
    }
    // Control outlines are at least 3:1 against the page.
    assert.ok(ratio(t['--c-line']!, t['--c-bg']!) >= 3, `--c-line on --c-bg: ${ratio(t['--c-line']!, t['--c-bg']!).toFixed(2)}`);
  });
}
