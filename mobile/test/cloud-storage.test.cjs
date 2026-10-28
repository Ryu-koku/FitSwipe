const assert = require('node:assert/strict');
const test = require('node:test');
const Module = require('node:module');
const data = new Map();
const secrets = new Map();
const original = Module._load;
Module._load = function (name, ...args) {
  if (name === '@react-native-async-storage/async-storage') return {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => data.set(key, value),
    removeItem: async (key) => data.delete(key),
  };
  if (name === 'expo-secure-store') return {
    getItemAsync: async (key) => secrets.get(key) ?? null,
    setItemAsync: async (key, value) => secrets.set(key, value),
    deleteItemAsync: async (key) => secrets.delete(key),
  };
  return original.call(this, name, ...args);
};
const { saveState, loadState, archiveState, loadArchive, removeArchive, saveGuest, loadGuest } = require('../src/storage.ts');
Module._load = original;
const { emptyCloud } = require('../src/sync.ts');
const { seedState } = require('../src/logic.ts');

test('session tokens go only to secure storage; account archives stay separate', async () => {
  const identity = { id: 'account-A', name: 'A', token: 'synthetic-secret-A', expiresAt: 9999999999 };
  const a = { ...seedState(), roomIdentity: identity, cloud: emptyCloud(identity) };
  await saveState(a);
  assert.ok(!JSON.stringify([...data]).includes(identity.token));
  assert.equal((await loadState()).cloud.identity.token, identity.token);
  await archiveState(a);
  await saveState(seedState());
  assert.equal((await loadState()).cloud, undefined);
  assert.equal((await loadArchive('account-A')).cloud.identity.id, 'account-A');
  assert.equal(await loadArchive('account-B'), undefined);
  await removeArchive('account-A');
  assert.equal(await loadArchive('account-A'), undefined);
  assert.equal(secrets.has('fitswipe.token.account-A'), false);
});

test('guest import source is retained without account sync metadata', async () => {
  const guest = { ...seedState(), sessions: [{ id: 1, startedAt: '2026-01-01T00:00:00Z', status: 'COMPLETED' }] };
  await saveGuest({ ...guest, roomIdentity: { id: 'old-room-account', name: 'old', token: 'old-token' } });
  const saved = await loadGuest();
  assert.deepEqual(saved.sessions, guest.sessions);
  assert.equal(saved.cloud, undefined);
  assert.equal(saved.roomIdentity, undefined);
});

test('corrupt persisted state fails visibly rather than resetting user records', async () => {
  data.set('fitlogsolo.react-native.state.v1', '{broken');
  await assert.rejects(loadState());
  assert.equal(data.get('fitlogsolo.react-native.state.v1'), '{broken');
});
