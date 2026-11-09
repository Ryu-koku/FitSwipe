export const TERMS_VERSION = '2026-11-09';
export const REPORT_REASONS = ['harassment', 'sexual', 'hate', 'personal_data', 'spam', 'other'];
export class SafetyError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function requireTermsVersion(version) {
  if (version !== TERMS_VERSION) throw new SafetyError(428, '利用規約とプライバシーポリシーを確認して同意してください');
}
export async function requireTerms(env, userId) {
  const user = await env.DB.prepare('SELECT terms_version FROM users WHERE id=?').bind(userId).first();
  requireTermsVersion(user?.terms_version);
}
export async function acceptTerms(env, userId, version) {
  requireTermsVersion(version);
  await env.DB.prepare('UPDATE users SET terms_version=?, terms_accepted_at=? WHERE id=?')
    .bind(TERMS_VERSION, new Date().toISOString(), userId).run();
  return {};
}
// Apply to members, profiles, manual posts, automatic posts, and rankings alike.
// Each party loses access to the other's shared identity and records.
export function visibleUserSql(alias, viewerExpression) {
  return `${alias}.suspended=0 AND NOT EXISTS (SELECT 1 FROM user_blocks b
    WHERE (b.blocker_id=${viewerExpression} AND b.blocked_id=${alias}.id)
       OR (b.blocker_id=${alias}.id AND b.blocked_id=${viewerExpression}))`;
}
export async function safetyStatus(env, userId) {
  const user = await env.DB.prepare('SELECT terms_version FROM users WHERE id=?').bind(userId).first();
  const { results: blocked } = await env.DB.prepare(`SELECT u.id, u.name FROM user_blocks b
    JOIN users u ON u.id=b.blocked_id WHERE b.blocker_id=? ORDER BY b.created_at DESC`).bind(userId).all();
  return { termsVersion: TERMS_VERSION, accepted: user?.terms_version === TERMS_VERSION, blocked };
}
export async function setBlock(env, userId, targetId, enabled) {
  if (userId === targetId) throw new SafetyError(400, '自分はブロックできません');
  if (!enabled) {
    await env.DB.prepare('DELETE FROM user_blocks WHERE blocker_id=? AND blocked_id=?').bind(userId, targetId).run();
    return {};
  }
  // No directory of arbitrary accounts: the target must share a room.
  const shared = await env.DB.prepare(`SELECT 1 FROM members a JOIN members b ON b.room_id=a.room_id
    WHERE a.user_id=? AND b.user_id=? LIMIT 1`).bind(userId, targetId).first();
  if (!shared) throw new SafetyError(404, '同じルームのメンバーが見つかりません');
  await env.DB.prepare('INSERT OR IGNORE INTO user_blocks(blocker_id,blocked_id,created_at) VALUES(?,?,?)')
    .bind(userId, targetId, new Date().toISOString()).run();
  return {};
}
export async function report(env, userId, roomId, data) {
  if (!REPORT_REASONS.includes(data.reason) || typeof data.details !== 'string' || data.details.length > 1000 || /[\u0000-\u0008]/u.test(data.details)) {
    throw new SafetyError(400, '通報の理由を確認してください');
  }
  const target = await env.DB.prepare(`SELECT u.id,u.name,u.avatar FROM users u JOIN members m ON m.user_id=u.id
    WHERE m.room_id=? AND u.id=?`).bind(roomId, typeof data.targetId === 'string' ? data.targetId : '').first();
  if (!target || target.id === userId) throw new SafetyError(404, '通報するメンバーが見つかりません');
  let post = null;
  if (data.postId != null) {
    if (typeof data.postId !== 'string' || data.postId.length > 100) throw new SafetyError(400, '記録を確認してください');
    post = await env.DB.prepare(`SELECT id,payload FROM posts WHERE room_id=? AND user_id=? AND id=?
      UNION ALL SELECT id,payload FROM auto_workouts WHERE room_id=? AND user_id=? AND id=? AND deleted=0 LIMIT 1`)
      .bind(roomId,target.id,data.postId,roomId,target.id,data.postId).first();
    if (!post) throw new SafetyError(404, '通報する記録が見つかりません');
  }
  const room = await env.DB.prepare('SELECT name FROM rooms WHERE id=?').bind(roomId).first();
  const id = crypto.randomUUID();
  // Bound daily writes even if a client bypasses the UI or moves between edges.
  const result = await env.DB.prepare(`INSERT INTO safety_reports(id,reporter_id,target_id,room_id,post_id,reason,details,evidence,created_at)
    SELECT ?,?,?,?,?,?,?,?,? WHERE (SELECT count(*) FROM safety_reports WHERE reporter_id=? AND created_at>=?) < 20`)
    .bind(id,userId,target.id,roomId,post?.id ?? null,data.reason,data.details.trim(),JSON.stringify({ room, profile: target, post }),
      new Date().toISOString(),userId,new Date(Date.now()-86400000).toISOString()).run();
  if (!result.meta.changes) throw new SafetyError(429, '本日の通報上限に達しました。緊急の場合はお問い合わせをご利用ください');
  return { id };
}
export async function deleteUser(env, userId) {
  await env.DB.batch([
    env.DB.prepare(`UPDATE rooms SET owner_id=(SELECT m.user_id FROM members m
      WHERE m.room_id=rooms.id AND m.user_id<>? ORDER BY m.rowid,m.user_id LIMIT 1)
      WHERE owner_id=? AND EXISTS(SELECT 1 FROM members m WHERE m.room_id=rooms.id AND m.user_id<>?)`).bind(userId,userId,userId),
    env.DB.prepare('DELETE FROM users WHERE id=?').bind(userId),
  ]);
}
export async function pruneSafety(env) {
  const before = new Date(Date.now()-90*86400000).toISOString();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM safety_reports WHERE created_at<?').bind(before),
    env.DB.prepare('DELETE FROM support_requests WHERE created_at<?').bind(before),
  ]);
}
