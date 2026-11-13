const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { seedState } = require('../src/logic.ts');

function editor(initialExerciseId) {
  let state = seedState(), cursor = 0;
  const slots = [], events = [];
  const presetId = state.presets[0].id;
  const filename = path.resolve(__dirname, '../src/components/PresetEditor.tsx');
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = name => {
    if (name === 'react') return { useState: initial => {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = value; }];
    } };
    if (name === 'react-native') return { View: 'View', Text: 'Text', Pressable: 'Pressable', Switch: 'Switch' };
    if (name === '../context') return { useApp: () => ({ state, update: fn => { state = fn(state); events.push('save'); } }) };
    if (name === '../ui') return { useTheme: () => ({ colors: {}, styles: {} }),
      Sheet: 'Sheet', Field: 'Field', Button: 'Button', IconButton: 'IconButton', WorkoutNumberWheel: 'WorkoutNumberWheel' };
    if (name.endsWith('/WeightWheel')) return { WeightWheel: 'WorkoutNumberWheel' };
    if (name.startsWith('./')) { const component = name.slice(2); return { [component]: component }; }
    return original(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return { events, get preset() { return state.presets.find(p => p.id === presetId); }, render() {
    cursor = 0;
    const nodes = [];
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(visit);
      nodes.push(node);
      visit(node.props?.children);
      visit(node.props?.header);
    }
    visit(mod.exports.PresetEditor({ presetId, initialExerciseId, onClose: () => events.push('close') }));
    return nodes;
  } };
}

for (const draft of ['  新しい名前  ', '   ']) {
  test(`closing saves an unblurred name before dismissing (${JSON.stringify(draft)})`, () => {
    const app = editor();
    const oldName = app.preset.name;
    app.render().find(n => n.type === 'Field').props.onChangeText(draft);
    const nodes = app.render();
    assert.equal(nodes.filter(n => n.type === 'Button' && n.props.label === '完了').length, 0);
    const sheet = nodes.find(n => n.type === 'Sheet');
    assert.equal(sheet.props.bottomSheet, true);
    assert.equal(sheet.props.scroll, false);
    assert.equal(sheet.props.right.props.accessibilityLabel, 'プリセットを削除');
    assert.equal(typeof sheet.props.right.props.onPress, 'function');
    assert.equal(sheet.props.right.props.children.type, 'AppIcon');
    assert.equal(sheet.props.right.props.children.props.name, 'trash');
    sheet.props.onClose();
    assert.equal(app.preset.name, draft.trim() || oldName);
    assert.deepEqual(app.events, draft.trim() ? ['save', 'close'] : ['close']);
  });
}

test('exercise sub-sheet keeps its Done button and only closes that sheet', () => {
  const app = editor(seedState().presets[0].exercises[0].exerciseId);
  const nodes = app.render();
  assert.equal(nodes.filter(n => n.type === 'Sheet').length, 2);
  assert.equal(nodes.filter(n => n.type === 'Sheet')[1].props.popup, true);
  const fields = nodes.filter(n => n.type === 'WorkoutNumberWheel');
  assert.equal(fields.length, 1);
  assert.equal(nodes.filter(n => n.type === 'Switch').length, 0);
  assert.equal(nodes.find(n => n.type === 'ExerciseOrderList').props.items[0].detail, `${app.preset.exercises[0].sets}セット`);
  const sets = fields.find(n => n.props.label === 'セット数');
  assert.equal(sets.props.min, 1);
  assert.equal(sets.props.max, 30);
  const buttons = nodes.filter(n => n.type === 'Button' && n.props.label === '完了');
  assert.equal(buttons.length, 1);
  buttons[0].props.onPress();
  assert.equal(app.render().filter(n => n.type === 'Sheet').length, 1);
  assert.deepEqual(app.events, []);
});

test('preset list stepper changes only the chosen exercise and keeps the popup wheel', () => {
  const app = editor();
  const items = app.render().find(n => n.type === 'ExerciseOrderList').props.items;
  const chosen = items[0];
  assert.equal(chosen.stepper.sets, app.preset.exercises[0].sets);
  assert.equal(chosen.stepper.min, 1);
  assert.equal(chosen.stepper.max, 30);
  const before = app.preset.exercises.slice(1);
  chosen.stepper.onChange(chosen.stepper.sets + 1);
  assert.equal(app.preset.exercises[0].sets, chosen.stepper.sets + 1);
  assert.deepEqual(app.preset.exercises.slice(1), before);
  assert.deepEqual(app.events, ['save']);
  app.render().find(n => n.type === 'ExerciseOrderList').props.onEdit(chosen.id);
  assert.ok(app.render().some(n => n.type === 'WorkoutNumberWheel' && n.props.label === 'セット数'));
});

for (const source of ['swipe', 'button']) {
  test(`${source} removes only the chosen preset exercise and closes its editor`, () => {
    const id = seedState().presets[0].exercises[0].exerciseId;
    const app = editor(id);
    const before = app.preset.exercises;
    const nodes = app.render();
    if (source === 'swipe') nodes.find(n => n.type === 'ExerciseOrderList').props.onDelete(id);
    else nodes.find(n => n.type === 'Button' && n.props.label === '種目を削除').props.onPress();
    assert.deepEqual(app.preset.exercises, before.filter(c => c.exerciseId !== id));
    assert.equal(app.render().filter(n => n.type === 'Sheet').length, 1);
    assert.deepEqual(app.events, ['save']);
  });
}
