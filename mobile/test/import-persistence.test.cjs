const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { seedState } = require('../src/logic.ts');
const { emptyCloud } = require('../src/sync.ts');
const { exportBackup, restoreBackup } = require('../src/backup.ts');
const { importWorkoutCsv } = require('../src/csv.ts');
function provider(state, saveState, client = {}, storage = {}) {
  const filename = path.resolve(__dirname, '../src/context.tsx');
  const mod = new Module(filename, module);
  mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  let seedCalls = 0;
  mod.require = name => {
    if (name === 'react') return { createContext: () => ({ Provider: 'Provider' }), useCallback: f => f, useEffect: () => {}, useMemo: f => f(), useRef: v => ({ current: v }), useState: v => [typeof v === 'function' ? v() : v, () => {}] };
    if (name === './community-consent') return { confirmCommunityTerms: async () => true, ensureCommunityTerms: async () => {} };
    if (name === './logic') return { seedState: () => seedCalls++ ? seedState() : state };
    if (name === './storage') return { saveState, forgetToken: async () => {}, ...storage };
    if (name === './rooms') return { createRoomsClient: () => client };
    if (name === 'expo-crypto') return { randomUUID };
    if (name === 'react-native') return { AppState: { currentState: 'active' } };
    return original(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  return mod.exports.AppProvider({}).props.value;
}
const csv = 'date,exercise,weightKg,reps\n2026-11-08,bench,50,10';
const source = importWorkoutCsv(seedState(), csv);
for (const [name, change] of [
  ['JSON', s => restoreBackup(s, exportBackup(source), randomUUID)],
  ['CSV', s => importWorkoutCsv(s, csv)],
]) test(`${name} save failure leaves memory/outbox unchanged and retry imports exactly once`, async () => {
  const initial = { ...seedState(), cloud: emptyCloud({ id: 'account', token: 'synthetic', name: 'test', expiresAt: 9999999999 }) };
  let fail = true, stored;
  const api = provider(initial, async s => { if (fail) throw Error('disk full'); stored = s; });
  await assert.rejects(api.importData(change), /disk full/);
  assert.equal(api.getState(), initial); assert.equal(initial.cloud.pending.length, 0);
  fail = false; await api.importData(change);
  assert.equal(api.getState(), stored); assert.equal(stored.sessions.length, 1);
  assert.equal(stored.cloud.identity, initial.cloud.identity);
  assert.ok(stored.cloud.pending.some(m => m.kind === 'session'));
});
test('uncommitted import is invisible to sync and concurrent changes until disk commit', async () => {
  const initial = seedState(); let release;
  const api = provider(initial, () => new Promise(resolve => { release = resolve; }));
  const pending = api.importData(s => importWorkoutCsv(s, csv));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(api.getState(), initial);
  await assert.rejects(api.persist(s => ({ ...s, themeMode: 'dark' })), /処理中/);
  await assert.rejects(api.importData(s => s), /処理中/);
  await api.syncNow();
  release(); await pending;
  assert.equal(api.getState().sessions.length, 1);
});

test('import waits for an in-flight pull and applies to the latest committed state', async () => {
  const initial = { ...seedState(), cloud: emptyCloud({ id: 'account', token: 'synthetic', name: 'test', expiresAt: 9999999999 }) };
  let releasePull, stored;
  const api = provider(initial, async state => { stored = state; }, {
    pull: () => new Promise(resolve => { releasePull = resolve; }),
  });
  const sync = api.syncNow();
  await new Promise(resolve => setImmediate(resolve));
  const importing = api.importData(s => ({ ...importWorkoutCsv(s, csv), weekStartsMonday: true }));
  releasePull({ changes: [{ kind: 'setting', id: '00000000-0000-4000-8000-000000000001', payload: { field: 'themeMode', value: 'dark' }, deleted: false }], cursor: 1, hasMore: false });
  await Promise.all([sync, importing]);
  assert.equal(stored.themeMode, 'dark'); assert.equal(stored.weekStartsMonday, true);
  assert.equal(stored.sessions.length, 1); assert.equal(api.getState(), stored);
});

test('delayed health import is rejected after account transitions including return to guest', async () => {
  const initial = seedState();
  const api = provider(initial, async () => {}, {}, { archiveState: async () => {} });
  const commit = api.captureImport();
  await api.logout();
  await api.logout();
  await assert.rejects(commit(s => ({ ...s, heightCm: 177 })), /アカウントが変更/);
  assert.equal(api.getState().heightCm, initial.heightCm);
  await api.captureImport()(s => ({ ...s, heightCm: 178 }));
  assert.equal(api.getState().heightCm, 178);
});
test('guest restore publishes only after the durable swap succeeds', async () => {
  const initial = seedState();
  const archived = { ...initial, heightCm: 171 };
  let fail = true, committed;
  const api = provider(initial, async () => {}, {}, {
    loadGuest: async () => archived,
    swapGuest: async (current, next) => { assert.equal(current, initial); if (fail) throw Error('disk full'); committed = next; },
  });
  await assert.rejects(api.restoreGuest(), /disk full/);
  assert.equal(api.getState(), initial);
  fail = false; await api.restoreGuest();
  assert.equal(api.getState(), committed);
  assert.equal(api.getState().heightCm, 171);
});
for (const reason of ['expired', 'missing token']) test(`logout archives full outboxes with ${reason} credentials without syncing`, async () => {
  const identity = { id: 'account', name: 'A', token: reason === 'missing token' ? '' : 'token', expiresAt: reason === 'expired' ? 1 : 9999999999 };
  const initial = { ...seedState(), cloud: { ...emptyCloud(identity), pending: [{ kind: 'set', id: 'pending', mutationId: 'm' }] }, pendingPosts: [{ id: 'post' }] };
  let archived; const forgotten = [];
  const api = provider(initial, async () => {}, { pull: () => { throw Error('must not sync'); }, push: () => { throw Error('must not sync'); }, revokeSession: () => { throw Error('must not call the server'); } },
    { archiveState: async state => { archived = state; }, forgetToken: async id => { forgotten.push(id); } });
  await api.logout();
  assert.equal(archived, initial); assert.equal(archived.cloud.pending.length, 1); assert.equal(archived.pendingPosts.length, 1);
  assert.equal(api.getState().cloud, undefined);
  assert.deepEqual(forgotten, ['account']);
});
test('valid-session logout still rejects unsent room posts', async () => {
  const initial = { ...seedState(), pendingPosts: [{ id: 'post' }] };
  const api = provider(initial, async () => {}, {}, { archiveState: async () => { throw Error('must not archive'); } });
  await assert.rejects(api.logout(), /未送信/);
});

test('a valid-session logout revokes the server session and forgets the device token', async () => {
  const identity = { id: 'account', name: 'A', token: 'token', expiresAt: 9999999999 };
  const { exerciseCatalogVersion } = require('../src/exercise-catalog.ts');
  const initial = { ...seedState(), exerciseCatalogVersion, cloud: emptyCloud(identity) };
  const revoked = [], forgotten = [];
  const api = provider(initial, async () => {}, {
    push: async () => ({ acknowledged: [] }),
    // The account already has the current catalog, so the pull adds no edits.
    pull: async () => ({ changes: [{ kind: 'setting', id: randomUUID(), revision: 1, deleted: false,
      payload: { field: 'exerciseCatalogVersion', value: exerciseCatalogVersion } }], cursor: 1, hasMore: false }),
    revokeSession: async (who) => { revoked.push(who.token); },
  }, { archiveState: async () => {}, forgetToken: async id => { forgotten.push(id); } });
  await api.logout();
  assert.deepEqual(revoked, ['token']); assert.deepEqual(forgotten, ['account']);
  assert.equal(api.getState().cloud, undefined);
});


test('failed in-flight sync does not block account deletion or preserve its cloud identity', async () => {
  const identity = { id: 'account', name: 'A', token: 'token', expiresAt: 9999999999 };
  const initial = { ...seedState(), cloud: emptyCloud(identity), roomIdentity: identity };
  let rejectPull, deleted = 0;
  const api = provider(initial, async () => {}, {
    pull: () => new Promise((resolve, reject) => { rejectPull = reject; }),
    deleteAccount: async who => { assert.equal(who.id, identity.id); deleted += 1; },
  }, { removeArchive: async () => {} });
  const syncing = api.syncNow().catch(() => {});
  await new Promise(resolve => setImmediate(resolve));
  const deleting = api.deleteCloudAccount();
  rejectPull(new Error('suspended or unavailable'));
  await Promise.all([syncing, deleting]);
  assert.equal(deleted, 1); assert.equal(api.getState().cloud, undefined);
  assert.equal(api.getState().roomIdentity, undefined);
});
