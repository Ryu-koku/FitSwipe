const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { seedState, KG_PER_LB, weightToDisplay, weightToKg, weightInputValue, roundWeight, weightStep, formatWeight } = require('../src/logic.ts');
const { exportBackup, parseBackup, restoreBackup } = require('../src/backup.ts');
const { emptyCloud, trackChanges, receive, mergeGuest } = require('../src/sync.ts');
const { startWorkout, updateSet, finishWorkout } = require('../src/workout.ts');
const { workoutSnapshot } = require('../src/rooms.ts');

test('weight conversion, rounding and formatting use display units', () => {
  assert.equal(weightToDisplay(KG_PER_LB, 'lb'), 1);
  assert.equal(weightToKg(1, 'lb'), KG_PER_LB);
  assert.equal(weightToKg(50, 'kg'), 50);
  assert.equal(roundWeight(12.36, 'lb'), 12.4);
  assert.equal(roundWeight(12.35, 'lb'), 12.4);
  assert.equal(roundWeight(0.15, 'lb'), 0.2);
  assert.equal(roundWeight(1.005, 'kg'), 1.01);
  assert.equal(weightToKg(12.36, 'lb'), 12.4 * KG_PER_LB);
  assert.equal(formatWeight(50), '50 kg');
  assert.equal(formatWeight(50, 'lb'), '110.2 lb');
  assert.equal(formatWeight(0, 'lb'), '0.0 lb');
  assert.equal(formatWeight(undefined, 'lb'), '—');
  assert.equal(formatWeight(NaN, 'kg'), '—');
  assert.equal(weightInputValue(undefined, 'lb'), undefined);
  assert.equal(weightStep(1, 'lb'), 5);
  assert.equal(weightStep(2.5, 'lb'), 5.5);
  assert.equal(weightStep(0.01, 'lb'), 0.1);
  assert.equal(weightStep(1.25, 'kg'), 1.25);
});

test('repeated lb input/save/load cycles do not drift', () => {
  for (const input of [0, 0.1, 1, 5, 12.3, 110.2, 225, 999.9]) {
    const kg = weightToKg(input, 'lb');
    let stored = kg;
    for (let n = 0; n < 100; n++) {
      assert.equal(weightInputValue(stored, 'lb'), input);
      stored = JSON.parse(JSON.stringify(weightToKg(weightInputValue(stored, 'lb'), 'lb')));
    }
    assert.equal(stored, kg);
  }
});

test('new and old backups default to kg; lb and global rest settings round-trip', () => {
  const state = seedState();
  assert.equal(state.weightUnit, 'kg');
  delete state.weightUnit;
  assert.equal(parseBackup(JSON.stringify(state)).weightUnit, 'kg');
  state.weightUnit = 'lb'; state.restTimerDisabled = true;
  const backup = exportBackup(state);
  const parsed = parseBackup(backup);
  assert.equal(parsed.weightUnit, 'lb');
  assert.equal(parsed.restTimerDisabled, true);
  assert.equal(restoreBackup(seedState(), backup, randomUUID).weightUnit, 'lb');
  state.weightUnit = 'stone';
  assert.throws(() => parseBackup(JSON.stringify(state)));
});

test('unit preference synchronizes and merges without converting stored weights', () => {
  const identity = { id: randomUUID(), name: 'test', token: 'test', expiresAt: 9999999999 };
  const before = { ...seedState(), cloud: emptyCloud(identity) };
  const changed = trackChanges(before, { ...before, weightUnit: 'lb' }, randomUUID);
  const mutation = changed.cloud.pending.find(r => r.kind === 'setting' && r.payload?.field === 'weightUnit');
  assert.ok(mutation);
  const restored = receive(before, { changes: [{ ...mutation, revision: 1 }], cursor: 1, hasMore: false });
  assert.equal(restored.weightUnit, 'lb');
  assert.deepEqual(restored.presets, before.presets);
  assert.equal(mergeGuest(before, { ...seedState(), weightUnit: 'lb' }, randomUUID).weightUnit, 'lb');
});

test('room payloads remain kg for lb input', () => {
  let state = startWorkout({ ...seedState(), weightUnit: 'lb' });
  const id = state.sets[0].id;
  const kg = weightToKg(135, 'lb');
  state = updateSet(state, id, { normalWeightKg: kg, normalReps: 8 });
  state.sets = state.sets.map(s => s.id === id ? { ...s, isCompleted: true } : s);
  const sessionId = state.workout.sessionId;
  state = finishWorkout(state, sessionId);
  const snapshot = workoutSnapshot(state, sessionId);
  assert.equal(snapshot.exercises[0].sets[0].weightKg, kg);
});

test('new unit setting does not renumber existing remote setting IDs', () => {
  const { project } = require('../src/sync.ts');
  const records = Object.values(project(seedState(), {}, randomUUID));
  const settings = records.filter(r => r.kind === 'setting');
  assert.equal(settings.find(r => r.payload.field === 'themeMode').id, '00000000-0000-4000-8000-000000000001');
  assert.equal(settings.find(r => r.payload.field === 'heightCm').id, '00000000-0000-4000-8000-000000000013');
  assert.equal(settings.find(r => r.payload.field === 'weightUnit').id, '00000000-0000-4000-8000-000000000014');
});
