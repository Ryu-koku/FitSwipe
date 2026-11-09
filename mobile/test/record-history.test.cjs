const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { seedState } = require('../src/logic.ts');
const { emptyCloud, trackChanges } = require('../src/sync.ts');
const { editRecordedSet, deleteRecordedSet, deleteRecordedSession } = require('../src/record-history.ts');
function fixture() {
  const state = seedState();
  const exerciseId = state.exercises[0].id;
  state.sessions = [1, 2, 3].map(id => ({ id, startedAt: `2026-11-09T0${id}:00:00Z`, status: id === 3 ? 'IN_PROGRESS' : 'COMPLETED' }));
  state.sets = [1, 2, 3].map(sessionId => ({ id: sessionId + 10, sessionId, exerciseId, setOrder: 1,
    normalWeightKg: 20, normalReps: 10, isCompleted: sessionId !== 3, leftCompleted: false, rightCompleted: false,
    createdAt: '2026-11-09T01:00:00Z', updatedAt: '2026-11-09T01:05:00Z' }));
  state.workout = { sessionId: 3, history: [], exerciseOrder: [exerciseId] };
  return state;
}
test('historical correction preserves other sessions, completion flags and original timing', () => {
  const state = fixture();
  const edited = editRecordedSet(state, 11, { normalWeightKg: 42.5, normalReps: 8 });
  assert.deepEqual(edited.sets[0], { ...state.sets[0], normalWeightKg: 42.5, normalReps: 8 });
  assert.equal(edited.sets[1], state.sets[1]);
  assert.equal(edited.sets[2], state.sets[2]);
  assert.equal(edited.workout, state.workout);
  assert.equal(editRecordedSet(state, 13, { normalWeightKg: 50 }), state);
  assert.equal(editRecordedSet(state, 11, { normalReps: 1.5 }), state);
  assert.equal(editRecordedSet(state, 11, { normalWeightKg: -1 }), state);
});
test('deleting a set or session leaves other sessions and active work intact', () => {
  const state = fixture();
  assert.deepEqual(deleteRecordedSet(state, 11).sets.map(row => row.id), [12, 13]);
  const removed = deleteRecordedSession(state, 1);
  assert.deepEqual(removed.sessions.map(row => row.id), [2, 3]);
  assert.deepEqual(removed.sets.map(row => row.id), [12, 13]);
  assert.equal(removed.workout, state.workout);
  assert.equal(deleteRecordedSet(state, 13), state);
  assert.equal(deleteRecordedSession(state, 3), state);
});
test('corrections and deletions enter the personal sync outbox', () => {
  let state = fixture();
  state.cloud = emptyCloud({ id: randomUUID(), name: 'tester', token: 'test-only', expiresAt: 9999999999 });
  state = trackChanges({ ...seedState(), cloud: state.cloud }, state, randomUUID);
  state = { ...state, cloud: { ...state.cloud, pending: [] } };
  const edited = trackChanges(state, editRecordedSet(state, 11, { normalWeightKg: 25 }), randomUUID);
  assert.equal(edited.cloud.pending.length, 1);
  assert.equal(edited.cloud.pending[0].kind, 'set');
  const removed = trackChanges(state, deleteRecordedSession(state, 1), randomUUID);
  assert.deepEqual(removed.cloud.pending.map(row => row.kind).sort(), ['session', 'set']);
  assert.ok(removed.cloud.pending.every(row => row.deleted));
});
