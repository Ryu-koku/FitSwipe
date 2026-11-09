const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { seedState } = require('../src/logic.ts');
const { japanMonth } = require('../src/automatic-sharing.ts');

function roomScreen() {
  const state = seedState();
  const room = { id: 'room', name: 'Friends', competitive: false, ownerId: 'owner' };
  state.rooms = [room];
  let cursor = 0;
  const slots = [], calls = [];
  const rooms = { account: { id: 'owner' }, roomId: room.id, configured: true, month: japanMonth(),
    comparison: { month: japanMonth(), rankings: [{ id: 'owner', name: 'Owner', sets: 0 }], posts: [] },
    run: async action => action(), setSharing: async (...args) => calls.push(args),
    openMember: async id => calls.push(['member', id]), changeMonth: async month => calls.push(['month', month]),
  };
  const filename = path.resolve(__dirname, '../src/app/rooms.tsx');
  const mod = new Module(filename, module); mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = name => {
    if (name === 'react') return { useState: value => { const i = cursor++; if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value; return [slots[i], next => { slots[i] = next; }]; }, useRef: value => ({ current: value }), useEffect: () => {}, useCallback: fn => fn };
    if (name === 'react-native') return { View: 'View', Text: 'Text', Pressable: 'Pressable', Modal: 'Modal',
      Animated: { View: 'AnimatedView', Text: 'AnimatedText', Value: class { interpolate() { return 0; } } },
      useWindowDimensions: () => ({ width: 390, height: 800 }) };
    if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) };
    if (name === 'expo-router') return { useFocusEffect: () => {}, useLocalSearchParams: () => ({}) };
    if (name === 'react-native-qrcode-svg') return 'QRCode';
    if (name === '../context') return { useApp: () => ({ state }) };
    if (name === '../use-rooms') return { useRooms: () => rooms };
    if (name === '../ui') return { useTheme: () => ({ styles: {}, colors: {} }), Screen: 'Screen', Sheet: 'Sheet', Button: 'Button', IconButton: 'IconButton', Card: 'Card', Field: 'Field' };
    if (name === '../components/LegalLinks') return { LegalLinks: 'LegalLinks' };
    if (name === '../components/AppIcon') return { AppIcon: 'AppIcon' };
    if (name === '../components/RoomComparisonChart') return { MemberAvatar: 'MemberAvatar', RoomComparisonChart: 'RoomComparisonChart' };
    if (name === '../components/RoomSharingPanel') return { RoomSharingPanel: 'RoomSharingPanel' };
    return original(name);
  };
  global.__DEV__ = false;
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  function render() {
    cursor = 0; const nodes = [];
    const visit = node => { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(visit); nodes.push(node); visit(node.props?.children); };
    visit(mod.exports.default()); return nodes;
  }
  return { calls, rooms, render, press: async label => {
    const node = render().find(node => node.props?.label === label);
    assert.ok(node, label); assert.ok(!node.props.disabled); await node.props.onPress();
  } };
}

test('opening consent and choosing view-only never sends; confirmation sends only the displayed month', async () => {
  const app = roomScreen();
  app.render().find(node => node.type === 'RoomSharingPanel').props.onStart();
  assert.equal(app.calls.length, 0);
  assert.ok(app.render().some(node => JSON.stringify(node.props?.children)?.includes('後から参加した人')));
  await app.press('今は見るだけ');
  assert.equal(app.calls.length, 0);
  app.render().find(node => node.type === 'RoomSharingPanel').props.onStart();
  await app.press('この範囲で自動共有を始める');
  assert.deepEqual(app.calls, [[true, japanMonth()]]);
});

test('month navigation and member taps issue targeted requests', async () => {
  const app = roomScreen();
  await app.press('前の月');
  assert.equal(app.calls[0][0], 'month');
  assert.notEqual(app.calls[0][1], japanMonth());
  app.render().find(node => node.type === 'RoomComparisonChart').props.onMember('owner');
  assert.deepEqual(app.calls[1], ['member', 'owner']);
});
