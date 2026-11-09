const { test } = require('node:test');
const assert = require('node:assert/strict');
const { seedState } = require('../src/logic.ts');
const { automaticWorkouts, japanMonth, sharingPlan, synchronizeAutomaticSharing } = require('../src/automatic-sharing.ts');
const { moveItem } = require('../src/reorder.ts');

function fixture() {
  const state = seedState();
  state.sessions = [{ id: 100, startedAt: '2026-09-30T15:00:00Z', endedAt: '2026-09-30T16:00:00Z', status: 'COMPLETED' }];
  state.sets = [{ id: 101, sessionId: 100, exerciseId: state.exercises[0].id, setOrder: 1, normalWeightKg: 60, normalReps: 10, isCompleted: true, leftCompleted: false, rightCompleted: false }];
  const room = { id: 'room', name: 'Friends', sharingSince: '2026-10' };
  return { state, room, now: new Date('2026-10-29T12:00:00Z') };
}

test('automatic sharing requires room consent and includes only eligible completed records', () => {
  const { state, room, now } = fixture();
  assert.equal(automaticWorkouts(state, { ...room, sharingSince: null }, now).length, 0);
  assert.equal(automaticWorkouts(state, room, now).length, 1);
  state.sessions.push({ ...state.sessions[0], id: 200, startedAt: '2026-09-30T14:59:59Z' });
  state.sessions.push({ ...state.sessions[0], id: 201, status: 'IN_PROGRESS' });
  state.sessions.push({ ...state.sessions[0], id: 202, startedAt: '2026-11-01T00:00:00Z' });
  assert.equal(automaticWorkouts(state, room, now).length, 1);
  assert.equal(japanMonth(new Date('2026-09-30T15:00:00Z')), '2026-10');
  assert.equal(japanMonth(new Date('2026-09-30T14:59:59Z')), '2026-09');
});

test('automatic copies use account UUIDs and retain the legacy ID for deduplication', () => {
  const { state, room, now } = fixture();
  state.cloud = { mapping: { 'session:100': 'account-session-uuid' } };
  const [payload] = automaticWorkouts(state, room, now);
  assert.equal(payload.clientId, 'account-session-uuid');
  assert.equal(payload.legacyClientId, `${state.installationId}-100`);
  state.cloud.mapping['session:999'] = 'account-session-uuid';
  state.sessions[0].id = 999; state.sets[0].sessionId = 999;
  assert.equal(automaticWorkouts(state, room, now)[0].clientId, payload.clientId);
});

test('sharing plan retries until durable acknowledgement and detects edits, deletions and another device copies', () => {
  const { state, room, now } = fixture();
  const [payload] = sharingPlan(state, room, [], now).save;
  const keys = [payload.clientId];
  assert.equal(sharingPlan(state, room, keys, now).save.length, 1);
  state.automaticRoomReceipts = { [room.id]: { [payload.clientId]: JSON.stringify(payload) } };
  assert.deepEqual(sharingPlan(state, room, keys, now), { save: [], remove: [] });
  state.sets[0].normalWeightKg = 70;
  assert.equal(sharingPlan(state, room, keys, now).save[0].exercises[0].sets[0].weightKg, 70);
  assert.equal(sharingPlan(state, room, [], now).save.length, 1);
  state.sessions = [];
  assert.deepEqual(sharingPlan(state, room, keys, now), { save: [], remove: keys });
});

test('removing all completed sets retracts the shared record without sharing unfinished sets', () => {
  const { state, room, now } = fixture();
  const id = automaticWorkouts(state, room, now)[0].clientId;
  state.sets[0].isCompleted = false;
  assert.deepEqual(sharingPlan(state, room, [id], now).remove, [id]);
});

test('an older device does not retract an unseen workout from another device', () => {
  const { state, room, now } = fixture();
  assert.deepEqual(sharingPlan(state, room, ['unseen-account-session'], now).remove, []);
  state.cloud = { mapping: {}, deletedSessions: ['unseen-account-session'], pending: [] };
  assert.deepEqual(sharingPlan(state, room, ['unseen-account-session'], now).remove, ['unseen-account-session']);
});

test('reordering follows an arbitrary target, preserves IDs and does not mutate the original', () => {
  const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
  assert.deepEqual(moveItem(items, 0, 2).map((v) => v.id), [2, 3, 1]);
  assert.deepEqual(moveItem(items, 2, 0).map((v) => v.id), [3, 1, 2]);
  assert.deepEqual(moveItem(items, -1, 0), items);
  assert.deepEqual(items.map((v) => v.id), [1, 2, 3]);
});

test('automatic synchronization preserves offline work, retries durably and catches edits made during upload', async () => {
  const f = fixture(); let state = f.state;
  state.roomIdentity = { id: 'owner', token: 'test-token', name: 'Owner' };
  let offline = true; let calls = 0; let editInFlight = false;
  const remote = new Set();
  const client = {
    list: async () => [f.room], automaticKeys: async () => ({ clientIds: [...remote] }),
    saveAutomatic: async (_a, _r, payload) => {
      calls++; if (offline) throw new Error('offline');
      remote.add(payload.clientId);
      if (editInFlight) { state = { ...state, sets: state.sets.map((s) => ({ ...s, normalWeightKg: 90 })) }; editInFlight = false; }
    },
    deleteAutomatic: async (_a, _r, id) => { remote.delete(id); },
  };
  const options = { client, getState: () => state, persist: async f => { state = f(state); }, isCurrent: () => state.roomIdentity?.id === 'owner' };
  await assert.rejects(() => synchronizeAutomaticSharing(options), /offline/);
  assert.equal(state.automaticRoomReceipts, undefined);
  offline = false; editInFlight = true;
  await synchronizeAutomaticSharing(options);
  assert.equal(calls, 2);
  await synchronizeAutomaticSharing(options);
  assert.equal(calls, 3); // New edit was not acknowledged by the older upload.
  await synchronizeAutomaticSharing(options);
  assert.equal(calls, 3);
  state = { ...state, sessions: [], sets: [] };
  await synchronizeAutomaticSharing(options);
  assert.equal(remote.size, 0);
});

test('disk failure or an account switch cannot publish or acknowledge another account data', async () => {
  const f = fixture(); let state = f.state;
  state.roomIdentity = { id: 'owner', token: 'test-token', name: 'Owner' };
  let network = 0;
  const client = {
    list: async () => { network++; return [f.room]; },
    automaticKeys: async () => ({ clientIds: [] }),
    saveAutomatic: async () => { state = { ...seedState(), roomIdentity: { id: 'other' } }; },
    deleteAutomatic: async () => {},
  };
  const options = { client, getState: () => state, persist: async f => { state = f(state); }, isCurrent: () => state.roomIdentity?.id === 'owner' };
  await assert.rejects(() => synchronizeAutomaticSharing({ ...options, persist: async () => { throw new Error('disk full'); } }), /disk full/);
  assert.equal(network, 0);
  await synchronizeAutomaticSharing(options);
  assert.equal(state.roomIdentity.id, 'other');
  assert.equal(state.automaticRoomReceipts, undefined);
});

test('automatic retention rolls over at Japan midnight without deleting local workouts', () => {
  const { state, room } = fixture();
  room.sharingSince = '2025-01';
  state.sessions[0].startedAt = '2025-10-31T15:00:00Z';
  state.sessions[0].endedAt = '2025-10-31T16:00:00Z';
  const before = new Date('2026-10-31T14:59:59Z');
  const after = new Date('2026-10-31T15:00:00Z');
  assert.equal(automaticWorkouts(state, room, before).length, 1);
  assert.equal(automaticWorkouts(state, room, after).length, 0);
  assert.equal(state.sessions.length, 1);
  state.sessions[0].startedAt = '2025-11-30T15:00:00Z';
  state.sessions[0].endedAt = '2025-11-30T16:00:00Z';
  assert.equal(automaticWorkouts(state, room, after).length, 1);
});

test('a refused workout is skipped durably and does not block later workouts or rooms', async () => {
  const { RoomsApiError } = require('../src/rooms.ts');
  const f = fixture(); let state = f.state;
  state.roomIdentity = { id: 'owner', token: 'test-token', name: 'Owner' };
  state.sessions = [...state.sessions, { id: 200, startedAt: '2026-10-02T15:00:00Z', endedAt: '2026-10-02T16:00:00Z', status: 'COMPLETED' }];
  state.sets = [...state.sets, { ...state.sets[0], id: 201, sessionId: 200 }];
  const rooms = [{ ...f.room }, { ...f.room, id: 'gone' }, { ...f.room, id: 'other' }];
  const saved = [], remote = new Set();
  const client = {
    list: async () => rooms, automaticKeys: async (_a, room) => ({ clientIds: [...remote].filter((k) => k.startsWith(`${room}/`)).map((k) => k.slice(room.length + 1)) }),
    saveAutomatic: async (_a, room, payload) => {
      if (room === 'gone') throw new RoomsApiError(403, 'consent');
      if (room === 'room' && payload.legacyClientId.endsWith('-100')) throw new RoomsApiError(400, 'invalid');
      saved.push(`${room}:${payload.legacyClientId}`); remote.add(`${room}/${payload.clientId}`);
    },
    deleteAutomatic: async () => {},
  };
  const options = { client, getState: () => state, persist: async u => { state = u(state); }, isCurrent: () => true };
  await synchronizeAutomaticSharing(options);
  assert.deepEqual(saved.map(s => s.replace(/rn-.*-/, '')), ['room:200', 'other:100', 'other:200']);
  saved.length = 0;
  await synchronizeAutomaticSharing(options);
  assert.deepEqual(saved, []); // The refused payload is not retried every cycle.
  state = { ...state, sets: state.sets.map((s) => s.id === 101 ? { ...s, normalReps: 12 } : s) };
  await assert.doesNotReject(() => synchronizeAutomaticSharing(options));
  assert.ok(Object.values(state.automaticRoomReceipts.room).some((v) => v.startsWith('rejected:')));
});

test('network and capacity failures stay local to a room and recover without duplicate uploads', async () => {
  const { RoomsApiError } = require('../src/rooms.ts');
  const f = fixture(); let state = { ...f.state, roomIdentity: { id: 'owner' } };
  const rooms = [f.room, { ...f.room, id: 'capacity', name: 'Capacity' }, { ...f.room, id: 'good', name: 'Good' }];
  let fail = true;
  const remote = { room: new Set(), capacity: new Set(), good: new Set() };
  const calls = [];
  const options = {
    getState: () => state, persist: async f => { state = f(state); }, isCurrent: () => true,
    client: {
      list: async () => rooms,
      automaticKeys: async (_, id) => {
        if (id === 'room' && fail) throw Error('offline');
        return { clientIds: [...remote[id]], limit: 1000 };
      },
      saveAutomatic: async (_, id, payload) => {
        if (id === 'capacity' && fail) throw new RoomsApiError(409, 'capacity full');
        calls.push(id); remote[id].add(payload.clientId);
      },
      deleteAutomatic: async () => {},
    },
  };
  await assert.rejects(synchronizeAutomaticSharing(options), /offline/);
  assert.deepEqual(calls, ['good']);
  assert.equal(state.automaticRoomStatus.room.issues[0].retryable, true);
  assert.equal(state.automaticRoomStatus.capacity.issues[0].retryable, true);
  assert.equal(state.automaticRoomStatus.good.issues.length, 0);
  assert.equal(state.automaticRoomReceipts.capacity, undefined);
  fail = false;
  await synchronizeAutomaticSharing(options);
  assert.deepEqual(calls, ['good', 'room', 'capacity']);
  assert.equal(state.automaticRoomStatus.capacity.issues.length, 0);
});

test('a failed retraction does not block an upload or another room', async () => {
  const f = fixture(); let state = { ...f.state, roomIdentity: { id: 'owner' }, automaticRoomReceipts: { room: { removed: 'old' } } };
  const saved = [];
  await assert.rejects(synchronizeAutomaticSharing({
    getState: () => state, persist: async f => { state = f(state); }, isCurrent: () => true,
    client: { list: async () => [f.room, { ...f.room, id: 'other' }],
      automaticKeys: async (_, id) => ({ clientIds: id === 'room' ? ['removed'] : [] }),
      deleteAutomatic: async () => { throw Error('offline delete'); },
      saveAutomatic: async (_, id) => { saved.push(id); },
    },
  }), /offline delete/);
  assert.deepEqual(saved, ['room', 'other']);
  assert.equal(state.automaticRoomReceipts.room.removed, 'old');
});

test('period choices cover twelve Japan-calendar months across years', () => {
  const { roomMonths } = require('../src/room-period.ts');
  const months = roomMonths(new Date('2026-12-31T15:00:00Z'));
  assert.equal(months.length, 12); assert.equal(months[0], '2027-01'); assert.equal(months[11], '2026-02');
});

test('a full member quota stops only new copies in that room and does not block sync', async () => {
  const { RoomsApiError } = require('../src/rooms.ts');
  const f = fixture(); let state = f.state;
  state.roomIdentity = { id: 'owner', token: 'test-token', name: 'Owner' };
  state.sessions = [...state.sessions, { id: 200, startedAt: '2026-10-02T15:00:00Z', endedAt: '2026-10-02T16:00:00Z', status: 'COMPLETED' }];
  state.sets = [...state.sets, { ...state.sets[0], id: 201, sessionId: 200 }];
  const rooms = [{ ...f.room }, { ...f.room, id: 'other' }];
  const calls = [];
  const client = {
    list: async () => rooms, automaticKeys: async () => ({ clientIds: [], limit: 1000 }),
    saveAutomatic: async (_a, room) => { calls.push(room); if (room === 'room') throw new RoomsApiError(409, 'full'); },
    deleteAutomatic: async () => {},
  };
  await synchronizeAutomaticSharing({ client, getState: () => state, persist: async u => { state = u(state); }, isCurrent: () => true });
  assert.deepEqual(calls, ['room', 'other', 'other']);
  assert.equal(state.automaticRoomStatus.room.issues.length, 1);
});
