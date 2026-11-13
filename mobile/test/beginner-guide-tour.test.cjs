const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function guide() {
  const slots = [], calls = [];
  let cursor = 0;
  const filename = path.resolve(__dirname, '../src/components/BeginnerGuide.tsx');
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = name => {
    if (name === 'react') return { useState: initial => {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    } };
    if (name === 'react-native') return { Modal: 'Modal', ScrollView: 'ScrollView', Text: 'Text', View: 'View' };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    if (name === 'expo-router') return { router: { replace: route => calls.push(route) } };
    if (name === '../tour') return { useTour: () => ({ start: () => {
      assert.equal(slots[0], false, 'modal closes before requesting the tour');
      calls.push('start');
    } }) };
    if (name === '../context') return { useApp: () => ({ state: { weightUnit: 'kg' } }) };
    if (name === '../ui') return { Button: 'Button', useTheme: () => ({ colors: {}, styles: {} }) };
    if (name === './AppIcon') return { AppIcon: 'AppIcon' };
    return original(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  function render() {
    cursor = 0;
    const nodes = [];
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(visit);
      nodes.push(node); visit(node.props?.children);
    }
    visit(mod.exports.BeginnerGuide()); return nodes;
  }
  const press = label => render().find(n => n.type === 'Button' && n.props.label === label).props.onPress();
  return { render, press, calls };
}

test('last guide button closes, returns home, and requests the tour', () => {
  const app = guide();
  app.press('はじめての使い方');
  app.press('次へ'); app.press('次へ');
  assert.deepEqual(app.calls, []);
  app.press('実際にやってみる');
  assert.deepEqual(app.calls, ['/', 'start']);
  assert.equal(app.render().find(n => n.type === 'Modal').props.visible, false);
});

test('last guide slide can still close without navigation or tour', () => {
  const app = guide();
  app.press('はじめての使い方');
  app.press('次へ'); app.press('次へ');
  app.press('閉じる');
  assert.deepEqual(app.calls, []);
  assert.equal(app.render().find(n => n.type === 'Modal').props.visible, false);
});
