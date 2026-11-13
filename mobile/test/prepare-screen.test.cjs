const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { seedState, selectedPreset } = require('../src/logic.ts');

function prepareScreen(colors = { primary: 'primary' }) {
  const state = seedState(), slots = [], routes = [];
  let cursor = 0;
  const filename = path.resolve(__dirname, '../src/app/prepare.tsx');
  const mod = new Module(filename, module);
  mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = name => {
    if (name === '../tour') return { TourProvider: 'TourProvider', useTour: () => ({ active: false, step: null, start: () => {}, notify: () => {} }), useTourTarget: () => ({}) };
    if (name === 'expo-router') return { router: { replace: route => routes.push(route) } };
    if (name === 'react') return { useEffect: effect => effect(), useMemo: factory => factory(), useCallback: callback => callback, useState: initial => {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = value; }];
    } };
    if (name === 'react-native') return { View: 'View', Text: 'Text', Pressable: 'Pressable' };
    if (name === '../context') return { useApp: () => ({ state, update: () => {} }) };
    if (name === '../premium-context') return { usePremium: () => ({ premium: false, openPaywall: () => {} }) };
    if (name === '../ui') return { feedback: () => {}, useTheme: () => ({ colors, styles: { body: { color: colors.ink } } }),
      Button: 'Button', Card: 'Card', Screen: 'Screen', SectionTitle: 'SectionTitle' };
    if (name.startsWith('../components/')) { const component = name.split('/').at(-1); return { [component]: component }; }
    return original(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return { state, routes, render() {
    cursor = 0;
    const nodes = [];
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(visit);
      nodes.push(node); visit(node.props?.children);
    }
    visit(mod.exports.default()); return nodes;
  } };
}

test('preset heading and accessible edit icon open the selected preset editor', () => {
  const app = prepareScreen();
  const nodes = app.render();
  assert.equal(nodes.find(node => node.type === 'SectionTitle').props.children, 'プリセット');
  const preset = selectedPreset(app.state);
  const button = nodes.find(node => node.props?.accessibilityLabel === `${preset.name}を編集・並べ替え`);
  assert.equal(button.props.accessibilityRole, 'button');
  assert.ok(button.props.style.minWidth >= 44 && button.props.style.minHeight >= 44);
  assert.equal(button.props.children.type, 'AppIcon');
  assert.equal(button.props.children.props.name, 'edit');
  assert.equal(button.props.children.props.color, 'primary');
  button.props.onPress();
  const editor = app.render().find(node => node.type === 'PresetEditor');
  assert.equal(editor.props.presetId, preset.id);
  assert.equal(editor.props.initialExerciseId, undefined);
});

test('beginner guide refers to the preset heading', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/components/BeginnerGuide.tsx'), 'utf8');
  assert.ok(source.includes('「プリセット」から選択'));
  assert.ok(!source.includes('プリセットから選ぶ'));
});


for (const colors of [
  { primary: '#007f78', soft: '#eaf5f3', surface: '#ffffff', line: '#ddd', ink: '#172326' },
  { primary: '#72d6c9', soft: '#0b554d', surface: '#172326', line: '#444', ink: '#ffffff' },
]) {
  test(`preset accents preserve theme backgrounds and text (${colors.primary})`, () => {
    const app = prepareScreen(colors);
    app.state.presets[0].color = '#e5484d';
    for (const selected of app.state.presets) {
      app.state.selectedPresetId = selected.id;
      const nodes = app.render();
      for (const preset of app.state.presets) {
        const color = preset.color ?? colors.primary;
        const button = nodes.find(n => n.props?.accessibilityLabel === preset.name);
        const card = button.props.children;
        const chosen = preset.id === selected.id;
        assert.equal(card.props.style.borderColor, chosen ? color : colors.line);
        assert.equal(card.props.style.backgroundColor, chosen ? colors.soft : colors.surface);
        assert.equal(card.props.style.overflow, undefined);
        assert.ok(!card.props.children.some(child => child.props.style?.position === 'absolute'));
        const [row] = card.props.children;
        const [indicator, name] = row.props.children;
        assert.equal(indicator.props.children, chosen ? '●' : '○');
        assert.equal(indicator.props.style.color, color);
        assert.equal(name.props.style[0].color, colors.ink);
      }
      const header = nodes.find(n => n.type === 'View' &&
        Array.isArray(n.props.children) && n.props.children[0]?.props?.style?.width === 8 &&
        n.props.children[1]?.props?.children === selected.name);
      assert.equal(header.props.children[0].props.style.backgroundColor, selected.color ?? colors.primary);
      assert.equal(header.props.children[1].props.style[0].color, colors.ink);
    }
  });
}

test('prepare redirects ongoing sessions without rendering the menu, including after state restoration', () => {
  const app = prepareScreen();
  assert.ok(app.render().length);
  assert.deepEqual(app.routes, []);
  app.state.sessions.push({ id: 1, status: 'COMPLETED' }, { id: 2, status: 'IN_PROGRESS' });
  assert.deepEqual(app.render(), []);
  assert.deepEqual(app.routes, ['/workout']);
});
