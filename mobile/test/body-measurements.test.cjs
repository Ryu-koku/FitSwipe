const assert = require('node:assert/strict');
const test = require('node:test');
const { seedState } = require('../src/logic.ts');
const { importBodyMeasurements } = require('../src/body-measurements.ts');
const sample = (uuid, value) => ({ uuid, value, startDate: new Date('2026-11-08T01:00:00Z') });
test('health import retains centimeters, both same-day samples and idempotent UUIDs', () => {
  const before = seedState();
  const weights = [sample('a', 65), sample('b', 66)];
  const next = importBodyMeasurements(before, weights, [sample('fat', 0.2)], [sample('height', 170)]);
  assert.equal(next.heightCm, 170); assert.equal(next.bodyMeasurements[0].heightCm, 170);
  assert.equal(next.bodyMeasurements[0].bodyFatPercent, 20); assert.equal(next.bodyMeasurements.length, 2);
  assert.equal(importBodyMeasurements(next, weights, [], []).bodyMeasurements.length, 2);
  assert.equal(before.bodyMeasurements.length, 0);
});
test('invalid health readings do not poison saved measurements', () => {
  const before = { ...seedState(), heightCm: 170 };
  const next = importBodyMeasurements(before, [sample('bad', NaN), sample('ok', 65)], [sample('fat', 200)], [sample('height', 17000)]);
  assert.equal(next.heightCm, 170); assert.equal(next.bodyMeasurements.length, 1);
  assert.equal(next.bodyMeasurements[0].bodyFatPercent, undefined);
});

test('native body-fat fractions convert to UI percentages, including boundaries', () => {
  for (const [fraction, percent] of [[0, 0], [0.2, 20], [0.237, 23.7], [1, 100]]) {
    const next = importBodyMeasurements(seedState(), [sample('weight', 65)], [sample('fat', fraction)], []);
    assert.equal(next.bodyMeasurements[0].bodyFatPercent, percent);
  }
  for (const value of [-0.1, 1.1, NaN, Infinity]) {
    const next = importBodyMeasurements(seedState(), [sample('weight', 65)], [sample('fat', value)], []);
    assert.equal(next.bodyMeasurements[0].bodyFatPercent, undefined);
  }
});
test('health source identity survives guest login and backup merge without duplicate readings', () => {
  const { randomUUID } = require('node:crypto');
  const { mergeGuest } = require('../src/sync.ts');
  const { exportBackup, restoreBackup } = require('../src/backup.ts');
  const weights = [sample(randomUUID(), 65)];
  const guest = importBodyMeasurements(seedState(), weights, [sample('fat', 0.2)], []);
  const account = mergeGuest(seedState(), guest, randomUUID);
  assert.equal(importBodyMeasurements(account, weights, [], []).bodyMeasurements.length, 1);
  const mergedAgain = mergeGuest(account, guest, randomUUID);
  assert.equal(mergedAgain.bodyMeasurements.length, 1);
  const restored = restoreBackup(seedState(), exportBackup(guest), randomUUID);
  assert.equal(importBodyMeasurements(restored, weights, [], []).bodyMeasurements.length, 1);
});

test('rereading a known health sample repairs the old fractional value without duplication', () => {
  const state = { ...seedState(), bodyMeasurements: [{ id: 'health-weight', measuredAt: '2026-11-08T01:00:00Z', weightKg: 65, bodyFatPercent: 0.2 }] };
  const next = importBodyMeasurements(state, [sample('weight', 65)], [sample('fat', 0.2)], []);
  assert.equal(next.bodyMeasurements.length, 1);
  assert.equal(next.bodyMeasurements[0].bodyFatPercent, 20);
  assert.equal(state.bodyMeasurements[0].bodyFatPercent, 0.2);
});

test('rereading preserves historical height even when current height has changed', () => {
  const state = { ...seedState(), heightCm: 180, bodyMeasurements: [{ id: 'health-weight', measuredAt: '2026-11-08T01:00:00Z', weightKg: 65, heightCm: 170 }] };
  for (const heights of [[], [sample('height', 180)]]) {
    const next = importBodyMeasurements(state, [sample('weight', 65)], [], heights);
    assert.equal(next.bodyMeasurements[0].heightCm, 170);
    assert.equal(next.heightCm, 180);
  }
});
test('new historical weights use only a height measured at or before the weight', () => {
  const weights = [sample('weight', 65)];
  const future = { ...sample('height', 180), startDate: new Date('2026-11-09T00:00:00Z') };
  const earlier = { ...sample('earlier', 170), startDate: new Date('2026-11-07T00:00:00Z') };
  assert.equal(importBodyMeasurements(seedState(), weights, [], [future]).bodyMeasurements[0].heightCm, undefined);
  assert.equal(importBodyMeasurements(seedState(), weights, [], [future, earlier]).bodyMeasurements[0].heightCm, 170);
});

test('body fat pairs with weight by local calendar day, not UTC date', () => {
  const { importBodyMeasurements } = require('../src/body-measurements.ts');
  const { seedState } = require('../src/logic.ts');
  const weight = new Date(2026, 9, 5, 8, 30), fat = new Date(2026, 9, 5, 9, 10);
  const state = importBodyMeasurements(seedState(), [{ uuid: 'w', startDate: weight, value: 70 }], [{ uuid: 'f', startDate: fat, value: 0.2 }], []);
  assert.equal(state.bodyMeasurements[0].bodyFatPercent, 20);
});
