const KINDS = new Set(["exercise", "session", "set", "preset", "setting"]);
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u;

export class SyncError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function validateChanges(data) {
  if (!Array.isArray(data.changes) || data.changes.length > 50) throw new SyncError(400, "変更は50件ずつ送信してください");
  const seen = new Set();
  return data.changes.map((change) => {
    if (!change || !UUID.test(change.mutationId) || !UUID.test(change.id) ||
        !KINDS.has(change.kind) || typeof change.deleted !== "boolean" || seen.has(change.mutationId)) {
      throw new SyncError(400, "同期データを確認してください");
    }
    seen.add(change.mutationId);
    if (!change.deleted && (!change.payload || typeof change.payload !== "object" || Array.isArray(change.payload))) {
      throw new SyncError(400, "同期データを確認してください");
    }
    const payload = change.deleted ? null : JSON.stringify(change.payload);
    if (payload && new TextEncoder().encode(payload).byteLength > 32_768) throw new SyncError(413, "記録が大きすぎます");
    return { ...change, payload };
  });
}

export async function pushChanges(env, user, data) {
  if (!user.google_subject) throw new SyncError(403, "Googleログインが必要です");
  const changes = validateChanges(data);
  const statements = [env.DB.prepare("INSERT OR IGNORE INTO sync_accounts(user_id) VALUES (?)").bind(user.id)];
  for (const change of changes) {
    // Receipts make transport retries idempotent: an old retry cannot overwrite
    // a newer edit. A genuine new edit always gets a fresh mutation UUID.
    const fresh = "NOT EXISTS (SELECT 1 FROM sync_receipts WHERE user_id = ? AND mutation_id = ?)";
    statements.push(
      env.DB.prepare(`UPDATE sync_accounts SET revision = revision + 1 WHERE user_id = ? AND ${fresh}`)
        .bind(user.id, user.id, change.mutationId),
      env.DB.prepare(`
        INSERT INTO sync_records(user_id, kind, record_id, revision, deleted, payload)
        SELECT ?, ?, ?, revision, ?, ? FROM sync_accounts WHERE user_id = ? AND ${fresh}
        ON CONFLICT(user_id, kind, record_id) DO UPDATE SET
          revision = excluded.revision, deleted = excluded.deleted, payload = excluded.payload
      `).bind(user.id, change.kind, change.id, Number(change.deleted), change.payload, user.id, user.id, change.mutationId),
      env.DB.prepare("INSERT OR IGNORE INTO sync_receipts(user_id, mutation_id) VALUES (?, ?)")
        .bind(user.id, change.mutationId),
    );
  }
  // D1 batch is transactional; no partially acknowledged mutations.
  await env.DB.batch(statements);
  return { acknowledged: changes.map((change) => change.mutationId) };
}

export async function pullChanges(env, user, cursor) {
  if (!user.google_subject) throw new SyncError(403, "Googleログインが必要です");
  if (!/^\d{1,15}$/u.test(cursor ?? "0")) throw new SyncError(400, "同期位置を確認してください");
  const { results } = await env.DB.prepare(`
    SELECT kind, record_id AS id, revision, deleted, payload FROM sync_records
    WHERE user_id = ? AND revision > ? ORDER BY revision LIMIT 101
  `).bind(user.id, Number(cursor ?? 0)).all();
  const page = results.slice(0, 100);
  return {
    changes: page.map((row) => ({ ...row, deleted: Boolean(row.deleted), payload: row.payload === null ? null : JSON.parse(row.payload) })),
    cursor: page.length ? page.at(-1).revision : Number(cursor ?? 0),
    hasMore: results.length > 100,
  };
}
