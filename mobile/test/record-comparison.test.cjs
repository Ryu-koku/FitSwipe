const test = require('node:test');
const assert = require('node:assert/strict');
const { progressIndex, exerciseRecords, personalBest } = require('../src/home-progress.ts');
const { periodRecords, compareRecords, comparisonChoices } = require('../src/record-comparison.ts');
const today = new Date('2026-11-10T12:00:00');
const record = (sessionId, weight, reps, date = '2026-11-10', setId = sessionId) => ({ date, sessionId, setId, weight, reps });

test('same-weight comparison takes the best set per session, preserves declines and keeps the all-time reference', () => {
  const rows = [record(1, 50, 12), record(2, 50, 8), record(2, 50, 10, undefined, 20), record(3, 50, 9), record(4, 60, 20)];
  const result = compareRecords(rows, 'weight', 50);
  assert.equal(result.previous.reps, 10);
  assert.equal(result.latest.reps, 9);
  assert.equal(result.difference, -1);
  assert.equal(result.best.reps, 12);
  assert.equal(result.latest.sessionId, 3);
});

test('same-repetition comparison ignores other repetitions and does not confuse extra sets with extra sessions', () => {
  const rows = [record(1, 50, 8), record(1, 55, 8, undefined, 11), record(2, 57.5, 8), record(3, 100, 1)];
  const result = compareRecords(rows, 'reps', 8);
  assert.equal(result.previous.weight, 55);
  assert.equal(result.latest.weight, 57.5);
  assert.equal(result.difference, 2.5);
  assert.equal(result.best.weight, 57.5);
  assert.equal(compareRecords(rows.slice(0, 2), 'reps', 8).difference, undefined);
});

test('empty, first-time, tied and bodyweight records do not fabricate progress or a load PR', () => {
  assert.deepEqual(comparisonChoices([], 'weight'), []);
  assert.equal(compareRecords([], 'weight', 50).latest, undefined);
  const rows = [record(1, 0, 10), record(2, 0, 10)];
  assert.deepEqual(comparisonChoices(rows, 'weight'), [0]);
  assert.deepEqual(comparisonChoices(rows, 'reps'), []);
  assert.equal(compareRecords(rows, 'weight', 0).difference, 0);
  assert.equal(compareRecords(rows, 'reps', 10).best, undefined);
});

test('calendar periods include their first day and today, excluding old and future records', () => {
  const rows = [record(1, 200, 1, '2025-12-31'), record(2, 100, 1, '2026-01-01'),
    record(3, 90, 1, '2026-10-31'), record(4, 80, 1, '2026-11-01'),
    record(5, 70, 1, '2026-11-10'), record(6, 300, 1, '2026-11-11')];
  assert.equal(personalBest(periodRecords(rows, 'all', today), 'weight').weight, 200);
  assert.equal(personalBest(periodRecords(rows, 'year', today), 'weight').weight, 100);
  assert.equal(personalBest(periodRecords(rows, 'month', today), 'weight').weight, 80);
  assert.deepEqual(periodRecords(rows, 'month', today).map(r => r.sessionId), [4, 5]);
  assert.equal(periodRecords(rows, 'month', new Date('2027-01-01T12:00:00')).length, 0);
  assert.deepEqual(periodRecords(rows, 'year', new Date('2026-01-01T12:00:00')).map(r => r.sessionId), [2]);
});

test('comparison uses actual session time even when same-day imported IDs are reversed, and keeps sides separate', () => {
  const state = {
    exercises: [{ id: 1, name: '左右種目', mode: 'BILATERAL' }],
    sessions: [{ id: 100, startedAt: '2026-11-10T08:00:00', status: 'COMPLETED' },
      { id: 1, startedAt: '2026-11-10T10:00:00', status: 'COMPLETED' },
      { id: 2, startedAt: '2026-11-10T11:00:00', status: 'IN_PROGRESS' }],
    sets: [100, 1, 2].map((id, i) => ({ id, sessionId: id, exerciseId: 1, isCompleted: true,
      leftCompleted: true, rightCompleted: i === 0,
      leftWeightKg: 50, leftReps: 8 + i, rightWeightKg: 50, rightReps: 20 + i })),
  };
  const index = progressIndex(state, today);
  const left = compareRecords(exerciseRecords(index, 1, 1), 'weight', 50);
  assert.equal(left.previous.sessionId, 100);
  assert.equal(left.latest.sessionId, 1);
  assert.equal(left.difference, 1);
  const right = compareRecords(exerciseRecords(index, 1, 2), 'weight', 50);
  assert.equal(right.latest.reps, 20);
  assert.equal(right.difference, undefined);
});
