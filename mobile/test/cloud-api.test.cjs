const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { createRoomsClient } = require('../src/rooms.ts');
const { seedState } = require('../src/logic.ts');
const { importWorkoutCsv } = require('../src/csv.ts');
const { workoutSnapshot } = require('../src/rooms.ts');
const { emptyCloud, trackChanges, receive, acknowledge } = require('../src/sync.ts');

test('app sync restores dates and settings through the real local Worker and D1', {
  skip: !process.env.SYNC_TEST_PERSIST || !process.env.WORKER_URL,
}, async () => {
  const url = new URL(process.env.WORKER_URL);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'local-only fixtures');
  const client = createRoomsClient(url.href.replace(/\/$/, ''));
  const identity = { ...await client.register('mobile-sync-test', undefined, '2026-11-09'), expiresAt: 9999999999 };
  try {
    assert.match(identity.id, /^[a-f0-9-]{36}$/);
    execFileSync('wrangler', ['d1', 'execute', 'fitswipe-rooms', '--local', '--persist-to', process.env.SYNC_TEST_PERSIST,
      '--command', `UPDATE users SET google_subject = id WHERE id = '${identity.id}'`], {
      cwd: path.resolve(__dirname, '../../rooms-server/cloudflare'), stdio: 'pipe',
    });
    const before = { ...seedState(), cloud: emptyCloud(identity) };
    let state = trackChanges({ ...before, cloud: undefined }, {
      ...before,
      themeMode: 'dark',
      heightCm: 170,
      bodyMeasurements: [{ id: randomUUID(), measuredAt: '2026-11-08T01:00:00Z', weightKg: 65, bodyFatPercent: 20, heightCm: 170 }],
      sessions: [{ id: 10000, startedAt: '2026-10-28T10:00:00Z', endedAt: '2026-10-28T11:00:00Z', status: 'COMPLETED' }],
    }, randomUUID);
    while (state.cloud.pending.length) {
      const response = await client.push(identity, state.cloud.pending.slice(0, 50));
      state = acknowledge(state, response.acknowledged);
    }
    const page = await client.pull(identity, 0);
    const restored = receive({ ...seedState(), cloud: emptyCloud(identity) }, page);
    assert.equal(restored.themeMode, 'dark');
    assert.equal(restored.heightCm, 170);
    assert.deepEqual(restored.bodyMeasurements, state.bodyMeasurements);
    assert.equal(restored.sessions[0].startedAt, '2026-10-28T10:00:00Z');
    assert.equal(restored.sessions[0].endedAt, '2026-10-28T11:00:00Z');
    assert.equal(restored.exercises.length, before.exercises.length);
    assert.equal(restored.cloud.pending.length, 0);
    assert.equal((await client.pull(identity, page.cursor)).changes.length, 0);
    const room = await client.create(identity, 'CSV review test');
    const imported = importWorkoutCsv(seedState(), 'date,exercise,weightKg,reps\n2026-11-08,bench,50,10');
    const saved = await client.post(identity, { roomId: room.id, workout: workoutSnapshot(imported, imported.sessions[0].id) });
    assert.ok(saved.id);
    await client.deleteRoom(identity, room.id);
  } finally {
    await client.deleteAccount(identity);
  }
});
test('non-JSON gateway responses produce a friendly RoomsApiError with the HTTP status', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => new Response('<html>Bad gateway</html>', { status: 502 });
  try {
    const client = createRoomsClient('http://localhost:8888');
    await assert.rejects(client.pull({ token: 'test' }, 0), error => {
      assert.equal(error.constructor.name, 'RoomsApiError'); assert.equal(error.status, 502);
      assert.equal(error.message, 'サーバーに接続できませんでした。再度お試しください'); return true;
    });
  } finally { global.fetch = originalFetch; }
});
