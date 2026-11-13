const { test } = require('node:test');
const assert = require('node:assert/strict');
const { seedState, previousSessionSets, previousSet } = require('../src/logic.ts');

function fixture() {
  const state = seedState();
  state.sessions = [3, 1, 4, 2].map(id => ({
    id, startedAt: `2026-01-0${id}T10:00:00Z`,
    status: id === 3 ? 'IN_PROGRESS' : 'COMPLETED',
  }));
  state.sets = [1, 2, 3, 4].flatMap(sessionId => [3, 1, 2].map(setOrder => ({
    id: sessionId * 10 + setOrder, sessionId, exerciseId: 1, setOrder,
    isCompleted: true, leftCompleted: true, rightCompleted: true,
    normalWeightKg: 60, normalReps: 10,
    leftWeightKg: 20, leftReps: 8, rightWeightKg: 25, rightReps: 6,
  })));
  return state;
}

test('previous set matches order in latest prior completed session without mutation', () => {
  const state = fixture();
  const before = structuredClone(state);
  assert.equal(previousSet(state, 1, 3, 2).id, 22);
  assert.deepEqual(state, before);
});

test('previous set falls back to last completed order within the same session', () => {
  const state = fixture();
  state.sets.find(s => s.id === 22).isCompleted = false;
  assert.equal(previousSet(state, 1, 3, 2).id, 23);
  assert.equal(previousSet(state, 1, 3, 4).id, 23);
});

test('previous set matches sides independently including partial bilateral completion', () => {
  const state = fixture();
  Object.assign(state.sets.find(s => s.id === 22), { isCompleted: false, leftCompleted: false });
  assert.equal(previousSet(state, 1, 3, 2, 'right').id, 22);
  assert.equal(previousSet(state, 1, 3, 2, 'right').rightWeightKg, 25);
  assert.equal(previousSet(state, 1, 3, 2, 'left').id, 23);
});

test('previous set excludes skipped sides and sessions without completed records', () => {
  const state = fixture();
  for (const row of state.sets.filter(s => s.sessionId === 2)) {
    row.skippedInputs = { left: { weightKg: 20, reps: 8 } };
  }
  assert.equal(previousSet(state, 1, 3, 2, 'left').id, 12);
  assert.equal(previousSet(state, 1, 3, 2, 'right').id, 22);
  state.sessions.find(s => s.id === 2).status = 'IN_PROGRESS';
  assert.equal(previousSet(state, 1, 3, 2).id, 12);
});

test('previous set supports bodyweight and returns undefined without matching history', () => {
  const state = fixture();
  delete state.sets.find(s => s.id === 22).normalWeightKg;
  assert.equal(previousSet(state, 1, 3, 2).normalWeightKg, undefined);
  assert.equal(previousSet(state, 1, 3, 2).normalReps, 10);
  assert.equal(previousSet(state, 99, 3, 2), undefined);
  state.sets = state.sets.filter(s => s.sessionId === 3);
  assert.equal(previousSet(state, 1, 3, 2), undefined);
});

test('previous session sets returns all completed sets in set order without mutation', () => {
  const state = fixture();
  const before = structuredClone(state);
  assert.deepEqual(previousSessionSets(state, 1, 3).map(row => row.id), [21, 22, 23]);
  assert.deepEqual(state, before);
});

test('previous session sets uses the latest session with records for the requested side', () => {
  const state = fixture();
  state.sets.find(row => row.id === 21).leftCompleted = false;
  state.sets.find(row => row.id === 22).skippedInputs = { left: { weightKg: 20, reps: 8 } };
  state.sets.find(row => row.id === 23).leftCompleted = false;
  assert.deepEqual(previousSessionSets(state, 1, 3, 'left').map(row => row.id), [11, 12, 13]);
  assert.deepEqual(previousSessionSets(state, 1, 3, 'right').map(row => row.id), [21, 22, 23]);
  state.sets.find(row => row.id === 22).isCompleted = false;
  assert.deepEqual(previousSessionSets(state, 1, 3).map(row => row.id), [21, 23]);
});

test('previous session sets excludes current, later and unfinished sessions and unrelated exercises', () => {
  const state = fixture();
  state.sessions.find(row => row.id === 2).status = 'IN_PROGRESS';
  assert.deepEqual(previousSessionSets(state, 1, 3).map(row => row.id), [11, 12, 13]);
  assert.deepEqual(previousSessionSets(state, 99, 3), []);
  state.sets = state.sets.filter(row => row.sessionId === 3 || row.sessionId === 4);
  assert.deepEqual(previousSessionSets(state, 1, 3), []);
});
