const { test } = require('node:test');
const assert = require('node:assert/strict');
const { seedState } = require('../src/logic.ts');
const { startWorkout, advanceWorkout } = require('../src/workout.ts');
const {
  enqueueWorkout,
  flushPendingPosts,
  RoomsApiError,
} = require('../src/rooms.ts');

function shared() {
  let state = startWorkout(seedState());
  while (state.workout) state = advanceWorkout(state);
  state.rooms = [
    {
      id: 'room-1',
      name: 'Friends',
      ownerId: 'alice',
      inviteCode: 'CODE',
      memberCount: 1,
    },
  ];
  state = enqueueWorkout(state, 'room-1', state.sessions[0].id);
  return state;
}

test('queue keeps a snapshot and deduplicates retries before any network call', () => {
  const state = shared();
  const again = enqueueWorkout(state, 'room-1', state.sessions[0].id);
  assert.equal(again, state);
  const snapshot = structuredClone(state.pendingPosts[0].workout);
  state.sets[0].normalWeightKg = 999;
  assert.deepEqual(state.pendingPosts[0].workout, snapshot);
});

test('offline failure retains queue; a later successful flush removes it durably', async () => {
  let state = shared();
  const persist = async (updater) => {
    state = structuredClone(updater(state));
  };
  await assert.rejects(
    () =>
      flushPendingPosts(
        () => state,
        persist,
        async () => {
          throw new Error('offline');
        },
      ),
    /offline/,
  );
  assert.equal(state.pendingPosts.length, 1);
  const sent = [];
  await flushPendingPosts(
    () => state,
    persist,
    async (entry) => sent.push(entry.workout.clientId),
  );
  assert.equal(sent.length, 1);
  assert.equal(state.pendingPosts.length, 0);
});

test('permanent invalid posts are removed while auth/rate-limit failures stay queued', async () => {
  for (const status of [400, 403, 404, 413, 401, 429, 500]) {
    let state = shared();
    await assert.rejects(() =>
      flushPendingPosts(
        () => state,
        async (updater) => {
          state = updater(state);
        },
        async () => {
          throw new RoomsApiError(status, 'failure');
        },
      ),
    );
    assert.equal(
      state.pendingPosts.length,
      [400, 403, 404, 413].includes(status) ? 0 : 1,
    );
  }
});
