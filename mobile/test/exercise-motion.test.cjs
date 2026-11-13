/* global __dirname */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Real render/effect callbacks, with platform views and animation drivers isolated.
function load(file, exported, mocks, memoize = false) {
  let cursor = 0, renderCount = 0, dirty = true;
  const slots = [], pending = [];
  const hooks = {
    useId: () => "picture",
    memo: component => {
      let previous, result;
      return props => {
        if (memoize && !dirty && previous && Object.keys(props).length === Object.keys(previous).length &&
          Object.keys(props).every(key => Object.is(props[key], previous[key]))) return result;
        renderCount++; dirty = false; previous = props;
        return result = component(props);
      };
    },
    startTransition: callback => callback(),
    useMemo: (fn, deps) => { const i = cursor++; if (!slots[i] || deps.some((d, j) => !Object.is(d, slots[i].deps[j]))) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useState: value => { const i = cursor++; if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value; return [slots[i], next => { slots[i] = next; dirty = true; }]; },
    useRef: value => { const i = cursor++; return slots[i] ??= { current: value }; },
    useEffect: (effect, deps) => { const i = cursor++; if (!slots[i] || deps.some((d, j) => !Object.is(d, slots[i].deps[j]))) pending.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: effect() }; }); },
  };
  const filename = path.resolve(__dirname, '../src/components', file);
  const mod = new Module(filename, module);
  mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = name => name === 'react' ? hooks : mocks[name] ?? original(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  return { renderCount: () => renderCount, render(props) { cursor = 0; const nodes = []; function visit(n) { if (!n || typeof n !== 'object') return; if (Array.isArray(n)) return n.forEach(visit); nodes.push(n); visit(n.props?.children); } visit(mod.exports[exported](props)); pending.splice(0).forEach(f => f()); return nodes; }, unmount() { slots.forEach(s => s?.cleanup?.()); slots.length = 0; pending.length = 0; } };
}

const { createExerciseMotionQueue } = require('../src/exercise-motion-queue.ts');

test('viewport releases one card per frame, cancels removed cards and clears on unmount', t => {
  const frames = new Map(); let id = 0;
  global.requestAnimationFrame ??= () => {};
  global.cancelAnimationFrame ??= () => {};
  t.mock.method(global, 'requestAnimationFrame', fn => { frames.set(++id, fn); return id; });
  t.mock.method(global, 'cancelAnimationFrame', id => frames.delete(id));
  const step = () => { const [id, fn] = frames.entries().next().value; frames.delete(id); fn(); };
  const queue = createExerciseMotionQueue(), started = [];
  queue.enqueue(() => started.push(1));
  const cancel = queue.enqueue(() => started.push(2));
  queue.enqueue(() => started.push(3));
  assert.deepEqual(started, []);
  step(); assert.deepEqual(started, [1]);
  cancel(); step(); assert.deepEqual(started, [1, 3]);
  assert.equal(frames.size, 0);
  queue.enqueue(() => started.push(4)); queue.clear();
  assert.equal(frames.size, 0);
  queue.enqueue(() => started.push(5)); step();
  assert.deepEqual(started, [1, 3, 5]);
});

test('poster display and idle precede queued playback; eligibility and cleanup remain effective', t => {
  const interactions = [], queued = [];
  const motion = { focused: true, appState: 'active', reducedMotion: false, covered: false,
    enqueue(fn) { const task = { fn, cancelled: false }; queued.push(task); return () => { task.cancelled = true; }; } };
  global.requestIdleCallback ??= () => {};
  global.cancelIdleCallback ??= () => {};
  t.mock.method(global, 'requestIdleCallback', fn => { const task = { fn, cancelled: false }; interactions.push(task); return interactions.length - 1; });
  t.mock.method(global, 'cancelIdleCallback', id => { interactions[id].cancelled = true; });
  const app = load('ExercisePictogram.tsx', 'ExercisePictogram', {
    'react-native': { View: 'View' },
    'expo-image': { Image: 'Image' }, './AppIcon': { AppIcon: 'Icon' },
    '../ui': { useTheme: () => ({ colors: {}, styles: {} }) },
    '../exercise-visual-assets': { exerciseVisualAssets: { 'bench-press': { poster: 1, animation: 2 }, 'dumbbell-curl': { poster: 3, animation: 4 } } },
    '../exercise-motion': { useExerciseMotion: () => motion, useExerciseVisibility: () => true },
  });
  const render = (name = 'ベンチプレス') => app.render({ name }).find(n => n.type === 'Image').props;
  assert.equal(render().source, 1); assert.equal(interactions.length, 0);
  render().onDisplay(); render(); assert.equal(interactions.length, 1);
  assert.equal(render().source, 1); interactions[0].fn(); render();
  assert.equal(queued.length, 1); assert.equal(render().source, 1);
  queued[0].fn(); assert.equal(render().source, 2);
  assert.equal(render().cachePolicy, 'memory-disk');
  motion.covered = true; assert.equal(render().source, 1);
  motion.covered = false; render(); assert.equal(render().source, 1);
  queued[1].fn(); assert.equal(render().source, 2);
  assert.equal(render('ダンベルカール').source, 3);
  render('ダンベルカール').onDisplay(); render('ダンベルカール');
  app.unmount(); assert(interactions.every(x => x.cancelled));
  assert(queued.every(x => x.cancelled));
});


test('displayed animations survive remount without poster, idle or queue; playback still respects gates', t => {
  const idle = [], queued = [];
  let visible = true;
  const motion = { focused: true, appState: 'active', reducedMotion: false, covered: false,
    enqueue(fn) { queued.push(fn); return () => {}; } };
  global.requestIdleCallback ??= () => {};
  global.cancelIdleCallback ??= () => {};
  t.mock.method(global, 'requestIdleCallback', fn => { idle.push(fn); return idle.length; });
  t.mock.method(global, 'cancelIdleCallback', () => {});
  const app = load('ExercisePictogram.tsx', 'ExercisePictogram', {
    'react-native': { View: 'View' }, 'expo-image': { Image: 'Image' }, './AppIcon': { AppIcon: 'Icon' },
    '../ui': { useTheme: () => ({ colors: {}, styles: {} }) },
    '../exercise-visual-assets': { exerciseVisualAssets: { 'bench-press': { poster: 1, animation: 2 }, 'dumbbell-curl': { poster: 3, animation: 4 } } },
    '../exercise-motion': { useExerciseMotion: () => motion, useExerciseVisibility: () => visible },
  });
  const render = (props = {}) => app.render({ name: 'ベンチプレス', ...props }).find(n => n.type === 'Image').props;
  render().onDisplay(); render(); idle[0](); render(); queued[0]();
  const first = render(); assert.equal(first.source, 2); first.onDisplay();
  app.unmount(); visible = false;
  const paused = render();
  assert.equal(paused.source, 2); assert.equal(paused.placeholder, 2);
  assert.equal(paused.autoplay, false); assert.equal(paused.recyclingKey, first.recyclingKey);
  visible = true;
  assert.equal(render().autoplay, true);
  for (const [key, value] of [['focused', false], ['appState', 'background'], ['reducedMotion', true], ['reducedMotion', undefined], ['covered', true]]) {
    const previous = motion[key]; motion[key] = value;
    assert.equal(render().source, 2); assert.equal(render().autoplay, false);
    motion[key] = previous;
    assert.equal(render().autoplay, true);
  }
  assert.equal(render({ animate: false }).autoplay, false);
  assert.equal(render({ animate: false }).source, 2);
  motion.covered = true; assert.equal(render({ inPreview: true }).autoplay, true); motion.covered = false;
  app.unmount(); assert.equal(render().source, 2); assert.equal(render().autoplay, true);
  assert.equal(idle.length, 1); assert.equal(queued.length, 1);
  assert.equal(render({ name: 'ダンベルカール' }).source, 3);
  render().onError(); assert.equal(render().source, 1);
  assert.equal(render().placeholder, 1);
  app.unmount();
});


test('workout artwork mounts after a frame, stays ready for the same name and cancels stale work', t => {
  const frames = new Map(); let id = 0;
  global.requestAnimationFrame ??= () => {};
  global.cancelAnimationFrame ??= () => {};
  t.mock.method(global, 'requestAnimationFrame', fn => { frames.set(++id, fn); return id; });
  t.mock.method(global, 'cancelAnimationFrame', id => frames.delete(id));
  const app = load('WorkoutPictogram.tsx', 'WorkoutPictogram', {
    './ExercisePictogram': { ExercisePictogram: 'ExercisePictogram' },
  });
  const render = (name = 'ベンチプレス') => app.render({ name });
  assert.deepEqual(render(), []);
  assert.equal(frames.size, 1);
  const first = frames.values().next().value; frames.clear(); first();
  assert.deepEqual(render()[0].props, { name: 'ベンチプレス', large: true, animate: true });
  render(); assert.equal(frames.size, 0);
  assert.deepEqual(render('ダンベルカール'), []);
  const stale = frames.values().next().value;
  render('スクワット'); assert.equal(frames.size, 1);
  stale(); assert.deepEqual(render('スクワット'), []);
  app.unmount(); assert.equal(frames.size, 0);
});

test('pictograms use default shallow memo for unchanged parent props', t => {
  global.requestAnimationFrame ??= () => {};
  global.cancelAnimationFrame ??= () => {};
  t.mock.method(global, 'requestAnimationFrame', () => 1);
  t.mock.method(global, 'cancelAnimationFrame', () => {});
  for (const component of ['ExercisePictogram', 'WorkoutPictogram']) {
    const app = load(component + '.tsx', component, {
      'react-native': { View: 'View' },
      'expo-image': { Image: 'Image' },
      './AppIcon': { AppIcon: 'Icon' },
      '../exercise-visual-assets': { exerciseVisualAssets: {} },
      './ExercisePictogram': { ExercisePictogram: 'ExercisePictogram' },
      '../ui': { useTheme: () => ({ colors: {}, styles: {} }) },
      '../exercise-motion': { useExerciseMotion: () => undefined, useExerciseVisibility: () => false },
    }, true);
    app.render({ name: 'unknown exercise' });
    const before = app.renderCount();
    app.render({ name: 'unknown exercise' });
    assert.equal(app.renderCount(), before, component);
    app.render({ name: 'another exercise' });
    assert.equal(app.renderCount(), before + 1, component);
    app.unmount();
  }
});
