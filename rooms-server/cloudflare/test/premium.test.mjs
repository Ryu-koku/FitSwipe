import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../worker.mjs';
import { localDatabase } from './local-worker.mjs';
import { isPremium } from '../premium.mjs';
import { TERMS_VERSION } from '../safety.mjs';

function fixture(t) {
  const env = localDatabase();
  t.after(() => env.db.close());
  const call = async (path, token, method = 'GET', body) => {
    const response = await worker.fetch(new Request(`https://local.test${path}`, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }), env);
    return { status: response.status, data: await response.json() };
  };
  return { env, call };
}
const customer = expires_date => new Response(JSON.stringify({ subscriber: { entitlements: { premium: { expires_date } } } }));

test('RevenueCat checks expiry, lifetime, invalid replies and failures', async () => {
  const now = Date.parse('2026-11-10T00:00:00Z');
  for (const [expiry, expected] of [[null, true], ['2027-01-01', true], ['2026-11-10', false], ['invalid', false], [undefined, false]]) {
    assert.equal(await isPremium('user', 'secret', async () => customer(expiry), now), expected);
  }
  assert.equal(await isPremium('user', undefined, () => { throw Error('must not fetch'); }), false);
  assert.equal(await isPremium('user', 'secret', async () => { throw Error('offline'); }), false);
  assert.equal(await isPremium('user', 'secret', async () => new Response('{}', { status: 500 })), false);
  assert.equal(await isPremium('user', 'secret', async () => new Response('{}')), false);
});

test('first two creations never query RevenueCat, missing key rejects third, premium allows it', async t => {
  const { env, call } = fixture(t);
  env.REVENUECAT_SECRET_KEY = 'test-secret';
  let queries = 0;
  const owner = (await call('/v1/account', null, 'POST', { name: 'owner', termsVersion: TERMS_VERSION })).data;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    queries++;
    assert.equal(url, `https://api.revenuecat.com/v1/subscribers/${owner.id}`);
    assert.equal(options.headers.Authorization, 'Bearer test-secret');
    return customer('2099-01-01T00:00:00Z');
  });
  for (let i = 0; i < 2; i++) assert.equal((await call('/v1/rooms', owner.token, 'POST', {})).status, 200);
  assert.equal(queries, 0);
  delete env.REVENUECAT_SECRET_KEY;
  const denied = await call('/v1/rooms', owner.token, 'POST', {});
  assert.equal(denied.status, 402);
  assert.equal(denied.data.code, 'premium_required');
  assert.equal(typeof denied.data.error, 'string');
  assert.equal(queries, 0);
  env.REVENUECAT_SECRET_KEY = 'test-secret';
  assert.equal((await call('/v1/rooms', owner.token, 'POST', {})).status, 200);
  assert.equal(queries, 1);
  t.mock.method(globalThis, 'fetch', async () => customer('2000-01-01T00:00:00Z'));
  assert.equal((await call('/v1/rooms', owner.token, 'POST', {})).status, 402);
  t.mock.method(globalThis, 'fetch', async () => { throw Error('offline'); });
  assert.equal((await call('/v1/rooms', owner.token, 'POST', {})).status, 402);
  assert.equal((await call('/v1/rooms', owner.token)).data.rooms.length, 3);
});

test('conditional insert rejects a creation whose initial count became stale', async t => {
  const { env, call } = fixture(t);
  const owner = (await call('/v1/account', null, 'POST', { name: 'race', termsVersion: TERMS_VERSION })).data;
  for (let i = 0; i < 2; i++) await call('/v1/rooms', owner.token, 'POST', {});
  const prepare = env.DB.prepare;
  env.DB.prepare = sql => sql === 'SELECT count(*) AS count FROM rooms WHERE owner_id = ?'
    ? { bind: () => ({ first: async () => ({ count: 1 }) }) } : prepare(sql);
  const denied = await call('/v1/rooms', owner.token, 'POST', {});
  assert.equal(denied.status, 402);
  assert.equal(denied.data.code, 'premium_required');
  assert.equal((await call('/v1/rooms', owner.token)).data.rooms.length, 2);
});
