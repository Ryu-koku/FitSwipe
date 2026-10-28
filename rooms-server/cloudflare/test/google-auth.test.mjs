import assert from "node:assert/strict";
import test from "node:test";
import { verifyGoogleToken } from "../google-auth.mjs";
import { validateChanges } from "../personal-sync.mjs";

const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
const jwk = { ...await crypto.subtle.exportKey("jwk", pair.publicKey), kid: "test-key", alg: "RS256" };
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const claims = { sub: "google-user", aud: "web-client-id", iss: "https://accounts.google.com", iat: 1000, exp: 2000 };
async function token(overrides = {}, header = {}) {
  const prefix = `${encode({ alg: "RS256", kid: "test-key", ...header })}.${encode({ ...claims, ...overrides })}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, new TextEncoder().encode(prefix));
  return `${prefix}.${Buffer.from(signature).toString("base64url")}`;
}
const options = { now: 1500, keys: [jwk] };

test("Google token requires valid signature and exact audience, issuer and lifetime", async () => {
  assert.deepEqual(await verifyGoogleToken(await token(), "web-client-id", options), { subject: "google-user" });
  assert.deepEqual(await verifyGoogleToken(await token({ azp: "android-client-id" }), "web-client-id", {
    ...options, authorizedPresenters: ["android-client-id"],
  }), { subject: "google-user" });
  for (const overrides of [{ aud: "other-client" }, { iss: "https://attacker.test" }, { exp: 1500 },
    { exp: "2000" }, { sub: "" }, { iat: 1601 }, { azp: "other-client" }]) {
    await assert.rejects(verifyGoogleToken(await token(overrides), "web-client-id", options));
  }
  await assert.rejects(verifyGoogleToken(await token({}, { alg: "none" }), "web-client-id", options));
  await assert.rejects(verifyGoogleToken(await token({}, { kid: "unknown" }), "web-client-id", options));
  const valid = await token();
  const [header, , signature] = valid.split(".");
  await assert.rejects(verifyGoogleToken(`${header}.${encode({ ...claims, sub: "attacker" })}.${signature}`, "web-client-id", options));
  await assert.rejects(verifyGoogleToken("not-a-jwt", "web-client-id", options));
  await assert.rejects(verifyGoogleToken(valid, "", options));
});

test("sync validates UUID identities, kinds, deletion and size before persistence", () => {
  const item = { mutationId: crypto.randomUUID(), id: crypto.randomUUID(), kind: "session", deleted: false,
    payload: { startedAt: "2026-10-28T10:00:00Z" } };
  assert.equal(validateChanges({ changes: [item] })[0].payload, JSON.stringify(item.payload));
  assert.equal(validateChanges({ changes: [{ ...item, deleted: true, payload: { secret: "discarded" } }] })[0].payload, null);
  for (const change of [{ ...item, kind: "auth-token" }, { ...item, id: "local-1" },
    { ...item, deleted: "false" }, { ...item, payload: [] }, { ...item, payload: null },
    { ...item, payload: { value: "x".repeat(32_769) } }]) {
    assert.throws(() => validateChanges({ changes: [change] }));
  }
  assert.throws(() => validateChanges({ changes: [item, item] }));
  assert.throws(() => validateChanges({ changes: Array(51).fill(item) }));
  assert.throws(() => validateChanges({}));
});
