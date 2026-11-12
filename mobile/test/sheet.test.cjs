const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

// Run the actual shared Sheet with native hosts and animation scheduling mocked.
function mount(platform = 'ios') {
  const source = ts.createSourceFile('ui.tsx', fs.readFileSync(require.resolve('../src/ui.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const sheet = source.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'Sheet');
  let closed = 0;
  const animations = [];
  class Value { setValue() {} stopAnimation() {} }
  const animation = () => ({ start: cb => animations.push(cb), stop() {} });
  const globals = {
    exports: {}, require, feedback: () => {},
    useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
    useCallback: fn => fn, useMemo: fn => fn(), useEffect() {},
    useTheme: () => ({ styles: {}, colors: {} }), useRefreshExerciseVisibility: () => () => {},
    useSafeAreaInsets: () => ({ top: 24, bottom: 20 }), useWindowDimensions: () => ({ height: 800 }),
    Animated: { Value, View: 'AnimatedView', add: () => 0, parallel: animation, timing: animation, spring: animation },
    PanResponder: { create: config => ({ panHandlers: config }) },
    Platform: { OS: platform }, StyleSheet: { absoluteFill: {} },
    Modal: 'Modal', KeyboardAvoidingView: 'KeyboardAvoidingView', Pressable: 'Pressable',
    View: 'View', Text: 'Text', IconButton: 'IconButton', ScrollView: 'ScrollView',
    SheetDismissContext: { Provider: 'Provider' },
  };
  const compiled = ts.transpileModule(sheet.getText(source), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const Sheet = new Function(...Object.keys(globals), `${compiled}; return exports.Sheet;`)(...Object.values(globals));
  const nodes = [];
  function visit(node, ancestors = []) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(child => visit(child, ancestors));
    nodes.push({ node, ancestors });
    visit(node.props?.children, [...ancestors, node]);
  }
  visit(Sheet({ title: 'プリセットを編集', bottomSheet: true, scroll: false,
    right: { type: 'Menu', props: {} }, onClose: () => closed++, children: { type: 'ExerciseOrderList', props: {} } }));
  return { nodes, closed: () => closed, finish: () => animations.forEach(cb => cb?.({ finished: true })) };
}

for (const action of ['swipe', 'close', 'backdrop', 'back']) {
  test(`bottom sheet ${action} invokes onClose after dismissal`, () => {
    const app = mount(), nodes = app.nodes.map(entry => entry.node);
    if (action === 'swipe') nodes.find(n => n.props.onPanResponderRelease).props.onPanResponderRelease({}, { dy: 120, vy: 0 });
    if (action === 'close') nodes.find(n => n.type === 'IconButton').props.onPress();
    if (action === 'backdrop') nodes.find(n => n.type === 'Pressable').props.onPress();
    if (action === 'back') nodes.find(n => n.type === 'Modal').props.onRequestClose();
    assert.equal(app.closed(), 0);
    app.finish();
    assert.equal(app.closed(), 1);
  });
}

test('only handle and title own sheet gestures; menu and list remain independent', () => {
  const { nodes } = mount();
  assert.equal(nodes.filter(({ node }) => node.props.onPanResponderRelease).length, 2);
  for (const type of ['Menu', 'IconButton', 'ExerciseOrderList']) {
    const entry = nodes.find(({ node }) => node.type === type);
    assert.ok(entry, type);
    assert.ok(!entry.node.props.onPanResponderRelease);
    assert.ok(entry.ancestors.every(node => !node.props.onPanResponderRelease));
  }
});

for (const platform of ['ios', 'android']) {
  test(`${platform} bottom sheet list can shrink inside keyboard avoidance`, () => {
    const list = mount(platform).nodes.find(({ node }) => node.type === 'ExerciseOrderList');
    const avoiding = list.ancestors.find(node => node.type === 'KeyboardAvoidingView');
    assert.ok(avoiding);
    assert.equal(avoiding.props.behavior, platform === 'ios' ? 'padding' : 'height');
    assert.equal(list.ancestors.find(node => node.type === 'AnimatedView').props.style.flexShrink, 1);
    assert.ok(list.ancestors.some(node => node.props.style?.minHeight === 0 && node.props.style.flex === 1));
  });
}
