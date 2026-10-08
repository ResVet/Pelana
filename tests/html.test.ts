// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// The small markup language the copy is written in.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { md, plain } from '../src/site/html.ts';

test('copy is escaped before markup is added', () => {
  assert.equal(md('<b>x</b> & y').value, '&lt;b&gt;x&lt;/b&gt; &amp; y');
});

test('italics and links render', () => {
  assert.equal(md('An _Aedes aegypti_ egg').value, 'An <i>Aedes aegypti</i> egg');
  assert.equal(md('[the guide](/en/sources/)').value, '<a href="/en/sources/">the guide</a>');
  assert.match(md('[WHO](https://www.who.int/)').value, /rel="noopener" target="_blank"/);
});

test('no-wrap spans and italics never reach inside a link address', () => {
  const out = md('See [the TAK-003 trial](https://example.org/TAK-003_trial_data/DENV-1) for DENV-2.').value;
  assert.match(out, /href="https:\/\/example\.org\/TAK-003_trial_data\/DENV-1"/);
  assert.match(out, />the <span class="nw">TAK-003<\/span> trial<\/a>/);
  assert.match(out, /for <span class="nw">DENV-2<\/span>\./);
});

test('plain strips the markup', () => {
  assert.equal(plain('An _Aedes_ [egg](/x/)'), 'An Aedes egg');
});
