const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  createRoomsClient,
  inviteCode,
  workoutSnapshot,
} = require('../src/rooms.ts');
const { seedState } = require('../src/logic.ts');
const { startWorkout, advanceWorkout } = require('../src/workout.ts');

test('existing Kotlin invitation URLs are accepted', () => {
  assert.equal(inviteCode('fitswipe://room?code=ABC123'), 'ABC123');
  assert.equal(inviteCode('fitlogsolo://room?code=ABC123'), 'ABC123');
  assert.equal(inviteCode(' ABC123 '), 'ABC123');
});

test('React Native client interoperates with the rooms Worker, including automatic sharing', async (t) => {
  // The real Worker on an in-process SQLite D1, served over loopback HTTP.
  const { serveWorker } = await import('../../rooms-server/cloudflare/test/local-worker.mjs');
  const server = await serveWorker();
  t.after(() => server.close());
  const api = createRoomsClient(server.url);
  // Accounts require the terms version the app ships with.
  const { TERMS_VERSION } = require('../src/legal.ts');
  await assert.rejects(() => api.register('NoConsent'), (e) => e.status === 428);
  const alice = await api.register('Alice', null, TERMS_VERSION);
  const bob = await api.register('Bob', null, TERMS_VERSION);
  const outsider = await api.register('Outsider', null, TERMS_VERSION);
  const created = await api.create(alice, 'Friends', false);
  assert.deepEqual(Object.keys(created), ['id']);
  let list = await api.list(alice);
  assert.equal(list[0].name, 'Friends');
  assert.equal(list[0].competitive, false);
  assert.equal(list[0].ownerId, alice.id);
  assert.ok(list[0].inviteCode);
  await api.join(bob, `fitswipe://room?code=${list[0].inviteCode}`);
  await assert.rejects(
    () => api.detail(outsider, created.id),
    (e) => e.status === 404,
  );
  assert.equal((await api.list(bob))[0].competitive, false);
  let state = startWorkout(seedState());
  while (state.workout) {
    const next = advanceWorkout(state);
    state = next === state ? require('../src/workout.ts').skipToNextExercise(state) : next;
  }
  const entry = {
    roomId: created.id,
    workout: workoutSnapshot(state, state.sessions[0].id),
  };
  const first = await api.post(alice, entry);
  const duplicate = await api.post(alice, entry);
  assert.equal(first.id, duplicate.id);
  const detail = await api.detail(bob, created.id);
  assert.equal(detail.members.length, 2);
  assert.equal(detail.posts.length, 1);
  assert.equal(detail.posts[0].name, 'Alice');
  assert.equal(detail.posts[0].workout.exercises.length, 3);
  await assert.rejects(
    () => api.deletePost(bob, created.id, first.id),
    (e) => e.status === 404,
  );
  await api.rename(alice, 'アリス');
  assert.equal((await api.detail(bob, created.id)).posts[0].name, 'アリス');
  await api.deletePost(alice, created.id, first.id);
  assert.equal((await api.detail(bob, created.id)).posts.length, 0);
  await api.post(alice, entry);
  const month = require('../src/automatic-sharing.ts').japanMonth();
  const start = new Date(`${month}-01T00:00:00+09:00`).toISOString();
  const automatic = { ...entry.workout, clientId: 'automatic-session', startedAt: start, endedAt: start };
  await assert.rejects(() => api.saveAutomatic(alice, created.id, automatic), (e) => e.status === 403);
  await api.sharing(alice, created.id, true);
  assert.equal((await api.list(alice))[0].sharingSince, month);
  await api.saveAutomatic(alice, created.id, automatic);
  await api.saveAutomatic(alice, created.id, automatic);
  assert.deepEqual((await api.automaticKeys(alice, created.id)).clientIds, ['automatic-session']);
  const compared = await api.comparison(bob, created.id, month);
  assert.equal(compared.rankings.length, 2);
  assert.ok(compared.rankings.find((r) => r.id === alice.id).sets > 0);
  assert.equal(compared.rankings.find((r) => r.id === bob.id).sets, 0);
  await assert.rejects(() => api.comparison(outsider, created.id, month), (e) => e.status === 404);
  await api.deleteAutomatic(alice, created.id, automatic.clientId);
  assert.deepEqual((await api.automaticKeys(alice, created.id)).clientIds, []);
  await api.sharing(alice, created.id, false);
  assert.equal((await api.detail(alice, created.id)).posts.length, 1);
  const previousCode = (await api.list(alice))[0].inviteCode;
  await assert.rejects(() => api.rotateInvite(bob, created.id), e => e.status === 403);
  await api.rotateInvite(alice, created.id);
  await assert.rejects(() => api.join(outsider, previousCode), e => e.status === 404);
  await api.removeMember(alice, created.id, bob.id);
  await assert.rejects(() => api.detail(bob, created.id), e => e.status === 404);
  await api.join(bob, (await api.list(alice))[0].inviteCode);
  await api.leave(bob, created.id);
  await assert.rejects(
    () => api.detail(bob, created.id),
    (e) => e.status === 404,
  );
  const transferred = await api.create(alice, 'Transfer');
  const transferRoom = (await api.list(alice)).find(r => r.id === transferred.id);
  assert.equal(transferRoom.competitive, false);
  await api.join(bob, transferRoom.inviteCode);
  await api.leave(alice, transferred.id);
  assert.equal((await api.list(bob))[0].ownerId, bob.id);
  await api.deleteRoom(bob, transferred.id);
  await api.deleteAccount(alice);
  assert.equal((await api.list(bob)).length, 0);
  await assert.rejects(
    () => api.list(alice),
    (e) => e.status === 401,
  );
});

test('shared snapshots stay within server limits without changing local data', () => {
  const { workoutSnapshot } = require('../src/rooms.ts');
  const state = seedState();
  const exercise = { ...state.exercises[0], name: `${'あ'.repeat(90)}\u0007` };
  state.exercises = [exercise];
  state.presets = [{ id: 'p', name: '   ', exercises: [] }];
  state.sessions = [{ id: 10, presetId: 'p', status: 'COMPLETED', startedAt: '2026-10-01T00:00:00.000Z', endedAt: '2026-10-20T00:00:00.000Z' }];
  state.sets = [{ id: 11, sessionId: 10, exerciseId: exercise.id, setOrder: 1, normalWeightKg: 50, normalReps: 5, isCompleted: true, leftCompleted: false, rightCompleted: false }];
  const snapshot = workoutSnapshot(state, 10);
  assert.equal(snapshot.presetName, 'トレーニング');
  assert.equal([...snapshot.exercises[0].name].length, 80);
  assert.equal(snapshot.endedAt, '2026-10-08T00:00:00.000Z');
  assert.equal(state.exercises[0].name.length, 91);
});

test('rooms client retains premium_required code from the real Worker', async t => {
  const { serveWorker } = await import('../../rooms-server/cloudflare/test/local-worker.mjs');
  const server = await serveWorker();
  t.after(() => server.close());
  const api = createRoomsClient(server.url);
  const { TERMS_VERSION } = require('../src/legal.ts');
  const owner = await api.register('Free', null, TERMS_VERSION);
  await api.create(owner, 'One');
  await api.create(owner, 'Two');
  await assert.rejects(() => api.create(owner, 'Three'), error => error.status === 402 && error.code === 'premium_required');
  assert.equal((await api.list(owner)).length, 2);
});
