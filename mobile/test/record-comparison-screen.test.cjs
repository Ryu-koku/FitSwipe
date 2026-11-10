const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Exercise real view callbacks; stub only hooks, native views and app context.
function view(relative, exported, props = {}, state = {}) {
  let cursor = 0;
  const slots = [];
  const filename = path.resolve(__dirname, relative);
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = name => {
    if (name === '__test_clock__') return class extends Date {
      constructor(...args) { super(...(args.length ? args : ['2026-11-10T12:00:00'])); }
    };
    if (name === 'react') return {
      useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
      useMemo: fn => fn(),
    };
    if (name === 'react-native') return { Text: 'Text', View: 'View', Pressable: 'Pressable', ScrollView: 'ScrollView' };
    if (name === 'expo-router') return { router: { canGoBack: () => false }, useLocalSearchParams: () => ({ exerciseId: '1' }) };
    if (name === '../context') return { useApp: () => ({ state }) };
    if (name === '../ui') return { useTheme: () => ({ styles: {}, colors: {} }), Card: 'Card', Chip: 'Chip', Button: 'Button', Screen: 'Screen', SectionTitle: 'SectionTitle', Sheet: 'Sheet' };
    if (name.startsWith('../components/')) { const component = name.split('/').at(-1); return { [component]: component, ProgressTrend: 'ProgressTrend' }; }
    return original(name);
  };
  mod._compile("const Date = require('__test_clock__');\n" + ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  function render() {
    cursor = 0;
    const nodes = [];
    function walk(node) {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== 'object') return;
      nodes.push(node); walk(node.props?.children);
    }
    walk(mod.exports[exported](props)); return nodes;
  }
  const content = node => Array.isArray(node) ? node.map(content).join('')
    : node && typeof node === 'object' ? content(node.props?.children) : node ?? '';
  return { render, text: () => render().filter(n => n.type === 'Text').map(content).join('\n'),
    press: label => { const chip = render().find(n => n.props?.label === label); assert.ok(chip, label); chip.props.onPress(); } };
}
const record = (sessionId, weight, reps, date = '2026-11-10') => ({ sessionId, weight, reps, date, setId: sessionId });

test('comparison controls switch conditions, show declines and open the actual source record', () => {
  const opened = [];
  const props = { records: [record(1, 50, 10), record(2, 50, 8), record(3, 55, 8)], initialWeight: 50, onOpenRecord: r => opened.push(r) };
  const app = view('../src/components/RecordComparison.tsx', 'RecordComparison', props);
  assert.match(app.text(), /−2回/);
  assert.match(app.text(), /全期間 · 50 kgでの過去最多/);
  app.press('同じ回数');
  app.press('8回');
  assert.match(app.text(), /\+5 kg/);
  const latest = app.render().find(n => n.props?.accessibilityLabel === '最新・2026-11-10の記録を見る');
  latest.props.onPress();
  assert.equal(opened[0].sessionId, 3);
  app.press('同じ重量');
  app.press('55 kg');
  assert.match(app.text(), /比較できる記録はまだ1回/);
  assert.doesNotMatch(app.text(), /−2回/);
});

test('empty comparison and bodyweight load comparison explain absent data without asking for targets', () => {
  const app = view('../src/components/RecordComparison.tsx', 'RecordComparison', { records: [], onOpenRecord: () => {} });
  assert.match(app.text(), /まだ完了した記録がありません/);
  app.press('同じ回数');
  assert.match(app.text(), /重量ありの完了記録がありません/);
  assert.ok(!app.render().some(n => n.type === 'TextInput'));
});

test('growth period changes bests while keeping the graph and comparison history unfiltered', () => {
  const rows = [record(1, 200, 1, '2025-12-31'), record(2, 100, 3, '2026-01-01'), record(3, 80, 8, '2026-11-01')];
  const state = {
    exercises: [{ id: 1, name: 'ベンチプレス', mode: 'NORMAL' }],
    sessions: rows.map(r => ({ id: r.sessionId, startedAt: `${r.date}T12:00:00`, status: 'COMPLETED' })),
    sets: rows.map(r => ({ id: r.setId, sessionId: r.sessionId, exerciseId: 1, normalWeightKg: r.weight, normalReps: r.reps, isCompleted: true })),
  };
  const app = view('../src/app/growth.tsx', 'default', {}, state);
  assert.match(app.text(), /200 kg × 1回/);
  app.press('今月');
  assert.match(app.text(), /80 kg × 8回/);
  assert.doesNotMatch(app.text(), /200 kg/);
  assert.equal(app.render().find(n => n.type === 'ProgressTrend').props.records.length, 3);
  assert.equal(app.render().find(n => n.type === 'RecordComparison').props.records.length, 3);
  app.press('今年');
  assert.match(app.text(), /100 kg × 3回/);
  const comparison = app.render().find(n => n.type === 'RecordComparison');
  comparison.props.onOpenRecord(comparison.props.records[0]);
  assert.deepEqual(app.render().find(n => n.type === 'SessionDetails').props.sessionIds, [1]);
});
