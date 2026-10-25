import assert from "node:assert/strict";
import test from "node:test";

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
