import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.mjs";
import { localDatabase as database } from "./local-worker.mjs";

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signedIn({ db }, token, expiresAt = Math.floor(Date.now() / 1000) + 3600) {
  db.prepare("INSERT OR IGNORE INTO users(id, name, token_hash, google_subject) VALUES ('u1', 'A', 'unused', 'google-1')").run();
  db.prepare("INSERT INTO account_sessions(token_hash, user_id, expires_at) VALUES (?, 'u1', ?)").run(await sha256(token), expiresAt);
}

const call = (env, method, path, token, body) => worker.fetch(new Request(`http://worker${path}`, {
  method,
  headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
}), env);

test("logout revokes only the presented Google session", async () => {
  const env = database();
  const token = "session-token-aaaaaaaaaaaaaaaa", other = "session-token-bbbbbbbbbbbbbbbb";
  await signedIn(env, token);
  await signedIn(env, other);
  assert.equal((await call(env, "GET", "/v1/sync?cursor=0", token)).status, 200);
  assert.equal((await call(env, "DELETE", "/v1/auth/session", token)).status, 200);
  assert.equal((await call(env, "GET", "/v1/sync?cursor=0", token)).status, 401);
  assert.equal((await call(env, "GET", "/v1/sync?cursor=0", other)).status, 200);
  // Revoking again is harmless.
  assert.equal((await call(env, "DELETE", "/v1/auth/session", token)).status, 200);
});

test("the daily cron prunes expired sessions and stale sync receipts only", async () => {
  const env = database();
  const live = "session-token-cccccccccccccccc";
  await signedIn(env, live);
  await signedIn(env, "session-token-dddddddddddddddd", Math.floor(Date.now() / 1000) - 1);
  const change = { mutationId: crypto.randomUUID(), id: crypto.randomUUID(), kind: "setting", deleted: false, payload: { field: "themeMode", value: "dark" } };
  assert.equal((await call(env, "POST", "/v1/sync", live, { changes: [change] })).status, 200);
  env.db.prepare("INSERT INTO sync_receipts(user_id, mutation_id, created_at) VALUES ('u1', 'old', 1)").run();
  await worker.scheduled({}, env);
  assert.equal(env.db.prepare("SELECT count(*) AS n FROM account_sessions").get().n, 1);
  assert.deepEqual(env.db.prepare("SELECT mutation_id FROM sync_receipts").all().map((row) => row.mutation_id), [change.mutationId]);
  // A retry of a recent push is still recognised after the cron run.
  assert.equal((await call(env, "POST", "/v1/sync", live, { changes: [change] })).status, 200);
  assert.equal(env.db.prepare("SELECT revision FROM sync_accounts").get().revision, 1);
});
