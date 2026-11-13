const { test } = require('node:test');
const assert = require('node:assert/strict');
const { seedState } = require('../src/logic.ts');
const { startWorkout, nextId } = require('../src/workout.ts');
const { addWorkoutExercises, addPresetExercises, availableExerciseChoices } = require('../src/exercise-additions.ts');

test('exercise choices collapse duplicate names and modes without changing stored exercises', () => {
  const state = seedState();
  state.exercises.push({ ...state.exercises[0], id: 900, name: ' ベンチプレス ', sortOrder: 100 });
  state.exercises.push({ ...state.exercises[0], id: 901, mode: 'BILATERAL', sortOrder: 101 });
  state.exercises.push({ ...state.exercises[0], id: 902, name: 'インクラインベンチプレス', archived: true });
  const original = structuredClone(state.exercises);
  const choices = availableExerciseChoices(state.exercises);
  assert.deepEqual(choices.filter((exercise) => exercise.name.trim() === 'ベンチプレス').map((exercise) => exercise.id), [1, 901]);
  assert.ok(!choices.some((exercise) => exercise.id === 902));
  assert.deepEqual(state.exercises, original);
  for (const excluded of [1, 900]) {
    const available = availableExerciseChoices(state.exercises, [excluded]);
    assert.ok(!available.some((exercise) => [1, 900].includes(exercise.id)));
    assert.ok(available.some((exercise) => exercise.id === 901));
  }
});

test('batch workout addition preserves existing sets and appends one set per selection in selection order', () => {
  const state = startWorkout(seedState());
  const sessionId = state.workout.sessionId;
  const original = structuredClone(state);
  const next = addWorkoutExercises(state, sessionId, [5, 4, 5, 1, 9999]);
  assert.deepEqual(next.sets.slice(0, state.sets.length), state.sets);
  assert.deepEqual(next.sets.slice(state.sets.length).map((row) => [row.exerciseId, row.setOrder]), [[5, 1], [4, 1]]);
  assert.deepEqual(next.workout.exerciseOrder, [...state.workout.exerciseOrder, 5, 4]);
  assert.equal(new Set(next.sets.map((row) => row.id)).size, next.sets.length);
  assert.deepEqual(addWorkoutExercises(next, sessionId, [5, 4, 1]).sets, next.sets);
  assert.deepEqual(state, original);
});

test('batch additions ignore archived or missing exercises and removed targets', () => {
  const state = startWorkout(seedState());
  state.exercises.find((exercise) => exercise.id === 4).archived = true;
  const next = addWorkoutExercises(state, state.workout.sessionId, [4, 9999]);
  assert.deepEqual(next.sets, state.sets);
  assert.equal(addWorkoutExercises(state, -1, [5]), state);
  assert.deepEqual(addPresetExercises(state, 'gym', [4, 9999]).presets, state.presets);
  assert.deepEqual(addPresetExercises(state, 'removed', [5]).presets, state.presets);
});

test('first-time additions initialize editable weight and repetitions for both exercise modes', () => {
  const state = startWorkout(seedState());
  for (const mode of ['NORMAL', 'BILATERAL']) {
    const id = nextId(state);
    const exercise = { id, name: '新しい種目', mode, sortOrder: 50, archived: false };
    const next = addWorkoutExercises({ ...state, exercises: [...state.exercises, exercise] }, state.workout.sessionId, [id]);
    const row = next.sets.find(item => item.exerciseId === id);
    for (const side of mode === 'BILATERAL' ? ['left', 'right'] : ['normal']) {
      assert.equal(row[`${side}WeightKg`], 0);
      assert.equal(row[`${side}Reps`], 10);
    }
    assert.equal(row.isCompleted, false);
  }
});

test('newly created exercise and previous selections are added together to both destinations', () => {
  const state = startWorkout(seedState());
  const id = nextId(state);
  const created = { id, name: 'ケーブルカール', muscleGroup: '腕', mode: 'BILATERAL', sortOrder: 20, archived: false };
  state.exercises.push(created);
  state.nextId = id + 1;
  const workout = addWorkoutExercises(state, state.workout.sessionId, [5, id]);
  assert.deepEqual(workout.workout.exerciseOrder.slice(-2), [5, id]);
  assert.equal(workout.sets.filter((row) => row.exerciseId === id).length, 1);
  assert.ok(workout.sets.every((row) => row.id !== id));
  const preset = addPresetExercises(state, 'gym', [5, id, id, 1]);
  assert.deepEqual(preset.presets[0].exercises.slice(-2).map((config) => config.exerciseId), [5, id]);
  assert.deepEqual(preset.presets[0].exercises.at(-1), { exerciseId: id, sets: 3 });
  assert.deepEqual(preset.presets[0].exercises.slice(0, 3), state.presets[0].exercises);
  assert.deepEqual(preset.presets[1], state.presets[1]);
});
