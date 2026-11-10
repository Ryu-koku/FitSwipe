const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Exercise the real SVG geometry and measurement callbacks without a native runtime.
function chart() {
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
    if (name === '../ui') return { useTheme: () => ({ colors: {}, styles: {} }) };
    return original(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return props => {
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
  assert.equal(render(props).find(n => n.type === 'Svg').props.height, 136);
});

test('detail charts retain their existing dimensions when no available height is supplied', () => {
  const render = chart();
  assert.equal(render({ points }).find(n => n.type === 'Svg').props.height, 240);
  assert.equal(render({ points, compact: true }).find(n => n.type === 'Svg').props.height, 140);
});
