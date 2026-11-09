const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const path = require('node:path');

// Render the real layout with only its platform/context boundaries stubbed.
// This exercises which screen is reachable, rather than matching source text.
function layout(state) {
  const filename = path.resolve(__dirname, '../src/app/_layout.tsx');
  const module = new Module(filename, moduleParent());
  module.filename = filename; module.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = module.require.bind(module);
  module.require = name => {
    if (name === 'expo-router') return { Stack: 'Stack', usePathname: () => '/' };
    if (name === '../context') return { AppProvider: 'Provider', useApp: () => ({ state, ready: true }) };
    if (name === '../ui') return { ThemeProvider: 'Theme', useTheme: () => ({ colors: {}, styles: {} }) };
    if (name === 'react-native') return { ActivityIndicator: 'ActivityIndicator', ScrollView: 'ScrollView', Text: 'Text', View: 'View' };
    if (name === 'react-native-safe-area-context') return { SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView' };
    if (name === 'expo-status-bar') return { StatusBar: 'StatusBar' };
    if (name === '../components/AccountPanel') return { AccountPanel: 'AccountPanel' };
    if (name === '../components/TrainingDock') return { TrainingDock: 'TrainingDock' };
    if (name === '../rest-notifications') return { RestNotifications: 'RestNotifications' };
    if (name === '../data-transfer') return { shareTextFile: async () => {} };
    return original(name);
  };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  module._compile(code, filename);
  const nodes = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(visit);
    if (typeof node.type === 'function') return visit(node.type(node.props));
    nodes.push(node); visit(node.props?.children);
  }
  visit(module.exports.default()); return nodes;
}
function moduleParent() { return module; }

test('guest navigation remains reachable after logout, restoration, deletion and choosing local use', () => {
  for (const state of [{ loginPromptDismissed: true }, { loginPromptDismissed: true, sessions: [{ id: 1 }] }, { cloud: { identity: {} } }]) {
    const nodes = layout(state);
    assert.ok(nodes.some(n => n.type === 'Stack'));
    assert.ok(!nodes.some(n => n.type === 'AccountPanel'));
  }
  assert.ok(layout({}).some(n => n.type === 'AccountPanel' && n.props.onboarding));
});
