import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { japanMonth } from '../room-comparison.mjs';
const base = process.env.WORKER_URL ?? 'http://127.0.0.1:8788';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local only');
async function call(path, token, method = 'GET', body) {
  if (path === '/v1/account' && method === 'POST') body = { ...body, termsVersion: '2026-11-09' };
  const response = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}
const sql = text => execFileSync('wrangler', ['d1', 'execute', 'fitswipe-rooms', '--local', '--persist-to', process.env.SYNC_TEST_PERSIST, '--command', text], { cwd: new URL('..', import.meta.url), stdio: 'pipe' });
const payload = clientId => ({ clientId, presetName: 'Capacity test', startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), exercises: [{ name: 'Press', sets: [{ order: 1, reps: 10 }] }] });

test('consent is bound to the displayed month, and member detail queries isolate posts', async () => {
  const owner = (await call('/v1/account', null, 'POST', { name: 'Requirements owner' })).data;
  const guest = (await call('/v1/account', null, 'POST', { name: 'Requirements guest' })).data;
  try {
    const room = (await call('/v1/rooms', owner.token, 'POST', { name: 'Requirements' })).data;
    const path = `/v1/rooms/${room.id}`;
    const code = (await call('/v1/rooms', owner.token)).data.rooms[0].inviteCode;
    assert.equal((await call(path + '/sharing', owner.token, 'PUT', { enabled: true, sinceMonth: '2000-01' })).status, 409);
    assert.equal((await call(path + '/auto-workouts', owner.token, 'PUT', payload('not-consented'))).status, 403);
    assert.equal((await call(path + '/comparison?month=' + japanMonth() + '&memberId=' + owner.id, guest.token)).status, 404);
    await call('/v1/rooms/join', guest.token, 'POST', { code });
    for (const account of [owner, guest]) {
      assert.equal((await call(path + '/sharing', account.token, 'PUT', { enabled: true, sinceMonth: japanMonth() })).status, 200);
      assert.equal((await call(path + '/auto-workouts', account.token, 'PUT', payload(account.id))).status, 200);
    }
    const result = await call(path + '/comparison?month=' + japanMonth() + '&memberId=' + guest.id, owner.token);
    assert.equal(result.status, 200); assert.equal(result.data.memberId, guest.id);
    assert.equal(result.data.posts.length, 1); assert.equal(result.data.posts[0].userId, guest.id);
    assert.deepEqual(result.data.rankings.map(r => r.sets), [1, 1]);
    assert.ok(result.data.fetchedAt);
  } finally { for (const account of [owner, guest]) await call('/v1/account', account.token, 'DELETE'); }
});

test('room can exceed 10000 records; concurrent uploads obey only the member quota and deleted rows free capacity', { skip: !process.env.SYNC_TEST_PERSIST }, async () => {
  const owner = (await call('/v1/account', null, 'POST', { name: 'Quota owner' })).data;
  const others = Array.from({ length: 11 }, () => randomUUID());
  try {
    const room = (await call('/v1/rooms', owner.token, 'POST', { name: 'Quota' })).data;
    const path = `/v1/rooms/${room.id}`;
    await call(path + '/sharing', owner.token, 'PUT', { enabled: true });
    const data = JSON.stringify(payload('fixture'));
    sql(others.map(id => `INSERT INTO users(id,name,token_hash) VALUES('${id}','fixture','${id}'); INSERT INTO members(room_id,user_id) VALUES('${room.id}','${id}'); INSERT INTO room_sharing VALUES('${room.id}','${id}','${japanMonth()}');`).join('\n') +
      `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<1000)
       INSERT INTO auto_workouts(id,room_id,user_id,client_id,created_at,payload)
       SELECT m.user_id || '-' || i,m.room_id,m.user_id,'fixture-' || i,'${new Date().toISOString()}','${data}'
       FROM members m,n WHERE m.room_id='${room.id}' AND (m.user_id<>'${owner.id}' OR i<1000);`);
    const results = await Promise.all(['new-a', 'new-b'].map(id => call(path + '/auto-workouts', owner.token, 'PUT', payload(id))));
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    let usage = (await call(path + '/auto-workouts', owner.token)).data;
    assert.equal(usage.used, 1000); assert.equal(usage.limit, 1000);
    assert.equal((await call(path + '/auto-workouts', owner.token, 'PUT', payload('fixture-1'))).status, 200);
    await call(path + '/auto-workouts/fixture-2', owner.token, 'DELETE');
    assert.equal((await call(path + '/auto-workouts', owner.token, 'PUT', payload('new-c'))).status, 200);
    assert.equal((await call(path + '/auto-workouts', owner.token, 'PUT', payload('fixture-2'))).status, 409);
  } finally {
    await call('/v1/account', owner.token, 'DELETE');
    sql(`DELETE FROM rooms WHERE owner_id IN (${others.map(id => `'${id}'`).join(',')}); DELETE FROM users WHERE id IN (${others.map(id => `'${id}'`).join(',')});`);
  }
});
