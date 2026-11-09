import assert from 'node:assert/strict';
import test from 'node:test';
import { japanMonth, monthBounds } from '../room-comparison.mjs';

test('Japan month boundaries are explicit and invalid periods are rejected', () => {
  assert.equal(japanMonth(new Date('2026-09-30T15:00:00Z')), '2026-10');
  assert.deepEqual(monthBounds('2026-12'), ['2026-11-30T15:00:00.000Z', '2026-12-31T15:00:00.000Z']);
  for (const month of [null, '2026-13', '2026-0', '0000-01']) assert.throws(() => monthBounds(month));
});
