const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Real component callbacks and wheel controller, with only the native host and
// React hook scheduling substituted. Storage acknowledgements can be delayed.
function mount(overrides = {}, platform = 'android', reduced = false) {
  let props, cursor = 0, pendingEffects = [];
  const slots = [], changes = [], haptics = [], appListeners = [], animations = [];
  const depsEqual = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useMemo(fn, deps) { const i = cursor++; if (!slots[i] || !depsEqual(slots[i].deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || !depsEqual(slots[i].deps, deps)) pendingEffects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
  };
  class Value {
    constructor(v) { this.value = v; this.listeners = new Map(); }
    setValue(v) { this.value = v; for (const listener of this.listeners.values()) listener({ value: v }); }
    stopAnimation() {}
    addListener(listener) { const key = String(this.listeners.size); this.listeners.set(key, listener); return key; }
    removeListener(key) { this.listeners.delete(key); }
    interpolate(config) { return { config, value: this }; }
  }
  const filename = path.resolve(__dirname, '../src/components/WorkoutNumberWheel.tsx');
  const mod = new Module(filename, module); mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = name => {
    if (name === 'react') return react;
    if (name === 'react-native') return { Text: 'Text', View: 'View', TextInput: 'TextInput', Platform: { OS: platform }, Vibration: { vibrate: duration => haptics.push(`vibrate:${duration}`) }, useWindowDimensions: () => ({ fontScale: 1 }),
      Animated: { View: 'AnimatedView', Text: 'AnimatedText', Value, timing: (v, config) => ({ start: () => { animations.push(config); v.setValue(config.toValue); } }) },
      AppState: { addEventListener: (_, f) => { appListeners.push(f); return { remove: () => appListeners.splice(appListeners.indexOf(f), 1) }; } },
      PanResponder: { create: config => ({ panHandlers: config }) } };
    if (name === 'expo-router') return { useFocusEffect: callback => react.useEffect(callback, [callback]) };
    if (name === 'expo-haptics') return { ImpactFeedbackStyle: { Heavy: 'heavy' }, impactAsync: style => { haptics.push(`impact:${style}`); return Promise.resolve(); } };
    if (name === '../ui') return { useTheme: () => ({ colors: { primary: 'primary', ink: 'ink' }, styles: {} }), Button: 'Button', Sheet: 'Sheet' };
    if (name === '../use-reduced-motion') return { useReducedMotion: () => reduced };
    return original(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  props = { label: '重量', unit: 'kg', value: 60, step: 2.5, onChange: v => changes.push(v), ...overrides };
  function render(next = {}) {
    props = { ...props, ...next }; cursor = 0; const nodes = [];
    function walk(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(walk); nodes.push(node); walk(node.props?.children); }
    walk(mod.exports.WorkoutNumberWheel(props)); const effects = pendingEffects; pendingEffects = []; effects.forEach(f => f()); return nodes;
  }
  const pan = () => render().find(n => n.props?.testID?.startsWith('workout-wheel')).props;
  let stopped = 0;
  const event = y => ({ nativeEvent: { locationY: y }, stopPropagation: () => stopped++ });
  function tap(y) { const p = pan(); p.onPanResponderGrant(event(y)); p.onPanResponderRelease(event(y)); }
  render();
  return { render, pan, tap, event, changes, haptics, appListeners, animations, stopped: () => stopped,
    unmount: () => { for (const slot of slots) slot?.cleanup?.(); },
    press: label => { const node = render().find(n => n.type === 'Button' && n.props.label === label); assert.ok(node, label); assert.ok(!node.props.disabled); node.props.onPress(); },
  };
}

test('number gestures own the responder and tick on Android without opening history or input', () => {
  const app = mount(), p = app.pan();
  assert.equal(p.onStartShouldSetPanResponder(), true);
  assert.equal(p.onPanResponderTerminationRequest(), false);
  p.onPanResponderGrant(app.event(70));
  p.onPanResponderMove(app.event(70), { dy: -48, numberActiveTouches: 1 });
  p.onPanResponderMove(app.event(70), { dy: -88, numberActiveTouches: 1 });
  p.onPanResponderRelease(app.event(70));
  assert.deepEqual(app.changes, [65]); assert.deepEqual(app.haptics, ['vibrate:80', 'vibrate:80']);
  assert.ok(app.stopped() >= 4);
  assert.ok(!app.render().some(n => n.type === 'Sheet'));
  app.unmount();
});

test('quick taps accumulate before storage acknowledges and an older acknowledgement cannot rewind the wheel', () => {
  const app = mount();
  app.tap(120); app.tap(120); assert.deepEqual(app.changes, [62.5, 65]);
  app.render({ value: 62.5 });
  assert.equal(app.pan().accessibilityValue.now, 65);
  app.tap(120); assert.deepEqual(app.changes, [62.5, 65, 67.5]);
  app.render({ value: 67.5 }); assert.equal(app.pan().accessibilityValue.now, 67.5);
  app.unmount();
});

test('the same numeric row follows the finger through selection changes, then aligns only on release', () => {
  const app = mount(), p = app.pan();
  const row = index => app.render().find(n => n.props?.testID === `workout-number-row-${index}`).props;
  const rowCenter = index => { const { style } = row(index); return style.top + style.height / 2 + style.transform[0].translateY.value; };
  p.onPanResponderGrant(app.event(70));
  const initial = rowCenter(0);
  for (const dy of [-8, -20, -24, -26, -49, -50, -70]) {
    p.onPanResponderMove(app.event(70), { dy, numberActiveTouches: 1 });
    assert.equal(rowCenter(0), initial + dy);
  }
  assert.equal(app.pan().accessibilityValue.now, 62.5);
  assert.deepEqual(app.animations, []);
  assert.deepEqual(app.changes, []);
  const beforeRelease = rowCenter(1);
  p.onPanResponderRelease(app.event(70));
  assert.deepEqual(app.changes, [62.5]);
  assert.deepEqual(app.haptics, ['vibrate:80']);
  assert.equal(app.animations.length, 1);
  assert.equal(app.animations[0].toValue, -50);
  assert.equal(rowCenter(1) - beforeRelease, 20);
  app.render({ value: 62.5 });
  assert.equal(rowCenter(1), initial);
  app.unmount();
});

test('direct tracking is retained with reduced motion, while release aligns without animation', () => {
  const app = mount({}, 'android', true), p = app.pan();
  p.onPanResponderGrant(app.event(70));
  p.onPanResponderMove(app.event(70), { dy: -32, numberActiveTouches: 1 });
  const position = () => app.render().find(n => n.props?.testID === 'workout-number-row-1').props.style.transform[0].translateY.value;
  assert.equal(position(), -32);
  p.onPanResponderRelease(app.event(70));
  assert.equal(position(), -50);
  assert.deepEqual(app.animations, []);
  assert.deepEqual(app.changes, [62.5]);
  app.unmount();
});

test('direct input validates and cancellation keeps the existing record; iOS uses heavy impacts', () => {
  const app = mount({}, 'ios');
  app.tap(70);
  const input = () => app.render().find(n => n.type === 'TextInput').props;
  input().onChangeText('-1');
  assert.equal(app.render().find(n => n.type === 'Button' && n.props.label === '決定').props.disabled, true);
  input().onSubmitEditing(); assert.deepEqual(app.changes, []);
  input().onChangeText('72.5'); app.press('取消'); assert.deepEqual(app.changes, []);
  app.tap(70); input().onChangeText('72.5'); app.press('決定');
  assert.deepEqual(app.changes, [72.5]); assert.deepEqual(app.haptics, ['impact:heavy']);
  assert.ok(!app.render().some(n => n.type === 'Sheet')); app.unmount();
});

test('background and unmount interrupt long presses and never keep ticking', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const app = mount();
  app.pan().onPanResponderGrant(app.event(120)); t.mock.timers.tick(400);
  app.appListeners[0]('background'); t.mock.timers.tick(2000);
  assert.deepEqual(app.changes, [62.5]); assert.equal(app.haptics.length, 1);
  app.pan().onPanResponderGrant(app.event(120)); t.mock.timers.tick(400); app.unmount(); t.mock.timers.tick(2000);
  assert.deepEqual(app.changes, [62.5, 65]); assert.equal(app.haptics.length, 2);
  assert.equal(app.appListeners.length, 0);
});

test('disabled overlays and accessibility adjustments obey the same boundaries', () => {
  const app = mount({ label: '回数', unit: '回', value: 0, step: 1 });
  app.pan().onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } });
  assert.deepEqual(app.changes, []); assert.deepEqual(app.haptics, []);
  app.pan().onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
  assert.deepEqual(app.changes, [1]);
  app.render({ disabled: true }); assert.equal(app.pan().onStartShouldSetPanResponder(), false);
  app.pan().onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
  assert.deepEqual(app.changes, [1]); app.unmount();
});


test('previous value alone is highlighted while idle and dragging, including zero', () => {
  for (const props of [{ value: 60, highlightValue: 62.5 }, { value: 0, highlightValue: 0 }, { value: 8, highlightValue: 9, step: 1, unit: '回' }]) {
    const app = mount(props);
    const check = () => {
      const rows = app.render().filter(node => node.props?.testID?.startsWith('workout-number-row-'));
      assert.ok(rows.some(row => row.props.children[0].props.children === props.highlightValue));
      for (const row of rows) {
        const text = row.props.children[0].props;
        assert.equal(text.style.color, text.children === props.highlightValue ? 'primary' : 'ink');
      }
    };
    check();
    const pan = app.pan();
    pan.onPanResponderGrant(app.event(70));
    pan.onPanResponderMove(app.event(70), { dy: -30, numberActiveTouches: 1 });
    check();
    pan.onPanResponderRelease(app.event(70));
    app.unmount();
  }
});

test('without previous value wheel retains its idle and active colors', () => {
  const app = mount();
  const colors = () => app.render().filter(node => node.props?.testID?.startsWith('workout-number-row-'))
    .map(row => row.props.children[0].props.style.color);
  assert.ok(colors().every(color => color === 'ink'));
  const pan = app.pan();
  pan.onPanResponderGrant(app.event(70));
  assert.ok(colors().every(color => color === 'primary'));
  pan.onPanResponderRelease(app.event(70));
  app.unmount();
});
