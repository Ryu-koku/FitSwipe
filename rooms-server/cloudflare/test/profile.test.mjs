import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import test from 'node:test';
const base = process.env.WORKER_URL ?? 'http://127.0.0.1:8788';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Local only');
async function call(path, token, method = 'GET', body) {
  if (path === '/v1/account' && method === 'POST') body = { ...body, termsVersion: '2026-11-09' };
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}
test('profile photos persist in members, room previews and rankings; rename preserves and null removes', async () => {
  const avatar = 'data:image/jpeg;base64,/9j/2Q==';
  const created = await call('/v1/account', null, 'POST', { name: 'Profile', avatar });
  assert.equal(created.status, 200);
  const account = created.data;
  try {
    assert.equal(account.avatar, avatar);
    const room = (await call('/v1/rooms', account.token, 'POST', { name: 'Profile test' })).data;
    const changed = await call('/v1/account', account.token, 'PUT', { name: 'Changed', avatar });
    assert.equal(changed.status, 200);
    assert.deepEqual(changed.data, { name: 'Changed', avatar });
    assert.deepEqual((await call('/v1/rooms', account.token)).data.rooms[0].memberProfiles, [{ name: 'Changed', avatar }]);
    assert.equal((await call(`/v1/rooms/${room.id}`, account.token)).data.members[0].avatar, avatar);
    const month = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 7);
    assert.equal((await call(`/v1/rooms/${room.id}/comparison?month=${month}`, account.token)).data.rankings[0].avatar, avatar);
    assert.equal((await call('/v1/account', account.token, 'PUT', { name: 'Legacy rename' })).data.avatar, avatar);
    for (const bad of ['https://example.com/a.jpg', 'data:image/svg+xml,<svg/>', 'a'.repeat(24001), 1]) {
      assert.equal((await call('/v1/account', account.token, 'PUT', { name: 'Invalid', avatar: bad })).status, 400);
    }
    assert.equal((await call('/v1/account', account.token, 'PUT', { name: 'Final', avatar: null })).status, 200);
    assert.equal((await call(`/v1/rooms/${room.id}`, account.token)).data.members[0].avatar, null);
    assert.equal((await call('/v1/account', 'invalid-token-value-that-is-long', 'PUT', { name: 'Wrong', avatar })).status, 401);
  } finally { await call('/v1/account', account.token, 'DELETE'); }
});


test('Google default can be retained on rename, replaced or removed without accepting arbitrary URLs', { skip: !process.env.SYNC_TEST_PERSIST }, async () => {
  const account = (await call('/v1/account', null, 'POST', { name: 'Google photo' })).data;
  const avatar = 'https://lh3.googleusercontent.com/a/test-profile';
  try {
    assert.match(account.id, /^[a-f0-9-]{36}$/);
    execFileSync('wrangler', ['d1', 'execute', 'fitswipe-rooms', '--local', '--persist-to', process.env.SYNC_TEST_PERSIST,
      '--command', `UPDATE users SET avatar='${avatar}', avatar_custom=0 WHERE id='${account.id}'`], { stdio: 'pipe' });
    assert.deepEqual((await call('/v1/account', account.token, 'PUT', { name: 'Renamed', avatar })).data, { name: 'Renamed', avatar });
    assert.equal((await call('/v1/account', account.token, 'PUT', { name: 'Renamed', avatar: 'https://lh3.googleusercontent.com/another-user' })).status, 400);
    assert.equal((await call('/v1/account', account.token, 'PUT', { name: 'Renamed', avatar: null })).status, 200);
    execFileSync('wrangler', ['d1', 'execute', 'fitswipe-rooms', '--local', '--persist-to', process.env.SYNC_TEST_PERSIST,
      '--command', `UPDATE users SET avatar='${avatar}' WHERE id='${account.id}' AND avatar_custom=0`], { stdio: 'pipe' });
    // The login update must not undo the explicit removal.
    assert.equal((await call('/v1/account', account.token, 'PUT', { name: 'Still removed' })).data.avatar, null);
  } finally { await call('/v1/account', account.token, 'DELETE'); }
});
