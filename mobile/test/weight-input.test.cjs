const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { weightToKg } = require('../src/logic.ts');

function load(component, weightUnit) {
  const filename = path.resolve(__dirname, `../src/components/${component}.tsx`);
  const mod = new Module(filename, module);
  mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = name => {
    if (name === '../context') return { useApp: () => ({ state: { weightUnit } }) };
    if (name === '../ui') return { NumberField: 'NumberField' };
    if (name === './WorkoutNumberWheel') return { WorkoutNumberWheel: 'WorkoutNumberWheel' };
    return original(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return mod.exports[component];
}

for (const unit of ['kg', 'lb']) test(`weight wheels display ${unit}, retain kg callbacks, and convert previous highlights`, () => {
  const Wheel = load('WeightWheel', unit);
  let kg;
  const wheel = Wheel({ unit: 'kg', label: '左kg', step: 1, value: 45.359237, highlightValue: 0, onChange: next => { kg = next; } });
  assert.equal(wheel.props.label, `左${unit}`);
  assert.equal(wheel.props.unit, unit);
  assert.equal(wheel.props.value, unit === 'lb' ? 100 : 45.36);
  assert.equal(wheel.props.highlightValue, 0);
  assert.equal(wheel.props.step, unit === 'lb' ? 5 : 1);
  wheel.props.onChange(105);
  assert.equal(kg, weightToKg(105, unit));
  assert.equal(Wheel({ unit: 'kg', label: '重量', step: 1, onChange() {} }).props.value, undefined);
});

test('weight fields convert lb edits to kg and allow clearing without inventing zero', () => {
  const Field = load('WeightField', 'lb');
  let value;
  const field = Field({ label: '重量（kg）', value: weightToKg(12.3, 'lb'), onChange: next => { value = next; } });
  assert.equal(field.props.label, '重量（lb）');
  assert.equal(field.props.value, 12.3);
  field.props.onChange(12.36);
  assert.equal(value, weightToKg(12.4, 'lb'));
  field.props.onChange(undefined);
  assert.equal(value, undefined);
});
