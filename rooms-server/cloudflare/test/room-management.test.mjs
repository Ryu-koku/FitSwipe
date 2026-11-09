import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { retentionStart, japanMonth } from '../room-comparison.mjs';
const base = process.env.WORKER_URL ?? 'http://127.0.0.1:8788';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Local only');
async function call(path, token, method = 'GET', body) {
  if (path === '/v1/account' && method === 'POST') body = { ...body, termsVersion: '2026-11-09' };
  const r = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, data: await r.json() };
}
const workout = (clientId, startedAt = new Date().toISOString()) => ({ clientId, presetName: 'Gym', startedAt, endedAt: startedAt, exercises: [{ name: 'Press', sets: [{ order: 1, reps: 10 }] }] });

test('owner management, invite revocation, transfer, and explicit deletion', async () => {
  const accounts = [];
  try {
    for (const name of ['owner', 'first', 'second', 'outsider']) {
      const result = await call('/v1/account', null, 'POST', { name });
      assert.equal(result.status, 200); accounts.push(result.data);
    }
    const [owner, first, second, outsider] = accounts;
    const made = await call('/v1/rooms', owner.token, 'POST', { name: '  management  ' });
    const path = `/v1/rooms/${made.data.id}`;
    let room = (await call('/v1/rooms', owner.token)).data.rooms[0];
    assert.equal(room.competitive, false);
    assert.equal(room.name, 'management');
    const oldCode = room.inviteCode;
    for (const member of [first, second]) assert.equal((await call('/v1/rooms/join', member.token, 'POST', { code: oldCode })).status, 200);
    assert.equal((await call(path + '/invite', first.token, 'POST', {})).status, 403);
    assert.equal((await call(path + '/members/' + second.id, first.token, 'DELETE')).status, 403);
    assert.equal((await call(path + '/members/' + owner.id, owner.token, 'DELETE')).status, 400);
    assert.equal((await call(path + '/invite', outsider.token, 'POST', {})).status, 404);
    assert.equal((await call(path + '/invite', owner.token, 'POST', {})).status, 200);
    assert.equal((await call('/v1/rooms/join', outsider.token, 'POST', { code: oldCode })).status, 404);
    room = (await call('/v1/rooms', owner.token)).data.rooms[0];
    assert.notEqual(room.inviteCode, oldCode);
    assert.equal((await call('/v1/rooms/join', outsider.token, 'POST', { code: room.inviteCode })).status, 200);
    for (const member of [owner, first, second]) {
      assert.equal((await call(path + '/posts', member.token, 'POST', workout(member.id))).status, 200);
      await call(path + '/sharing', member.token, 'PUT', { enabled: true });
      assert.equal((await call(path + '/auto-workouts', member.token, 'PUT', workout('auto-' + member.id))).status, 200);
    }
    assert.equal((await call(path + '/members/' + second.id, owner.token, 'DELETE')).status, 200);
    for (const suffix of ['', '/posts', '/auto-workouts', '/comparison?month=' + japanMonth()]) assert.equal((await call(path + suffix, second.token)).status, 404);
    assert.equal((await call(path + '/posts', second.token, 'POST', workout('retry'))).status, 404);
    assert.equal((await call(path + '/auto-workouts', second.token, 'PUT', workout('retry'))).status, 404);
    assert.equal((await call(path + '/leave', owner.token, 'POST', {})).status, 200);
    assert.equal((await call(path, owner.token)).status, 404);
    room = (await call('/v1/rooms', first.token)).data.rooms[0];
    assert.equal(room.ownerId, first.id);
    assert.deepEqual((await call(path + '/posts', first.token)).data.posts.map(p => p.userId), [first.id]);
    assert.ok((await call(path + '/comparison?month=' + japanMonth(), first.token)).data.posts.every(p => p.userId === first.id));
    // Explicit whole-room deletion is separate from the new leave endpoint.
    assert.equal((await call(path, first.token, 'DELETE')).status, 200);
    assert.equal((await call(path, outsider.token)).status, 404);
    const alone = (await call('/v1/rooms', owner.token, 'POST', { name: 'alone', competitive: true })).data;
    assert.equal((await call('/v1/rooms', owner.token)).data.rooms[0].competitive, true);
    assert.equal((await call(`/v1/rooms/${alone.id}/leave`, owner.token, 'POST', {})).status, 200);
    assert.equal((await call('/v1/rooms', owner.token)).data.rooms.length, 0);
  } finally { for (const a of accounts) await call('/v1/account', a.token, 'DELETE'); }
});

test('retention follows the Japanese calendar including year boundaries', () => {
  assert.equal(retentionStart(new Date('2026-10-31T14:59:59Z')), '2025-10-31T15:00:00.000Z');
  assert.equal(retentionStart(new Date('2026-10-31T15:00:00Z')), '2025-11-30T15:00:00.000Z');
  assert.equal(retentionStart(new Date('2026-01-01T00:00:00Z')), '2025-01-31T15:00:00.000Z');
});

test('expired automatic copies are pruned, cannot be reuploaded, and manual shares survive', { skip: !process.env.SYNC_TEST_PERSIST }, async () => {
  const owner = (await call('/v1/account', null, 'POST', { name: 'retention' })).data;
  try {
    const room = (await call('/v1/rooms', owner.token, 'POST', { name: 'retention' })).data;
    const path = `/v1/rooms/${room.id}`;
    const boundary = retentionStart();
    const old = new Date(new Date(boundary).getTime() - 1000).toISOString();
    assert.equal((await call(path + '/posts', owner.token, 'POST', workout('manual', old))).status, 200);
    await call(path + '/sharing', owner.token, 'PUT', { enabled: true });
    assert.match(room.id, /^[a-f0-9-]{36}$/); assert.match(owner.id, /^[a-f0-9-]{36}$/);
    const payload = JSON.stringify(workout('expired', old)).replaceAll("'", "''");
    execFileSync('wrangler', ['d1', 'execute', 'fitswipe-rooms', '--local', '--persist-to', process.env.SYNC_TEST_PERSIST, '--command',
      `UPDATE room_sharing SET since_month='2020-01' WHERE room_id='${room.id}'; INSERT INTO auto_workouts(id,room_id,user_id,client_id,created_at,payload) VALUES ('expired','${room.id}','${owner.id}','expired','${old}','${payload}');`], { cwd: new URL('..', import.meta.url), stdio: 'pipe' });
    // Exercise the scheduled handler as well as read-time cleanup.
    const scheduled = await fetch(base + '/__scheduled?cron=0+15+*+*+*');
    assert.equal(scheduled.status, 200);
    const counted = execFileSync('wrangler', ['d1', 'execute', 'fitswipe-rooms', '--local', '--persist-to', process.env.SYNC_TEST_PERSIST, '--json', '--command',
      `SELECT count(*) AS n FROM auto_workouts WHERE room_id='${room.id}'`], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
    assert.equal(JSON.parse(counted)[0].results[0].n, 0);
    assert.deepEqual((await call(path + '/auto-workouts', owner.token)).data.clientIds, []);
    assert.equal((await call(path + '/auto-workouts', owner.token, 'PUT', workout('expired', old))).status, 400);
    assert.equal((await call(path + '/auto-workouts', owner.token, 'PUT', workout('boundary', boundary))).status, 200);
    assert.equal((await call(path + '/posts', owner.token)).data.posts.length, 1);
    assert.equal((await call(path + '/comparison?month=' + japanMonth(new Date(old)), owner.token)).data.posts[0].automatic, false);
  } finally { await call('/v1/account', owner.token, 'DELETE'); }
});


test('concurrent room creation and joining preserve the per-user room limit', async () => {
  const owner = (await call('/v1/account', null, 'POST', { name: 'limits' })).data;
  const guest = (await call('/v1/account', null, 'POST', { name: 'join-limit' })).data;
  try {
    const created = await Promise.all(Array.from({ length: 32 }, () => call('/v1/rooms', owner.token, 'POST', {})));
    assert.equal(created.filter(r => r.status === 200).length, 30);
    assert.ok(created.filter(r => r.status !== 200).every(r => r.status === 400 && r.data.error === '参加できるルームは30個までです'));
    const rooms = (await call('/v1/rooms', owner.token)).data.rooms;
    assert.equal(rooms.length, 30);
    assert.ok(rooms.every(r => r.name === '筋トレ仲間'));
    for (let i = 0; i < 29; i++) assert.equal((await call('/v1/rooms', guest.token, 'POST', {})).status, 200);
    const joined = await Promise.all(rooms.slice(0, 2).map(room => call('/v1/rooms/join', guest.token, 'POST', { code: room.inviteCode })));
    assert.deepEqual(joined.map(r => r.status).sort(), [200, 400]);
    assert.equal((await call('/v1/rooms', guest.token)).data.rooms.length, 30);
    const accepted = rooms[joined.findIndex(r => r.status === 200)];
    assert.equal((await call('/v1/rooms/join', guest.token, 'POST', { code: accepted.inviteCode })).status, 200);
  } finally {
    await call('/v1/account', guest.token, 'DELETE');
    await call('/v1/account', owner.token, 'DELETE');
  }
});


test('concurrent joins preserve the 100-member room limit', { skip: !process.env.SYNC_TEST_PERSIST }, async () => {
  const accounts = [];
  const fixturePrefix = crypto.randomUUID();
  try {
    for (const name of ['capacity-owner', 'capacity-first', 'capacity-second']) accounts.push((await call('/v1/account', null, 'POST', { name })).data);
    const [owner, first, second] = accounts;
    const room = (await call('/v1/rooms', owner.token, 'POST', {})).data;
    const code = (await call('/v1/rooms', owner.token)).data.rooms[0].inviteCode;
    const fixtures = Array.from({ length: 98 }, (_, i) => `${fixturePrefix}-${i}`);
    const sql = fixtures.map(id => `INSERT INTO users(id,name,token_hash) VALUES('${id}','fixture','${id}'); INSERT INTO members(room_id,user_id) VALUES('${room.id}','${id}');`).join(' ');
    execFileSync('wrangler', ['d1', 'execute', 'fitswipe-rooms', '--local', '--persist-to', process.env.SYNC_TEST_PERSIST, '--command', sql], { cwd: new URL('..', import.meta.url), stdio: 'pipe' });
    const responses = await Promise.all([first, second].map(account => call('/v1/rooms/join', account.token, 'POST', { code })));
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 400]);
    assert.equal(responses.find(r => r.status === 400).data.error, 'ルームの人数が上限に達しています');
    assert.equal((await call(`/v1/rooms/${room.id}`, owner.token)).data.members.length, 100);
    assert.equal((await call('/v1/rooms/join', owner.token, 'POST', { code })).status, 200);
  } finally {
    for (const account of accounts.slice().reverse()) await call('/v1/account', account.token, 'DELETE');
    execFileSync('wrangler', ['d1', 'execute', 'fitswipe-rooms', '--local', '--persist-to', process.env.SYNC_TEST_PERSIST, '--command', `DELETE FROM rooms WHERE owner_id LIKE '${fixturePrefix}-%'; DELETE FROM users WHERE id LIKE '${fixturePrefix}-%';`], { cwd: new URL('..', import.meta.url), stdio: 'pipe' });
  }
});
