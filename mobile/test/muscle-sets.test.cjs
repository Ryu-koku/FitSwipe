const test = require('node:test');
const assert = require('node:assert/strict');
const { seedState } = require('../src/logic.ts');
const { recentMuscleSets } = require('../src/muscle-sets.ts');

test('counts completed sets by exercise group over seven local calendar days, including zero groups', () => {
  const state = seedState();
  state.exercises.push({ id: 900, name: '独自種目', muscleGroup: '肩', mode: 'NORMAL', sortOrder: 99, archived: true });
  const today = new Date(2026, 10, 13, 12);
  const add = (id, day, exerciseId, status = 'COMPLETED', isCompleted = true) => {
    state.sessions.push({ id, startedAt: new Date(2026, 10, day, 0, 30).toISOString(), status });
    state.sets.push({ id, sessionId: id, exerciseId, setOrder: 1, isCompleted, leftCompleted: false, rightCompleted: false });
  };
  add(1000, 7, 1); // seven-day boundary
  add(1001, 13, 1);
  add(1002, 13, 900); // archived exercise retains historical group
  add(1003, 6, 1); // too old
  add(1004, 14, 1); // future
  add(1005, 12, 1, 'IN_PROGRESS');
  add(1006, 12, 1, 'COMPLETED', false);
  const rows = recentMuscleSets(state, today);
  assert.deepEqual(rows.map(row => row.group), ['胸', '背中', '肩', '腕', '脚', '腹', '有酸素運動', 'その他']);
  assert.deepEqual(rows.map(row => row.sets), [2, 0, 1, 0, 0, 0, 0, 0]);
  assert.equal(state.sessions.length, 7); // pure: no mutation
});
