const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function purchases({ platform = 'android', key = 'public-key', development = false } = {}) {
  const calls = [];
  const info = { entitlements: { active: { premium: {} } } };
  const sdk = {
    configure: options => calls.push(['configure', options]),
    logIn: async id => calls.push(['login', id]),
    logOut: async () => calls.push(['logout']),
    getCustomerInfo: async () => info,
    getOfferings: async () => ({ current: { monthly: { identifier: 'monthly' } } }),
    purchasePackage: async item => { calls.push(['purchase', item.identifier]); return { customerInfo: info }; },
    restorePurchases: async () => info,
    addCustomerInfoUpdateListener: callback => calls.push(['subscribe', callback]),
    removeCustomerInfoUpdateListener: callback => calls.push(['unsubscribe', callback]),
  };
  const filename = path.resolve(__dirname, '../src/purchases.ts');
  const mod = new Module(filename, module); mod.filename = filename;
  const env = { EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: key, EXPO_PUBLIC_PREMIUM_OVERRIDE: '1' };
  mod.require = name => {
    if (name === 'react-native') return { Platform: { OS: platform } };
    if (name === 'expo-constants') return { expoConfig: { android: { package: development ? 'dev.local.fitlogsolo.expodev' : 'dev.local.fitlogsolo' } } };
    if (name === 'react-native-purchases') { calls.push(['load']); return sdk; }
    throw Error(name);
  };
  let source = fs.readFileSync(filename, 'utf8');
  source = source.replaceAll('process.env.', 'testEnv.').replaceAll('__DEV__', 'testDev');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  mod._compile(`const testEnv = ${JSON.stringify(env)}; const testDev = true;\n${compiled}`, filename);
  return { api: mod.exports, calls, info };
}

test('store wrapper configures, switches room identities, subscribes, purchases and restores', async () => {
  const { api, calls, info } = purchases();
  assert.equal(await api.initializePurchases('first'), info);
  assert.deepEqual(calls[1], ['configure', { apiKey: 'public-key', appUserID: 'first' }]);
  await api.initializePurchases('second');
  await api.initializePurchases(undefined);
  assert.ok(calls.some(call => call[0] === 'login' && call[1] === 'second'));
  assert.ok(calls.some(call => call[0] === 'logout'));
  const listener = () => {};
  api.subscribePurchases(listener)();
  assert.ok(calls.some(call => call[0] === 'unsubscribe' && call[1] === listener));
  assert.equal(await api.purchasePremium(await api.monthlyPackage()), info);
  assert.equal(await api.restorePurchases(), info);
  assert.equal(api.hasPremium(info), true);
  assert.equal(api.hasPremium({ entitlements: { active: {} } }), false);
});

test('web, missing key and development package never load the native store module', async () => {
  for (const options of [{ platform: 'web' }, { key: '' }, { development: true }]) {
    const { api, calls } = purchases(options);
    assert.ok(api.purchaseUnavailableReason);
    assert.equal(await api.initializePurchases('room-user'), undefined);
    await assert.rejects(() => api.restorePurchases());
    assert.deepEqual(calls, []);
    assert.equal(api.premiumOverride, true);
  }
});
