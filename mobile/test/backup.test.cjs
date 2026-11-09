const assert = require('node:assert/strict');
const test = require('node:test');
const { randomUUID } = require('node:crypto');
const { seedState } = require('../src/logic.ts');
const { exportBackup, parseBackup, restoreBackup } = require('../src/backup.ts');
const { emptyCloud, trackChanges } = require('../src/sync.ts');
const fixture = () => ({ ...seedState(),
  sessions: [{ id: 100, startedAt: '2026-11-08T01:00:00Z', endedAt: '2026-11-08T02:00:00Z', status: 'COMPLETED', presetId: 'gym' }],
  sets: [{ id: 101, sessionId: 100, exerciseId: 1, setOrder: 1, normalWeightKg: 50, normalReps: 10, isCompleted: true, leftCompleted: false, rightCompleted: false }],
  bodyMeasurements: [{ id: 'reading', measuredAt: '2026-11-08T01:00:00Z', weightKg: 65, bodyFatPercent: 20, heightCm: 170 }], heightCm: 170, nextId: 102,
});
test('portable backup excludes account, room, sync and unknown nested fields', () => {
  const state = fixture();
  state.cloud = emptyCloud({ id: 'source', name: 'source', token: 'PRIVATE-TOKEN', expiresAt: 9999999999 });
  state.roomIdentity = state.cloud.identity;
  state.pendingPosts = [{ roomId: 'PRIVATE-ROOM' }];
  state.automaticRoomReceipts = { 'PRIVATE-ROOM': {} };
  state.exercises[0].unexpected = { token: 'NESTED-SECRET' };
  const json = exportBackup(state);
  for (const secret of ['PRIVATE-TOKEN', 'PRIVATE-ROOM', 'NESTED-SECRET', 'installationId', 'cloud', 'roomIdentity']) assert.ok(!json.includes(secret), secret);
  const restored = parseBackup(json);
  assert.deepEqual(restored.sets, parseBackup(JSON.stringify(fixture())).sets);
  assert.deepEqual(restored.bodyMeasurements, fixture().bodyMeasurements);
  assert.equal(restored.cloud, undefined);
});
test('restore validates all input before adding, remaps collisions and retains current identity/outbox', () => {
  const current = fixture();
  current.cloud = emptyCloud({ id: 'destination', name: 'destination', token: 'current-token', expiresAt: 9999999999 });
  current.roomIdentity = current.cloud.identity;
  current.cloud.pending = [{ mutationId: 'already-pending' }];
  const before = JSON.stringify(current);
  const next = restoreBackup(current, exportBackup(fixture()), randomUUID);
  assert.equal(JSON.stringify(current), before);
  assert.equal(next.cloud, current.cloud);
  assert.equal(next.roomIdentity, current.roomIdentity);
  assert.equal(next.sessions.length, 2);
  assert.equal(next.sets.length, 2);
  assert.notEqual(next.sessions[0].id, next.sessions[1].id);
  assert.equal(next.sets[1].sessionId, next.sessions[1].id);
  assert.notEqual(next.bodyMeasurements[0].id, next.bodyMeasurements[1].id);
  const tracked = trackChanges(current, next, randomUUID);
  assert.ok(tracked.cloud.pending.some(m => m.kind === 'session'));
  assert.equal(tracked.cloud.pending[0].mutationId, 'already-pending');
});
test('incomplete JSON, invalid records, duplicate IDs, bad references and unsupported versions fail without mutation', () => {
  const current = fixture(), before = JSON.stringify(current);
  const invalid = [
    '{broken', JSON.stringify({ exercises: [], sessions: [], sets: [] }),
    JSON.stringify({ format: 'fitswipe', version: 99, data: fixture() }),
  ];
  for (const change of [s => s.sets[0].exerciseId = 99999, s => s.sets[0].normalReps = -1,
    s => s.exercises.push(s.exercises[0]), s => s.presets[0].exercises[0].exerciseId = 99999,
    s => s.sessions[0].startedAt = 'invalid', s => s.sessions[0].startedAt = '2026-02-30T00:00:00Z', s => s.sets[0].isCompleted = 'true',
    s => s.bodyMeasurements[0].heightCm = 30000]) {
    const state = fixture(); change(state); invalid.push(JSON.stringify(state));
  }
  for (const json of invalid) assert.throws(() => restoreBackup(current, json, randomUUID));
  assert.equal(JSON.stringify(current), before);
});
test('legacy backup credentials never replace current login', () => {
  const source = fixture(); source.cloud = { identity: { token: 'old-secret' }, cursor: 12345 }; source.roomIdentity = { token: 'old-room-secret' };
  const next = restoreBackup(seedState(), JSON.stringify(source), randomUUID);
  assert.equal(next.cloud, undefined); assert.equal(next.roomIdentity, undefined);
  assert.ok(!JSON.stringify(next).includes('old-secret'));
});

test('backups keep skipped inputs so a skipped card can still be reopened', () => {
  const state = seedState();
  state.sessions = [{ id: 10, status: 'COMPLETED', startedAt: '2026-10-01T00:00:00.000Z', endedAt: '2026-10-01T01:00:00.000Z' }];
  state.sets = [{ id: 11, sessionId: 10, exerciseId: state.exercises[0].id, setOrder: 1, isCompleted: false, leftCompleted: false, rightCompleted: false,
    skippedInputs: { normal: { weightKg: 60, reps: 8 } }, finalSkippedSide: 'normal' }];
  const set = parseBackup(exportBackup(state)).sets[0];
  assert.deepEqual(set.skippedInputs, { normal: { weightKg: 60, reps: 8 } });
  assert.equal(set.finalSkippedSide, 'normal');
  assert.throws(() => parseBackup(exportBackup(state).replace('"normal": {', '"middle": {')));
});

test('restoring onto a fresh install reuses equal exercises instead of duplicating them', () => {
  const old = seedState();
  old.sessions = [{ id: 900, status: 'COMPLETED', startedAt: '2026-10-01T00:00:00.000Z', endedAt: '2026-10-01T01:00:00.000Z' }];
  old.sets = [{ id: 901, sessionId: 900, exerciseId: old.exercises[0].id, setOrder: 1, normalWeightKg: 50, normalReps: 5, isCompleted: true, leftCompleted: false, rightCompleted: false }];
  old.restTimerDisabledExerciseIds = [old.exercises[0].id];
  const fresh = { ...seedState(), restTimerDisabledExerciseIds: [old.exercises[0].id] };
  const restored = restoreBackup(fresh, exportBackup(old), randomUUID);
  assert.equal(restored.exercises.length, fresh.exercises.length);
  assert.equal(restored.sets[0].exerciseId, fresh.exercises.find((e) => e.name === old.exercises[0].name).id);
  assert.equal(new Set(restored.restTimerDisabledExerciseIds).size, restored.restTimerDisabledExerciseIds.length);
});
