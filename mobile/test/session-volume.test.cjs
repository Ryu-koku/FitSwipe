const assert = require('node:assert/strict');
const test = require('node:test');
const { seedState, setVolume } = require('../src/logic.ts');
const { sessionVolumes } = require('../src/session-volume.ts');

const session = (id, day, status = 'COMPLETED') => ({ id, startedAt: `2026-11-${day}T10:00:00Z`, status });
const row = (sessionId, exerciseId, weight, reps, extra = {}) => ({ sessionId, exerciseId, normalWeightKg: weight, normalReps: reps, isCompleted: true, ...extra });

test('shared volume sums each bilateral side and defaults missing inputs to zero', () => {
  assert.equal(setVolume(row(1, 1, 12.5, 8), 'NORMAL'), 100);
  assert.equal(setVolume({ leftWeightKg: 10, leftReps: 8, rightWeightKg: 12, rightReps: 5 }, 'BILATERAL'), 140);
  assert.equal(setVolume({ leftWeightKg: 10, leftReps: 8 }, 'BILATERAL'), 80);
  assert.equal(setVolume({}), 0);
});

test('compares the latest earlier completed session for each exercise, ignoring unfinished sets and future sessions', () => {
  const state = seedState();
  state.sessions = [session(4, '12'), session(1, '01'), session(3, '10', 'IN_PROGRESS'), session(2, '05'), session(5, '15')];
  state.sets = [row(1, 1, 10, 10), row(2, 1, 20, 10), row(3, 1, 500, 10), row(5, 1, 800, 10),
    row(4, 1, 20, 10), row(4, 1, 10, 10), row(4, 1, 999, 10, { isCompleted: false }),
    row(1, 2, 10, 10), row(4, 2, 5, 10), row(4, 3, 10, 10), row(4, 5, 0, 20)];
  const result = sessionVolumes(state, 4);
  assert.deepEqual(result.map(({ exerciseId, today, previous, percent }) => ({ exerciseId, today, previous, percent })), [
    { exerciseId: 1, today: 300, previous: 200, percent: 50 },
    { exerciseId: 2, today: 50, previous: 100, percent: -50 },
    { exerciseId: 3, today: 100, previous: null, percent: null },
  ]);
});

test('bilateral totals, unchanged totals and zero previous volume are finite', () => {
  const state = seedState();
  state.sessions = [session(1, '01'), session(2, '02')];
  const bilateral = { leftWeightKg: 10, leftReps: 8, rightWeightKg: 15, rightReps: 4 };
  state.sets = [row(1, 6, 999, 999, bilateral), row(2, 6, 999, 999, bilateral), row(1, 1, 0, 10), row(2, 1, 10, 10)];
  const result = sessionVolumes(state, 2);
  assert.equal(result[0].today, 140);
  assert.equal(result[0].percent, 0);
  assert.equal(result[1].previous, 0);
  assert.equal(result[1].percent, null);
  assert.deepEqual(sessionVolumes(state, 999), []);
  state.sets = [];
  assert.deepEqual(sessionVolumes(state, 2), []);
});
