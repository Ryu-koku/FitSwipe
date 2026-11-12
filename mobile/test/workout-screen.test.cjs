const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { seedState } = require('../src/logic.ts');
const { startWorkout, updateSet, currentCard, advanceWorkout } = require('../src/workout.ts');

// Run real screen callbacks with only hooks, platform and context stubbed.
function screen(initial, deferred = false) {
  let state = initial, cursor = 0;
  const slots = [];
  const routes = [];
  const queuedUpdates = [];
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
    if (name === 'expo-router') return { router: { replace: route => routes.push(route) }, useFocusEffect: () => {} };
    if (name === 'expo-keep-awake') return {};
    if (name === '../context') return { useApp: () => ({ state, getState: () => state, update: f => { if (deferred) queuedUpdates.push(f); else state = f(state); } }) };
    if (name === '../ui') return { useTheme: () => ({ colors: {}, styles: {} }), feedback: () => {}, Button: 'Button', Card: 'Card', Chip: 'Chip', IconButton: 'IconButton', Screen: 'Screen', Sheet: 'Sheet' };
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
  return { render, getState: () => state, routes, flush: () => { while (queuedUpdates.length) state = queuedUpdates.shift()(state); }, press: label => {
    if (label === 'セット完了' || label === 'スキップ') {
      const card = render().find(node => node.type === 'SwipeActions');
      assert.ok(card, 'swipe card exists');
      card.props[label === 'セット完了' ? 'onAdvance' : 'onSkip']();
      return;
    }
    if (label === '前のカードへ' || label === 'カードの種目を編集') {
      const actions = render().find(node => node.type === 'SwipeActions');
      assert.ok(actions);
      if (label === '前のカードへ') { assert.ok(actions.props.canGoBack); actions.props.onBack(); }
      else actions.props.onEdit();
      return;
    }
    const button = render().find(node => node.props?.label === label && typeof node.props.onPress === 'function');
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
  const inputs = app.render().filter(node => node.type === 'WorkoutNumberWheel');
  assert.deepEqual(inputs.map(node => node.props.value), [62.5, 8]);
  app.press('セット完了');
  const saved = app.getState().sets.find(set => set.id === card.setId);
  assert.equal(saved.isCompleted, true); assert.equal(saved.normalWeightKg, 62.5); assert.equal(saved.normalReps, 8);
});

test('wheel edits carry weight to upcoming sets and keep repetitions local without advancing', () => {
  const state = startWorkout(seedState());
  const current = currentCard(state, state.workout.sessionId);
  const app = screen(state);
  const inputs = app.render().filter(node => node.type === 'WorkoutNumberWheel');
  assert.equal(inputs[0].props.step, state.exerciseWeightSteps[state.sets[0].exerciseId] ?? state.weightStepKg);
  inputs[0].props.onChange(72.5); inputs[1].props.onChange(7);
  const rows = app.getState().sets.filter(row => row.exerciseId === state.sets[0].exerciseId);
  assert.equal(rows[0].normalWeightKg, 72.5); assert.equal(rows[0].normalReps, 7);
  assert.ok(rows.slice(1).every(row => row.normalWeightKg === 72.5 && row.normalReps === state.sets.find(old => old.id === row.id).normalReps));
  assert.equal(currentCard(app.getState(), state.workout.sessionId).setId, current.setId);
  assert.deepEqual(app.routes, []);
});

test('wheel edits on a bilateral exercise change only the displayed side', () => {
  const initial = seedState(); initial.exercises[0].mode = 'BILATERAL';
  const state = startWorkout(initial);
  const current = currentCard(state, state.workout.sessionId);
  const before = state.sets.find(row => row.id === current.setId);
  const other = current.side === 'left' ? 'right' : 'left';
  const app = screen(state);
  const inputs = app.render().filter(node => node.type === 'WorkoutNumberWheel');
  inputs[0].props.onChange(32.5); inputs[1].props.onChange(9);
  const row = app.getState().sets.find(item => item.id === current.setId);
  assert.equal(row[`${current.side}WeightKg`], 32.5); assert.equal(row[`${current.side}Reps`], 9);
  assert.equal(row[`${other}WeightKg`], before[`${other}WeightKg`]);
  assert.equal(row[`${other}Reps`], before[`${other}Reps`]);
  assert.equal(row.isCompleted, false);
});

test('completing immediately after a wheel edit preserves edits still awaiting disk', () => {
  const state = startWorkout(seedState());
  state.restTimerDisabledExerciseIds = state.exercises.map(e => e.id);
  const current = currentCard(state, state.workout.sessionId);
  const app = screen(state, true);
  const inputs = app.render().filter(node => node.type === 'WorkoutNumberWheel');
  inputs[0].props.onChange(72.5); inputs[1].props.onChange(7);
  app.press('セット完了'); app.flush();
  const row = app.getState().sets.find(item => item.id === current.setId);
  assert.equal(row.isCompleted, true); assert.equal(row.normalWeightKg, 72.5); assert.equal(row.normalReps, 7);
});

test('closing order editor exits browsing and shows reordered current exercise', () => {
  const state = advanceWorkout(startWorkout(seedState()));
  state.workout.restEndsAt = undefined;
  const app = screen(state);
  app.press('前のカードへ'); app.press('カードの種目を編集');
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
  app.press('セット完了');
  app.press('セット完了');
  assert.equal(app.getState().sets.find(item => item.id === id).isCompleted, true);
});

test('card edit opens the exercise list and artwork opens history with an empty state', () => {
  const app = screen(startWorkout(seedState()));
  app.press('カードの種目を編集');
  const nodes = app.render();
  const editor = nodes.find(node => node.type === 'WorkoutOrderEditor');
  assert.ok(editor);
  assert.equal(editor.props.initialExerciseId, undefined);
  editor.props.onClose();
  app.render().find(node => node.props?.accessibilityLabel?.endsWith('の過去の記録を見る')).props.onPress();
  assert.ok(app.render().some(node => node.type === 'Sheet' && node.props.title.endsWith('の記録')));
  assert.ok(app.render().some(node => node.props?.children === '直近90日にグラフに表示できる完了記録はありません。'));
});

test('history graphs include high-rep sets and switch between weight and repetitions', () => {
  const state = startWorkout(seedState());
  const current = currentCard(state, state.workout.sessionId);
  const row = state.sets.find(item => item.id === current.setId);
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  state.sessions.push({ id: -1, status: 'COMPLETED', startedAt: yesterday.toISOString() });
  state.sets.push({ ...row, id: -2, sessionId: -1, isCompleted: true, normalWeightKg: 62.5, normalReps: 15 });
  const app = screen(state);
  app.render().find(node => node.props?.accessibilityLabel?.endsWith('の過去の記録を見る')).props.onPress();
  const graph = () => app.render().find(node => node.type === 'ProgressChart');
  assert.equal(graph().props.unit, 'kg');
  assert.deepEqual(graph().props.points.map(point => point.value), [62.5]);
  app.press('回数');
  assert.equal(graph().props.unit, '回');
  assert.deepEqual(graph().props.points.map(point => point.value), [15]);
});

test('bodyweight history automatically uses repetitions and keeps left and right separate', () => {
  const state = seedState();
  const exercise = state.exercises[0];
  exercise.mode = 'BILATERAL';
  const active = startWorkout(state);
  const current = currentCard(active, active.workout.sessionId);
  const row = active.sets.find(item => item.id === current.setId);
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  active.sessions.push({ id: -1, status: 'COMPLETED', startedAt: yesterday.toISOString() });
  active.sets.push({ ...row, id: -2, sessionId: -1, isCompleted: true, leftCompleted: true, rightCompleted: true,
    leftWeightKg: 0, rightWeightKg: 0, leftReps: 12, rightReps: 16 });
  const app = screen(active);
  app.render().find(node => node.props?.accessibilityLabel?.endsWith('の過去の記録を見る')).props.onPress();
  const graph = app.render().find(node => node.type === 'ProgressChart');
  assert.equal(graph.props.unit, '回');
  assert.deepEqual(graph.props.points.map(point => point.value), [current.side === 'left' ? 12 : 16]);
});

test('active workout header keeps its title centered without an exit button', () => {
  const app = screen(startWorkout(seedState()));
  const nodes = app.render();
  assert.ok(!nodes.some(node => node.props?.label === 'トレーニングを終了'));
  const header = nodes.find(node => node.type === 'View' &&
    Array.isArray(node.props.children) && node.props.children[0]?.props?.label === '戻る');
  assert.ok(header);
  const [back, title, spacer] = header.props.children;
  assert.equal(back.type, 'IconButton');
  assert.equal(back.props.symbol, '⌄');
  back.props.onPress();
  assert.deepEqual(app.routes, ['/prepare']);
  assert.equal(title.props.style[1].textAlign, 'center');
  assert.equal(title.props.style[1].flex, 1);
  assert.equal(spacer.type, 'View');
  assert.equal(spacer.props.style.width, 48);
});

test('ending an empty workout also saves immediately', () => {
  const state = startWorkout(seedState());
  state.sets = [];
  const app = screen(state);
  app.press('トレーニングを終了');
  assert.equal(app.getState().sessions[0].status, 'COMPLETED');
  assert.deepEqual(app.routes, [{ pathname: '/complete', params: { sessionId: state.workout.sessionId } }]);
});

test('comparison stays out of the recording card and opens its source session only from history', () => {
  const state = startWorkout(seedState());
  const row = state.sets.find(item => item.id === currentCard(state, state.workout.sessionId).setId);
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  state.sessions.push({ id: -1, status: 'COMPLETED', startedAt: yesterday.toISOString() });
  state.sets.push({ ...row, id: -2, sessionId: -1, isCompleted: true, normalWeightKg: 50, normalReps: 8 });
  const app = screen(state);
  assert.ok(!app.render().some(node => node.type === 'RecordComparison'));
  app.render().find(node => node.props?.accessibilityLabel?.endsWith('の過去の記録を見る')).props.onPress();
  const comparison = app.render().find(node => node.type === 'RecordComparison');
  assert.equal(comparison.props.records.length, 1);
  assert.equal(comparison.props.records[0].sessionId, -1);
  comparison.props.onOpenRecord(comparison.props.records[0]);
  assert.deepEqual(app.render().find(node => node.type === 'SessionDetails').props.sessionIds, [-1]);
  app.press('比較に戻る');
  assert.ok(app.render().some(node => node.type === 'RecordComparison'));
  app.render().find(node => node.type === 'Sheet').props.onClose();
  assert.ok(!app.render().some(node => node.type === 'RecordComparison'));
});


test('wheels highlight previous values for the displayed side, including zero', () => {
  for (const mode of ['NORMAL', 'BILATERAL']) {
    const initial = seedState();
    if (mode === 'BILATERAL') initial.exercises[0].mode = mode;
    const state = startWorkout(initial);
    const card = currentCard(state, state.workout.sessionId);
    const row = state.sets.find(item => item.id === card.setId);
    const wheels = app => app.render().filter(node => node.type === 'WorkoutNumberWheel');
    assert.deepEqual(wheels(screen(state)).map(node => node.props.highlightValue), [undefined, undefined]);
    state.sessions.push({ id: -1, status: 'COMPLETED', startedAt: '2020-01-01T00:00:00Z' });
    state.sets.push({ ...row, id: -2, sessionId: -1, isCompleted: true, leftCompleted: true, rightCompleted: true,
      normalWeightKg: 0, normalReps: 8, leftWeightKg: 32.5, leftReps: 9, rightWeightKg: 35, rightReps: 10 });
    const previous = state.sets.at(-1);
    const side = card.side ?? 'normal';
    assert.deepEqual(wheels(screen(state)).map(node => node.props.highlightValue),
      [previous[side + 'WeightKg'], previous[side + 'Reps']]);
  }
});
