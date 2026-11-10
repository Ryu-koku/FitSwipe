import { visibleUserSql } from './safety.mjs';
export class ComparisonError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function japanMonth(date = new Date()) {
  return new Date(date.getTime() + 9 * 3_600_000).toISOString().slice(0, 7);
}

export function monthBounds(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/u.test(month ?? '') || month < '2000-01' || month > '2100-12') {
    throw new ComparisonError(400, '集計月を確認してください');
  }
  const [year, m] = month.split('-').map(Number);
  return [new Date(Date.UTC(year, m - 1, 1, -9)).toISOString(), new Date(Date.UTC(year, m, 1, -9)).toISOString()];
}

export function retentionStart(now = new Date()) {
  const [year, month] = japanMonth(now).split('-').map(Number);
  return new Date(Date.UTC(year, month - 12, 1, -9)).toISOString();
}

export async function pruneAutomatic(env, now = new Date(), roomId) {
  // Manual shares and personal-sync records are deliberately untouched.
  return env.DB.prepare(`DELETE FROM auto_workouts WHERE
    datetime(json_extract(payload,'$.startedAt')) < datetime(?)${roomId ? ' AND room_id=?' : ''}`)
    .bind(retentionStart(now), ...(roomId ? [roomId] : [])).run();
}

export const monthlyRankingsSql = `
  WITH counted AS (
    SELECT w.user_id, w.id, e.key, json_extract(s.value, '$.order') AS set_order,
      max(CASE WHEN json_extract(s.value, '$.side') IS NULL THEN 1 ELSE 0 END) AS normal,
      max(CASE WHEN json_extract(s.value, '$.side') = '左' THEN 1 ELSE 0 END) AS l,
      max(CASE WHEN json_extract(s.value, '$.side') = '右' THEN 1 ELSE 0 END) AS r
    FROM room_comparison w, json_each(w.payload, '$.exercises') e, json_each(e.value, '$.sets') s
    WHERE w.room_id = ? AND datetime(json_extract(w.payload, '$.startedAt')) >= datetime(?)
      AND datetime(json_extract(w.payload, '$.startedAt')) < datetime(?)
      AND datetime(json_extract(w.payload, '$.startedAt')) <= datetime(?)
      AND json_extract(s.value, '$.reps') > 0
    GROUP BY w.user_id, w.id, e.key, set_order
  ), totals AS (
    SELECT user_id, sum(CASE WHEN normal = 1 OR (l = 1 AND r = 1) THEN 1 ELSE 0 END) AS sets
    FROM counted GROUP BY user_id
  )
  SELECT u.id, u.name, u.avatar, coalesce(t.sets, 0) AS sets FROM members m
    JOIN users u ON u.id = m.user_id LEFT JOIN totals t ON t.user_id = u.id
    WHERE m.room_id = ? ORDER BY sets DESC, u.id`;

export async function sharing(env, userId, roomId, enabled, sinceMonth) {
  if (typeof enabled !== 'boolean') throw new ComparisonError(400, '共有設定を確認してください');
  if (enabled) {
    const month = japanMonth();
    if (sinceMonth !== undefined && sinceMonth !== month) throw new ComparisonError(409, '月が変わりました。共有範囲をもう一度確認してください');
    await env.DB.prepare('INSERT OR IGNORE INTO room_sharing(room_id,user_id,since_month) VALUES(?,?,?)')
      .bind(roomId, userId, month).run();
  } else {
    // Cascades only automatic copies; existing manually shared posts survive.
    await env.DB.prepare('DELETE FROM room_sharing WHERE room_id=? AND user_id=?').bind(roomId, userId).run();
  }
  return {};
}

export async function saveAutomatic(env, userId, roomId, data, validate) {
  const payload = validate(data);
  if (new Date(payload.startedAt) < new Date(retentionStart())) throw new ComparisonError(400, '自動共有できるのは当月と過去11か月の記録です');
  if (!/^[A-Za-z0-9-]{1,100}$/u.test(payload.clientId)) throw new ComparisonError(400, '記録IDを確認してください');
  const consent = await env.DB.prepare('SELECT since_month FROM room_sharing WHERE room_id=? AND user_id=?').bind(roomId, userId).first();
  if (!consent) throw new ComparisonError(403, 'このルームの自動共有への同意が必要です');
  if (new Date(payload.startedAt) < new Date(monthBounds(consent.since_month)[0])) throw new ComparisonError(400, '同意した月より前の記録は共有できません');
  const legacy = data.legacyClientId;
  if (legacy !== undefined && (typeof legacy !== 'string' || !/^[A-Za-z0-9-]{1,100}$/u.test(legacy))) throw new ComparisonError(400, '記録IDを確認してください');
  if (await env.DB.prepare('SELECT 1 FROM hidden_workouts WHERE room_id=? AND user_id=? AND client_id IN (?,?)').bind(roomId,userId,payload.clientId,legacy ?? payload.clientId).first()) throw new ComparisonError(403, '運営により削除された記録は再共有できません');
  // Quota belongs to each member, so one prolific member cannot block others.
  // Check in the INSERT statement as well to serialize concurrent requests.
  const insert = env.DB.prepare(`INSERT INTO auto_workouts(id,room_id,user_id,client_id,legacy_client_id,created_at,payload,deleted)
    SELECT ?,?,?,?,?,?,?,0 WHERE EXISTS(SELECT 1 FROM room_sharing WHERE room_id=? AND user_id=? AND since_month=?)
      AND NOT EXISTS(SELECT 1 FROM auto_workouts WHERE room_id=? AND user_id=? AND legacy_client_id=? AND client_id<>?)
      AND ((SELECT count(*) FROM auto_workouts WHERE room_id=? AND user_id=? AND deleted=0) < 1000
        OR EXISTS(SELECT 1 FROM auto_workouts WHERE room_id=? AND user_id=? AND client_id IN (?,?) AND deleted=0))
    ON CONFLICT(room_id,user_id,client_id) DO UPDATE SET payload=excluded.payload, deleted=0,
      legacy_client_id=coalesce(auto_workouts.legacy_client_id, excluded.legacy_client_id)`)
    .bind(crypto.randomUUID(), roomId, userId, payload.clientId, legacy ?? null, new Date().toISOString(), JSON.stringify(payload),
      roomId, userId, consent.since_month, roomId, userId, payload.clientId, payload.clientId,
      roomId, userId, roomId, userId, payload.clientId, legacy ?? payload.clientId);
  // A pre-login device ID and the personal-sync UUID identify the same
  // automatic copy. Commit replacement and cleanup together so a retry or a
  // failed insert cannot leave two ranked workouts or erase the only copy.
  const [result] = await env.DB.batch([
    insert,
    env.DB.prepare(`DELETE FROM auto_workouts WHERE room_id=? AND user_id=? AND client_id=? AND client_id<>?
      AND EXISTS(SELECT 1 FROM auto_workouts WHERE room_id=? AND user_id=? AND client_id=? AND deleted=0)`)
      .bind(roomId, userId, legacy ?? payload.clientId, payload.clientId, roomId, userId, payload.clientId),
  ]);
  if (!result.meta.changes) {
    const current = await env.DB.prepare('SELECT 1 FROM room_sharing WHERE room_id=? AND user_id=? AND since_month=?')
      .bind(roomId, userId, consent.since_month).first();
    if (!current) throw new ComparisonError(403, '自動共有の設定が変わりました。更新してください');
    // A delayed retry of an ID already migrated to a sync UUID is obsolete.
    if (await env.DB.prepare('SELECT 1 FROM auto_workouts WHERE room_id=? AND user_id=? AND legacy_client_id=? AND client_id<>?')
      .bind(roomId, userId, payload.clientId, payload.clientId).first()) return {};
    throw new ComparisonError(409, 'このルームのあなたの自動共有が1,000件に達しました。保存期限による空きを待つか、自動共有を停止できます。個人記録の削除は不要です');
  }
  return {};
}

export async function deleteAutomatic(env, userId, roomId, clientId) {
  await env.DB.prepare('UPDATE auto_workouts SET deleted=1 WHERE room_id=? AND user_id=? AND client_id=?').bind(roomId, userId, clientId).run();
  return {};
}

export async function comparison(env, roomId, month, cursor, memberId = null, viewerId = null) {
  const [start, end] = monthBounds(month);
  const offset = cursor === null ? 0 : Number(cursor);
  if (!Number.isInteger(offset) || offset < 0 || offset > 110000) throw new ComparisonError(400, '続きの記録を確認してください');
  if (memberId && !/^[a-f0-9-]{36}$/u.test(memberId)) throw new ComparisonError(400, 'メンバーを確認してください');
  const now = new Date().toISOString();
  const visible = viewerId ? ` AND ${visibleUserSql('u', '?')}` : '';
  const rankingSql = monthlyRankingsSql.replace('WHERE m.room_id = ? ORDER BY', `WHERE m.room_id = ?${visible} ORDER BY`);
  const { results: rankings } = await env.DB.prepare(rankingSql).bind(roomId, start, end, now, roomId, ...(viewerId ? [viewerId, viewerId] : [])).all();
  let rank = 0;
  rankings.forEach((member, i) => { if (!i || member.sets !== rankings[i - 1].sets) rank = i + 1; member.rank = rank; });
  const { results } = await env.DB.prepare(`SELECT w.*, u.name FROM room_comparison w JOIN users u ON u.id=w.user_id
    WHERE room_id=? AND datetime(json_extract(payload,'$.startedAt')) >= datetime(?)
    AND datetime(json_extract(payload,'$.startedAt')) < datetime(?) AND datetime(json_extract(payload,'$.startedAt')) <= datetime(?)
    ${memberId ? 'AND w.user_id=?' : ''}${visible}
    ORDER BY json_extract(payload,'$.startedAt') DESC, w.id LIMIT 51 OFFSET ?`).bind(roomId, start, end, now, ...(memberId ? [memberId] : []), ...(viewerId ? [viewerId, viewerId] : []), offset).all();
  return { month, memberId, fetchedAt: now, rankings, posts: results.slice(0, 50).map((r) => ({ id: r.id, userId: r.user_id, name: r.name, createdAt: r.created_at, automatic: !!r.automatic, workout: JSON.parse(r.payload) })), nextCursor: results.length > 50 ? String(offset + 50) : null };
}
