const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function swipe(reduced = false, isGestureBlocked, rest = false, unavailable = []) {
  const values = [], animations = [], stateUpdates = [];
  let haptics = 0;
  class Value {
    constructor(value) { this.value = value; values.push(this); }
    setValue(value) { this.value = value; }
    stopAnimation() {}
    interpolate(config) { return { value: this, ...config }; }
    getTranslateTransform() { return []; }
  }
  class XY extends Value { constructor() { super({ x: 0, y: 0 }); this.x = new Value(0); } }
  const filename = path.resolve(__dirname, '../src/components/SwipeCard.tsx');
  const mod = new Module(filename, module); mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = name => {
    if (name === 'react') return { createContext: () => ({ Provider: 'Provider' }), useContext: () => null,
      useEffect: () => {}, useLayoutEffect: f => f(), useMemo: f => f(), useRef: v => ({ current: v }),
      useState: v => [typeof v === 'function' ? v() : v, (value) => stateUpdates.push(value)] };
    if (name === 'react-native') return { Animated: { Value, ValueXY: XY, View: 'AnimatedView', Text: 'AnimatedText',
      timing: (value, config) => ({ start: cb => { animations.push(config); value.setValue(config.toValue); cb?.({ finished: true }); } }) },
      PanResponder: { create: handlers => ({ panHandlers: handlers }) }, useWindowDimensions: () => ({ width: 400, height: 800 }), Text: 'Text', View: 'View' };
    if (name === '../ui') return { useTheme: () => ({ colors: {}, styles: {} }), feedback: () => { haptics++; } };
    if (name === './AppIcon') return { AppIcon: 'AppIcon' };
    if (name === '../use-reduced-motion') return { useReducedMotion: () => reduced };
    return original(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  const counts = [0, 0, 0, 0];
  const progress = new Value(0);
  const node = mod.exports.SwipeCard({ progress, isGestureBlocked, rest,
    onAdvance: () => { throw Error('unexpected advance'); },
    onSwipeRight: unavailable.includes('right') ? null : () => counts[0]++,
    onSwipeLeft: unavailable.includes('left') ? null : () => counts[1]++,
    onSwipeUp: unavailable.includes('up') ? null : () => counts[2]++,
    onSwipeDown: unavailable.includes('down') ? null : () => counts[3]++,
  });
  return { node, progress, animations, stateUpdates, haptics: () => haptics, counts: () => counts };
}

test('each swipe direction runs its own action and flies in that direction', () => {
  for (const [index, dx, dy, destination] of [
    [0, 100, 0, { x: 560, y: 0 }], [1, -100, 0, { x: -560, y: 0 }],
    [2, 0, -100, { x: 0, y: -800 }], [3, 0, 100, { x: 0, y: 800 }],
  ]) {
    const app = swipe(); const gesture = { dx, dy, vx: 0, vy: 0 };
    app.node.props.onPanResponderMove(null, gesture);
    assert.equal(app.progress.value, 0.25);
    app.node.props.onPanResponderRelease(null, gesture);
    assert.deepEqual(app.counts(), [0, 1, 2, 3].map(i => Number(i === index)));
    assert.equal(app.progress.value, 1);
    assert.deepEqual(app.animations.at(-1).toValue, destination);
  }
});

test('unavailable left and down directions spring back without an action', () => {
  for (const [dx, dy] of [[-100, 0], [0, 100]]) {
    const app = swipe(false, undefined, false, ['left', 'down']);
    app.node.props.onPanResponderMove(null, { dx, dy });
    app.node.props.onPanResponderRelease(null, { dx, dy, vx: 0, vy: 0 });
    assert.deepEqual(app.counts(), [0, 0, 0, 0]);
    assert.deepEqual(app.animations.at(-1).toValue, { x: 0, y: 0 });
    assert.equal(app.progress.value, 0);
    assert.equal(app.haptics(), 0);
  }
});

test('cancel and termination reset progress without navigating; reduced motion has zero duration', () => {
  for (const reduced of [false, true]) {
    const app = swipe(reduced);
    app.node.props.onPanResponderMove(null, { dx: 15, dy: 0 });
    app.node.props.onPanResponderRelease(null, { dx: 15, dy: 0, vx: 0, vy: 0 });
    assert.equal(app.progress.value, 0);
    assert.deepEqual(app.counts(), [0, 0, 0, 0]);
    app.node.props.onPanResponderTerminate();
    assert.equal(app.progress.value, 0);
    if (reduced) assert.ok(app.animations.every(a => a.duration === 0));
  }
});


test('wheel and button touches block card swipes without rerendering', () => {
  let touchingControl = false;
  const app = swipe(false, () => touchingControl);
  const canStart = () => app.node.props.onMoveShouldSetPanResponder(null, { dx: 80, dy: 0 });
  assert.equal(canStart(), true);
  touchingControl = true; assert.equal(canStart(), false);
  touchingControl = false; assert.equal(canStart(), true);
});

test('deck reveal spans a full width independently of the unchanged commit threshold', () => {
  for (const [distance, expected] of [[32, 0.08], [100, 0.25], [200, 0.5], [400, 1], [600, 1]]) {
    const app = swipe();
    const gesture = { dx: distance, dy: 0, vx: 0, vy: 0 };
    app.node.props.onPanResponderMove(null, gesture);
    assert.equal(app.progress.value, expected);
    assert.equal(app.haptics(), 0);
    assert.deepEqual(app.stateUpdates, []);
    app.node.props.onPanResponderRelease(null, gesture);
    assert.deepEqual(app.counts(), [1, 0, 0, 0]);
    assert.equal(app.haptics(), 1);
    app.node.props.onPanResponderRelease(null, gesture);
    assert.equal(app.haptics(), 1);
  }
  const rest = swipe(false, undefined, true);
  rest.node.props.onPanResponderMove(null, { dx: 15, dy: 0 });
  assert.deepEqual(rest.stateUpdates, []);
  assert.equal(rest.node.props.children.type, 'Provider');
  rest.node.props.onPanResponderRelease(null, { dx: 15, dy: 0, vx: 0, vy: 0 });
  assert.equal(rest.haptics(), 0);
});
