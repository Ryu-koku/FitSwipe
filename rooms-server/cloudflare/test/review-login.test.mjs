import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.mjs';
import { localDatabase } from './local-worker.mjs';

const password = 'local-test-only-credential-123';
const digest = async value => Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))).toString('hex');

test('review login authenticates separately, syncs, revokes sessions and supports deletion', async () => {
  const env = { ...localDatabase(), REVIEW_LOGIN: 'review', REVIEW_PASSWORD_SHA256: await digest(password) };
  const call = async (path, method = 'POST', body, token) => {
    const response = await worker.fetch(new Request(`https://local.test${path}`, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }), env);
    return { status: response.status, data: await response.json() };
  };
  const credentials = { login: 'review', password, termsVersion: '2026-11-09' };
  try {
    assert.equal((await call('/v1/auth/review', 'POST', { ...credentials, password: 'wrong' })).status, 401);
    assert.equal((await call('/v1/auth/review', 'POST', { ...credentials, login: 'other' })).status, 401);
    assert.equal(env.db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 0);
    assert.equal((await call('/v1/auth/review', 'POST', { ...credentials, termsVersion: 'old' })).status, 428);
    const first = await call('/v1/auth/review', 'POST', credentials);
    assert.equal(first.status, 200);
    const account = first.data;
    assert.equal(env.db.prepare('SELECT google_subject FROM users WHERE id=?').get(account.id).google_subject, null);
    const second = (await call('/v1/auth/review', 'POST', credentials)).data;
    assert.equal(second.id, account.id);
    assert.notEqual(second.token, account.token);
    const mutation = { kind: 'setting', id: crypto.randomUUID(), mutationId: crypto.randomUUID(), deleted: false, payload: { field: 'heightCm', value: 170 } };
    assert.equal((await call('/v1/sync', 'POST', { changes: [mutation] }, account.token)).status, 200);
    const pull = await call('/v1/sync?cursor=0', 'GET', undefined, second.token);
    assert.equal(pull.status, 200);
    assert.deepEqual(pull.data.changes[0].payload, mutation.payload);
    assert.equal((await call('/v1/auth/session', 'DELETE', undefined, account.token)).status, 200);
    assert.equal((await call('/v1/sync', 'GET', undefined, account.token)).status, 401);
    assert.equal((await call('/v1/account', 'DELETE', undefined, second.token)).status, 200);
    assert.equal((await call('/v1/sync', 'GET', undefined, second.token)).status, 401);
    const recreated = (await call('/v1/auth/review', 'POST', credentials)).data;
    assert.notEqual(recreated.id, account.id);
    assert.deepEqual((await call('/v1/sync', 'GET', undefined, recreated.token)).data.changes, []);
    env.db.prepare('UPDATE users SET suspended=1 WHERE id=?').run(recreated.id);
    assert.equal((await call('/v1/auth/review', 'POST', credentials)).status, 403);
    delete env.REVIEW_PASSWORD_SHA256;
    assert.equal((await call('/v1/auth/review', 'POST', credentials)).status, 503);
  } finally { env.db.close(); }
});
