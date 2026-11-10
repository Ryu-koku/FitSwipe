import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.mjs';
import { localDatabase } from './local-worker.mjs';

test('oversized chunked requests stop reading and cancel at the byte limit', async () => {
  let pulls = 0, cancelled = false;
  const body = new ReadableStream({
    pull(controller) {
      pulls++;
      if (pulls <= 20) controller.enqueue(new Uint8Array(65536));
      else controller.close();
    },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  const result = await worker.fetch(new Request('https://worker/v1/account', {
    method: 'POST', body, duplex: 'half',
  }), localDatabase());
  assert.equal(result.status, 413);
  assert.ok(pulls <= 3, `read ${pulls} chunks before rejecting`);
  assert.equal(cancelled, true);
});

test('unexpected dependency errors cannot copy credentials or personal data to logs', async (t) => {
  const secret = 'Bearer synthetic-private-session; private-profile';
  const calls = [];
  t.mock.method(console, 'error', (...args) => calls.push(args));
  const env = { API_LIMIT: { limit: async () => { throw Error(secret); } } };
  const result = await worker.fetch(new Request('https://worker/v1/rooms'), env);
  assert.equal(result.status, 500);
  assert.ok(!(await result.text()).includes(secret));
  assert.equal(calls.length, 1);
  assert.ok(!JSON.stringify(calls).includes(secret));
});

const call = (env, path, token, method = 'GET', body) => worker.fetch(new Request(`https://worker${path}`, {
  method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', Origin: 'https://untrusted.test' },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
}), env);

test('outsiders and removed members cannot read profiles/posts or mutate a room; body extras are never shared', async () => {
  const env = localDatabase();
  const accounts = [];
  for (const name of ['owner', 'member', 'outsider']) {
    accounts.push(await (await call(env, '/v1/account', null, 'POST', { name, termsVersion: '2026-11-09' })).json());
  }
  const [owner, member, outsider] = accounts;
  const { id } = await (await call(env, '/v1/rooms', owner.token, 'POST', { name: 'private' })).json();
  const path = `/v1/rooms/${id}`;
  const [{ inviteCode }] = (await (await call(env, '/v1/rooms', owner.token)).json()).rooms;
  assert.match(inviteCode, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/u);
  await call(env, '/v1/rooms/join', member.token, 'POST', { code: inviteCode });
  const workout = { clientId: 'private-record', presetName: 'Gym', startedAt: '2026-11-01T10:00:00Z', endedAt: '2026-11-01T11:00:00Z',
    bodyMeasurements: [{ weightKg: 77 }], token: 'private-token-in-extra', exercises: [{ name: 'Press', token: 'nested-private', sets: [{ order: 1, reps: 5, bodyFat: 20 }] }] };
  const saved = await (await call(env, path + '/posts', owner.token, 'POST', workout)).json();
  for (const actor of [outsider, { token: undefined }]) {
    for (const [suffix, method, body] of [['', 'GET'], ['/posts', 'GET'], ['/comparison?month=2026-11', 'GET'], ['/auto-workouts', 'GET'],
      ['/posts', 'POST', workout], ['/invite', 'POST', {}], [`/members/${member.id}`, 'DELETE'], [`/posts/${saved.id}`, 'DELETE']]) {
      assert.equal((await call(env, path + suffix, actor.token, method, body)).status, actor.token ? 404 : 401);
    }
  }
  const read = await call(env, path + '/posts', member.token);
  assert.equal(read.headers.get('access-control-allow-origin'), null);
  const serialized = await read.text();
  for (const field of ['bodyMeasurements', 'bodyFat', 'private-token-in-extra', 'nested-private']) assert.ok(!serialized.includes(field));
  assert.equal((await call(env, path + '/posts/' + saved.id, member.token, 'DELETE')).status, 404);
  await call(env, path + '/members/' + member.id, owner.token, 'DELETE');
  assert.equal((await call(env, path, member.token)).status, 404);
  assert.equal((await call(env, path + '/posts', member.token, 'POST', workout)).status, 404);
  await call(env, '/v1/account', owner.token, 'DELETE');
  assert.equal((await call(env, path, owner.token)).status, 401);
  assert.equal(env.db.prepare('SELECT count(*) AS n FROM posts WHERE user_id=?').get(owner.id).n, 0);
  assert.equal(env.db.prepare('SELECT count(*) AS n FROM members WHERE user_id=?').get(owner.id).n, 0);
  env.db.close();
});
