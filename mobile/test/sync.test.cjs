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

test('body readings merge independently across devices, survive pull, and support deletion', () => {
  const a = signed(), b = signed();
  const measurement = (id, weightKg) => ({ id, weightKg, bodyFatPercent: 20, heightCm: 170, measuredAt: '2026-11-08T00:00:00Z' });
  const editedA = trackChanges(a, { ...a, bodyMeasurements: [measurement('a', 65)], heightCm: 170 }, randomUUID);
  const editedB = trackChanges(b, { ...b, bodyMeasurements: [measurement('b', 66)] }, randomUUID);
  const pulled = receive(editedB, page(editedA.cloud.pending));
  assert.equal(pulled.bodyMeasurements.length, 2);
  assert.equal(pulled.heightCm, 170);
  const confirmed = receive(acknowledge(pulled, pulled.cloud.pending.map(m => m.mutationId)), page(editedB.cloud.pending, 2));
  const removed = trackChanges(confirmed, { ...confirmed, bodyMeasurements: confirmed.bodyMeasurements.filter(m => m.id !== 'a') }, randomUUID);
  assert.equal(removed.cloud.pending.length, 1); assert.equal(removed.cloud.pending[0].deleted, true);
  const result = receive(acknowledge(removed, removed.cloud.pending.map(m => m.mutationId)), page(removed.cloud.pending, 3));
  assert.deepEqual(result.bodyMeasurements.map(m => m.id), ['b']);
});
test('1000 measurements use small individual records rather than an oversized setting', () => {
  const before = signed();
  const measurements = Array.from({ length: 1000 }, (_, i) => ({ id: `measurement-${i}`, measuredAt: '2026-11-08T00:00:00Z', weightKg: 65, bodyFatPercent: 20, heightCm: 170 }));
  const next = trackChanges(before, { ...before, bodyMeasurements: measurements }, randomUUID);
  assert.equal(next.cloud.pending.length, 1000);
  assert.ok(next.cloud.pending.every(m => Buffer.byteLength(JSON.stringify(m.payload)) < 32768));
  const restored = receive(signed(), page(next.cloud.pending));
  assert.deepEqual(restored.bodyMeasurements, measurements);
});

test('the same health sample on two devices uses the same remote identity', () => {
  const id = `health-${randomUUID()}`;
  const reading = { id, measuredAt: '2026-11-08T00:00:00Z', weightKg: 65 };
  const a = signed(), b = signed();
  const first = trackChanges(a, { ...a, bodyMeasurements: [reading] }, randomUUID);
  const second = trackChanges(b, { ...b, bodyMeasurements: [reading] }, randomUUID);
  assert.equal(first.cloud.pending[0].id, second.cloud.pending[0].id);
  assert.equal(receive(second, page(first.cloud.pending)).bodyMeasurements.length, 1);
});
test('malformed remote shapes are skipped while valid entries are applied', () => {
  const records = [
    { kind: 'preset', id: 'bad-preset', payload: { exercises: null } },
    { kind: 'preset', id: 'preset', payload: { name: 'P', exercises: [null, {}, { exerciseId: 123 }, { exerciseId: 'exercise' }] } },
    { kind: 'set', id: 'set', payload: { sessionId: {}, exerciseId: 'exercise' } },
    { kind: 'session', id: 'session', payload: { presetId: [] } },
    ...['exerciseWeightSteps', 'exerciseRestDurations'].map(field => ({ kind: 'setting', id: field, payload: { field, value: null } })),
    ...['restTimerDisabledExerciseIds', 'sideSwitchRestExerciseIds', 'leftFirstExerciseIds'].map(field => ({ kind: 'setting', id: field, payload: { field, value: [null, 'exercise', {}] } })),
    ...[null, {}, { id: 1, measuredAt: 'x' }, { id: 'x', measuredAt: 1 }].map((value, i) => ({ kind: 'setting', id: `body-${i}`, payload: { field: 'bodyMeasurement', value } })),
    { kind: 'setting', id: 'selected', payload: { field: 'selectedPresetId', value: {} } },
  ].map(r => ({ ...r, deleted: false }));
  const result = receive(signed(), page(records));
  assert.equal(result.presets.length, 1); assert.equal(result.presets[0].exercises.length, 1);
  assert.equal(result.sessions.length, 0); assert.equal(result.sets.length, 0);
  assert.equal(result.bodyMeasurements.length, 0);
  assert.equal(result.cloud.cursor, 1);
  assert.equal(result.restTimerDisabledExerciseIds.length, 1);
});
test('selective tracking matches full projection including UUID order and mapping side effects', () => {
  const oldTrack = (previous, next, uuid) => {
    if (!next.cloud) return next;
    const cloud = { ...next.cloud, mapping: { ...next.cloud.mapping }, pending: [...next.cloud.pending] };
    const before = previous.cloud ? project(previous, cloud.mapping, uuid) : {}, after = project(next, cloud.mapping, uuid);
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (JSON.stringify(before[key]) === JSON.stringify(after[key])) continue;
      cloud.pending.push({ ...(after[key] ?? { ...before[key], deleted: true, payload: null }), mutationId: uuid() });
    }
    return { ...next, cloud };
  };
  let current = signed();
  for (let i = 0; i < 90; i++) {
    const edits = [
      s => ({ ...s, exercises: [...s.exercises, { id: i + 1, name: `E${i}`, mode: 'NORMAL' }] }),
      s => ({ ...s, presets: [...s.presets, { id: `p${i}`, name: 'P', exercises: [{ exerciseId: i + 9 }] }] }),
      s => ({ ...s, sessions: [...s.sessions, { id: i + 1, presetId: `p${i + 3}` }] }),
      s => ({ ...s, sets: [...s.sets, { id: i + 1, exerciseId: i + 8, sessionId: i + 4 }] }),
      s => ({ ...s, exerciseWeightSteps: { ...s.exerciseWeightSteps, [i + 7]: 2 }, leftFirstExerciseIds: [i + 6] }),
      s => ({ ...s, themeMode: i % 2 ? 'dark' : 'light', selectedPresetId: `p${i + 9}` }),
      s => ({ ...s, bodyMeasurements: [{ id: `m${i}`, measuredAt: '2026-11-08' }] }),
      s => ({ ...s, exercises: s.exercises.slice(1), sets: s.sets.slice(1) }),
      s => ({ ...s, nextId: i + 100 }),
    ];
    // Deliberately drop mappings sometimes to exercise references in unchanged collections.
    if (i % 13 === 0) current = { ...current, cloud: { ...current.cloud, mapping: {} } };
    const next = edits[i % edits.length](current);
    let a = 0, b = 0;
    // Unique across edits, like real UUIDs: a reused ID would merge records.
    const actual = trackChanges(current, next, () => `uuid-${i}-${a++}`);
    const expected = oldTrack(current, next, () => `uuid-${i}-${b++}`);
    assert.deepEqual(actual, expected, `edit ${i}`); assert.equal(a, b);
    current = actual;
  }
});

test('two devices adding the same catalog entries before syncing converge on one exercise each', () => {
  const { seedState } = require('../src/logic.ts');
  const { trackChanges, receive, emptyCloud } = require('../src/sync.ts');
  const { ensureExerciseCatalog } = require('../src/exercise-catalog.ts');
  const { randomUUID } = require('node:crypto');
  const server = [];
  const push = (s) => { s.cloud.pending.forEach((m) => server.push({ ...m, revision: server.length + 1 })); return { ...s, cloud: { ...s.cloud, pending: [] } }; };
  let a = { ...seedState(), exerciseCatalogVersion: 1, exercises: seedState().exercises.slice(0, 3), cloud: emptyCloud({ id: 'u', token: 't', name: 'n', expiresAt: 9e9 }) };
  a = push(trackChanges({ ...a, cloud: undefined }, a, randomUUID));
  const { freshAccount } = require('../src/sync.ts');
  let b = receive(freshAccount(seedState(), a.cloud.identity), { changes: server.slice(), cursor: server.length, hasMore: false });
  const upgrade = (s) => trackChanges(s, ensureExerciseCatalog(s), randomUUID);
  a = push(upgrade(a));
  const cursor = b.cloud.cursor;
  b = push(upgrade(b));
  b = receive(b, { changes: server.filter((r) => r.revision > cursor), cursor: server.length, hasMore: false });
  const names = b.exercises.map((e) => e.name);
  assert.equal(new Set(names).size, names.length);
  assert.equal(b.exercises.length, a.exercises.length);
});

test('pulls apply only their changes: other rows keep identity, deletions cascade, unsent edits win', () => {
  const { freshAccount } = require('../src/sync.ts');
  const { seedState } = require('../src/logic.ts');
  let a = freshAccount(seedState(), identity);
  a = trackChanges(a, { ...a, exercises: [{ id: 1, name: 'bench', mode: 'NORMAL', sortOrder: 0, archived: false }],
    sessions: [{ id: 2, startedAt: '2026-11-01T00:00:00Z', status: 'COMPLETED' }, { id: 3, startedAt: '2026-11-02T00:00:00Z', status: 'COMPLETED' }],
    sets: [{ id: 4, sessionId: 2, exerciseId: 1, setOrder: 1 }, { id: 5, sessionId: 3, exerciseId: 1, setOrder: 1 }], nextId: 6 }, randomUUID);
  const server = a.cloud.pending.map((m, i) => ({ ...m, revision: i + 1 }));
  a = acknowledge(a, a.cloud.pending.map((m) => m.mutationId));
  const b = receive(freshAccount(seedState(), identity), { changes: server, cursor: server.length, hasMore: false });
  assert.equal(b.sets.length, 2);
  // Another device deletes session 2 and renames the exercise; this device has an unsent rename.
  const edited = trackChanges(a, { ...a, exercises: [{ ...a.exercises[0], name: 'local name' }] }, randomUUID);
  const sessionId = a.cloud.mapping['session:2'], exerciseId = a.cloud.mapping['exercise:1'];
  const pulled = receive(edited, { changes: [
    { kind: 'session', id: sessionId, deleted: true, payload: null, revision: 9 },
    { kind: 'exercise', id: exerciseId, deleted: false, payload: { name: 'remote name', mode: 'NORMAL', sortOrder: 0, archived: false }, revision: 10 },
  ], cursor: 10, hasMore: false });
  assert.deepEqual(pulled.sessions.map((s) => s.id), [3]);
  assert.deepEqual(pulled.sets.map((s) => s.id), [5]);
  assert.equal(pulled.sets[0], edited.sets[1]);
  assert.equal(pulled.exercises[0].name, 'local name');
  assert.deepEqual(pulled.cloud.deletedSessions, [sessionId]);
  assert.equal(pulled.cloud.records, undefined);
});
