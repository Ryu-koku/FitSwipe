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
      useLayoutEffect: () => {}, Profiler: 'Profiler', // PERF-TEMP
      useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = value; }]; },
      useMemo: factory => factory(), useRef: value => ({ current: value }), useEffect: () => {}, useCallback: f => f,
    };
    if (name === 'react-native') return { useWindowDimensions: () => ({ fontScale: 1 }), View: 'View', Text: 'Text', Switch: 'Switch', Pressable: 'Pressable', Animated: { Value: class {} } };
    if (name === 'expo-router') return { router: { replace: route => routes.push(route) }, useFocusEffect: () => {} };
    if (name === 'expo-keep-awake') return {};
    if (name === '../context') return { useApp: () => ({ state, getState: () => state, update: f => { if (deferred) queuedUpdates.push(f); else state = f(state); } }) };
    if (name === '../ui') return { useTheme: () => ({ colors: { primary: 'primary', soft: 'soft', line: 'line' }, styles: {} }), feedback: () => {}, Button: 'Button', Card: 'Card', Chip: 'Chip', IconButton: 'IconButton', Screen: 'Screen', Sheet: 'Sheet' };
    if (name === 'react-native-svg') return { __esModule: true, default: 'Svg', Circle: 'Circle' };
    if (name === '../use-reduced-motion') return { useReducedMotion: () => true };
    if (name === '../components/SwipeCard') return { SwipeCard: 'SwipeCard', SwipeActions: 'SwipeActions' };
    if (name.endsWith('/WeightWheel')) return { WeightWheel: 'WorkoutNumberWheel' };
    if (name === '../components/WorkoutProgressBar') {
      const componentFilename = path.resolve(__dirname, '../src/components/WorkoutProgressBar.tsx');
      const component = new Module(componentFilename, mod);
      component.require = mod.require;
      component._compile(ts.transpileModule(fs.readFileSync(componentFilename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, componentFilename);
      return component.exports;
    }
    if (name.startsWith('../components/')) { const component = name.split('/').at(-1); return { [component]: component }; }
    return original(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  function render(includeBehind = false) {
    cursor = 0; const nodes = [];
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(visit);
      if (node.props?.behind && !includeBehind) return;
      if (typeof node.type === 'function' && node.type.name === 'PerfWorkoutScreen') { visit(node.type(node.props)); return; } // PERF-TEMP
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
  state.restDurationSeconds = 0;
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
  state.restDurationSeconds = 0;
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
  state.restDurationSeconds = 0;
  state.workout.exerciseOrder.reverse();
  state.workout.card = undefined;
  const app = screen(state);
  const segments = () => app.render().find(node => node.type?.name === 'WorkoutProgressBar').props.segments;
  assert.deepEqual(segments().map(item => item.id), state.workout.exerciseOrder);
  assert.ok(segments().every(item => item.completed === 0 && item.total > 0));
  app.press('セット完了');
  assert.equal(segments()[0].completed, 1);
  app.press('スキップ');
  assert.equal(segments()[0].completed, 1);
});

test('exercise progress follows the displayed card and stays unchanged when sets complete', () => {
  const initial = seedState();
  initial.restDurationSeconds = 0;
  initial.presets[0].exercises.forEach(config => { config.sets = 3; });
  const state = startWorkout(initial);
  const app = screen(state);
  const bars = () => {
    const node = app.render().find(node => node.type?.name === 'WorkoutProgressBar');
    return node.type(node.props).props.children;
  };
  const first = currentCard(state, state.workout.sessionId);
  const snapshot = () => bars().map(bar => ({
    value: bar.props.accessibilityValue.now,
    selected: bar.props.accessibilityState?.selected === true,
    style: bar.props.style,
  }));
  const before = snapshot();
  assert.ok(before.every(bar => bar.value === 0));
  assert.deepEqual(before.map(bar => bar.selected), before.map((_, i) => i === 0));
  assert.equal(before[0].style.backgroundColor, 'soft');
  assert.equal(before[0].style.borderColor, 'primary');
  assert.ok(before[0].style.borderWidth > 0);
  assert.ok(before[0].style.height > before[1].style.height);
  assert.ok(before.slice(1).every(bar => bar.style.backgroundColor === 'line'));
  app.press('セット完了');
  assert.notEqual(currentCard(app.getState(), state.workout.sessionId).setId, first.setId);
  assert.deepEqual(snapshot(), before);
  app.press('セット完了');
  app.press('セット完了');
  assert.deepEqual(snapshot(), before);
  app.render().find(node => node.type === 'SwipeCard').props.onAdvance();
  const next = snapshot();
  assert.equal(next[0].value, 1);
  assert.equal(next[0].style.backgroundColor, 'primary');
  assert.deepEqual(next.map(bar => bar.selected), next.map((_, i) => i === 1));
  assert.equal(next[1].style.backgroundColor, 'soft');
  assert.ok(next.slice(1).every(bar => bar.value === 0));
  assert.ok(next.slice(2).every(bar => bar.style.backgroundColor === 'line'));
  const node = app.render().find(node => node.type?.name === 'WorkoutProgressBar');
  assert.equal(node.props.currentId, state.workout.exerciseOrder[1]);
});

test('returning from history to the current card permits recording it', () => {
  let state = startWorkout(seedState());
  state.restDurationSeconds = 0;
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
  app.render().find(node => node.props?.accessibilityLabel === '過去の記録を見る').props.onPress();
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
  app.render().find(node => node.props?.accessibilityLabel === '過去の記録を見る').props.onPress();
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
  app.render().find(node => node.props?.accessibilityLabel === '過去の記録を見る').props.onPress();
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
  assert.equal(back.props.icon.type, 'AppIcon');
  assert.equal(back.props.icon.props.name, 'chevronDown');
  assert.equal(back.props.icon.props.size, 28);
  back.props.onPress();
  assert.deepEqual(app.routes, ['/']);
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
  app.render().find(node => node.props?.accessibilityLabel === '過去の記録を見る').props.onPress();
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


test('header taps go back, complete and open history without wrapping wheels', () => {
  const state = startWorkout(seedState()); state.restDurationSeconds = 0;
  const app = screen(state);
  const tap = label => app.render().find(n => n.props?.accessibilityLabel === label).props.onPress();
  const first = currentCard(state, state.workout.sessionId);
  tap('セット完了して次へ');
  assert.equal(app.getState().sets.find(s => s.id === first.setId).isCompleted, true);
  tap('前のセット');
  tap('過去の記録を見る');
  assert.ok(app.render().some(n => n.type === 'Sheet'));
});

test('swiping while browsing skips displayed exercise and preserves queued wheel edits', () => {
  const state = startWorkout(seedState()); state.restDurationSeconds = 0;
  const app = screen(state, true);
  app.render().find(n => n.type === 'WorkoutNumberWheel').props.onChange(77.5);
  app.render().find(n => n.type === 'SwipeCard').props.onAdvance(); app.flush();
  const updated = app.getState();
  const firstExercise = state.workout.exerciseOrder[0];
  assert.ok(updated.sets.filter(s => s.exerciseId === firstExercise).every(s => s.skippedInputs.normal.weightKg === 77.5));
  assert.equal(updated.sets.find(s => s.id === currentCard(updated, updated.workout.sessionId).setId).exerciseId, state.workout.exerciseOrder[1]);
});


test('mounted next-exercise card retains its key and becomes interactive after browsing swipe', () => {
  const state = startWorkout(seedState()); state.restDurationSeconds = 0;
  const app = screen(state);
  app.press('セット完了'); app.press('前のカードへ');
  const deck = app.render(true).filter(n => n.type === 'SwipeCard');
  const behind = deck.find(n => n.props.behind);
  assert.ok(behind.props.disabled);
  deck.find(n => !n.props.behind).props.onAdvance();
  const promoted = app.render().find(n => n.type === 'SwipeCard');
  assert.equal(promoted.key, behind.key);
  assert.equal(promoted.props.disabled, false);
  assert.equal(app.getState().sets[0].isCompleted, true);
  assert.ok(app.getState().sets[1].skippedInputs.normal);
  const promotedSetId = currentCard(app.getState(), state.workout.sessionId).setId;
  app.press('セット完了');
  assert.ok(app.getState().sets.find(s => s.id === promotedSetId).isCompleted);
});

test('artwork keeps playing and wheels do not send activity to the screen', () => {
  const app = screen(startWorkout(seedState()));
  const artwork = app.render(true).filter(n => n.type === 'WorkoutPictogram');
  assert.ok(artwork.length > 0);
  assert.ok(artwork.every(n => typeof n.props.name === 'string'));
  assert.ok(app.render().filter(n => n.type === 'WorkoutNumberWheel').every(n => !n.props.onActive));
});

test('card edge underlay spans full height and precedes foreground controls', () => {
  const app = screen(startWorkout(seedState()));
  const nodes = app.render();
  const edges = nodes.find(n => n.props?.testID === 'workout-card-edges');
  assert.equal(edges.props.pointerEvents, 'box-none');
  for (const edge of edges.props.children) {
    assert.equal(edge.props.style.top, 0);
    assert.equal(edge.props.style.bottom, 0);
  }
  const previous = edges.props.children.find(n => n.props.accessibilityLabel === '前のセット');
  const next = edges.props.children.find(n => n.props.accessibilityLabel === 'セット完了して次へ');
  assert.equal(previous.props.style.width, '20%');
  assert.equal(next.props.style.width, '20%');
  const history = nodes.find(n => n.props?.accessibilityLabel === '過去の記録を見る');
  assert.equal(history.props.style.left, '20%');
  assert.equal(history.props.style.width, '60%');
  assert.ok(nodes.indexOf(edges) < nodes.findIndex(n => n.type === 'WorkoutNumberWheel'));
  assert.ok(nodes.indexOf(edges) < nodes.findIndex(n => n.type === 'SwipeActions'));
});

const restToggle = app => app.render().find(node => node.type === 'Switch' && node.props.accessibilityLabel === '休憩タイマー');

test('header rest toggle suppresses subsequent rest and re-enables configured duration', () => {
  const state = startWorkout(seedState());
  const exerciseId = state.sets.find(row => row.id === currentCard(state, state.workout.sessionId).setId).exerciseId;
  state.exerciseRestDurations[exerciseId] = 42;
  const app = screen(state, true);
  assert.equal(restToggle(app).props.value, true);
  restToggle(app).props.onValueChange(false);
  restToggle(app).props.onValueChange(false);
  app.press('セット完了'); app.flush();
  assert.equal(app.getState().restTimerDisabled, true);
  assert.equal(restToggle(app).props.value, false);
  assert.ok(!app.render().some(node => node.type === 'RestCard'));
  restToggle(app).props.onValueChange(true); app.flush();
  assert.equal(app.getState().restTimerDisabled, false);
  app.press('セット完了'); app.flush();
  assert.ok(app.render().some(node => node.type === 'RestCard'));
  const progress = app.getState().workout;
  assert.equal(progress.restEndsAt - progress.restStartedAt, 42000);
});

test('turning rest off during a rest ends it without advancing the set', () => {
  const state = advanceWorkout(startWorkout(seedState()));
  const app = screen(state);
  assert.ok(app.render().some(node => node.type === 'RestCard'));
  const before = currentCard(state, state.workout.sessionId);
  restToggle(app).props.onValueChange(false);
  assert.equal(app.getState().workout.restStartedAt, undefined);
  assert.equal(app.getState().workout.restEndsAt, undefined);
  assert.ok(!app.render().some(node => node.type === 'RestCard'));
  assert.deepEqual(currentCard(app.getState(), state.workout.sessionId), before);
});

test('rest toggle stays global across swiped exercises and back cannot change exercises', () => {
  const state = startWorkout(seedState());
  const firstId = state.workout.exerciseOrder[0];
  state.restTimerDisabled = true;
  const app = screen(state);
  assert.equal(restToggle(app).props.value, false);
  app.render().find(node => node.type === 'SwipeCard').props.onAdvance();
  const secondId = app.getState().sets.find(row => row.id === currentCard(app.getState(), state.workout.sessionId).setId).exerciseId;
  assert.notEqual(secondId, firstId);
  assert.equal(restToggle(app).props.value, false);
  restToggle(app).props.onValueChange(false);
  assert.equal(app.render().find(node => node.type === 'SwipeActions').props.canGoBack, false);
  assert.equal(restToggle(app).props.value, false);
  restToggle(app).props.onValueChange(true);
  assert.equal(app.getState().restTimerDisabled, false);
});


test('wheel and action containers guard swipes using refs, leaving edge taps independent', () => {
  const app = screen(startWorkout(seedState()));
  const nodes = app.render();
  const swipe = nodes.find(n => n.type === 'SwipeCard').props;
  const controls = nodes.filter(n => n.type === 'View' && n.props.onTouchStart);
  assert.equal(controls.length, 2);
  for (const control of controls) {
    assert.equal(control.props.pointerEvents, 'box-none');
    assert.equal(swipe.isGestureBlocked(), false);
    control.props.onTouchStart(); assert.equal(swipe.isGestureBlocked(), true);
    control.props.onTouchEnd(); assert.equal(swipe.isGestureBlocked(), false);
    control.props.onTouchStart(); control.props.onTouchCancel(); assert.equal(swipe.isGestureBlocked(), false);
  }
});

test('edge taps and complete buttons hold the last set; only swiping changes exercise or finishes', () => {
  for (const edge of [false, true]) {
    const initial = seedState();
    initial.restDurationSeconds = 0;
    initial.presets[0].exercises.forEach(config => { config.sets = 1; });
    const app = screen(startWorkout(initial));
    const order = [...app.getState().workout.exerciseOrder];
    for (const exerciseId of order) {
      const complete = () => edge
        ? app.render().find(node => node.props?.accessibilityLabel === 'セット完了して次へ').props.onPress()
        : app.press('セット完了');
      complete(); complete();
      const state = app.getState();
      assert.equal(state.sets.find(row => row.id === currentCard(state, state.workout.sessionId).setId).exerciseId, exerciseId);
      assert.deepEqual(app.routes, []);
      app.render().find(node => node.type === 'SwipeCard').props.onAdvance();
    }
    assert.equal(app.getState().workout, undefined);
    assert.equal(app.routes.length, 1);
    assert.equal(app.routes[0].pathname, '/complete');
  }
});

test('current set stays darkest even when completed, completed sets are soft and pending sets use line', () => {
  const state = startWorkout(seedState());
  state.sets[0].isCompleted = true;
  state.sets[1].isCompleted = true;
  state.workout.card = { setId: state.sets[1].id };
  const app = screen(state);
  const bar = app.render().find(node => node.type?.name === 'SetProgressBar');
  const view = bar.type(bar.props);
  const segments = view.props.children[1].props.children;
  assert.deepEqual(segments.map(node => node.props.style.backgroundColor), ['soft', 'primary', 'line']);
});


test('set navigation retains the exercise card and artwork and input wheels', () => {
  const state = startWorkout(seedState()); state.restDurationSeconds = 0;
  const app = screen(state);
  const before = app.render();
  const card = before.find(n => n.type === 'SwipeCard');
  const artwork = before.find(n => n.type === 'WorkoutPictogram');
  const wheels = before.filter(n => n.type === 'WorkoutNumberWheel');
  app.press('セット完了');
  const after = app.render();
  assert.equal(after.find(n => n.type === 'SwipeCard').key, card.key);
  assert.deepEqual(after.find(n => n.type === 'WorkoutPictogram').props, artwork.props);
  assert.ok(after.filter(n => n.type === 'WorkoutNumberWheel').every((n, i) => n.key === wheels[i].key && n.props.resetToken !== wheels[i].props.resetToken));
  app.press('前のカードへ');
  assert.equal(app.render().find(n => n.type === 'SwipeCard').key, card.key);
});


test('retained wheels update the new set and queued writes retain their target set ID', () => {
  const state = startWorkout(seedState()); state.restDurationSeconds = 0;
  const app = screen(state, true);
  const before = app.render().filter(n => n.type === 'WorkoutNumberWheel');
  before[1].props.onChange(7);
  app.press('セット完了'); app.flush();
  const after = app.render().filter(n => n.type === 'WorkoutNumberWheel');
  after[1].props.onChange(11); app.flush();
  assert.equal(before[1].key, after[1].key);
  assert.notEqual(before[1].props.resetToken, after[1].props.resetToken);
  assert.equal(app.getState().sets.find(s => s.id === before[1].props.resetToken).normalReps, 7);
  assert.equal(app.getState().sets.find(s => s.id === after[1].props.resetToken).normalReps, 11);
  app.press('前のカードへ');
  assert.equal(app.render().filter(n => n.type === 'WorkoutNumberWheel')[1].props.value, 7);
});

test('behind card uses static values and promotes to exactly two interactive wheels', () => {
  const app = screen(startWorkout(seedState()));
  const nodes = app.render(true);
  assert.equal(nodes.filter(n => n.type === 'WorkoutNumberWheel').length, 2);
  assert.equal(nodes.filter(n => n.props?.testID === 'workout-next-values').length, 1);
  const behind = nodes.find(n => n.type === 'SwipeCard' && n.props.behind);
  nodes.find(n => n.type === 'SwipeCard' && !n.props.behind).props.onAdvance();
  assert.equal(app.render().find(n => n.type === 'SwipeCard').key, behind.key);
  assert.equal(app.render().filter(n => n.type === 'WorkoutNumberWheel').length, 2);
  assert.ok(!app.render().some(n => n.props?.testID === 'workout-next-values'));
});

for (const active of [false, true]) {
  test(`empty workout navigation returns home and offers the correct destination (active=${active})`, () => {
    const state = active ? startWorkout(seedState()) : seedState();
    state.sets = [];
    const app = screen(state);
    app.render().find(node => node.type === 'Screen').props.onBack();
    app.press(active ? 'ホームへ' : '準備画面へ');
    assert.deepEqual(app.routes, ['/', active ? '/' : '/prepare']);
  });
}
