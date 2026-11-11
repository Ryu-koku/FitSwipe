const test = require('node:test');
const assert = require('node:assert/strict');
const { canAddPreset, canAddCustomExercise, canCreateRoom } = require('../src/premium.ts');
const { seedState } = require('../src/logic.ts');
const { exportBackup, parseBackup, restoreBackup } = require('../src/backup.ts');
const { randomUUID } = require('node:crypto');
const { emptyCloud, trackChanges, receive } = require('../src/sync.ts');

test('presets stop at three and premium accepts over-limit data', () => {
  for (const n of [0, 2, 3, 4]) {
    const state = { presets: Array(n).fill({}) };
    assert.equal(canAddPreset(state, false), n < 3);
    assert.equal(canAddPreset(state, true), true);
  }
});
test('only active explicitly custom exercises count toward three', () => {
  for (const n of [0, 2, 3, 4]) {
    const state = { exercises: [...Array(n).fill({ custom: true, archived: false }), {}, { custom: false }, { custom: true, archived: true }] };
    assert.equal(canAddCustomExercise(state, false), n < 3);
    assert.equal(canAddCustomExercise(state, true), true);
  }
});
test('only owned rooms count toward two', () => {
  for (const n of [0, 1, 2, 3]) {
    const rooms = [...Array(n).fill({ ownerId: 'me' }), ...Array(20).fill({ ownerId: 'other' })];
    assert.equal(canCreateRoom(rooms, 'me', false), n < 2);
    assert.equal(canCreateRoom(rooms, 'me', true), true);
  }
});
test('custom flag survives backup export, parse and restore even with a matching catalog name', () => {
  const state = seedState();
  state.exercises = state.exercises.map((e, i) => i === 0 ? { ...e, custom: true } : e);
  const json = exportBackup(state);
  assert.equal(parseBackup(json).exercises[0].custom, true);
  const restored = restoreBackup(seedState(), json, randomUUID);
  assert.ok(restored.exercises.some(e => e.custom === true));
});
test('custom flag survives personal cloud synchronization', () => {
  const state = seedState();
  state.cloud = emptyCloud({ id: 'me' });
  const next = { ...state, exercises: state.exercises.map((e, i) => i === 0 ? { ...e, custom: true } : e) };
  const tracked = trackChanges(state, next, randomUUID);
  const changes = tracked.cloud.pending.filter(m => m.kind === 'exercise').map((m, i) => ({ ...m, revision: i + 1 }));
  const received = receive(state, { changes, cursor: changes.length, hasMore: false });
  assert.ok(received.exercises.some(e => e.custom === true));
});
