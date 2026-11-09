const assert = require('node:assert/strict');
const test = require('node:test');
const { seedState } = require('../src/logic.ts');
const { exportWorkoutCsv, importWorkoutCsv, parseCsv } = require('../src/csv.ts');
const { workoutSnapshot } = require('../src/rooms.ts');
const empty = () => ({ ...seedState(), exercises: [], presets: [], sessions: [], sets: [] });
test('legacy CSV creates one-based orders valid for room sharing and does not mutate input', () => {
  const before = empty(), json = JSON.stringify(before);
  const state = importWorkoutCsv(before, 'date,exercise,weightKg,reps\n2026-11-08,bench,50,10\n2026-11-08,bench,55,8');
  assert.deepEqual(state.sets.map(s => s.setOrder), [1, 2]);
  assert.equal(JSON.stringify(before), json);
  assert.deepEqual(workoutSnapshot(state, state.sessions[0].id).exercises[0].sets.map(s => s.order), [1, 2]);
});
test('CSV roundtrip keeps both sides, partial pairs, quoted names and separate sessions on the same day', () => {
  const state = empty(); state.exercises = [{ id: 1, name: 'curl, "左右"', mode: 'BILATERAL', archived: false, sortOrder: 0, muscleGroup: '腕' }];
  state.sessions = [1, 2].map(id => ({ id, startedAt: `2026-11-08T0${id}:00:00Z`, endedAt: `2026-11-08T0${id}:30:00Z`, status: 'COMPLETED' }));
  state.sets = [1, 2].map(id => ({ id, sessionId: id, exerciseId: 1, setOrder: 1, leftWeightKg: 12, leftReps: 10, rightWeightKg: 14, rightReps: 8, leftCompleted: true, rightCompleted: id === 1, isCompleted: id === 1 }));
  const restored = importWorkoutCsv(empty(), exportWorkoutCsv(state));
  assert.equal(restored.sessions.length, 2); assert.equal(restored.sets.length, 2);
  assert.equal(restored.exercises[0].name, state.exercises[0].name);
  assert.equal(restored.exercises[0].mode, 'BILATERAL');
  assert.equal(restored.sets[0].leftWeightKg, 12); assert.equal(restored.sets[0].rightWeightKg, 14);
  assert.equal(restored.sets[0].rightReps, 8); assert.equal(restored.sets[0].isCompleted, true);
  assert.equal(restored.sets[1].leftCompleted, true); assert.equal(restored.sets[1].rightCompleted, false);
  assert.equal(restored.sessions[1].startedAt, state.sessions[1].startedAt);
});
test('malformed CSV is atomic and cannot create invalid dates, duplicate sides or zero orders', () => {
  const current = empty(), before = JSON.stringify(current);
  for (const raw of [
    'date,exercise,weightKg,reps\n2026-02-30,bench,50,10',
    'date,exercise,weightKg,reps\n2026-11-08,bench,50,10\n2026-11-08,bench,50,-1',
    'date,exercise,weightKg,reps,setOrder\n2026-11-08,bench,50,10,0',
    'date,exercise,weightKg,reps,side,setOrder\n2026-11-08,curl,10,10,left,1\n2026-11-08,curl,10,10,left,1',
    'date,exercise,weightKg,reps\n2026-11-08,"unterminated,50,10',
  ]) assert.throws(() => importWorkoutCsv(current, raw));
  assert.equal(JSON.stringify(current), before);
  assert.deepEqual(parseCsv('a,b\r\n"hello\nworld","a""b"'), [['a','b'], ['hello\nworld','a"b']]);
});

test('same-name exercises roundtrip by source ID even with conflicting destination IDs', () => {
  const state = empty();
  state.exercises = [1, 2].map(id => ({ id, name: 'bench', mode: 'NORMAL', sortOrder: id - 1, archived: false, muscleGroup: '胸' }));
  state.sessions = [{ id: 100, startedAt: '2026-11-08T01:00:00Z', status: 'COMPLETED' }];
  state.sets = [1, 2].map(id => ({ id: 100 + id, exerciseId: id, sessionId: 100, setOrder: 1, isCompleted: true, leftCompleted: false, rightCompleted: false, normalWeightKg: id * 20, normalReps: 10 }));
  const restored = importWorkoutCsv(seedState(), exportWorkoutCsv(state));
  assert.notEqual(restored.sets[0].exerciseId, restored.sets[1].exerciseId);
  assert.ok(restored.sets.every(s => s.exerciseId > 2));
  assert.deepEqual(restored.sets.map(s => s.normalWeightKg), [20, 40]);
  const twice = importWorkoutCsv(empty(), exportWorkoutCsv(restored));
  assert.equal(twice.exercises.length, 2); assert.equal(twice.sets.length, 2);
});
test('conflicting source exercise metadata is rejected atomically', () => {
  const state = empty(), before = JSON.stringify(state);
  assert.throws(() => importWorkoutCsv(state, 'date,exercise,weightKg,reps,exerciseId\n2026-11-08,bench,50,10,1\n2026-11-08,squat,50,10,1'));
  assert.equal(JSON.stringify(state), before);
});
test('formula text cells are escaped and import removes exactly one protective apostrophe', () => {
  for (const prefix of ['=', '+', '-', '@', '\t', '\r']) {
    const state = empty();
    state.exercises = [{ id: 1, name: `${prefix}name`, muscleGroup: `${prefix}body`, mode: 'NORMAL', archived: false, sortOrder: 0 }];
    state.sessions = [{ id: 2, startedAt: '2026-11-08T00:00:00Z', status: 'COMPLETED' }];
    state.sets = [{ id: 3, sessionId: 2, exerciseId: 1, setOrder: 1, normalReps: 10, isCompleted: true }];
    const csv = exportWorkoutCsv(state), cells = parseCsv(csv)[1];
    assert.equal(cells[1], `'${prefix}name`); assert.equal(cells[2], `'${prefix}body`);
    const restored = importWorkoutCsv(empty(), csv);
    assert.equal(restored.exercises[0].name, `${prefix}name`);
    assert.equal(restored.exercises[0].muscleGroup, `${prefix}body`);
    const doubled = csv.replace(`"'${prefix}name"`, `"''${prefix}name"`);
    assert.equal(importWorkoutCsv(empty(), doubled).exercises[0].name, `''${prefix}name`);
  }
});
