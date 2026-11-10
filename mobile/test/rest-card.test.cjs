const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Real render/effect callbacks, with platform views and animation drivers isolated.
function load(file, exported, mocks) {
  let cursor = 0;
  const slots = [], pending = [];
  const hooks = {
    useState: value => { const i = cursor++; if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value; return [slots[i], next => { slots[i] = next; }]; },
    useRef: value => { const i = cursor++; return slots[i] ??= { current: value }; },
    useEffect: (effect, deps) => { const i = cursor++; if (!slots[i] || deps.some((d, j) => !Object.is(d, slots[i].deps[j]))) pending.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: effect() }; }); },
  };
  const filename = path.resolve(__dirname, '../src/components', file);
  const mod = new Module(filename, module);
  mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = name => name === 'react' ? hooks : mocks[name] ?? original(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  return { render(props) { cursor = 0; const nodes = []; function visit(n) { if (!n || typeof n !== 'object') return; if (Array.isArray(n)) return n.forEach(visit); nodes.push(n); visit(n.props?.children); } visit(mod.exports[exported](props)); pending.splice(0).forEach(f => f()); return nodes; }, unmount() { slots.forEach(s => s?.cleanup?.()); } };
}

test('rest expiry stops the illustration and advances after 3 seconds using the latest callback; subscriptions clean up', t => {
  let now = 1000, tick, cleared = false, removed = false;
  t.mock.method(Date, 'now', () => now);
  t.mock.method(global, 'setInterval', f => { tick = f; return 1; });
  t.mock.method(global, 'clearInterval', () => { cleared = true; });
  const app = load('RestCard.tsx', 'RestCard', {
    'react-native': { Text: 'Text', View: 'View', AppState: { addEventListener: () => ({ remove: () => { removed = true; } }) } },
    '../ui': { Button: 'Button', Card: 'Card', useTheme: () => ({ colors: {}, styles: {} }) },
    '../use-reduced-motion': { useReducedMotion: () => true },
    './SwipeCard': { SwipeCard: 'SwipeCard' }, './RestMuscle': { RestMuscle: 'RestMuscle' },
  });
  let old = 0, latest = 0;
  const props = { startedAt: 1000, endsAt: 61000, exerciseName: '種目', next: '10回', onSkip: () => { old++; } };
  assert.equal(app.render(props).find(n => n.type === 'RestMuscle').props.animate, true);
  const updated = { ...props, onSkip: () => { latest++; } }; app.render(updated);
  now = 61000; tick(); const nodes = app.render(updated);
  assert.equal(nodes.find(n => n.type === 'RestMuscle').props.animate, false);
  assert(nodes.some(n => n.props?.children === '休憩終了'));
  assert.equal(latest, 0);
  now = 63999; tick(); app.render(updated); assert.equal(latest, 0);
  now = 64000; tick(); app.render(updated); assert.equal(latest, 1); assert.equal(old, 0);
  nodes.find(n => n.type === 'Button').props.onPress(); assert.equal(latest, 2);
  nodes.find(n => n.type === 'SwipeCard').props.onAdvance(); assert.equal(latest, 3);
  app.unmount(); assert(cleared && removed);
});

test('muscle loop pauses for reduced motion, hidden screens, background and completed rest', () => {
  let reduced = true, started = 0, stopped = 0;
  let visibility = { focused: true, appState: 'active', covered: false };
  class Value { setValue() {} stopAnimation() {} interpolate(x) { return x; } }
  const app = load('RestMuscle.tsx', 'RestMuscle', {
    'react-native': { View: 'View', Easing: { sin: 'sin', inOut: x => x }, Animated: { View: 'AnimatedView', Value, timing: () => ({}), sequence: x => x, loop: () => ({ start() { started++; }, stop() { stopped++; } }) } },
    'react-native-svg': { __esModule: true, default: 'Svg', Ellipse: 'Ellipse', Path: 'Path' },
    '../ui': { useTheme: () => ({ isDark: false }) },
    '../use-reduced-motion': { useReducedMotion: () => reduced },
    '../exercise-motion': { useExerciseMotion: () => visibility },
  });
  app.render({ animate: true }); assert.equal(started, 0);
  reduced = false; app.render({ animate: true }); assert.equal(started, 1);
  visibility = { ...visibility, covered: true }; app.render({ animate: true }); assert.equal(stopped, 1);
  visibility = { ...visibility, covered: false, focused: false }; app.render({ animate: true }); assert.equal(started, 1);
  visibility = { ...visibility, focused: true, appState: 'background' }; app.render({ animate: true }); assert.equal(started, 1);
  visibility = { ...visibility, appState: 'active' }; app.render({ animate: true }); assert.equal(started, 2);
  app.render({ animate: false }); assert.equal(stopped, 2);
  app.render({ animate: true }); app.unmount(); assert.equal(stopped, 3);
});
