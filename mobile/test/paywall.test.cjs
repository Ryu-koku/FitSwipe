const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function render(state = {}, reason, dark = true) {
  const calls = [];
  const filename = path.resolve(__dirname, '../src/components/Paywall.tsx');
  const mod = new Module(filename, module);
  mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = name => {
    if (name === 'react-native') return { Text: 'Text', View: 'View', Pressable: 'Pressable', StyleSheet: { create: x => x } };
    if (name === '../ui') return { feedback: () => {}, Button: 'Button', Sheet: 'Sheet', feedback: () => {}, useTheme: () => ({ styles: { buttonText: { color: dark ? '#003731' : '#fff' } }, colors: { primary: dark ? '#72d6c9' : '#007f78', red: '#ffb4ab', bg: '#101a1c' } }) };
    if (name === '../premium-context') return { usePremium: () => ({ plan: 'monthly', plans: ['monthly'], monthlyPrice: '¥300', lifetimePrice: '¥3,000', setPlan: value => calls.push(['plan', value]), price: '¥300', busy: false, premium: false, purchase: () => calls.push('purchase'), restore: () => calls.push('restore'), ...state }) };
    if (name === './AppIcon') return { AppIcon: 'AppIcon' };
    if (name === './LegalLinks') return { LegalLinks: 'LegalLinks' };
    return original(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  const nodes = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (node == null || typeof node === 'boolean') return;
    nodes.push(node);
    if (typeof node === 'object') visit(node.props?.children);
  }
  visit(mod.exports.Paywall({ reason, onClose: () => calls.push('close') }));
  return { nodes, calls, subscribe: nodes.find(n => n.type === 'Pressable' && n.props.accessibilityRole === 'button'), restore: nodes.find(n => n.props?.accessibilityLabel === '購入を復元') };
}

test('paywall has one monthly plan, reason, legal links and purchase/restore/close callbacks', () => {
  const app = render({}, '無料プランのプリセットは3つまでです。');
  const text = app.nodes.filter(n => typeof n === 'string').join('');
  assert.match(text, /¥300 \/ 月/);
  assert.match(text, /無料プランのプリセットは3つまでです。/);
  assert.doesNotMatch(text, /1週間無料|買い切り/);
  assert.equal(app.nodes.filter(n => n.props?.accessibilityLabel === 'プレミアムプラン、選択済み').length, 1);
  assert.ok(app.nodes.some(n => n.type === 'LegalLinks'));
  assert.equal(app.nodes[0].props.fullScreen, true);
  app.subscribe.props.onPress(); app.restore.props.onPress(); app.nodes[0].props.onClose();
  assert.deepEqual(app.calls, ['purchase', 'restore', 'close']);
});
for (const state of [{ busy: true }, { premium: true }, { unavailableReason: 'ストア未設定' }]) {
  test(`purchase disabled for ${Object.keys(state)[0]}`, () => {
    const app = render(state);
    assert.equal(app.subscribe.props.disabled, true);
    assert.equal(app.subscribe.props.accessibilityState.disabled, true);
    assert.equal(app.restore.props.disabled, !!state.busy);
  });
}

for (const [label, headline] of [['1か月', '初月無料'], ['1週間', '1週間無料']]) {
  test(`paywall shows ${label} trial and renewal terms`, () => {
    const app = render({ freeTrial: { label, headline } });
    const text = app.nodes.filter(n => typeof n === 'string').join('');
    assert.ok(text.includes('はじめての方'));
    assert.ok(text.includes(headline));
    assert.ok(text.includes(`${label}無料で始める`));
    assert.ok(text.includes(`初回限定。無料期間後は¥300/月で自動更新。`));
    assert.equal(app.subscribe.props.accessibilityLabel, `${label}無料で始める`);
    app.subscribe.props.onPress();
    assert.deepEqual(app.calls, ['purchase']);
  });
}
test('without a trial the original offer remains', () => {
  const text = render().nodes.filter(n => typeof n === 'string').join('');
  assert.ok(text.includes('一番人気'));
  assert.ok(text.includes('プレミアムに登録'));
  assert.doesNotMatch(text, /初月無料|はじめての方|無料期間終了後/);
});

for (const dark of [true, false]) {
  test(`paywall uses primary and shared Button foreground (${dark ? 'dark' : 'light'})`, () => {
    const app = render({ freeTrial: { label: '1か月', headline: '初月無料' } }, '制限の理由', dark);
    const primary = dark ? '#72d6c9' : '#007f78';
    const foreground = dark ? '#003731' : '#fff';
    const flatten = style => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
    assert.equal(flatten(app.subscribe.props.style({ pressed: false })).backgroundColor, primary);
    assert.equal(flatten(app.subscribe.props.children[0].props.style).color, foreground);
    assert.equal(app.subscribe.props.children[1].props.color, foreground);
    const reason = app.nodes.find(n => n.type === 'Text' && n.props.children === '制限の理由');
    assert.equal(flatten(reason.props.style).color, '#ffb4ab');
    for (const label of ['プリセット無制限', '自作種目無制限', 'ルーム作成無制限']) {
      const benefit = app.nodes.find(n => n.type === 'View' && Array.isArray(n.props?.children) && n.props.children[1]?.props?.children === label);
      assert.equal(benefit.props.children[0].props.name, 'check');
      assert.equal(benefit.props.children[0].props.color, primary);
    }
    assert.equal(app.nodes.find(n => n.type === 'LegalLinks').props.compact, true);
    assert.equal(flatten(app.subscribe.props.style({ pressed: false })).minHeight, 52);
    const text = app.nodes.filter(n => typeof n === 'string').join('');
    assert.doesNotMatch(text, /使い方に合わせて|あなたに合ったトレーニング/);
    assert.notEqual(app.nodes[0].props.scroll, false);
  });
}

test('compact legal links share the restore row and open the existing legal URLs', () => {
  const filename = path.resolve(__dirname, '../src/components/LegalLinks.tsx');
  const mod = new Module(filename, module);
  mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  const opened = [];
  mod.require = name => {
    if (name === 'react-native') return { View: 'View', Text: 'Text', Pressable: 'Pressable' };
    if (name === '../ui') return { feedback: () => {}, Button: 'Button', useTheme: () => ({ colors: { primary: '#72d6c9' }, styles: { small: {} } }) };
    if (name === '../community-consent') return { openLegalUrl: url => opened.push(url) };
    if (name === '../legal') return { legalUrls: { terms: 'terms-url', privacy: 'privacy-url' } };
    return original(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  const row = mod.exports.LegalLinks({ compact: true, children: 'restore-link' });
  assert.equal(row.props.style.flexDirection, 'row');
  assert.equal(row.props.children[0], 'restore-link');
  const links = row.props.children.filter(n => n?.type === 'Pressable');
  assert.deepEqual(links.map(n => n.props.children.props.children), ['利用規約', 'プライバシー']);
  links.forEach(n => { assert.equal(n.props.accessibilityRole, 'link'); n.props.onPress(); });
  assert.deepEqual(opened, ['terms-url', 'privacy-url']);
  const standard = mod.exports.LegalLinks({});
  assert.equal(standard.props.children.length, 4);
});

const { visiblePremiumPlans } = require('../src/premium.ts');
test('lifetime visibility requires both a package and an initialized available store', () => {
  assert.deepEqual(visiblePremiumPlans({}, true), ['monthly']);
  assert.deepEqual(visiblePremiumPlans({ lifetime: {} }, false), ['monthly']);
  assert.deepEqual(visiblePremiumPlans({ lifetime: {} }, true), ['monthly', 'lifetime']);
});
test('lifetime radio selects the plan and lifetime purchase has no renewal or trial copy', () => {
  const app = render({ plan: 'lifetime', plans: ['monthly', 'lifetime'] });
  const radios = app.nodes.filter(n => n.props?.accessibilityRole === 'radio');
  assert.deepEqual(radios.map(n => n.props.accessibilityState.checked), [false, true]);
  radios[1].props.onPress();
  app.subscribe.props.onPress();
  assert.deepEqual(app.calls, [['plan', 'lifetime'], 'purchase']);
  const text = app.nodes.filter(n => typeof n === 'string').join('');
  assert.match(text, /¥3,000（買い切り）/);
  assert.match(text, /一度の購入でずっと無制限/);
  assert.match(text, /一度のお支払いで、以降の更新料はかかりません。/);
  assert.doesNotMatch(text, /自動更新|無料で始める/);
  assert.equal(app.subscribe.props.accessibilityLabel, '買い切りで購入');
});

test('paywall centers the premium identity below the floating close button', () => {
  const app = render();
  assert.equal(app.nodes[0].props.closeOnly, true);
  const content = app.nodes[0].props.children;
  assert.ok(content.props.style.paddingTop >= 56);
  const identity = content.props.children[0].props.children[0];
  assert.equal(identity.props.style.justifyContent, 'center');
  assert.equal(identity.props.children[0].props.name, 'crown');
  assert.equal(identity.props.children[0].props.color, '#72d6c9');
  const label = identity.props.children[1];
  assert.equal(label.props.children, 'Premium にアップグレード');
  assert.equal(label.props.style[1].color, '#72d6c9');
  assert.equal(label.props.style[0].fontSize, 14);
});
