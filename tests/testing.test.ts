// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_DAY, TEST_KEYS, adviceFor, strength } from '../src/shared/tests.ts';

test('NS1 and PCR find the virus early; IgM takes over later', () => {
  assert.equal(strength('ns1', 2, 'no'), 2);
  assert.equal(strength('pcr', 2, 'no'), 2);
  assert.equal(strength('igm', 2, 'no'), 0);
  assert.equal(strength('igm', 8, 'no'), 2);
  assert.equal(strength('ns1', 12, 'no'), 0);
});

test('in a second infection IgG rises early and NS1 fades sooner', () => {
  assert.ok(strength('igg', 3, 'yes') > strength('igg', 3, 'no'));
  assert.ok(strength('ns1', 5, 'yes') < strength('ns1', 5, 'no'));
});

test('"not sure" never claims more than both histories agree on', () => {
  for (const key of TEST_KEYS) {
    for (let day = 1; day <= MAX_DAY; day++) {
      const a = strength(key, day, 'no');
      const b = strength(key, day, 'yes');
      const u = strength(key, day, 'unknown');
      assert.ok(u <= Math.max(a, b));
      if (u === 2) assert.ok(a === 2 && b === 2);
    }
  }
});

test('advice changes on days 4 and 8', () => {
  assert.equal(adviceFor(3), 'early');
  assert.equal(adviceFor(4), 'middle');
  assert.equal(adviceFor(7), 'middle');
  assert.equal(adviceFor(8), 'late');
});
