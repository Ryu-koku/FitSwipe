const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { seedState } = require('../src/logic.ts');
const { startWorkout, updateSet, currentCard, advanceWorkout } = require('../src/workout.ts');

// Run real screen callbacks with only hooks, platform and context stubbed.
function screen(initial) {
  let state = initial, cursor = 0;
  const slots = [];
  const filename = path.resolve(__dirname, '../src/app/workout.tsx');
  const mod = new Module(filename, module);
  mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = name => {
    if (name === 'react') return {
      useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = value; }]; },
      useRef: value => ({ current: value }), useEffect: () => {}, useCallback: f => f,
    };
    if (name === 'react-native') return { View: 'View', Text: 'Text', Pressable: 'Pressable' };
    if (name === 'expo-router') return { router: { replace: () => {} }, useFocusEffect: () => {} };
    if (name === 'expo-keep-awake') return {};
    if (name === '../context') return { useApp: () => ({ state, getState: () => state, update: f => { state = f(state); } }) };
    if (name === '../ui') return { useTheme: () => ({ colors: {}, styles: {} }), feedback: () => {}, Button: 'Button', Card: 'Card', IconButton: 'IconButton', Screen: 'Screen', Sheet: 'Sheet' };
    if (name === 'react-native-svg') return { __esModule: true, default: 'Svg', Circle: 'Circle' };
    if (name === '../use-reduced-motion') return { useReducedMotion: () => true };
    if (name === '../components/SwipeCard') return { SwipeCard: 'SwipeCard', SwipeActions: 'SwipeActions' };
    if (name.startsWith('../components/')) { const component = name.split('/').at(-1); return { [component]: component }; }
    return original(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  function render() {
    cursor = 0; const nodes = [];
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(visit);
      nodes.push(node); visit(node.props?.children);
    }
    visit(mod.exports.default()); return nodes;
  }
  return { render, getState: () => state, press: label => {
    if (label === 'セット完了' || label === 'スキップ') {
      const card = render().find(node => node.type === 'SwipeCard');
      assert.ok(card, 'swipe card exists');
      card.props[label === 'セット完了' ? 'onAdvance' : 'onSkip']();
      return;
    }
    const button = render().find(node => node.props?.label === label);
    assert.ok(button, `button ${label} exists`); assert.ok(!button.props.disabled); button.props.onPress();
  } };
}

test('skip then back shows entered numbers and set-complete records them', () => {
  let state = startWorkout(seedState());
  state.restTimerDisabledExerciseIds = state.exercises.map(e => e.id);
  const card = currentCard(state, state.workout.sessionId);
  state = updateSet(state, card.setId, { normalWeightKg: 62.5, normalReps: 8 });
  const app = screen(state);
  app.press('スキップ'); app.press('前のカードへ');
  const inputs = app.render().filter(node => typeof node.type === 'function' && node.type.name === 'TapNumber');
  assert.deepEqual(inputs.map(node => node.props.value), [62.5, 8]);
  app.press('セット完了');
  const saved = app.getState().sets.find(set => set.id === card.setId);
  assert.equal(saved.isCompleted, true); assert.equal(saved.normalWeightKg, 62.5); assert.equal(saved.normalReps, 8);
});

test('closing order editor exits browsing and shows reordered current exercise', () => {
  const state = advanceWorkout(startWorkout(seedState()));
  state.workout.restEndsAt = undefined;
  const app = screen(state);
  app.press('前のカードへ'); app.press('種目を編集');
  const editor = app.render().find(node => node.type === 'WorkoutOrderEditor');
  const active = app.getState();
  active.workout.exerciseOrder.reverse(); active.workout.card = undefined;
  editor.props.onClose();
  const expected = active.exercises.find(e => e.id === active.workout.exerciseOrder[0]).name;
  assert.ok(app.render().some(node => node.type === 'Text' && node.props.children === expected));
});


test('exercise segments follow workout order and keep skipped cards incomplete', () => {
  let state = startWorkout(seedState());
  state.restTimerDisabledExerciseIds = state.exercises.map(e => e.id);
  state.workout.exerciseOrder.reverse();
  state.workout.card = undefined;
  const app = screen(state);
  const segments = () => app.render().find(node => node.type === 'WorkoutProgressBar').props.segments;
  assert.deepEqual(segments().map(item => item.id), state.workout.exerciseOrder);
  assert.ok(segments().every(item => item.completed === 0 && item.total > 0));
  app.press('セット完了');
  assert.equal(segments()[0].completed, 1);
  app.press('スキップ');
  assert.equal(segments()[0].completed, 1);
});

test('returning from history to the current card permits recording it', () => {
  let state = startWorkout(seedState());
  state.restTimerDisabledExerciseIds = state.exercises.map(e => e.id);
  const app = screen(state);
  app.press('セット完了');
  const id = currentCard(app.getState(), app.getState().workout.sessionId).setId;
  app.press('前のカードへ');
  app.press('次のカードを見る');
  app.press('セット完了');
  assert.equal(app.getState().sets.find(item => item.id === id).isCompleted, true);
});
