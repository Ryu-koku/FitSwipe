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
  const routes = [], tourEvents = [];
  const queuedUpdates = [];
  const filename = path.resolve(__dirname, '../src/app/workout.tsx');
  const mod = new Module(filename, module);
  mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = name => {
    if (name === '../tour') return { TourProvider: 'TourProvider', useTour: () => ({ active: false, step: null, start: () => {}, notify: event => tourEvents.push(event) }), useTourTarget: () => ({}) };
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
  return { tourEvents, render, getState: () => state, routes, flush: () => { while (queuedUpdates.length) state = queuedUpdates.shift()(state); }, press: label => {
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

test('jumping from the order editor moves to the selected set and closes the sheet', () => {
  const state = startWorkout(seedState());
  const app = screen(state);
  app.press('カードの種目を編集');
  const editor = app.render().find(node => node.type === 'WorkoutOrderEditor');
  const target = state.sets.find(row => row.sessionId === state.workout.sessionId && row.id !== currentCard(state, state.workout.sessionId).setId);
  editor.props.onJumpToSet({ setId: target.id });
  assert.deepEqual(currentCard(app.getState(), state.workout.sessionId), { setId: target.id });
  assert.equal(app.render().some(node => node.type === 'WorkoutOrderEditor'), false);
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

test('recording card shows every previous set in order and emphasizes the matching set', () => {
  const state = startWorkout(seedState());
  const card = currentCard(state, state.workout.sessionId);
  const row = state.sets.find(item => item.id === card.setId);
  state.sessions.push({ id: -1, status: 'COMPLETED', startedAt: '2020-01-01T00:00:00Z' });
  for (const [order, weight, reps] of [[3, 17.5, 8], [1, 20, 10], [2, 20, 8]]) {
    state.sets.push({ ...row, id: -order, sessionId: -1, setOrder: order, isCompleted: true,
      normalWeightKg: weight, normalReps: reps });
  }
  const nodes = screen(state).render();
  const label = nodes.find(node => node.type === 'Text' && node.props.children?.[0] === '前回');
  assert.ok(label);
  assert.equal(label.props.numberOfLines, undefined);
  const entries = label.props.children[2];
  assert.deepEqual(entries.map(entry => entry.props.children.join('')),
    ['20 kg × 10回', ' / 20 kg × 8回', ' / 17.5 kg × 8回']);
  assert.deepEqual(entries.map(entry => entry.props.style?.fontWeight), ['bold', undefined, undefined]);
});


test('set swipes navigate and the history tap still opens records', () => {
  const state = startWorkout(seedState()); state.restDurationSeconds = 0;
  const app = screen(state);
  const tap = label => app.render().find(n => n.props?.accessibilityLabel === label).props.onPress();
  const first = currentCard(state, state.workout.sessionId);
  app.render().find(n => n.type === 'SwipeCard').props.onSwipeLeft();
  assert.equal(app.getState().sets.find(s => s.id === first.setId).isCompleted, true);
  app.render().find(n => n.type === 'SwipeCard').props.onSwipeRight();
  assert.equal(app.render().find(n => n.type?.name === 'SetProgressBar').props.currentSet.id, first.setId);
  tap('過去の記録を見る');
  assert.ok(app.render().some(n => n.type === 'Sheet'));
});

test('exercise progress only lets passed segments return to their first card', () => {
  const state = startWorkout(seedState());
  const app = screen(state);
  const sessionId = state.workout.sessionId;
  app.render().find(n => n.type === 'SwipeCard').props.onSwipeUp();
  app.render().find(n => n.type === 'SwipeCard').props.onSwipeUp();
  const bar = app.render().find(n => n.type?.name === 'WorkoutProgressBar');
  const segments = bar.type(bar.props).props.children;
  assert.deepEqual(segments.map(node => node.type), ['Pressable', 'Pressable', 'View']);
  assert.equal(segments[0].props.accessibilityRole, 'button');
  assert.match(segments[0].props.accessibilityLabel, /に戻る$/);
  assert.ok(segments[0].props.hitSlop.top > 0);
  segments[0].props.onPress();
  assert.deepEqual(currentCard(app.getState(), sessionId), require('../src/workout.ts').workoutCards(state, sessionId)[0]);
  const currentSegments = app.render().find(n => n.type?.name === 'WorkoutProgressBar');
  assert.ok(currentSegments.type(currentSegments.props).props.children.every(node => node.type === 'View'));
});

test('set progress returns to an earlier set on the same side and blocks card swipes during touch', () => {
  const initial = seedState();
  initial.exercises.find(exercise => exercise.id === initial.presets[0].exercises[0].exerciseId).mode = 'BILATERAL';
  let state = startWorkout(initial);
  const sessionId = state.workout.sessionId;
  const cards = require('../src/workout.ts').workoutCards(state, sessionId);
  state = require('../src/workout.ts').moveToCard(state, cards[2]);
  const app = screen(state);
  const nodes = app.render();
  const bar = nodes.find(n => n.type?.name === 'SetProgressBar');
  const segments = bar.type(bar.props).props.children[1].props.children;
  assert.equal(segments[0].type, 'Pressable');
  assert.equal(segments[1].type, 'View');
  assert.equal(segments[0].props.accessibilityLabel, 'セット1に戻る');
  assert.ok(segments[0].props.hitSlop.top > 0);
  const swipe = nodes.find(n => n.type === 'SwipeCard').props;
  const guard = nodes.find(n => n.type === 'View' && n.props.onTouchStart && n.props.children?.type?.name === 'SetProgressBar');
  guard.props.onTouchStart(); assert.equal(swipe.isGestureBlocked(), true);
  guard.props.onTouchEnd(); assert.equal(swipe.isGestureBlocked(), false);
  segments[0].props.onPress();
  assert.deepEqual(currentCard(app.getState(), sessionId), cards[0]);
  const behind = app.render(true).find(n => n.type?.name === 'SetProgressBar' && n.props.disabled);
  assert.ok(behind);
  assert.ok(behind.type(behind.props).props.children[1].props.children.every(node => node.type === 'View'));
});






test('artwork keeps playing and wheels do not send activity to the screen', () => {
  const app = screen(startWorkout(seedState()));
  const artwork = app.render(true).filter(n => n.type === 'WorkoutPictogram');
  assert.ok(artwork.length > 0);
  assert.ok(artwork.every(n => typeof n.props.name === 'string'));
  assert.ok(app.render().filter(n => n.type === 'WorkoutNumberWheel').every(n => !n.props.onActive));
});

test('card has no set navigation tap targets and keeps the history tap target', () => {
  const app = screen(startWorkout(seedState()));
  const nodes = app.render();
  assert.ok(!nodes.some(n => n.props?.testID === 'workout-card-edges'));
  assert.ok(!nodes.some(n => ['前のセット', 'セット完了して次へ'].includes(n.props?.accessibilityLabel)));
  const history = nodes.find(n => n.props?.accessibilityLabel === '過去の記録を見る');
  assert.equal(history.type, 'Pressable');
  assert.equal(history.props.style.left, '20%');
  assert.equal(history.props.style.width, '60%');
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

test('rest toggle stays global across swiped exercises and back can browse exercises', () => {
  const state = startWorkout(seedState());
  const firstId = state.workout.exerciseOrder[0];
  state.restTimerDisabled = true;
  const app = screen(state);
  assert.equal(restToggle(app).props.value, false);
  app.render().find(node => node.type === 'SwipeCard').props.onSwipeUp();
  const secondId = app.getState().sets.find(row => row.id === currentCard(app.getState(), state.workout.sessionId).setId).exerciseId;
  assert.notEqual(secondId, firstId);
  assert.equal(restToggle(app).props.value, false);
  restToggle(app).props.onValueChange(false);
  assert.equal(app.render().find(node => node.type === 'SwipeActions').props.canGoBack, true);
  assert.equal(restToggle(app).props.value, false);
  restToggle(app).props.onValueChange(true);
  assert.equal(app.getState().restTimerDisabled, false);
});

test('left swipe records the set and advances like the complete button', () => {
  const state = startWorkout(seedState()); state.restDurationSeconds = 0;
  const first = currentCard(state, state.workout.sessionId);
  const app = screen(state);
  assert.equal(app.render().find(n => n.type === 'SwipeCard').props.onSwipeRight, null);
  app.render().find(n => n.type === 'SwipeCard').props.onSwipeLeft();
  assert.equal(app.getState().sets.find(row => row.id === first.setId).isCompleted, true);
  assert.notEqual(currentCard(app.getState(), state.workout.sessionId).setId, first.setId);
  assert.equal(app.tourEvents.at(-1), 'advanced');
});






test('wheel and action containers guard swipes using refs', () => {
  const app = screen(startWorkout(seedState()));
  const nodes = app.render();
  const swipe = nodes.find(n => n.type === 'SwipeCard').props;
  const controls = nodes.filter(n => n.type === 'View' && n.props.onTouchStart);
  assert.equal(controls.length, 3);
  for (const control of controls) {
    assert.equal(control.props.pointerEvents, 'box-none');
    assert.equal(swipe.isGestureBlocked(), false);
    control.props.onTouchStart(); assert.equal(swipe.isGestureBlocked(), true);
    control.props.onTouchEnd(); assert.equal(swipe.isGestureBlocked(), false);
    control.props.onTouchStart(); control.props.onTouchCancel(); assert.equal(swipe.isGestureBlocked(), false);
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




test('card actions have the same controls when moving back and forward', () => {
  const initial = startWorkout(seedState());
  initial.restTimerDisabled = true;
  const app = screen(initial);
  const actions = () => app.render().find(node => node.type === 'SwipeActions').props;
  const first = actions();
  assert.equal(first.reviewing, undefined);
  assert.equal(first.onSkip, undefined);
  first.onAdvance();
  const second = actions();
  assert.equal(second.reviewing, undefined);
  assert.equal(second.onSkip, undefined);
  second.onBack();
  assert.equal(actions().canGoBack, false);
  assert.ok(app.render().some(node => node.props?.accessibilityLabel === 'セットを削除'));
});

test('deleting the current set selects its successor and routes to completion when empty', () => {
  const state = startWorkout(seedState());
  state.sets = state.sets.slice(0, 1);
  state.workout.exerciseOrder = [state.sets[0].exerciseId];
  const app = screen(state);
  app.render().find(node => node.props?.accessibilityLabel === 'セットを削除').props.onPress();
  assert.equal(app.getState().sets.length, 0);
  assert.equal(app.getState().sessions[0].status, 'COMPLETED');
  assert.equal(app.routes.at(-1).pathname, '/complete');
});
