import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { localDatabase } from './local-worker.mjs';
import { saveAutomatic, deleteAutomatic, comparison, sharing, monthBounds, japanMonth } from '../room-comparison.mjs';
import { pushChanges, pullChanges, pruneSync } from '../personal-sync.mjs';

function fixture() {
  const env = localDatabase();
  const user = { id: crypto.randomUUID(), google_subject: 'google-test' }, room = crypto.randomUUID();
  env.db.prepare('INSERT INTO users(id,name,token_hash,google_subject) VALUES(?,?,?,?)').run(user.id, 'A', user.id, user.google_subject);
  env.db.prepare('INSERT INTO rooms(id,name,owner_id,invite) VALUES(?,?,?,?)').run(room, 'Room', user.id, room);
  env.db.prepare('INSERT INTO members(room_id,user_id) VALUES(?,?)').run(room, user.id);
  const startedAt = monthBounds(japanMonth())[0];
  return { env, user, room, payload: { clientId: 'legacy-device-100', presetName: 'Gym', startedAt, endedAt: startedAt, exercises: [{ name: 'Bench', sets: [{ order: 1, reps: 10, weightKg: 50 }] }] } };
}
const validate = data => ({ ...data });

test('linking personal sync migrates a legacy automatic copy without double counting or leaving it after deletion', async () => {
  const { env, user, room, payload } = fixture();
  await sharing(env, user.id, room, true, japanMonth());
  await saveAutomatic(env, user.id, room, payload, validate);
  const migrated = { ...payload, clientId: crypto.randomUUID(), legacyClientId: payload.clientId };
  await saveAutomatic(env, user.id, room, migrated, validate);
  let result = await comparison(env, room, japanMonth(), null);
  assert.equal(result.posts.length, 1);
  assert.equal(result.rankings[0].sets, 1);
  await saveAutomatic(env, user.id, room, migrated, validate);
  await saveAutomatic(env, user.id, room, payload, validate); // Delayed transport retry of the old device ID.
  assert.equal(env.db.prepare('SELECT count(*) AS n FROM auto_workouts').get().n, 1);
  await deleteAutomatic(env, user.id, room, migrated.clientId);
  result = await comparison(env, room, japanMonth(), null);
  assert.equal(result.posts.length, 0);
  assert.equal(result.rankings[0].sets, 0);
});

test('sync batch failure rolls back all revisions, records and receipts; retries and old duplicate deliveries are idempotent', async () => {
  const { env, user } = fixture();
  const change = value => ({ kind: 'setting', id: '00000000-0000-4000-8000-000000000001', mutationId: crypto.randomUUID(), deleted: false, payload: { field: 'themeMode', value } });
  const a = change('dark'), b = change('light');
  env.db.exec("CREATE TRIGGER fail_sync BEFORE INSERT ON sync_receipts WHEN (SELECT count(*) FROM sync_receipts)=1 BEGIN SELECT RAISE(ABORT,'injected failure'); END");
  await assert.rejects(pushChanges(env, user, { changes: [a, b] }), /injected failure/);
  for (const table of ['sync_accounts', 'sync_records', 'sync_receipts']) assert.equal(env.db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n, 0);
  env.db.exec('DROP TRIGGER fail_sync');
  await pushChanges(env, user, { changes: [a, b] });
  await pushChanges(env, user, { changes: [a] });
  const pulled = await pullChanges(env, user, '0');
  assert.equal(pulled.changes.length, 1);
  assert.equal(pulled.changes[0].payload.value, 'light');
  assert.equal(pulled.cursor, 2);
});

test('every migration prefix upgrades to the same schema and retains existing sync rows', () => {
  const dir = new URL('../migrations/', import.meta.url);
  const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  let expected;
  for (let cut = 1; cut <= files.length; cut++) {
    const db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys=ON');
    for (const f of files.slice(0, cut)) db.exec(readFileSync(new URL(f, dir), 'utf8'));
    db.prepare("INSERT INTO users(id,name,token_hash) VALUES('existing','Existing','hash')").run();
    if (cut >= 2) {
      db.prepare("INSERT INTO sync_accounts(user_id,revision) VALUES('existing',7)").run();
      db.prepare("INSERT INTO sync_records(user_id,kind,record_id,revision,deleted,payload) VALUES('existing','setting','record',7,0,'{}')").run();
      db.prepare("INSERT INTO sync_receipts(user_id,mutation_id) VALUES('existing','mutation')").run();
    }
    for (const f of files.slice(cut)) db.exec(readFileSync(new URL(f, dir), 'utf8'));
    const schema = db.prepare("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all();
    if (expected) assert.deepEqual(schema, expected, `upgrade after ${files[cut - 1]}`); else expected = schema;
    assert.equal(db.prepare("SELECT count(*) AS n FROM users WHERE id='existing'").get().n, 1);
    if (cut >= 2) {
      assert.equal(db.prepare('SELECT revision FROM sync_accounts').get().revision, 7);
      assert.equal(db.prepare('SELECT count(*) AS n FROM sync_records').get().n, 1);
      assert.equal(db.prepare('SELECT count(*) AS n FROM sync_receipts').get().n, 1);
    }
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    db.close();
  }
});


test('an offline retry remains idempotent after ninety days and cannot overwrite another device edit', { todo: '既知問題: ACK未保存かつ90日超の再送。保持方針の変更は利用者判断（docs/sync-sharing-verification-2026-11-10.md）' }, async () => {
  const { env, user } = fixture();
  const id = crypto.randomUUID();
  const a = { kind: 'setting', id, mutationId: crypto.randomUUID(), deleted: false, payload: { field: 'themeMode', value: 'dark' } };
  const b = { ...a, mutationId: crypto.randomUUID(), payload: { field: 'themeMode', value: 'light' } };
  await pushChanges(env, user, { changes: [a] });
  env.db.prepare('UPDATE sync_receipts SET created_at=?').run(Math.floor(Date.now() / 1000) - 91 * 86400);
  await pushChanges(env, user, { changes: [b] });
  await pruneSync(env);
  await pushChanges(env, user, { changes: [a] });
  const pulled = await pullChanges(env, user, '0');
  assert.equal(pulled.changes[0].payload.value, 'light');
  assert.equal(pulled.cursor, 2);
});

test('automatic ID replacement is atomic and works when the member quota is full', async () => {
  const { env, user, room, payload } = fixture();
  await sharing(env, user.id, room, true, japanMonth());
  await saveAutomatic(env, user.id, room, payload, validate);
  const insert = env.db.prepare('INSERT INTO auto_workouts(id,room_id,user_id,client_id,created_at,payload) VALUES(?,?,?,?,?,?)');
  for (let i = 1; i < 1000; i++) insert.run(crypto.randomUUID(), room, user.id, `quota-${i}`, payload.startedAt, JSON.stringify({ ...payload, clientId: `quota-${i}` }));
  const migrated = { ...payload, clientId: crypto.randomUUID(), legacyClientId: payload.clientId };
  env.db.exec("CREATE TRIGGER fail_cleanup BEFORE DELETE ON auto_workouts BEGIN SELECT RAISE(ABORT,'cleanup failure'); END");
  await assert.rejects(saveAutomatic(env, user.id, room, migrated, validate), /cleanup failure/);
  assert.equal(env.db.prepare('SELECT count(*) AS n FROM auto_workouts').get().n, 1000);
  assert.equal(env.db.prepare('SELECT count(*) AS n FROM auto_workouts WHERE client_id=?').get(migrated.clientId).n, 0);
  env.db.exec('DROP TRIGGER fail_cleanup');
  await saveAutomatic(env, user.id, room, migrated, validate);
  assert.equal(env.db.prepare('SELECT count(*) AS n FROM auto_workouts').get().n, 1000);
  assert.equal(env.db.prepare('SELECT count(*) AS n FROM auto_workouts WHERE client_id=?').get(payload.clientId).n, 0);
});
