const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

for (const mode of ['NORMAL', 'BILATERAL']) {
  for (const override of [undefined, 1.25]) {
    test(`workout detail wheels retain set values and weight step (${mode}, ${override})`, () => {
      const source = ts.createSourceFile('editor.tsx', fs.readFileSync(require.resolve('../src/components/WorkoutOrderEditor.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const declaration = source.statements.find(n => ts.isFunctionDeclaration(n));
      const set = { id: 10, exerciseId: 1, sessionId: 2, setOrder: 1, normalWeightKg: 20, normalReps: 8, leftWeightKg: 10, leftReps: 9, rightWeightKg: 12, rightReps: 7 };
      const state = { exercises: [{ id: 1, name: 'test', mode }], sets: [{ ...set, id: 9, setOrder: 0, isCompleted: true, normalWeightKg: 99, leftWeightKg: 99 }, set], weightStepKg: 2.5, exerciseWeightSteps: override === undefined ? {} : { 1: override }, restTimerDisabledExerciseIds: [], leftFirstExerciseIds: [] };
      const globals = { exports: {}, require, useState: initial => [initial, () => {}],
        useApp: () => ({ state, update: () => {} }), useTheme: () => ({ styles: {} }),
        Sheet: 'Sheet', View: 'View', Text: 'Text', Switch: 'Switch', Button: 'Button',
        WeightWheel: 'WorkoutNumberWheel', WorkoutNumberWheel: 'WorkoutNumberWheel', ExerciseOrderList: 'ExerciseOrderList', ExercisePictogram: 'ExercisePictogram', formatWeight: value => `${value ?? '—'} kg`,
        getCurrentCard: state => state.workout?.card ?? { setId: state.sets[0].id } };
      const compiled = ts.transpileModule(declaration.getText(source), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
      const Editor = new Function(...Object.keys(globals), `${compiled}; return exports.WorkoutOrderEditor;`)(...Object.values(globals));
      const nodes = [];
      function visit(node) {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) return node.forEach(visit);
        nodes.push(node); visit(node.props?.children);
      }
      visit(Editor({ sessionId: 2, initialExerciseId: 1, onClose() {} }));
      assert.equal(nodes.filter(n => n.type === 'Sheet')[1].props.popup, true);
      const fields = nodes.filter(n => n.type === 'WorkoutNumberWheel').map(n => n.props);
      const count = fields.find(n => n.label === 'セット数');
      assert.equal(count.min, 1);
      assert.equal(count.max, 30);
      assert.equal(count.value, 2);
      const weights = fields.filter(n => n.label.includes('kg'));
      assert.deepEqual(weights.map(n => n.value), mode === 'BILATERAL' ? [10, 12] : [20]);
      assert.ok(weights.every(n => n.step === (override ?? 2.5)));
      assert.deepEqual(fields.filter(n => n.label === '回数').map(n => n.value), mode === 'BILATERAL' ? [9] : [8]);
    });
  }
}
{
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { seedState } = require('../src/logic.ts');
const { startWorkout } = require('../src/workout.ts');

function editor(initial) {
  let state = initial;
  const filename = path.resolve(__dirname, '../src/components/WorkoutOrderEditor.tsx');
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = name => {
    if (name === 'react') return { useState: initial => [initial, () => {}] };
    if (name === 'react-native') return { View: 'View' };
    if (name === '../context') return { useApp: () => ({ state, update: fn => { state = fn(state); } }) };
    if (name === '../ui') return { Button: 'Button', Sheet: 'Sheet' };
    if (name.startsWith('./')) { const component = name.slice(2); return { [component]: component }; }
    return original(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  const sessionId = state.workout.sessionId;
  const jumps = [];
  return { sessionId, jumps, get state() { return state; }, render: () => {
    const nodes = [];
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(visit);
      nodes.push(node);
      visit(node.props?.children);
    }
    visit(mod.exports.WorkoutOrderEditor({ sessionId, onClose: () => {}, onJumpToSet: card => jumps.push(card) }));
    return nodes;
  } };
}

test('workout stepper uses completed sides as its minimum and resizes the chosen exercise', () => {
  const initial = startWorkout(seedState());
  const id = initial.workout.exerciseOrder[0];
  const rows = initial.sets.filter(set => set.sessionId === initial.workout.sessionId && set.exerciseId === id);
  assert.ok(rows.length >= 3);
  rows[0].leftCompleted = true;
  rows[1].rightCompleted = true;
  const app = editor(initial);
  const items = app.render().find(n => n.type === 'ExerciseOrderList').props.items;
  const chosen = items.find(item => item.id === id);
  assert.equal(chosen.stepper.sets, rows.length);
  assert.equal(chosen.stepper.min, 2);
  assert.equal(chosen.stepper.max, 30);
  const other = app.state.sets.filter(set => set.exerciseId !== id);
  chosen.stepper.onChange(2);
  assert.equal(app.state.sets.filter(set => set.exerciseId === id).length, 2);
  assert.deepEqual(app.state.sets.filter(set => set.exerciseId !== id), other);
  app.render().find(n => n.type === 'ExerciseOrderList').props.items.find(item => item.id === id).stepper.onChange(1);
  assert.equal(app.state.sets.filter(set => set.exerciseId === id).length, 2);
});

test('set rows remain expanded, show values and completion, and jump to the chosen card', () => {
  const initial = startWorkout(seedState());
  const id = initial.workout.exerciseOrder[0];
  const rows = initial.sets.filter(set => set.sessionId === initial.workout.sessionId && set.exerciseId === id);
  rows[0].normalWeightKg = 60; rows[0].normalReps = 8;
  rows[1].normalWeightKg = 62.5; rows[1].normalReps = 6; rows[1].isCompleted = true;
  initial.workout.card = { setId: rows[0].id };
  const app = editor(initial);
  const item = app.render().find(n => n.type === 'ExerciseOrderList').props.items.find(item => item.id === id);
  assert.equal(item.setRows.length, rows.length);
  assert.match(item.setRows[0].label, /1セット目 \/ 60kg×8/);
  assert.equal(item.setRows[0].current, true);
  assert.equal(item.setRows[1].completed, true);
  assert.match(item.setRows[1].label, /✓/);
  assert.match(item.setRows[0].accessibilityLabel, /60kg 8回。タップで移動/);
  item.setRows[1].onPress();
  assert.deepEqual(app.jumps, [{ setId: rows[1].id }]);
});

test('bilateral set row shows both sides and chooses the unfinished card', () => {
  const initial = startWorkout(seedState());
  const id = initial.workout.exerciseOrder[0];
  initial.exercises.find(exercise => exercise.id === id).mode = 'BILATERAL';
  initial.leftFirstExerciseIds = [id];
  const row = initial.sets.find(set => set.sessionId === initial.workout.sessionId && set.exerciseId === id);
  initial.workout.card = { setId: initial.sets.find(set => set.exerciseId !== id).id };
  Object.assign(row, { leftWeightKg: 25, leftReps: 9, rightWeightKg: 27.5, rightReps: 7, leftCompleted: true });
  const app = editor(initial);
  const item = app.render().find(n => n.type === 'ExerciseOrderList').props.items.find(item => item.id === id);
  assert.match(item.setRows[0].label, /左25kg×9✓ \/ 右27.5kg×7/);
  assert.equal(item.setRows[0].completed, false);
  item.setRows[0].onPress();
  assert.deepEqual(app.jumps, [{ setId: row.id, side: 'right' }]);
});

}
