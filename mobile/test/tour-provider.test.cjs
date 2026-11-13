const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Exercise the real provider and overlay with deterministic native measurements.
function fixture() {
  const state = { sessions: [], loginPromptDismissed: false };
  let pathname = '/', current, cursor, context;
  const instances = new Map(), routes = [], timers = new Set();
  const same = (a, b) => a && b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
  const react = {
    createContext: value => ({ Provider: 'Provider', value }),
    useContext: () => context,
    useState: initial => {
      const i = cursor++, owner = current;
      if (!(i in owner.slots)) owner.slots[i] = typeof initial === 'function' ? initial() : initial;
      return [owner.slots[i], value => { owner.slots[i] = typeof value === 'function' ? value(owner.slots[i]) : value; }];
    },
    useRef: initial => { const i = cursor++; return current.slots[i] ??= { current: initial }; },
    useMemo: (factory, deps) => {
      const i = cursor++, old = current.slots[i];
      if (!old || !same(old.deps, deps)) current.slots[i] = { deps, value: factory() };
      return current.slots[i].value;
    },
    useCallback: (fn, deps) => react.useMemo(() => fn, deps),
    useEffect: (fn, deps) => {
      const i = cursor++, owner = current, old = owner.slots[i];
      if (!old || !same(old.deps, deps)) owner.effects.push(() => {
        old?.cleanup?.(); owner.slots[i] = { deps, cleanup: fn() };
      });
    },
  };
  const filename = path.resolve(__dirname, '../src/tour.tsx');
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = name => {
    if (name === 'react') return react;
    if (name === 'react-native') return { View: 'View', Text: 'Text', ScrollView: 'ScrollView', StyleSheet: { absoluteFill: {} }, useWindowDimensions: () => ({ width: 400, height: 800 }) };
    if (name === 'expo-router') return { usePathname: () => pathname, router: { replace: route => routes.push(route) } };
    if (name === './context') return { useApp: () => ({ state, ready: true }) };
    if (name === './ui') return { Button: 'Button', useTheme: () => ({ colors: { primary: 'primary' }, styles: {} }) };
    if (name === 'tour-test-timers') return { setInterval: fn => { timers.add(fn); return fn; }, clearInterval: fn => timers.delete(fn) };
    return original(name);
  };
  mod._compile("const { setInterval, clearInterval } = require('tour-test-timers');\n" + ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  function render(component, props = {}) {
    current = instances.get(component) ?? { slots: [], effects: [] };
    instances.set(component, current); cursor = 0;
    const result = component(props);
    if (result?.props?.ref) result.props.ref.current = { measureInWindow: cb => cb(0, 24, 400, 760) };
    const effects = current.effects.splice(0); effects.forEach(fn => fn());
    return result;
  }
  function provider() {
    const node = render(mod.exports.TourProvider, { children: 'screens' });
    context = node.props.value;
    return node;
  }
  return { state, routes, provider, render, setPath: p => { pathname = p; }, get tour() { return context; }, tick: () => timers.forEach(fn => fn()) };
}

function nodes(root) {
  if (!root || typeof root !== 'object') return [];
  if (Array.isArray(root)) return root.flatMap(nodes);
  return [root, ...nodes(root.props?.children)];
}

test('provider is invisible when inactive, retains onboarding request, and routes an existing workout only when ready', () => {
  const app = fixture();
  assert.equal(app.provider().props.children[1], false);
  app.state.sessions.push({ status: 'IN_PROGRESS' });
  app.provider(); app.tour.start(); app.provider();
  assert.equal(app.tour.step, 4);
  assert.deepEqual(app.routes, []);
  app.state.loginPromptDismissed = true;
  app.provider(); app.provider();
  assert.deepEqual(app.routes, ['/workout']);
  app.tour.notify('exit');
  assert.equal(app.provider().props.children[1], false);
});

test('route changes progress the tour and missing targets never create a blocking shade', () => {
  const app = fixture(); app.provider(); app.tour.start();
  app.state.loginPromptDismissed = true;
  let overlay = app.provider().props.children[1];
  let tree = app.render(overlay.type, overlay.props);
  assert.equal(tree.props.pointerEvents, 'box-none');
  assert.equal(nodes(tree).filter(n => n.props?.pointerEvents === 'none').length, 0);
  assert.ok(nodes(tree).some(n => n.props?.label === 'ツアーを終了'));
  const unregister = app.tour.register('home-dock', { path: '/', measure: cb => cb({ x: 160, y: 680, width: 56, height: 56 }) });
  app.tick(); tree = app.render(overlay.type, overlay.props);
  const shades = nodes(tree).filter(n => Array.isArray(n.props?.style) && n.props.style[0]?.backgroundColor === 'rgba(0,0,0,0.6)');
  assert.equal(shades.length, 4);
  const outline = nodes(tree).find(n => n.props?.pointerEvents === 'none');
  assert.equal(outline.props.style.top, 656, 'window measurements subtract the overlay safe-area origin');
  assert.equal(outline.props.style.left, 160);
  unregister(); app.tick(); tree = app.render(overlay.type, overlay.props);
  assert.equal(nodes(tree).filter(n => n.props?.pointerEvents === 'none').length, 0);
  app.setPath('/prepare'); app.provider(); app.provider();
  assert.equal(app.tour.step, 2);
  app.tour.notify('preset-selected'); app.provider();
  assert.equal(app.tour.step, 3);
  app.setPath('/workout'); app.provider(); app.provider();
  assert.equal(app.tour.step, 4);
});
