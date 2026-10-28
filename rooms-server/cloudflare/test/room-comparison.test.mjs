import assert from 'node:assert/strict';
import test from 'node:test';
import { japanMonth, monthBounds } from '../room-comparison.mjs';

const base = process.env.WORKER_URL ?? 'http://127.0.0.1:8788';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Local server only');
const call = async (path, token, method = 'GET', body) => {
  const response = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, data: await response.json() };
};

test('Japan month boundaries are explicit and invalid periods are rejected', () => {
  assert.equal(japanMonth(new Date('2026-09-30T15:00:00Z')), '2026-10');
  assert.deepEqual(monthBounds('2026-12'), ['2026-11-30T15:00:00.000Z', '2026-12-31T15:00:00.000Z']);
  for (const month of [null, '2026-13', '2026-0', '0000-01']) assert.throws(() => monthBounds(month));
});

test('D1 automatic room sharing requires consent, deduplicates, counts pairs and retracts only automatic copies', async () => {
  const owner = (await call('/v1/account', null, 'POST', { name: 'auto-owner' })).data;
  const guest = (await call('/v1/account', null, 'POST', { name: 'auto-guest' })).data;
  try {
    const room = (await call('/v1/rooms', owner.token, 'POST', { name: 'automatic' })).data;
    const path = `/v1/rooms/${room.id}`;
    const month = japanMonth();
    const [start] = monthBounds(month);
    const payload = { clientId: 'auto-session', legacyClientId: 'legacy-session', presetName: 'Gym', startedAt: start, endedAt: start,
      exercises: [{ name: 'Curl', sets: [{ order: 1, side: '左', reps: 10, weightKg: 10 }, { order: 1, side: '右', reps: 9, weightKg: 12 }, { order: 2, side: '左', reps: 8, weightKg: 10 }] }] };
    assert.equal((await call(path + '/auto-workouts', owner.token, 'PUT', payload)).status, 403);
    assert.equal((await call(path + '/sharing', guest.token, 'PUT', { enabled: true })).status, 404);
    const listed = (await call('/v1/rooms', owner.token)).data.rooms;
    assert.deepEqual(listed[0].memberNames, ['auto-owner']);
    await call('/v1/rooms/join', guest.token, 'POST', { code: listed[0].inviteCode });
    assert.equal((await call(path + '/sharing', owner.token, 'PUT', { enabled: true })).status, 200);
    assert.equal((await call('/v1/rooms', owner.token)).data.rooms[0].sharingSince, month);
    assert.equal((await call(path + '/posts', owner.token, 'POST', { ...payload, clientId: payload.legacyClientId })).status, 200);
    for (let i = 0; i < 2; i++) assert.equal((await call(path + '/auto-workouts', owner.token, 'PUT', payload)).status, 200);
    assert.deepEqual((await call(path + '/auto-workouts', owner.token)).data.clientIds, [payload.clientId]);
    let compared = await call(path + '/comparison?month=' + month, guest.token);
    assert.equal(compared.status, 200);
    assert.deepEqual(compared.data.rankings.map((m) => m.sets), [1, 0]);
    assert.equal(compared.data.posts.length, 1);
    payload.exercises[0].sets.push({ order: 2, side: '右', reps: 7 });
    assert.equal((await call(path + '/auto-workouts', owner.token, 'PUT', payload)).status, 200);
    assert.equal((await call(path + '/comparison?month=' + month, guest.token)).data.rankings[0].sets, 2);
    const previous = new Date(new Date(start).getTime() - 1000).toISOString();
    assert.equal((await call(path + '/auto-workouts', owner.token, 'PUT', { ...payload, clientId: 'too-old', startedAt: previous, endedAt: previous })).status, 400);
    await call(path + '/auto-workouts/auto-session', guest.token, 'DELETE');
    assert.equal((await call(path + '/comparison?month=' + month, owner.token)).data.rankings[0].sets, 2);
    await call(path + '/auto-workouts/auto-session', owner.token, 'DELETE');
    assert.deepEqual((await call(path + '/comparison?month=' + month, owner.token)).data.rankings.map((m) => m.sets), [0, 0]);
    for (let i = 0; i < 55; i++) {
      const item = { ...payload, clientId: `page-${i}`, legacyClientId: undefined, exercises: [{ name: 'Press', sets: [{ order: 1, reps: 10 }] }] };
      assert.equal((await call(path + '/auto-workouts', owner.token, 'PUT', item)).status, 200);
    }
    const full = (await call(path + '/comparison?month=' + month, owner.token)).data;
    assert.equal(full.rankings[0].sets, 55);
    assert.equal(full.posts.length, 50);
    assert.ok(full.nextCursor);
    const next = (await call(path + '/comparison?month=' + month + '&cursor=' + full.nextCursor, guest.token)).data;
    assert.equal(next.posts.length, 5);
    assert.equal(next.rankings[0].sets, 55);
    assert.equal((await call(path + '/sharing', owner.token, 'PUT', { enabled: false })).status, 200);
    assert.equal((await call(path + '/posts', owner.token)).data.posts.length, 1);
    assert.equal((await call(path + '/comparison?month=' + month, owner.token)).data.rankings[0].sets, 1);
    assert.equal((await call(path + '/auto-workouts', owner.token, 'PUT', payload)).status, 403);
    assert.equal((await call(path + '/comparison?month=2026-13', owner.token)).status, 400);
    assert.equal((await call(path + '/comparison?month=' + month + '&cursor=-1', owner.token)).status, 400);
    await call(path, guest.token, 'DELETE');
    assert.equal((await call(path + '/comparison?month=' + month, guest.token)).status, 404);
  } finally {
    await call('/v1/account', owner.token, 'DELETE');
    await call('/v1/account', guest.token, 'DELETE');
  }
});
