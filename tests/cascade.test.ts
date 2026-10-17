// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// A rule inside a media query loses to a later rule with the same selector
// outside it, so the query silently does nothing. This happened twice while
// building the site; this test keeps it from happening again.

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const STYLES = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'src', 'styles');

interface Declaration {
  selector: string;
  property: string;
  media: string;
  order: number;
}

/** Flattens a stylesheet into declarations, each with the media queries around it. */
function declarations(css: string): Declaration[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: Declaration[] = [];
  const stack: { kind: 'media' | 'rule' | 'other'; head: string }[] = [];
  let buffer = '';
  let order = 0;
  const flush = (chunk: string) => {
    const top = stack[stack.length - 1];
    if (!top || top.kind !== 'rule') return;
    const colon = chunk.indexOf(':');
    if (colon < 0) return;
    const property = chunk.slice(0, colon).trim();
    const media = stack.filter((s) => s.kind === 'media').map((s) => s.head).join(' & ');
    for (const selector of top.head.split(',')) out.push({ selector: selector.trim(), property, media, order: order++ });
  };
  for (const c of text) {
    if (c === '{') {
      const head = buffer.trim();
      buffer = '';
      stack.push({ kind: head.startsWith('@media') ? 'media' : head.startsWith('@') ? 'other' : 'rule', head });
    } else if (c === '}') {
      flush(buffer);
      buffer = '';
      stack.pop();
    } else if (c === ';') {
      flush(buffer);
      buffer = '';
    } else {
      buffer += c;
    }
  }
  return out;
}

for (const file of readdirSync(STYLES).filter((f) => f.endsWith('.css'))) {
  test(`${file}: no media query is undone by a later rule`, () => {
    const list = declarations(readFileSync(join(STYLES, file), 'utf8'));
    for (const d of list) {
      if (!d.media) continue;
      const later = list.find((e) => e.order > d.order && !e.media && e.selector === d.selector && e.property === d.property);
      assert.equal(later, undefined, `"${d.selector}" ${d.property} inside ${d.media} is overridden by a later rule outside it`);
    }
  });
}
