import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";

const baseUrl = process.env.WORKER_URL ?? "http://127.0.0.1:8788";
if (!["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname)) {
  throw new Error("These tests only run against a local Wrangler server.");
}

async function call(path, { method = "GET", token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const result = await fetch(new URL(path, baseUrl), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: result.status, data: await result.json() };
}

test("Cloudflare Worker supports private room sharing end-to-end", async () => {
  const suffix = crypto.randomUUID();
  let owner;
  let guest;
  let roomId;
  try {
    assert.deepEqual((await call("/health")).data, { status: "ok" });

    const ownerRegistration = await call("/v1/account", {
      method: "POST", body: { name: `owner-${suffix.slice(0, 8)}` },
    });
    assert.equal(ownerRegistration.status, 200);
    owner = ownerRegistration.data;

    const roomCreation = await call("/v1/rooms", {
      method: "POST", token: owner.token, body: { name: "テストルーム" },
    });
    assert.equal(roomCreation.status, 200);
    roomId = roomCreation.data.id;

    const ownerRooms = await call("/v1/rooms", { token: owner.token });
    const inviteCode = ownerRooms.data.rooms.find((room) => room.id === roomId).inviteCode;
    const guestRegistration = await call("/v1/account", {
      method: "POST", body: { name: `guest-${suffix.slice(0, 8)}` },
    });
    assert.equal(guestRegistration.status, 200);
    guest = guestRegistration.data;

    const joined = await call("/v1/rooms/join", {
      method: "POST", token: guest.token, body: { code: inviteCode },
    });
    assert.equal(joined.status, 200);
    assert.equal(joined.data.id, roomId);

    const now = Date.now();
    const workout = {
      clientId: `test-${suffix}`,
      presetName: "テスト",
      startedAt: new Date(now - 15 * 60_000).toISOString(),
      endedAt: new Date(now).toISOString(),
      exercises: [{
        name: "ダンベルプレス",
        sets: [
          { order: 1, side: "左", weightKg: 12.5, reps: 10 },
          { order: 1, side: "右", weightKg: 12, reps: 9 },
        ],
      }],
    };
    const posted = await call(`/v1/rooms/${roomId}/posts`, {
      method: "POST", token: owner.token, body: workout,
    });
    assert.equal(posted.status, 200);

    const shared = await call(`/v1/rooms/${roomId}/posts`, { token: guest.token });
    assert.equal(shared.status, 200);
    assert.equal(shared.data.posts.length, 1);
    assert.equal(shared.data.posts[0].workout.durationMinutes, 15);
    assert.deepEqual(shared.data.posts[0].workout.exercises[0].sets.map((set) => set.side), ["左", "右"]);

    const duplicate = await call(`/v1/rooms/${roomId}/posts`, {
      method: "POST", token: owner.token, body: workout,
    });
    assert.equal(duplicate.data.id, posted.data.id);

    const forbiddenDelete = await call(`/v1/rooms/${roomId}/posts/${posted.data.id}`, {
      method: "DELETE", token: guest.token,
    });
    assert.equal(forbiddenDelete.status, 404);

    const stranger = await call(`/v1/rooms/${roomId}/posts`, {
      token: "not-a-valid-room-account-token-123456",
    });
    assert.equal(stranger.status, 401);

    const guestPost = await call(`/v1/rooms/${roomId}/posts`, {
      method: "POST", token: guest.token, body: { ...workout, clientId: `guest-${suffix}` },
    });
    assert.equal(guestPost.status, 200);

    assert.equal((await call(`/v1/rooms/${roomId}`, { method: "DELETE", token: guest.token })).status, 200);
    const remaining = await call(`/v1/rooms/${roomId}/posts`, { token: owner.token });
    assert.equal(remaining.data.posts.length, 1);
    assert.equal(remaining.data.posts[0].userId, owner.id);
    assert.equal((await call(`/v1/rooms/${roomId}`, { method: "DELETE", token: owner.token })).status, 200);
    assert.deepEqual((await call("/v1/rooms", { token: owner.token })).data.rooms, []);
  } finally {
    if (guest?.token) await call("/v1/account", { method: "DELETE", token: guest.token }).catch(() => {});
    if (owner?.token) await call("/v1/account", { method: "DELETE", token: owner.token }).catch(() => {});
  }
});

test("account deletion preserves other members' rooms and posts", async () => {
  const owner = (await call("/v1/account", { method: "POST", body: { name: "transfer-owner" } })).data;
  const member = (await call("/v1/account", { method: "POST", body: { name: "transfer-member" } })).data;
  try {
    const room = (await call("/v1/rooms", { method: "POST", token: owner.token, body: { name: "keep" } })).data;
    const code = (await call("/v1/rooms", { token: owner.token })).data.rooms[0].inviteCode;
    await call("/v1/rooms/join", { method: "POST", token: member.token, body: { code } });
    assert.equal((await call("/v1/account", { method: "DELETE", token: owner.token })).status, 200);
    const rooms = (await call("/v1/rooms", { token: member.token })).data.rooms;
    assert.equal(rooms[0].id, room.id);
    assert.equal(rooms[0].ownerId, member.id);
    assert.equal((await call("/v1/rooms", { token: owner.token })).status, 401);
  } finally {
    await call("/v1/account", { method: "DELETE", token: owner.token });
    await call("/v1/account", { method: "DELETE", token: member.token });
  }
});

// Fixture provisioning is local-only and opt-in, never an authentication bypass
// in the Worker. It lets D1 behavior be tested without real Google credentials.
test("personal sync is private, transactional, retry-safe and deletion-aware", {
  skip: !process.env.SYNC_TEST_PERSIST,
}, async () => {
  const owner = (await call("/v1/account", { method: "POST", body: { name: "sync-owner" } })).data;
  const other = (await call("/v1/account", { method: "POST", body: { name: "sync-other" } })).data;
  try {
    assert.equal((await call("/v1/sync", { token: owner.token })).status, 403);
    // Both values are locally generated UUIDs; never interpolate external input.
    assert.match(owner.id, /^[a-f0-9-]{36}$/u);
    assert.match(other.id, /^[a-f0-9-]{36}$/u);
    execFileSync("wrangler", ["d1", "execute", "fitswipe-rooms", "--local", "--persist-to", process.env.SYNC_TEST_PERSIST,
      "--command", `UPDATE users SET google_subject = id WHERE id IN ('${owner.id}', '${other.id}')`], {
      cwd: new URL("..", import.meta.url), stdio: "pipe",
    });
    const change = { id: crypto.randomUUID(), mutationId: crypto.randomUUID(), kind: "session", deleted: false,
      payload: { startedAt: "2026-10-28T10:00:00Z", endedAt: null } };
    const push = (changes) => call("/v1/sync", { method: "POST", token: owner.token, body: { changes } });
    assert.equal((await push([change])).status, 200);
    const first = (await call("/v1/sync", { token: owner.token })).data;
    assert.equal(first.changes.length, 1);
    assert.deepEqual(first.changes[0].payload, change.payload);
    assert.equal((await call("/v1/sync", { token: other.token })).data.changes.length, 0);
    const edit = { ...change, mutationId: crypto.randomUUID(), payload: { startedAt: "2026-10-29T10:00:00Z" } };
    await push([edit]);
    await push([change]); // stale transport retry must not overwrite the newer edit
    const second = (await call(`/v1/sync?cursor=${first.cursor}`, { token: owner.token })).data;
    assert.deepEqual(second.changes[0].payload, edit.payload);
    assert.equal(second.cursor, first.cursor + 1);
    assert.equal((await push([{ ...edit, mutationId: crypto.randomUUID(), kind: "invalid" }])).status, 400);
    await push([{ ...edit, mutationId: crypto.randomUUID(), deleted: true }]);
    const deleted = (await call(`/v1/sync?cursor=${second.cursor}`, { token: owner.token })).data;
    assert.equal(deleted.changes[0].deleted, true);
    assert.equal(deleted.changes[0].payload, null);
    assert.equal((await call("/v1/sync?cursor=-1", { token: owner.token })).status, 400);
    assert.equal((await call("/v1/sync")).status, 401);
    await call("/v1/account", { method: "DELETE", token: owner.token });
    assert.equal((await push([edit])).status, 401);
  } finally {
    await call("/v1/account", { method: "DELETE", token: owner.token });
    await call("/v1/account", { method: "DELETE", token: other.token });
  }
});
