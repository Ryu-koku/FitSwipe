const { test } = require('node:test');
const assert = require('node:assert/strict');
const { seedState, initialExercises } = require('../src/logic.ts');
const { exerciseCatalog, ensureExerciseCatalog } = require('../src/exercise-catalog.ts');
const { emptyCloud, trackChanges, receive } = require('../src/sync.ts');
let serial = 0;
const uuid = () => `00000000-0000-4000-9000-${String(++serial).padStart(12, '0')}`;
const legacy = () => ({ ...seedState(), exerciseCatalogVersion: undefined, exercises: structuredClone(initialExercises), nextId: 100 });

test('all source and supplemental entries are available on new installs without duplicating the five existing names', () => {
  const state = seedState();
  assert.equal(exerciseCatalog.length, 55);
  assert.equal(state.exercises.length, 57);
  for (const entry of exerciseCatalog) {
    assert.equal(state.exercises.filter((exercise) => exercise.name === entry.name).length, 1, entry.name);
  }
  assert.equal(state.exercises.filter((exercise) => exercise.muscleGroup === '肩').length, 7);
  assert.equal(state.exercises.find((exercise) => exercise.name === 'ランニング').muscleGroup, '有酸素運動');
  assert.deepEqual(state.exercises.slice(0, 7).map((exercise) => exercise.id), [1, 2, 3, 4, 5, 6, 7]);
});

test('upgrade preserves history, edited and archived exercises, and normalizes names before deduplication', () => {
  const state = legacy();
  state.exercises[0].archived = true;
  state.exercises.push({ id: 500, name: ' サイドレイズ ', mode: 'BILATERAL', muscleGroup: '自分の肩', sortOrder: 99, archived: true });
  state.sessions = [{ id: 600, startedAt: '2026-11-01T00:00:00Z', status: 'COMPLETED' }];
  state.sets = [{ id: 700, sessionId: 600, exerciseId: 1, setOrder: 1, normalWeightKg: 60, normalReps: 10, isCompleted: true }];
  const before = structuredClone(state);
  const upgraded = ensureExerciseCatalog(state);
  assert.deepEqual(upgraded.exercises.slice(0, state.exercises.length), state.exercises);
  assert.equal(upgraded.exercises.filter((exercise) => exercise.name.trim() === 'サイドレイズ').length, 1);
  assert.ok(upgraded.exercises.slice(state.exercises.length).every((exercise) => exercise.id > 700 && exercise.sortOrder > 99));
  assert.equal(new Set(upgraded.exercises.map((exercise) => exercise.id)).size, upgraded.exercises.length);
  assert.equal(upgraded.sessions, state.sessions);
  assert.equal(upgraded.sets, state.sets);
  assert.equal(upgraded.presets, state.presets);
  assert.deepEqual(state, before);
  upgraded.exercises.find((exercise) => exercise.name === 'チェストプレス').name = '自分のチェストプレス';
  assert.equal(ensureExerciseCatalog(upgraded), upgraded);
});

test('catalog upgrade survives a cloud roundtrip, including its one-time version marker', () => {
  const old = legacy();
  old.cloud = emptyCloud({ id: 'account', name: 'A', token: 'test', expiresAt: 9999999999 });
  const upgraded = trackChanges(old, ensureExerciseCatalog(old), uuid);
  assert.equal(upgraded.cloud.pending.filter((change) => change.kind === 'exercise').length, 50);
  assert.ok(upgraded.cloud.pending.some((change) => change.kind === 'setting' && change.payload.field === 'exerciseCatalogVersion'));
  const other = { ...seedState(), cloud: emptyCloud(old.cloud.identity) };
  const restored = receive(other, { changes: upgraded.cloud.pending.map((change, index) => ({ ...change, revision: index + 1 })), cursor: upgraded.cloud.pending.length, hasMore: false });
  assert.equal(restored.exerciseCatalogVersion, 2);
  assert.equal(ensureExerciseCatalog(restored), restored);
});

test('a legacy cloud account is upgraded even when the fresh device already has a current catalog', () => {
  const { freshAccount } = require('../src/sync.ts');
  const fresh = freshAccount(seedState(), { id: 'account', name: 'A', token: 'test', expiresAt: 9999999999 });
  const restored = receive(fresh, { changes: [], cursor: 0, hasMore: false });
  assert.equal(restored.exerciseCatalogVersion, 0);
  assert.equal(ensureExerciseCatalog(restored).exercises.length, 55);
});


test('version 2 only appends new entries and respects changes to version 1 entries', () => {
  const state = seedState();
  const common = require('../src/data/common-exercises.json');
  const commonNames = new Set(common.map((entry) => entry.name));
  state.exercises = state.exercises.filter((exercise) => !commonNames.has(exercise.name) && exercise.name !== 'ペックフライ');
  state.exerciseCatalogVersion = 1;
  state.exercises.find((exercise) => exercise.name === 'チェストプレス').name = 'マイチェストプレス';
  state.exercises.find((exercise) => exercise.name === 'サイドレイズ').archived = true;
  state.exercises.push({ id: 900, name: ' ハンマーカール ', muscleGroup: '腕', mode: 'BILATERAL', sortOrder: 100, archived: true });
  const upgraded = ensureExerciseCatalog(state);
  assert.equal(upgraded.exercises.length, state.exercises.length + 23);
  assert.ok(!upgraded.exercises.some((exercise) => ['ペックフライ', 'チェストプレス'].includes(exercise.name)));
  assert.ok(upgraded.exercises.find((exercise) => exercise.name === 'サイドレイズ').archived);
  assert.deepEqual(upgraded.exercises.slice(0, state.exercises.length), state.exercises);
  assert.equal(upgraded.exercises.find((exercise) => exercise.name === 'ワンハンドダンベルロー').mode, 'BILATERAL');
  assert.equal(upgraded.exercises.find((exercise) => exercise.name === 'ヒップスラスト').mode, 'NORMAL');
  assert.equal(ensureExerciseCatalog(upgraded), upgraded);
});
