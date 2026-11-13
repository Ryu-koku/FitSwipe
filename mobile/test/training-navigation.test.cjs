const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { seedState } = require('../src/logic.ts');

function fixture(component, pathname, active) {
  const state = seedState();
  state.sessions = [{ id: 1, status: 'COMPLETED' }, ...(active ? [{ id: 2, status: 'IN_PROGRESS' }] : [])];
  const routes = [], starts = [], notifications = [], slots = [];
  let cursor = 0;
  const filename = path.resolve(__dirname, `../src/components/${component}.tsx`);
  const mod = new Module(filename, module);
  mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = name => {
    if (name === '../tour') return { TourProvider: 'TourProvider', useTour: () => ({ active: false, step: null, start: () => {}, notify: () => {} }), useTourTarget: () => ({}) };
    if (name === 'react') return {
      useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = value; }]; },
      useRef: initial => { const i = cursor++; return slots[i] ??= { current: initial }; },
      useMemo: factory => factory(), useLayoutEffect: () => {},
    };
    if (name === 'react-native') return { View: 'View', Text: 'Text', Pressable: 'Pressable', TextInput: 'TextInput', Alert: { alert: () => {} } };
    if (name === 'expo-router') return { usePathname: () => pathname, useNavigation: () => ({}), router: {
      push: route => routes.push(route), replace: route => routes.push(route),
    } };
    if (name === '../context') return { useApp: () => ({ state, update: () => {}, startWorkout: id => starts.push(id) }) };
    if (name === '../rest-notifications') return { prepareRestNotifications: async options => { notifications.push(options); return true; } };
    if (name === '../ui') return { feedback: () => {}, useTheme: () => ({ colors: {}, styles: {} }), Button: 'Button', Card: 'Card', Chip: 'Chip', IconButton: 'IconButton', Sheet: 'Sheet' };
    if (name === './AppIcon') return { AppIcon: 'AppIcon' };
    if (name === './ProgressChart') return { ProgressChart: 'ProgressChart' };
    return original(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return { state, routes, starts, notifications, render(name = component, props = {}) {
    cursor = 0;
    const nodes = [];
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(visit);
      nodes.push(node); visit(node.props?.children);
    }
    visit(mod.exports[name](props)); return nodes;
  } };
}

for (const pathname of ['/', '/rooms', '/prepare']) {
  for (const active of [false, true]) {
    test(`dock action and side navigation (${pathname}, active=${active})`, async () => {
      const app = fixture('TrainingDock', pathname, active);
      const label = active ? 'トレーニングを再開' : pathname === '/prepare' ? 'トレーニングを開始' : 'トレーニングメニューを開く';
      const button = app.render().find(n => n.props?.accessibilityLabel === label);
      const large = active || pathname === '/prepare';
      assert.equal(button.props.style({ pressed: false })[0].width, large ? 84 : 56);
      assert.equal(button.props.children[0].props.name, large ? 'play' : 'plus');
      if (active) assert.equal(button.props.children[1].props.children, '続きから');
      button.props.onPress();
      if (large) {
        assert.equal(app.render().find(n => n.props?.accessibilityLabel === label).props.disabled, true);
        button.props.onPress(); // Duplicate taps must not start twice.
      }
      await new Promise(resolve => setImmediate(resolve));
      assert.deepEqual(app.routes, [large ? '/workout' : '/prepare']);
      assert.equal(app.starts.length, large ? 1 : 0);
      assert.deepEqual(app.notifications, large ? [{ resume: active }] : []);
      for (const [side, destination] of [['ホーム', '/'], ['ルーム', '/rooms']]) {
        app.routes.length = 0;
        app.render().find(n => n.props?.accessibilityLabel === side).props.onPress();
        assert.deepEqual(app.routes, pathname === destination ? [] : [destination]);
      }
    });
  }
}

for (const active of [false, true]) {
  test(`home empty trend and missing exercise navigate correctly (active=${active})`, () => {
    const app = fixture('HomeProgress', '/', active);
    const trend = app.render('ProgressTrend', { records: [], metric: 'estimated', onMetric: () => {} });
    trend.find(n => n.props?.label === 'トレーニングへ').props.onPress();
    app.state.exercises = [];
    app.render().find(n => n.props?.accessibilityLabel === '記録の詳細を見る').props.onPress();
    assert.deepEqual(app.routes, Array(2).fill(active ? '/workout' : '/prepare'));
  });
}
