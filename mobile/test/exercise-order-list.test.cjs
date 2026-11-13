const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const source = ts.createSourceFile('ExerciseOrderList.tsx',
  fs.readFileSync(require.resolve('../src/components/ExerciseOrderList.tsx'), 'utf8'),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const deltaFunction = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'autoScrollDelta');
const compiled = ts.transpileModule(deltaFunction.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const autoScrollDelta = new Function('EDGE', 'EDGE_START_DISTANCE', 'MAX_SCROLL_STEP', `${compiled}; return autoScrollDelta;`)(56, 12, 7);
const geometry = new Function('ROW', 'SET_ROW', source.statements
  .filter(node => ts.isFunctionDeclaration(node) && ['rowHeight', 'rowPositions', 'dragTarget'].includes(node.name?.text))
  .map(node => ts.transpileModule(node.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText).join('\n')
  + '; return { rowHeight, rowPositions, dragTarget };')(72, 44);

test('drag starting inside the top edge does not scroll until moved upward 12px', () => {
  assert.equal(autoScrollDelta(120, 120, 100, 400), 0);
  assert.equal(autoScrollDelta(109, 120, 100, 400), 0);
  assert.ok(autoScrollDelta(108, 120, 100, 400) < 0);
  assert.equal(autoScrollDelta(130, 120, 100, 400), 0);
});

test('drag starting inside the bottom edge needs the same downward movement', () => {
  assert.equal(autoScrollDelta(480, 480, 100, 400), 0);
  assert.equal(autoScrollDelta(491, 480, 100, 400), 0);
  assert.ok(autoScrollDelta(492, 480, 100, 400) > 0);
  assert.equal(autoScrollDelta(470, 480, 100, 400), 0);
});

test('scroll speed grows with edge penetration and stays within 7px per frame', () => {
  const shallow = autoScrollDelta(150, 200, 100, 400);
  const deep = autoScrollDelta(120, 200, 100, 400);
  assert.ok(shallow < 0 && deep < shallow);
  assert.equal(autoScrollDelta(90, 200, 100, 400), -7);
  assert.equal(autoScrollDelta(510, 400, 100, 400), 7);
  assert.equal(autoScrollDelta(120, 200, 100, 0), 0);
});

function renderRow(sets, min, max, setRows) {
  const filename = path.resolve(__dirname, '../src/components/ExerciseOrderList.tsx');
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const changes = [], edits = [];
  let feedbacks = 0;
  const original = mod.require.bind(mod);
  mod.require = name => {
    if (name === 'react') return { __esModule: true, default: { Fragment: 'Fragment' },
      useState: value => [typeof value === 'function' ? value() : value, () => {}],
      useRef: value => ({ current: value }), useEffect: () => {}, useLayoutEffect: () => {} };
    if (name === 'react-native') return { Animated: { Value: class { setValue() {} } },
      ScrollView: 'ScrollView', View: 'View', Text: 'Text', Pressable: 'Pressable', PanResponder: {} };
    if (name === '../ui') return { Card: 'Card', feedback: () => { feedbacks++; },
      useTheme: () => ({ colors: { primary: 'primary', muted: 'muted', line: 'line', soft: 'soft', ink: 'ink' }, styles: { row: {}, body: {}, small: {} } }) };
    if (name === '../reorder') return { moveItem: items => items };
    if (name === '../use-reduced-motion') return { useReducedMotion: () => true };
    if (name === './SwipeDeleteRow') return { SwipeDeleteRow: 'SwipeDeleteRow' };
    if (name === './ExercisePictogram') return { ExercisePictogram: 'ExercisePictogram' };
    return original(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  const tree = mod.exports.ExerciseOrderList({ items: [{ id: 1, name: 'ベンチプレス', detail: `${sets}セット`,
    stepper: { sets, min, max, onChange: value => changes.push(value) }, setRows }], onMove: () => {}, onEdit: id => edits.push(id) });
  const find = (node, predicate) => {
    if (!node || typeof node !== 'object') return undefined;
    if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
    if (predicate(node)) return node;
    return find(node.props?.children, predicate);
  };
  const row = find(tree, node => node.type?.name === 'OrderRow');
  const rowContents = row.props.children.props.children(() => false).props.children;
  const card = rowContents[0];
  const edit = find(card, node => node.type === 'Pressable' && node.props.accessibilityLabel?.includes('タップで編集'));
  const stepper = find(card, node => node.type?.name === 'SetsStepper');
  const controls = stepper.type(stepper.props);
  const buttons = [];
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(visit);
    if (node.type === 'Pressable') buttons.push(node);
    visit(node.props?.children);
  };
  visit(controls);
  return { card, edit, buttons, setButtons: rowContents[1], row, tree, changes, edits, get feedbacks() { return feedbacks; } };
}

test('set controls show value, labels and 44pt targets without nesting in edit button', () => {
  const row = renderRow(3, 1, 30);
  assert.equal(row.buttons.length, 2);
  assert.deepEqual(row.buttons.map(button => button.props.accessibilityLabel),
    ['ベンチプレスのセットを1減らす', 'ベンチプレスのセットを1増やす']);
  assert.ok(row.buttons.every(button => button.props.style.width === 44 && button.props.style.height === 44));
  assert.equal(row.card.props.children.props.children[0], row.edit);
  assert.equal(row.card.props.children.props.children[1].type.name, 'SetsStepper');
  assert.equal(row.card.props.children.props.children[2].type.name, 'DragGrip');
  assert.equal(row.card.props.children.props.children[1].props.sets, 3);
  assert.equal(row.edit.props.children.props.children[1].props.children[0].props.children, 'ベンチプレス');
  row.buttons[0].props.onPress();
  row.buttons[1].props.onPress();
  assert.deepEqual(row.changes, [2, 4]);
  assert.deepEqual(row.edits, []);
  assert.equal(row.feedbacks, 2);
});

test('set controls disable decrement and increment at their limits', () => {
  const low = renderRow(2, 2, 30);
  assert.equal(low.buttons[0].props.disabled, true);
  assert.deepEqual(low.buttons[0].props.accessibilityState, { disabled: true });
  assert.equal(low.buttons[1].props.disabled, false);
  const high = renderRow(30, 1, 30);
  assert.equal(high.buttons[1].props.disabled, true);
  assert.deepEqual(high.buttons[1].props.accessibilityState, { disabled: true });
  assert.equal(high.buttons[0].props.disabled, false);
});

test('set rows are accessible 44pt buttons and preserve the exercise edit target', () => {
  const jumps = [];
  const setRows = [1, 2, 3].map(number => ({ key: number, label: `${number}セット目 / 60kg×8 / ›`,
    accessibilityLabel: `ベンチプレス ${number}セット目 60kg 8回。タップで移動`,
    completed: number === 1, current: number === 2, onPress: () => jumps.push(number) }));
  const result = renderRow(3, 1, 30, setRows);
  assert.equal(result.setButtons.length, 3);
  assert.ok(result.setButtons.every(button => button.type === 'Pressable' && button.props.accessibilityRole === 'button' && button.props.style.minHeight >= 44));
  assert.equal(result.setButtons[1].props.style.backgroundColor, 'soft');
  assert.equal(result.setButtons[0].props.children.props.style[1].opacity, 0.5);
  result.setButtons[1].props.onPress();
  assert.deepEqual(jumps, [2]);
  result.edit.props.onPress();
  assert.deepEqual(result.edits, [1]);
  assert.equal(result.tree.props.children.props.children[1].props.style.height, 72 + 3 * 44);
});

test('variable-height drag slots and preview positions follow each row height', () => {
  const items = [
    { id: 1, setRows: [{}, {}, {}] },
    { id: 2, setRows: [{}] },
    { id: 3 },
  ];
  const layout = geometry.rowPositions(items);
  assert.deepEqual([...layout.positions.values()], [0, 204, 320]);
  assert.equal(layout.height, 392);
  assert.equal(geometry.dragTarget(items, 0, 57), 0);
  assert.equal(geometry.dragTarget(items, 0, 58), 1);
  assert.equal(geometry.dragTarget(items, 0, 153), 2);
  const moved = geometry.rowPositions([items[1], items[2], items[0]]);
  assert.deepEqual([...moved.positions.values()], [0, 116, 188]);
  assert.equal(moved.positions.get(1), 188);
  assert.deepEqual([...geometry.rowPositions([{ id: 1 }, { id: 2 }, { id: 3 }]).positions.values()], [0, 72, 144]);
});
