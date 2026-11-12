const assert = require('node:assert/strict');
const test = require('node:test');
const Module = require('node:module');
const data = new Map();
const secrets = new Map();
let failKey;
const original = Module._load;
Module._load = function (name, ...args) {
  if (name === '@react-native-async-storage/async-storage') return {
    multiGet: async keys => keys.map(key => [key, data.get(key) ?? null]),
    multiSet: async entries => { for (const [key, value] of entries) { if (key === failKey) throw Error('disk full'); data.set(key, value); } },
    multiRemove: async keys => { if (keys.some(key => `remove:${key}` === failKey)) throw Error('disk full'); keys.forEach(key => data.delete(key)); },
    getAllKeys: async () => [...data.keys()],
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { if (key === failKey) throw Error("disk full"); data.set(key, value); },
    removeItem: async (key) => { if (`remove:${key}` === failKey) throw Error("disk full"); data.delete(key); },
  };
  if (name === 'expo-secure-store') return {
    getItemAsync: async (key) => secrets.get(key) ?? null,
    setItemAsync: async (key, value) => secrets.set(key, value),
    deleteItemAsync: async (key) => secrets.delete(key),
  };
  return original.call(this, name, ...args);
};
const { saveState, loadState, archiveState, loadArchive, removeArchive, saveGuest, loadGuest, swapGuest } = require('../src/storage.ts');
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

test('home view, exercise, metric, side and ranking survive local save/load', async () => {
  const state = { ...seedState(), homeGrowthExerciseId: 42,
    homeProgress: { view: 'ranking', metric: 'reps', ranking: 'updates', side: 2 } };
  await saveState(state);
  const loaded = await loadState();
  assert.equal(loaded.homeGrowthExerciseId, 42);
  assert.deepEqual(loaded.homeProgress, state.homeProgress);
});

for (const stage of ['journal', 'main', 'guest', 'cleanup']) test(`guest swap survives failure at ${stage} and restart`, async () => {
  data.clear();
  const key = 'fitlogsolo.react-native.state.v1';
  const current = { ...seedState(), heightCm: 180 }, archived = { ...seedState(), heightCm: 170 };
  await saveState(current); await saveGuest(archived);
  failKey = { journal: `${key}.guest-swap`, main: key, guest: `${key}.guest`, cleanup: `remove:${key}.guest-swap` }[stage];
  try {
    if (stage === 'journal') await assert.rejects(swapGuest(current, archived), /disk full/);
    else await swapGuest(current, archived);
  } finally { failKey = undefined; }
  // Read from durable storage as on restart, without using the provider's memory.
  assert.equal((await loadState()).heightCm, stage === 'journal' ? 180 : 170);
  assert.equal((await loadGuest()).heightCm, stage === 'journal' ? 170 : 180);
  assert.equal(data.has(`${key}.guest-swap`), false);
  await saveState({ ...seedState(), heightCm: 190 });
  assert.equal((await loadState()).heightCm, 190);
});

const mainKey = 'fitlogsolo.react-native.state.v1';
test('large state, archives, guest and swap journal use bounded chunks', async () => {
  data.clear();
  const large = { ...seedState(), marker: '筋'.repeat(1100000), cloud: emptyCloud({ id: 'large', name: 'L', token: 'secret', expiresAt: 9999999999 }) };
  await saveState(large);
  assert.equal((await loadState()).marker, large.marker);
  await archiveState(large); assert.equal((await loadArchive('large')).marker, large.marker);
  await saveGuest(large); assert.equal((await loadGuest()).marker, large.marker);
  failKey = mainKey;
  await swapGuest(large, { ...large, heightCm: 172 });
  failKey = undefined;
  assert.ok(data.has(`${mainKey}.guest-swap`));
  for (const value of data.values()) assert.ok(Buffer.byteLength(value) <= 512 * 1024);
  assert.equal((await loadState()).heightCm, 172);
  assert.equal((await loadGuest()).marker, large.marker);
  const old = Object.values(JSON.parse(data.get(mainKey)).parts).flat(2);
  await saveState(seedState());
  const current = new Set(Object.values(JSON.parse(data.get(mainKey)).parts).flat(2));
  assert.ok(old.filter(key => !current.has(key)).every(key => !data.has(key)));
});
test('legacy single-key state loads and missing chunks never reset it', async () => {
  data.clear(); data.set(mainKey, JSON.stringify({ ...seedState(), heightCm: 166 }));
  assert.equal((await loadState()).heightCm, 166);
  await saveState(seedState());
  const raw = data.get(mainKey), m = JSON.parse(raw);
  data.delete(m.parts.base[0][0]);
  await assert.rejects(loadState(), /不完全/);
  assert.equal(data.get(mainKey), raw);
});
test('failed manifest commit preserves previous complete generation', async () => {
  data.clear(); await saveState({ ...seedState(), heightCm: 166 });
  failKey = mainKey;
  await assert.rejects(saveState({ ...seedState(), heightCm: 180 }));
  failKey = undefined;
  assert.equal((await loadState()).heightCm, 166);
});

function largeState() {
  const state = { ...seedState(), cloud: emptyCloud({ id: 'big', name: 'B', token: 'secret', expiresAt: 9999999999 }) };
  let id = 1000;
  for (let d = 0; d < 300; d++) {
    const sessionId = id++;
    state.sessions.push({ id: sessionId, startedAt: new Date(Date.UTC(2026, 0, 1 + d)).toISOString(), status: 'COMPLETED' });
    for (let k = 0; k < 20; k++) {
      const setId = id++;
      state.sets.push({ id: setId, sessionId, exerciseId: state.exercises[k % 5].id, setOrder: k + 1, normalWeightKg: 60, normalReps: 10, isCompleted: true, leftCompleted: false, rightCompleted: false });
      state.cloud.mapping[`set:${setId}`] = `00000000-0000-4000-8000-${String(setId).padStart(12, '0')}`;
    }
  }
  return { ...state, nextId: id };
}
const bytesWritten = async (work) => {
  const before = new Map(data);
  await work();
  return [...data].filter(([key, value]) => before.get(key) !== value).reduce((sum, [key, value]) => sum + (key === mainKey ? 0 : Buffer.byteLength(value)), 0);
};

test('a one-set edit rewrites only its page, and the state round-trips exactly', async () => {
  data.clear();
  const state = largeState();
  const full = await bytesWritten(() => saveState(state));
  const edited = { ...state, sets: state.sets.map((set, i) => i === 4000 ? { ...set, normalReps: 12 } : set), workout: { sessionId: 1, exerciseOrder: [], history: [] } };
  const delta = await bytesWritten(() => saveState(edited));
  assert.ok(full > 1_000_000, `full write ${full}`);
  assert.ok(delta < full / 20, `delta ${delta} of ${full}`);
  const loaded = await loadState();
  // JSON drops undefined fields, as every storage format always has.
  const plain = (value) => JSON.parse(JSON.stringify({ ...value, cloud: { ...value.cloud, identity: { ...value.cloud.identity, token: '' } } }));
  assert.deepEqual(plain(loaded), plain(edited));
  assert.equal(loaded.cloud.identity.token, 'secret');
  // After loading, an unchanged save writes only the small base.
  assert.ok(await bytesWritten(() => saveState(loaded)) < 20_000);
});

test('keys of an interrupted save are removed on the next load', async () => {
  data.clear();
  await saveState(largeState());
  failKey = mainKey;
  await assert.rejects(saveState({ ...largeState(), heightCm: 181 }));
  failKey = undefined;
  const referenced = () => new Set(Object.values(JSON.parse(data.get(mainKey)).parts).flat(2));
  assert.ok([...data.keys()].some(key => key.startsWith(`${mainKey}.s.`) && !referenced().has(key)));
  assert.equal((await loadState()).heightCm, undefined);
  assert.ok(![...data.keys()].some(key => key.startsWith(`${mainKey}.s.`) && !referenced().has(key)));
});

test('raw recovery export retains room/sync data and legacy plaintext tokens (known product decision)', async () => {
  // Recovery intentionally preserves bytes, unlike the portable backup boundary.
  const { exportRawStorage } = require('../src/storage.ts');
  data.clear();
  data.set(mainKey, '{broken');
  data.set('fitswipe.archive.legacy', JSON.stringify({
    roomIdentity: { id: 'legacy', token: 'synthetic-legacy-private-token' },
    rooms: [{ inviteCode: 'PRIVATE-INVITE' }], cloud: { cursor: 12345 },
  }));
  await assert.rejects(loadState());
  const exported = await exportRawStorage();
  for (const retained of ['synthetic-legacy-private-token', 'PRIVATE-INVITE', 'cursor', '{broken']) {
    assert.ok(exported.includes(retained), retained);
  }
});

test('garbage collection failure after commit cannot report a failed save', async () => {
  data.clear();
  const state = { ...seedState(), heightCm: 166 };
  await saveState(state);
  const oldKey = JSON.parse(data.get(mainKey)).parts.base[0][0];
  failKey = `remove:${oldKey}`;
  try {
    await assert.doesNotReject(saveState({ ...state, heightCm: 180 }));
    assert.equal((await loadState()).heightCm, 180);
  } finally { failKey = undefined; }
});

test('weight unit survives local/guest/archive storage and missing legacy values default to kg', async () => {
  data.clear();
  for (const unit of ['lb', undefined]) {
    const state = { ...seedState(), weightUnit: unit, cloud: emptyCloud({ id: 'unit-test', name: 'test', token: 'test', expiresAt: 9999999999 }) };
    await saveState(state); await saveGuest(state); await archiveState(state);
    assert.equal((await loadState()).weightUnit, unit ?? 'kg');
    assert.equal((await loadGuest()).weightUnit, unit ?? 'kg');
    assert.equal((await loadArchive('unit-test')).weightUnit, unit ?? 'kg');
  }
});

test('stored legacy rest settings default to enabled and global settings persist', async () => {
  const old = { ...seedState(), restTimerDisabledExerciseIds: [1] };
  delete old.restTimerDisabled;
  await saveState(old);
  const loaded = await loadState();
  assert.equal(loaded.restTimerDisabled, false);
  assert.equal(Object.hasOwn(loaded, 'restTimerDisabledExerciseIds'), false);
  for (const disabled of [true, false]) {
    await saveState({ ...loaded, restTimerDisabled: disabled });
    assert.equal((await loadState()).restTimerDisabled, disabled);
  }
});
