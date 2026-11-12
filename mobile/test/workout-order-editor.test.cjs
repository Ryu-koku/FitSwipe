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
      const state = { exercises: [{ id: 1, name: 'test', mode }], sets: [{ ...set, id: 9, setOrder: 0, isCompleted: true, normalWeightKg: 99, leftWeightKg: 99 }, set], weightStepKg: 2.5, exerciseWeightSteps: override === undefined ? {} : { 1: override }, restTimerDisabledExerciseIds: [] };
      const globals = { exports: {}, require, useState: initial => [initial, () => {}],
        useApp: () => ({ state, update: () => {} }), useTheme: () => ({ styles: {} }),
        Sheet: 'Sheet', View: 'View', Text: 'Text', Switch: 'Switch', Button: 'Button',
        WeightWheel: 'WorkoutNumberWheel', WorkoutNumberWheel: 'WorkoutNumberWheel', ExerciseOrderList: 'ExerciseOrderList', ExercisePictogram: 'ExercisePictogram' };
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
