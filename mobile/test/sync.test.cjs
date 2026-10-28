const assert = require('node:assert/strict');
const test = require('node:test');
const { randomUUID } = require('node:crypto');
const { seedState } = require('../src/logic.ts');
const { emptyCloud, trackChanges, receive, acknowledge, mergeGuest, project } = require('../src/sync.ts');

const identity = { id: randomUUID(), name: 'tester', token: 'test-only', expiresAt: 9999999999 };
const blank = () => ({ ...seedState(), exercises: [], sessions: [], sets: [], presets: [], nextId: 1 });
const signed = () => ({ ...blank(), cloud: emptyCloud(identity) });
const page = (changes, cursor = 1) => ({ changes: changes.map((v, i) => ({ ...v, revision: i + 1 })), cursor, hasMore: false });

test('offline edits produce durable UUID mutations including deletes', () => {
  const before = signed();
  const next = trackChanges(before, { ...before, exercises: [{ id: 1, name: 'bench', mode: 'NORMAL', sortOrder: 0, archived: false }], nextId: 2 }, randomUUID);
  const added = next.cloud.pending.find((r) => r.kind === 'exercise');
  assert.match(added.id, /^[a-f0-9-]{36}$/);
  assert.equal(added.payload.name, 'bench');
  const removed = trackChanges(next, { ...next, exercises: [] }, randomUUID);
  const deletion = removed.cloud.pending.at(-1);
  assert.equal(deletion.id, added.id);
  assert.equal(deletion.deleted, true);
  assert.equal(deletion.payload, null);
  assert.equal(acknowledge(removed, [added.mutationId]).cloud.pending.length, removed.cloud.pending.length - 1);
});

test('remote records restore references despite numeric ID collisions', () => {
  let a = signed();
  a = trackChanges(a, { ...a,
    exercises: [{ id: 10, name: 'bench', mode: 'NORMAL', sortOrder: 0, archived: false }],
    sessions: [{ id: 11, startedAt: '2026-10-28T10:00:00Z', endedAt: '2026-10-28T10:30:00Z', status: 'COMPLETED' }],
    sets: [{ id: 12, exerciseId: 10, sessionId: 11, setOrder: 1, normalWeightKg: 60, normalReps: 10, isCompleted: true, leftCompleted: false, rightCompleted: false }],
    nextId: 13,
  }, randomUUID);
  const restored = receive(signed(), page(a.cloud.pending, 50));
  assert.equal(restored.sessions[0].startedAt, a.sessions[0].startedAt);
  assert.equal(restored.sets[0].exerciseId, restored.exercises[0].id);
  assert.equal(restored.sets[0].sessionId, restored.sessions[0].id);
  assert.equal(restored.sets[0].normalWeightKg, 60);
  assert.equal(restored.cloud.cursor, 50);
  assert.equal(restored.cloud.pending.length, 0);
});

test('pull does not discard a local edit made during an in-flight request', () => {
  const before = signed();
  const edited = trackChanges(before, { ...before, themeMode: 'dark' }, randomUUID);
  const setting = edited.cloud.pending.find((r) => r.payload.field === 'themeMode');
  const pulled = receive(edited, page([{ ...setting, payload: { field: 'themeMode', value: 'light' } }]));
  assert.equal(pulled.themeMode, 'dark');
  assert.equal(pulled.cloud.pending.length, edited.cloud.pending.length);
  const confirmed = receive(acknowledge(pulled, [setting.mutationId]), page([{ ...setting, payload: { field: 'themeMode', value: 'light' } }], 2));
  assert.equal(confirmed.themeMode, 'light');
});

test('confirmed guest import remaps IDs and excludes identity and room caches', () => {
  const guest = seedState();
  guest.sessions = [{ id: 1, startedAt: '2026-01-01T00:00:00Z', status: 'COMPLETED' }];
  guest.roomIdentity = { id: 'guest', token: 'never-upload', name: 'guest' };
  guest.pendingPosts = [{ roomId: 'private-room', workout: { clientId: 'sensitive' } }];
  const next = mergeGuest(signed(), guest, randomUUID);
  assert.equal(next.sessions.length, 1);
  assert.ok(next.cloud.pending.some((r) => r.kind === 'session'));
  const json = JSON.stringify(next.cloud.pending);
  assert.ok(!json.includes('never-upload'));
  assert.ok(!json.includes('private-room'));
  assert.equal(next.cloud.identity.id, identity.id);
  const mapping = { ...next.cloud.mapping };
  assert.deepEqual(project(next, mapping, randomUUID), project(next, mapping, randomUUID));
});

test('remote deletion removes related sets, with cursor and tombstone preserved', () => {
  const exercise = { kind: 'exercise', id: randomUUID(), deleted: false, payload: { name: 'bench', mode: 'NORMAL', sortOrder: 0, archived: false } };
  const state = receive(signed(), page([exercise]));
  const deleted = receive(state, page([{ ...exercise, deleted: true, payload: null }], 2));
  assert.equal(deleted.exercises.length, 0);
  assert.equal(deleted.cloud.cursor, 2);
});

test('presets, selected preset and per-exercise preferences survive UUID remapping', () => {
  const guest = seedState();
  guest.selectedPresetId = guest.presets[0].id;
  const exercise = guest.exercises[0].id;
  guest.exerciseWeightSteps = { [exercise]: 2.5 };
  guest.exerciseRestDurations = { [exercise]: 75 };
  guest.sideSwitchRestExerciseIds = [exercise];
  guest.leftFirstExerciseIds = [exercise];
  const mapped = mergeGuest(signed(), guest, randomUUID);
  const target = receive(signed(), page(Object.values(project(mapped, mapped.cloud.mapping, randomUUID))));
  const restored = target.exercises.find((e) => e.name === guest.exercises[0].name);
  assert.equal(target.exerciseWeightSteps[restored.id], 2.5);
  assert.equal(target.exerciseRestDurations[restored.id], 75);
  assert.deepEqual(target.leftFirstExerciseIds, [restored.id]);
  assert.deepEqual(target.sideSwitchRestExerciseIds, [restored.id]);
  assert.ok(target.presets.some((p) => p.id === target.selectedPresetId));
  target.presets.forEach((p) => p.exercises.forEach((e) => assert.ok(target.exercises.some((item) => item.id === e.exerciseId))));
});
