const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Exercise the real SVG geometry and measurement callbacks without a native runtime.
function chart(weightUnit = 'kg') {
  let cursor = 0;
  const slots = [];
  const filename = path.resolve(__dirname, '../src/components/ProgressChart.tsx');
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = name => {
    if (name === 'react') return { useState: initial => {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = value; }];
    } };
    if (name === 'react-native') return { View: 'View', Text: 'Text' };
    if (name === 'react-native-svg') return { __esModule: true, default: 'Svg', Circle: 'Circle', Line: 'Line', Polyline: 'Polyline', Text: 'SvgText' };
    if (name === '../context') return { useApp: () => ({ state: { weightUnit } }) };
    if (name === '../ui') return { useTheme: () => ({ colors: {}, styles: {} }) };
    return original(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  const render = props => {
    cursor = 0;
    const nodes = [];
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(visit);
      nodes.push(node);
      visit(node.props?.children);
    }
    visit(mod.exports.ProgressChart(props));
    return nodes;
  };
  const measured = props => {
    const nodes = render(props);
    nodes[0]?.props.onLayout(layout(180));
    for (const node of nodes.filter(n => n.type === 'Text')) {
      node.props.onLayout(layout(node.props.children === '次の記録で比較できます。' ? 18 : 24));
    }
    return render(props);
  };
  measured.raw = render;
  return measured;
}
const layout = (height, width = 280) => ({ nativeEvent: { layout: { height, width } } });
const points = [{ date: '2026-11-01', value: 60 }, { date: '2026-11-09', value: 85 }];

test('adaptive chart redraws within measured dimensions, preserving label size and height bounds', () => {
  const render = chart();
  const props = { points, compact: true, availableHeight: 180 };
  render(props)[0].props.onLayout(layout(180));
  const nodes = render(props);
  const svg = nodes.find(n => n.type === 'Svg');
  assert.equal(svg.props.height, 148);
  assert.equal(svg.props.viewBox, '0 0 280 148');
  for (const circle of nodes.filter(n => n.type === 'Circle')) {
    assert(circle.props.cy >= 24 && circle.props.cy <= 108);
    assert(circle.props.cx >= 52 && circle.props.cx <= 254);
  }
  assert(nodes.filter(n => n.type === 'SvgText').every(n => n.props.fontSize === 11));
  assert.equal(render({ ...props, availableHeight: 500 }).find(n => n.type === 'Svg').props.height, 220);
  const small = render({ ...props, availableHeight: 0 });
  assert.equal(small.find(n => n.type === 'Svg').props.height, 100);
  const ticks = small.filter(n => n.type === 'SvgText' && typeof n.props.children === 'string' && /^\d+$/.test(n.props.children));
  for (let i = 1; i < ticks.length; i++) assert(Math.abs(ticks[i].props.y - ticks[i - 1].props.y) >= 16);
});

test('single-point hint and enlarged value text reserve measured height before sizing the graph', () => {
  const render = chart();
  const props = { points: points.slice(0, 1), compact: true, availableHeight: 220 };
  const nodes = render(props);
  nodes.find(n => n.type === 'Text').props.onLayout(layout(40));
  nodes.find(n => n.type === 'Text' && n.props.children === '次の記録で比較できます。').props.onLayout(layout(36));
  assert.equal(render.raw(props).find(n => n.type === 'Svg').props.height, 136);
});

test('detail charts retain their existing dimensions when no available height is supplied', () => {
  const render = chart();
  assert.equal(render({ points }).find(n => n.type === 'Svg').props.height, 240);
  assert.equal(render({ points, compact: true }).find(n => n.type === 'Svg').props.height, 140);
});

test('date ticks are single SVG strings with end labels anchored inside the plot', () => {
  for (const width of [240, 280, 360]) {
    const render = chart();
    const props = { points: [{ date: '2026-10-29', value: 105 }, { date: '2026-11-02', value: 105 }], compact: true, availableHeight: 180 };
    render(props)[0].props.onLayout(layout(180, width));
    const nodes = render.raw(props);
    const ticks = nodes.filter(n => n.type === 'SvgText' && n.props.y === 129);
    assert.deepEqual(ticks.map(n => n.props.children), ['10/29', '10/31', '11/2']);
    assert.deepEqual(ticks.map(n => n.props.textAnchor), ['start', 'middle', 'end']);
    assert.equal(ticks.at(-1).props.x, width - 26);
  }
});

test('lb charts convert weight values and axes while repetition charts stay unchanged', () => {
  const render = chart('lb');
  const nodes = render({ points: [{ date: '2026-11-01', value: 45.359237 }] });
  assert.ok(nodes.some(n => n.type === 'Text' && n.props.children.includes('100.0') && n.props.children.includes('lb')));
  assert.ok(nodes.some(n => n.type === 'SvgText' && n.props.children === 'lb'));
  assert.ok(nodes.some(n => n.props?.accessibilityLabel === '2026-11-01：100.0lb'));
  const reps = render({ points: [{ date: '2026-11-01', value: 10 }], unit: '回' });
  assert.ok(reps.some(n => n.props?.accessibilityLabel === '2026-11-01：10回'));
});

test('chart stays invisible until parent, width, value and single-point hint are measured', () => {
  const render = chart().raw;
  const props = { points: points.slice(0, 1), compact: true, availableHeight: 220, layoutReady: false };
  let nodes = render(props);
  assert.equal(nodes[0].props.style.opacity, 0);
  assert.equal(nodes.some(n => n.type === 'Svg'), false);
  nodes[0].props.onLayout(layout(220));
  nodes.find(n => n.type === 'Text').props.onLayout(layout(40));
  nodes = render({ ...props, layoutReady: true });
  assert.equal(nodes.some(n => n.type === 'Svg'), false);
  nodes.find(n => n.props.children === '次の記録で比較できます。').props.onLayout(layout(36));
  nodes = render(props);
  assert.equal(nodes.some(n => n.type === 'Svg'), false);
  nodes = render({ ...props, layoutReady: true });
  assert.equal(nodes[0].props.style.opacity, 1);
  assert.equal(nodes.find(n => n.type === 'Svg').props.height, 136);
});

test('subpixel layout noise does not change the measured chart dimensions', () => {
  const render = chart();
  const props = { points, compact: true, availableHeight: 180 };
  const nodes = render(props);
  nodes[0].props.onLayout(layout(180, 280.5));
  nodes.find(n => n.type === 'Text').props.onLayout(layout(24.5));
  const next = render.raw(props).find(n => n.type === 'Svg');
  assert.equal(next.props.viewBox, '0 0 280 148');
});

test('home defers history until transition end, caches layout renders, and refreshes changed history', () => {
  const filename = path.resolve(__dirname, '../src/components/HomeProgress.tsx');
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  const slots = [];
  const effects = [];
  const listeners = new Map();
  const calls = { progressIndex: 0, exerciseRecords: 0, dailyProgress: 0, progressRanking: 0 };
  let cursor = 0;
  let state = {
    exercises: [{ id: 1, name: 'スクワット', mode: 'NORMAL' }],
    sessions: [], sets: [], homeGrowthExerciseId: 1,
  };
  const navigation = { addListener: (name, listener) => {
    listeners.set(name, listener);
    return () => listeners.delete(name);
  } };
  mod.require = name => {
    if (name === 'react') return {
      useState: initial => {
        const i = cursor++;
        if (!(i in slots)) slots[i] = initial;
        return [slots[i], value => { slots[i] = value; }];
      },
      useMemo: (factory, deps) => {
        const i = cursor++;
        if (!slots[i] || deps.some((dep, j) => !Object.is(dep, slots[i].deps[j]))) {
          slots[i] = { deps, value: factory() };
        }
        return slots[i].value;
      },
      useLayoutEffect: effect => {
        const i = cursor++;
        if (!(i in slots)) { slots[i] = true; effects.push(effect); }
      },
    };
    if (name === 'react-native') return { View: 'View', Text: 'Text', Pressable: 'Pressable' };
    if (name === 'expo-router') return { router: {}, useNavigation: () => navigation };
    if (name === '../context') return { useApp: () => ({ state, update: () => {} }) };
    if (name === '../ui') return { useTheme: () => ({ colors: {}, styles: {} }), Card: 'Card', IconButton: 'IconButton' };
    if (name === './ProgressChart') return { ProgressChart: 'ProgressChart' };
    if (name === '../home-progress') {
      const actual = original(name);
      return { ...actual, ...Object.fromEntries(Object.keys(calls).map(key => [key, (...args) => {
        calls[key]++;
        return actual[key](...args);
      }])) };
    }
    return original(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  const render = height => { cursor = 0; return mod.exports.HomeProgress({ availableHeight: height }); };
  render(0);
  assert.equal(calls.progressIndex, 0);
  const cleanup = effects[0]();
  try {
    listeners.get('transitionStart')();
    render(200);
    assert.equal(calls.progressIndex, 0);
    listeners.get('transitionEnd')();
    render(200);
    assert.equal(calls.progressIndex, 1);
    const cached = { ...calls };
    render(300);
    state = { ...state, weightUnit: 'lb' };
    render(300);
    assert.deepEqual(calls, cached);
    state = { ...state, sets: [...state.sets] };
    render(300);
    assert.equal(calls.progressIndex, 2);
    assert.equal(calls.dailyProgress, cached.dailyProgress + 1);
  } finally { cleanup(); }
  assert.equal(listeners.size, 0);
});
