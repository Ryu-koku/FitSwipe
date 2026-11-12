const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const centerIndex = list => Math.round(list.contentOffset.y / list.snapToInterval);

// Real component callbacks with native scroll/Animated hosts and hook scheduling
// substituted. Storage acknowledgements can be delayed; gestures never render React.
function mount(overrides = {}, platform = 'android', reduced = false) {
  let props, cursor = 0, pendingEffects = [], rowRenders = 0, stateUpdates = 0;
  const slots = [], changes = [], haptics = [], appListeners = [], animations = [];
  const depsEqual = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    memo: component => {
      const cache = new Map();
      return props => {
        const previous = cache.get(props.index);
        if (previous && Object.keys(props).every(key => Object.is(props[key], previous.props[key]))) return previous.node;
        rowRenders++;
        const node = component(props);
        cache.set(props.index, { props, node });
        return node;
      };
    },
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { stateUpdates++; slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useMemo(fn, deps) { const i = cursor++; if (!slots[i] || !depsEqual(slots[i].deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || !depsEqual(slots[i].deps, deps)) pendingEffects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
    useLayoutEffect(fn, deps) { react.useEffect(fn, deps); },
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
    if (name === 'react-native') return { Text: 'Text', View: 'View', Pressable: 'Pressable', TextInput: 'TextInput', Platform: { OS: platform }, Vibration: { vibrate: duration => haptics.push(`vibrate:${duration}`) }, useWindowDimensions: () => ({ fontScale: 1 }),
      Animated: { View: 'AnimatedView', Text: 'AnimatedText', FlatList: 'FlatList', Value, event: (mapping, config) => {
        const handler = event => { mapping[0].nativeEvent.contentOffset.y.value = event.nativeEvent.contentOffset.y; config.listener(event); };
        handler.nativeDriver = config.useNativeDriver; return handler;
      }, timing: (v, config) => ({ start: () => { animations.push(config); v.setValue(config.toValue); } }) },
      AppState: { addEventListener: (_, f) => { appListeners.push(f); return { remove: () => appListeners.splice(appListeners.indexOf(f), 1) }; } },
      PanResponder: { create: config => ({ panHandlers: config }) } };
    if (name === 'expo-router') return { useFocusEffect: callback => react.useEffect(callback, [callback]) };
    if (name === 'expo-haptics') return { ImpactFeedbackStyle: { Heavy: 'heavy' }, impactAsync: style => { haptics.push(`impact:${style}`); return Promise.resolve(); } };
    if (name === '../ui') return { feedback: () => haptics.push('selection'), useTheme: () => ({ colors: { primary: 'primary', ink: 'ink' }, styles: {} }), Button: 'Button', Sheet: 'Sheet' };
    if (name === '../use-reduced-motion') return { useReducedMotion: () => reduced };
    return original(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  props = { label: '重量', unit: 'kg', value: 60, step: 2.5, onChange: v => changes.push(v), ...overrides };
  function render(next = {}) {
    props = { ...props, ...next }; cursor = 0; const nodes = [];
    function walk(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(walk); if (typeof node.type === 'function') return walk(node.type(node.props)); nodes.push(node);
      if (node.type === 'FlatList') {
        node.props.ref.current = { scrollToOffset: config => animations.push(config) };
        const center = centerIndex(node.props);
        node.props.data.slice(Math.max(0, center - 6), center + 7).forEach((item, i) => walk(node.props.renderItem({ item, index: Math.max(0, center - 6) + i })));
      }
      walk(node.props?.children); }
    // Flush layout-triggered renders before exposing the committed frame.
    let updates;
    do {
      updates = stateUpdates; cursor = 0; nodes.length = 0;
      walk(mod.exports.WorkoutNumberWheel(props));
      const effects = pendingEffects; pendingEffects = []; effects.forEach(f => f());
    } while (stateUpdates !== updates);
    return nodes;
  }
  const control = () => render().find(n => n.props?.testID?.startsWith('workout-wheel')).props;
  const list = () => render().find(n => n.type === 'FlatList').props;
  let dragList, base;
  const event = y => ({ nativeEvent: { contentOffset: { y } } });
  const begin = () => { dragList = list(); base = centerIndex(dragList) * 50; dragList.onScrollBeginDrag(); };
  const move = delta => dragList.onScroll(event(base + delta));
  const release = delta => dragList.onScrollEndDrag(event(base + delta));
  const settle = delta => { dragList.onMomentumScrollBegin(); dragList.onMomentumScrollEnd(event(base + delta)); };
  const row = delta => {
    const props = list(), index = centerIndex(props) + delta;
    return render().find(n => n.type === 'Pressable' && n.props.children?.props.testID === `workout-number-row-${index}`).props;
  };
  const tap = delta => { list().onTouchStart(); row(delta).onPress(); };
  render();
  return { rowRenders: () => rowRenders, stateUpdates: () => stateUpdates, render, control, list, begin, move, release, settle, tap, row, changes, haptics, appListeners, animations,
    unmount: () => { for (const slot of slots) slot?.cleanup?.(); },
    press: label => { const node = render().find(n => n.type === 'Button' && n.props.label === label); assert.ok(node, label); assert.ok(!node.props.disabled); haptics.push('selection'); node.props.onPress(); },
  };
}

const rows = app => app.render().filter(n => n.props?.testID?.startsWith('workout-number-row-'));

test('native scroll tracks detents without React state updates and commits once after release', () => {
  const app = mount();
  assert.equal(app.list().onScroll.nativeDriver, true);
  assert.equal(app.list().snapToInterval, 50);
  app.begin(); const updates = app.stateUpdates();
  for (const delta of [8, 24, 26, 48, 88]) app.move(delta);
  assert.equal(app.stateUpdates(), updates); assert.deepEqual(app.changes, []);
  assert.deepEqual(app.haptics, ['selection', 'selection']);
  app.release(88); assert.deepEqual(app.changes, []);
  app.settle(100); assert.deepEqual(app.changes, [65]);
  app.unmount();
});

test('native animated nodes retain continuous offset through detent crossings', () => {
  const app = mount(); const hosts = rows(app);
  const offset = hosts[0].props.style.transform[0].scale.value;
  const initial = offset.value; app.begin();
  for (const delta of [8, 24, 26, 49, 70]) { app.move(delta); assert.equal(offset.value, initial + delta); }
  assert.equal(app.stateUpdates(), 0);
  app.release(70); app.settle(50); app.unmount();
});

test('quick taps accumulate despite delayed and stale storage acknowledgements', () => {
  const app = mount(); app.tap(1); app.tap(1); assert.deepEqual(app.changes, [62.5, 65]);
  app.render({ value: 62.5 }); assert.equal(app.control().accessibilityValue.now, 65);
  app.tap(1); assert.deepEqual(app.changes, [62.5, 65, 67.5]);
  app.render({ value: 67.5 }); assert.equal(app.control().accessibilityValue.now, 67.5); app.unmount();
});

test('reduced motion disables momentum and aligns immediately without animation', () => {
  const app = mount({}, 'android', true);
  assert.equal(app.list().disableIntervalMomentum, true);
  app.begin(); app.move(32); app.release(32);
  assert.deepEqual(app.changes, [62.5]); assert.ok(app.animations.every(a => a.animated === false)); app.unmount();
});

test('native momentum can cross more detents but saves only its final snap', () => {
  const app = mount(); app.begin(); app.move(50); app.release(50);
  app.move(200); app.settle(200); assert.deepEqual(app.changes, [70]); app.unmount();
});

test('a release without momentum commits when native momentum does not start', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const app = mount(); app.begin(); app.move(50); app.release(50);
  t.mock.timers.tick(120); assert.deepEqual(app.changes, [62.5]); app.unmount();
});

test('direct input validates, cancellation preserves the record and iOS ticks', () => {
  const app = mount({}, 'ios'); app.tap(0);
  const input = () => app.render().find(n => n.type === 'TextInput').props;
  input().onChangeText('-1');
  assert.equal(app.render().find(n => n.type === 'Button' && n.props.label === '決定').props.disabled, true);
  input().onSubmitEditing(); assert.deepEqual(app.changes, []);
  input().onChangeText('72.5'); app.press('取消'); assert.deepEqual(app.changes, []);
  app.tap(0); input().onChangeText('72.5'); app.press('決定');
  assert.deepEqual(app.changes, [72.5]); assert.deepEqual(app.haptics, Array(5).fill('selection')); app.unmount();
});

test('long hold repeats without React updates, saves on release and stops on interruption', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const app = mount(); const row = app.row(1); row.onLongPress(); t.mock.timers.tick(140);
  assert.deepEqual(app.changes, []); assert.equal(app.stateUpdates(), 0);
  row.onPressOut(); assert.deepEqual(app.changes, [65]);
  t.mock.timers.tick(1000); assert.equal(app.haptics.length, 2); app.unmount();
  for (const interruption of ['background', 'disable', 'unmount']) {
    const app = mount(); app.row(1).onLongPress();
    if (interruption === 'background') app.appListeners[0]('background');
    if (interruption === 'disable') app.render({ disabled: true });
    app.unmount(); t.mock.timers.tick(1000); assert.equal(app.haptics.length, 1); assert.deepEqual(app.changes, []);
  }
});

test('bounds and accessibility honor min/max and disabled', () => {
  const app = mount({ value: 1, min: 1, max: 3, step: 1, unit: '回' });
  app.begin(); app.move(-1000); app.release(-1000); app.settle(-1000); assert.deepEqual(app.changes, []);
  app.begin(); app.move(2000); app.release(2000); app.settle(2000); assert.deepEqual(app.changes, [3]);
  app.control().onAccessibilityAction({ nativeEvent: { actionName: 'increment' } }); assert.deepEqual(app.changes, [3]);
  app.render({ disabled: true }); assert.equal(app.list().scrollEnabled, false);
  app.control().onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } }); assert.deepEqual(app.changes, [3]); app.unmount();
});

test('only the previous value is highlighted including zero', () => {
  for (const props of [{ value: 60, highlightValue: 62.5 }, { value: 0, highlightValue: 0 }]) {
    const app = mount(props);
    const check = () => rows(app).forEach(row => {
      const text = row.props.children[0].props;
      assert.equal(text.style.color, text.children === props.highlightValue ? 'primary' : 'ink');
    });
    check(); app.begin(); app.move(30); check(); app.release(30); app.settle(50); app.unmount();
  }
});

test('empty value stays empty on tap, but crossing a detent and returning commits zero', () => {
  const app = mount({ value: undefined, step: 1 });
  app.tap(0); assert.deepEqual(app.changes, []); app.press('取消');
  app.begin(); app.move(50); app.move(0); app.release(0); app.settle(0);
  assert.deepEqual(app.changes, [0]); app.unmount();
});


test('set changes reuse the wheel and synchronously replace values and highlights', () => {
  const app = mount({ resetToken: 1, value: 0, highlightValue: 0 });
  const offset = rows(app)[0].props.style.transform[0].scale.value;
  for (const [resetToken, value, highlightValue] of [[2, 500, 502.5], [3, undefined, 0], [4, 0, 0]]) {
    const frame = app.render({ resetToken, value, highlightValue });
    const list = frame.find(n => n.type === 'FlatList').props;
    const control = frame.find(n => n.props?.testID === 'workout-wheel-weight').props;
    assert.equal(control.accessibilityValue.now, value ?? 0);
    assert.equal(list.data[centerIndex(list)].empty, value === undefined);
    assert.equal(list.data[centerIndex(list)].value, value ?? 0);
    assert.equal(list.initialNumToRender, 21);
    assert.equal(list.maxToRenderPerBatch, 10);
    assert.equal(list.windowSize, 5);
    assert.equal(offset.value, centerIndex(list) * 50);
    for (const row of frame.filter(n => n.props?.testID?.startsWith('workout-number-row-'))) {
      assert.equal(row.props.style.transform[0].scale.value, offset);
      const text = row.props.children[0].props;
      assert.equal(text.style.color, text.children === highlightValue ? 'primary' : 'ink');
    }
  }
  assert.ok(app.animations.every(a => a.animated === false));
  assert.deepEqual(app.changes, []); app.unmount();
});

test('set changes discard active, settling, held and pending edits even for equal values', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  for (const mode of ['active', 'settling', 'held', 'pending', 'input']) {
    const writes = [];
    const app = mount({ resetToken: 'old', onChange: value => writes.push(['old', value]) });
    let staleSave;
    if (mode === 'active' || mode === 'settling') {
      app.begin(); app.move(100);
      if (mode === 'settling') app.release(100);
    } else if (mode === 'held') app.row(1).onLongPress();
    else if (mode === 'pending') app.tap(1);
    else {
      app.tap(0);
      app.render().find(n => n.type === 'TextInput').props.onChangeText('99');
      staleSave = app.render().find(n => n.type === 'Button' && n.props.label === '決定').props.onPress;
    }
    const expected = [...writes];
    app.render({ resetToken: 'new', value: 60, onChange: value => writes.push(['new', value]) });
    assert.equal(app.control().accessibilityValue.now, 60);
    assert.ok(!app.render().some(n => n.type === 'TextInput'));
    if (mode === 'active' || mode === 'settling') app.settle(100);
    staleSave?.();
    t.mock.timers.tick(1000);
    assert.deepEqual(writes, expected);
    app.tap(1);
    assert.deepEqual(writes, [...expected, ['new', 62.5]]);
    app.unmount();
  }
});

test('row memo and callbacks survive equal-valued set changes and parent callbacks', () => {
  const app = mount({ resetToken: 1 });
  const before = app.list();
  const count = app.rowRenders();
  app.render({ resetToken: 2, onChange: () => {} });
  const after = app.list();
  assert.equal(after.renderItem, before.renderItem);
  assert.equal(after.getItemLayout, before.getItemLayout);
  assert.equal(after.keyExtractor, before.keyExtractor);
  assert.equal(app.rowRenders(), count);
  app.unmount();
});

test('distant centers remount the list with an initial window containing the selected cell', () => {
  const app = mount({ value: 0 });
  let previous = app.render().find(n => n.type === 'FlatList');
  for (const value of [500, undefined, 250, 0]) {
    const next = app.render({ value }).find(n => n.type === 'FlatList');
    assert.notEqual(next.key, previous.key);
    assert.equal(Number(next.key), centerIndex(next.props) || 0);
    const first = next.props.initialScrollIndex;
    const last = Math.min(next.props.data.length - 1, first + next.props.initialNumToRender - 1);
    assert.ok(first <= Math.max(0, centerIndex(next.props) - 1));
    assert.ok(last >= Math.min(next.props.data.length - 1, centerIndex(next.props) + 1));
    assert.equal(next.props.data[centerIndex(next.props)].value, value ?? 0);
    assert.equal(app.animations.at(-1).offset, centerIndex(next.props) * 50);
    previous = next;
  }
  app.unmount();
});
