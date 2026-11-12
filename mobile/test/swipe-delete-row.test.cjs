const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function row(open = false, reduced = false) {
  let pan, value = 0, deleted = 0;
  const changes = [], springs = [];
  const filename = path.resolve(__dirname, '../src/components/SwipeDeleteRow.tsx');
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = name => {
    if (name === 'react') return {
      useState: fn => [typeof fn === "function" ? fn() : fn, () => {}], useRef: value => ({ current: value }), useEffect: fn => { fn(); },
    };
    if (name === 'react-native') return {
      View: 'View', Text: 'Text', Pressable: 'Pressable',
      PanResponder: { create: config => { pan = config; return { panHandlers: {} }; } },
      Animated: { View: 'Animated.View', Value: class {
          setValue(v) { value = v; }
          stopAnimation() {}
          interpolate(config) {
            return { config, get value() {
              const { inputRange: [min, max], outputRange: [from, to], extrapolate } = config;
              const input = extrapolate === 'clamp' ? Math.max(min, Math.min(max, value)) : value;
              return from + (input - min) / (max - min) * (to - from);
            } };
          }
        },
        spring: (_, config) => { springs.push(config); return { start: () => { value = config.toValue; } }; } },
    };
    if (name === '../ui') return { feedback() {}, useTheme: () => ({ colors: { red: "#f00" } }) };
    if (name === '../use-reduced-motion') return { useReducedMotion: () => reduced };
    return original(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  let closeOnTap;
  const tree = mod.exports.SwipeDeleteRow({ name: 'スクワット', open,
    onOpenChange: v => changes.push(v), onDelete: () => deleted++, children: close => { closeOnTap = close; return null; } });
  return { pan, changes, tree, springs, setOffset: v => { value = v; }, close: () => closeOnTap(), get value() { return value; }, get deleted() { return deleted; } };
}

test('only a clear left horizontal swipe claims a closed row', () => {
  const { pan } = row();
  for (const [dx, dy, expected] of [[-10, 0, false], [-20, 18, false], [-5, 40, false], [40, 0, false], [-40, 5, true]]) {
    assert.equal(pan.onMoveShouldSetPanResponder(null, { dx, dy }), expected);
  }
});
test('swipe clamps, opens, closes on cancellation and exposes the right delete button', () => {
  const app = row();
  app.pan.onPanResponderGrant();
  app.pan.onPanResponderMove(null, { dx: -140 });
  assert.equal(app.value, -92);
  app.pan.onPanResponderRelease(null, { dx: -60 });
  assert.deepEqual(app.changes, [true, true]);
  app.pan.onPanResponderTerminate();
  assert.equal(app.value, 0);
  const region = app.tree.props.children[0];
  const button = region.props.children;
  assert.equal(region.props.style.right, 0);
  assert.equal(button.props.disabled, true);
  assert.equal(button.props.accessibilityElementsHidden, true);
});
test('an open row closes on tap and deletes through the revealed button', () => {
  const app = row(true);
  assert.equal(app.close(), true);
  app.tree.props.children[0].props.children.props.onPress();
  assert.equal(app.deleted, 1);
  assert.deepEqual(app.changes, [false, false]);
});

test('red is confined to the delete region and hidden at rest, including overshoot', () => {
  const app = row();
  const region = app.tree.props.children[0];
  const content = app.tree.props.children[1];
  assert.equal(app.tree.props.style.backgroundColor, undefined);
  assert.equal(region.props.style.backgroundColor, '#f00');
  assert.equal(region.props.style.width, 92);
  const translate = content.props.style.transform[0].translateX;
  const opacity = region.props.style.opacity;
  assert.equal(translate.config.extrapolate, 'clamp');
  assert.equal(opacity.config.extrapolate, 'clamp');
  for (const [offset, expectedX, expectedOpacity] of [
    [-120, -92, 1], [-92, -92, 1], [-46, -46, 0.5], [0, 0, 0], [12, 0, 0],
  ]) {
    app.setOffset(offset);
    assert.equal(translate.value, expectedX);
    assert.equal(opacity.value, expectedOpacity);
  }
});

test('all spring paths prevent overshoot, with and without reduced motion', () => {
  for (const reduced of [false, true]) {
    for (const open of [false, true]) {
      const app = row(open, reduced);
      app.pan.onPanResponderGrant();
      app.pan.onPanResponderRelease(null, { dx: -100 });
      app.pan.onPanResponderGrant();
      app.pan.onPanResponderRelease(null, { dx: 100 });
      app.pan.onPanResponderTerminate();
      assert.equal(app.value, 0);
      assert.equal(app.springs.length, reduced ? 3 : 4);
      for (const config of app.springs) {
        assert.equal(config.overshootClamping, true);
        assert.equal(config.useNativeDriver, true);
      }
    }
  }
});
