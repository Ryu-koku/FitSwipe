const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
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

test('React Native client interoperates with the Python rooms API, including automatic sharing', async (t) => {
  const python = spawn(
    'python3',
    [
      '-u',
      '-c',
      `
import tempfile
from wsgiref.simple_server import make_server, WSGIRequestHandler
from server import Application, Store
class Quiet(WSGIRequestHandler):
    def log_message(self, *args): pass
with tempfile.TemporaryDirectory(prefix="rn-rooms-") as directory:
    app = Application(Store(directory + "/rooms.sqlite3"))
    server = make_server("127.0.0.1", 0, app, handler_class=Quiet)
    print(server.server_port, flush=True)
    server.serve_forever()
`,
    ],
    {
      cwd: path.resolve(__dirname, '../../rooms-server'),
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  t.after(() => python.kill());
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('test server did not start')),
      10000,
    );
    python.stdout.once('data', (data) => {
      clearTimeout(timer);
      resolve(Number(String(data).trim()));
    });
    python.stderr.once('data', (data) => {
      clearTimeout(timer);
      reject(new Error(String(data)));
    });
    python.once('error', reject);
  });
  const api = createRoomsClient(`http://127.0.0.1:${port}`);
  const alice = await api.register('Alice');
  const bob = await api.register('Bob');
  const outsider = await api.register('Outsider');
  const created = await api.create(alice, 'Friends');
  assert.deepEqual(Object.keys(created), ['id']);
  let list = await api.list(alice);
  assert.equal(list[0].name, 'Friends');
  assert.equal(list[0].ownerId, alice.id);
  assert.ok(list[0].inviteCode);
  await api.join(bob, `fitswipe://room?code=${list[0].inviteCode}`);
  await assert.rejects(
    () => api.detail(outsider, created.id),
    (e) => e.status === 404,
  );
  let state = startWorkout(seedState());
  while (state.workout) state = advanceWorkout(state);
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
  await api.leave(bob, created.id);
  await assert.rejects(
    () => api.detail(bob, created.id),
    (e) => e.status === 404,
  );
  await api.deleteAccount(alice);
  assert.equal((await api.list(bob)).length, 0);
  await assert.rejects(
    () => api.list(alice),
    (e) => e.status === 401,
  );
});
