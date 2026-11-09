const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const { TERMS_VERSION } = require('../src/legal.ts');

function consentUI(status) {
  const prompts = [], accepted = [], opened = [];
  const filename = path.resolve(__dirname, '../src/community-consent.ts');
  const mod = new Module(filename, module); mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = name => {
    if (name === 'react-native') return { Alert: { alert: (title, text, buttons) => prompts.push({title, text, buttons}) } };
    if (name === 'expo-linking') return { openURL: async url => opened.push(url) };
    if (name === './rooms') return { createRoomsClient: () => ({ safety: async () => status, acceptTerms: async (...args) => accepted.push(args) }) };
    return original(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
  return { ...mod.exports, prompts, accepted, opened };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
test('only explicit agreement records the version; cancel and reading policies never accept', async () => {
  const identity = { id:'test', token:'token' };
  for (const choice of ['キャンセル', '規約・方針を読む', '同意する']) {
    const ui = consentUI({ accepted:false, termsVersion:TERMS_VERSION });
    const promise = ui.ensureCommunityTerms(identity);
    // Attach rejection before letting the cancellation happen.
    const result = promise.then(() => true, () => false);
    await tick(); assert.equal(ui.accepted.length,0);
    await ui.prompts[0].buttons.find(button => button.text === choice).onPress();
    assert.equal(await result, choice === '同意する');
    assert.equal(ui.accepted.length, choice === '同意する' ? 1 : 0);
    if (choice === '同意する') assert.deepEqual(ui.accepted[0], [identity,TERMS_VERSION]);
    if (choice === '規約・方針を読む') assert.ok(ui.opened[0].endsWith('/terms'));
  }
});
test('current acceptance avoids another prompt; a newer server version requires an app update', async () => {
  const accepted = consentUI({ accepted:true, termsVersion:TERMS_VERSION });
  await accepted.ensureCommunityTerms({}); assert.equal(accepted.prompts.length,0); assert.equal(accepted.accepted.length,0);
  const stale = consentUI({ accepted:false, termsVersion:'2099-01-01' });
  await assert.rejects(stale.ensureCommunityTerms({}), /更新/); assert.equal(stale.prompts.length,0); assert.equal(stale.accepted.length,0);
});
