const { test } = require('node:test');
const assert = require('node:assert/strict');
const { seedState, trainingLevel, strengthGrowth, estimatedOneRepMax, lastExerciseTrainingDays } = require('../src/logic.ts');

function fixture() {
  const state = seedState();
  const add = (id, date, weight, reps, extra = {}, status = 'COMPLETED') => {
    state.sessions.push({ id, startedAt: `${date}T12:00:00`, status });
    state.sets.push({ id, sessionId: id, exerciseId: 1, setOrder: 0,
      normalWeightKg: weight, normalReps: reps, isCompleted: true, ...extra });
  };
  return { state, add };
}

test('level starts at 1 and counts distinct completed training days only', () => {
  const { state, add } = fixture();
  assert.deepEqual(trainingLevel(state), { trainingDays: 0, level: 1 });
  add(1, '2025-01-01', 50, 5);
  add(2, '2025-01-01', 60, 5);
  add(3, '2025-01-02', 50, 5);
  add(4, '2025-01-03', 50, 5, {}, 'IN_PROGRESS');
  add(5, '2025-01-04', 50, 5, { isCompleted: false });
  add(6, '2099-01-01', 50, 5);
  assert.deepEqual(trainingLevel(state), { trainingDays: 2, level: 3 });
});

test('growth uses the daily best Epley estimate and includes declines', () => {
  const { state, add } = fixture();
  add(1, '2026-10-01', 60, 5);
  add(2, '2026-10-01', 75, 1);
  add(3, '2026-10-03', 60, 1);
  assert.deepEqual(strengthGrowth(state, 1, 0, new Date('2026-10-28T12:00:00')), [
    { date: '2026-10-01', value: 75 },
    { date: '2026-10-03', value: 60 },
  ]);
});

test('estimated RM is validated and uses the Epley formula', () => {
  assert.equal(estimatedOneRepMax(100, 1), 100);
  assert.equal(estimatedOneRepMax(100, 10), 130);
  assert.equal(estimatedOneRepMax(0, 5), undefined);
  assert.equal(estimatedOneRepMax(100, 13), undefined);
});

test('last trained days uses only completed sets in completed sessions', () => {
  const { state, add } = fixture();
  assert.equal(lastExerciseTrainingDays(state, 1, new Date('2026-10-29T12:00:00')), undefined);
  add(1, '2026-10-25', 50, 5);
  add(2, '2026-10-27', 50, 5, {}, 'IN_PROGRESS');
  assert.equal(lastExerciseTrainingDays(state, 1, new Date('2026-10-29T12:00:00')), 4);
});

test('growth excludes invalid reps, weights, dates, incomplete and other exercise records', () => {
  const { state, add } = fixture();
  add(1, '2026-10-01', 60, 0);
  add(2, '2026-10-01', 60, 11);
  add(3, '2026-10-01', 0, 5);
  add(4, '2026-10-01', Infinity, 5);
  add(5, '2026-10-01', 60, 5, { isCompleted: false });
  add(6, '2026-10-01', 60, 5, { exerciseId: 2 });
  add(7, '2026-10-01', 60, 5, {}, 'IN_PROGRESS');
  add(8, '2026-07-30', 60, 5);
  add(9, '2026-10-29', 60, 5);
  add(10, '2026-07-31', 30, 10);
  assert.deepEqual(strengthGrowth(state, 1, 0, new Date('2026-10-28T12:00:00')), [
    { date: '2026-07-31', value: 40 },
  ]);
});

test('bilateral growth keeps left and right estimates separate', () => {
  const { state, add } = fixture();
  add(1, '2026-10-01', undefined, undefined, {
    leftWeightKg: 20, leftReps: 6, rightWeightKg: 25, rightReps: 1,
  });
  const today = new Date('2026-10-28T12:00:00');
  assert.equal(strengthGrowth(state, 1, 1, today)[0].value, 24);
  assert.equal(strengthGrowth(state, 1, 2, today)[0].value, 25);
  assert.deepEqual(strengthGrowth(state, 1, 0, today), []);
});
