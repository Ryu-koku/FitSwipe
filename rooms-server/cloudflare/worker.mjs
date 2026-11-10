import { TERMS_VERSION, SafetyError, requireTermsVersion, requireTerms, acceptTerms, safetyStatus, setBlock, report, deleteUser, pruneSafety, visibleUserSql } from './safety.mjs';
import { publicRoute } from './public-pages.mjs';
import { applyGooglePicture, googlePicture, initialGoogleName } from './google-profile.mjs';
import { GoogleAuthError, googleAndroidPresenters, verifyGoogleToken } from "./google-auth.mjs";
import { SyncError, pruneSync, pullChanges, pushChanges } from "./personal-sync.mjs";
import { ComparisonError, comparison, deleteAutomatic, saveAutomatic, sharing, pruneAutomatic } from './room-comparison.mjs';

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_BODY_BYTES = 131_072;

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function text(value, label, limit) {
  if (typeof value !== "string") throw new ApiError(400, `${label}を確認してください`);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > limit || /[\u0000-\u001f\u007f-\u009f]/u.test(trimmed)) {
    throw new ApiError(400, `${label}を確認してください`);
  }
  return trimmed;
}

function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function newInviteCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return [...bytes].map((byte) => INVITE_ALPHABET[byte & 31]).join("");
}

async function parseBody(request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) throw new ApiError(413, "送信する記録が大きすぎます");
  // Enforce the limit while reading: Content-Length is optional and untrusted.
  const reader = request.body?.getReader();
  const chunks = [];
  let size = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BODY_BYTES) {
          await reader.cancel().catch(() => {});
          throw new ApiError(413, "送信する記録が大きすぎます");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  const raw = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { raw.set(chunk, offset); offset += chunk.byteLength; }
  if (raw.byteLength === 0 || raw.byteLength > MAX_BODY_BYTES) {
    throw new ApiError(raw.byteLength > MAX_BODY_BYTES ? 413 : 400,
      raw.byteLength > MAX_BODY_BYTES ? "送信する記録が大きすぎます" : "送信データを確認してください");
  }
  try {
    const data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("not an object");
    return data;
  } catch {
    throw new ApiError(400, "送信データを確認してください");
  }
}

function validateWorkout(data) {
  const result = {
    clientId: text(data.clientId, "記録ID", 100),
    presetName: text(data.presetName, "プリセット名", 80),
  };
  const dates = [];
  for (const key of ["startedAt", "endedAt"]) {
    const raw = data[key];
    if (typeof raw !== "string" || raw.length > 40 || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(raw)) {
      throw new ApiError(400, "記録の日時を確認してください");
    }
    const date = new Date(raw);
    if (!Number.isFinite(date.getTime())) throw new ApiError(400, "記録の日時を確認してください");
    dates.push(date);
    result[key] = date.toISOString();
  }
  const seconds = (dates[1].getTime() - dates[0].getTime()) / 1000;
  if (seconds < 0 || seconds > 7 * 86_400) throw new ApiError(400, "トレーニング時間を確認してください");
  result.durationMinutes = Math.max(1, Math.ceil(seconds / 60));

  if (!Array.isArray(data.exercises) || data.exercises.length < 1 || data.exercises.length > 100) {
    throw new ApiError(400, "種目を確認してください");
  }
  let totalSets = 0;
  result.exercises = data.exercises.map((exercise) => {
    if (!exercise || typeof exercise !== "object" || Array.isArray(exercise)) throw new ApiError(400, "種目を確認してください");
    if (!Array.isArray(exercise.sets) || exercise.sets.length < 1 || exercise.sets.length > 60) {
      throw new ApiError(400, "セットを確認してください");
    }
    const sets = exercise.sets.map((set) => {
      if (!set || typeof set !== "object" || Array.isArray(set)) throw new ApiError(400, "セットを確認してください");
      const weightKg = set.weightKg ?? null;
      const reps = set.reps;
      const order = set.order;
      const side = set.side ?? null;
      if (weightKg !== null && (typeof weightKg !== "number" || !Number.isFinite(weightKg) || weightKg < 0 || weightKg > 10_000)) {
        throw new ApiError(400, "重量を確認してください");
      }
      if (!Number.isInteger(reps) || reps < 0 || reps > 10_000 || !Number.isInteger(order) || order < 1 || order > 100) {
        throw new ApiError(400, "回数・セット番号を確認してください");
      }
      if (side !== null && side !== "左" && side !== "右") throw new ApiError(400, "左右を確認してください");
      totalSets += 1;
      return { weightKg, reps, order, side };
    });
    return { name: text(exercise.name, "種目名", 80), sets };
  });
  if (totalSets > 600) throw new ApiError(400, "セット数が多すぎます");
  return result;
}

async function rateLimit(binding, request) {
  if (!binding) return;
  const { success } = await binding.limit({ key: request.headers.get("cf-connecting-ip") ?? "unknown" });
  if (!success) throw new ApiError(429, "しばらく待ってからもう一度お試しください");
}

async function authenticate(request, env) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (token.length < 20 || token.length > 100) throw new ApiError(401, "アカウントを確認してください");
  const hash = await sha256(token);
  const user = await env.DB.prepare(`
    SELECT id, name, avatar, google_subject, review_login, suspended FROM users WHERE token_hash = ?
    UNION ALL
    SELECT u.id, u.name, u.avatar, u.google_subject, u.review_login, u.suspended FROM users u
      JOIN account_sessions s ON s.user_id = u.id
      WHERE s.token_hash = ? AND s.expires_at > ? LIMIT 1
  `).bind(hash, hash, Math.floor(Date.now() / 1000)).first();
  if (!user) throw new ApiError(401, "アカウントを確認してください");
  return user;
}

async function requireMember(env, userId, roomId) {
  const member = await env.DB.prepare("SELECT 1 AS ok FROM members WHERE room_id = ? AND user_id = ?")
    .bind(roomId, userId).first();
  if (!member) throw new ApiError(404, "ルームが見つからないか、参加していません");
}

function avatarValue(value) {
  if (value == null) return null;
  if (typeof value !== 'string' || value.length > 24000 || !/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/u.test(value)) {
    throw new ApiError(400, 'アイコンを確認してください');
  }
  return value;
}

async function register(request, env, data) {
  await rateLimit(env.REGISTER_LIMIT, request);
  const name = text(data.name, "表示名", 32);
  requireTermsVersion(data.termsVersion);
  const id = crypto.randomUUID();
  const token = newToken();
  await env.DB.prepare("INSERT INTO users (id, name, token_hash, avatar, avatar_custom, terms_version, terms_accepted_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(id, name, await sha256(token), avatarValue(data.avatar), data.avatar ? 1 : 0, TERMS_VERSION, new Date().toISOString()).run();
  return { id, name, token, avatar: avatarValue(data.avatar) };
}

async function listRooms(env, userId) {
  const { results } = await env.DB.prepare(`
    WITH viewer AS (SELECT ? AS id)
    SELECT r.id, CASE WHEN EXISTS(SELECT 1 FROM user_blocks b WHERE
      (b.blocker_id=(SELECT id FROM viewer) AND b.blocked_id=r.owner_id) OR
      (b.blocked_id=(SELECT id FROM viewer) AND b.blocker_id=r.owner_id)) OR EXISTS(SELECT 1 FROM users owner WHERE owner.id=r.owner_id AND owner.suspended=1) THEN 'ルーム' ELSE r.name END AS name, r.competitive, r.owner_id AS ownerId, r.invite AS inviteCode,
      (SELECT count(*) FROM members m WHERE m.room_id = r.id) AS memberCount,
      (SELECT since_month FROM room_sharing s WHERE s.room_id=r.id AND s.user_id=m.user_id) AS sharingSince,
      (SELECT json_group_array(name) FROM (SELECT u.name FROM users u JOIN members preview ON preview.user_id=u.id WHERE preview.room_id=r.id AND ${visibleUserSql('u', '(SELECT id FROM viewer)')} ORDER BY u.name LIMIT 3)) AS memberNames,
      (SELECT json_group_array(json_object('name',name,'avatar',avatar)) FROM (SELECT u.name,u.avatar FROM users u JOIN members preview ON preview.user_id=u.id WHERE preview.room_id=r.id AND ${visibleUserSql('u', '(SELECT id FROM viewer)')} ORDER BY u.name LIMIT 3)) AS memberProfiles
    FROM rooms r JOIN members m ON m.room_id = r.id
    WHERE m.user_id = ? ORDER BY r.rowid DESC
  `).bind(userId, userId).all();
  return { rooms: results.map((r) => ({ ...r, competitive: Boolean(r.competitive), memberNames: JSON.parse(r.memberNames), memberProfiles: JSON.parse(r.memberProfiles) })) };
}

async function createRoom(env, userId, data) {
  const competitive = data.competitive === undefined ? false : data.competitive;
  if (typeof competitive !== "boolean") throw new ApiError(400, "ルームの種類が不正です");
  const rawName = data.name ?? "";
  let name;
  if (typeof rawName === "string" && !rawName.trim()) name = "筋トレ仲間";
  else name = text(rawName, "ルーム名", 40);
  const id = crypto.randomUUID();
  const invite = newInviteCode();
  const results = await env.DB.batch([
    env.DB.prepare(`INSERT INTO rooms (id, name, owner_id, invite, competitive)
      SELECT ?, ?, ?, ?, ? WHERE (SELECT count(*) FROM members WHERE user_id = ?) < 30`)
      .bind(id, name, userId, invite, competitive ? 1 : 0, userId),
    env.DB.prepare("INSERT INTO members (room_id, user_id) SELECT id, ? FROM rooms WHERE id = ?").bind(userId, id),
  ]);
  if (!results[0].meta.changes) throw new ApiError(400, "参加できるルームは30個までです");
  return { id };
}

async function joinRoom(env, userId, data) {
  const rawCode = text(data.code, "招待コード", 200);
  let code = rawCode;
  if (/^fitswipe:\/\//iu.test(rawCode)) {
    try { code = new URL(rawCode).searchParams.get("code") ?? rawCode; } catch { /* validate as a code below */ }
  }
  code = code.trim().toUpperCase().replaceAll("-", "").replaceAll(" ", "");
  const room = await env.DB.prepare("SELECT id FROM rooms WHERE invite = ?").bind(code).first();
  if (!room) throw new ApiError(404, "招待コードが見つかりません");
  const existing = await env.DB.prepare("SELECT 1 AS ok FROM members WHERE room_id = ? AND user_id = ?")
    .bind(room.id, userId).first();
  if (!existing) {
    const result = await env.DB.prepare(`INSERT OR IGNORE INTO members (room_id, user_id)
      SELECT id, ? FROM rooms WHERE id=? AND invite=?
      AND (SELECT count(*) FROM members WHERE user_id = ?) < 30
      AND (SELECT count(*) FROM members WHERE room_id = ?) < 100`)
      .bind(userId, room.id, code, userId, room.id).run();
    if (!result.meta.changes) {
      // A concurrent retry may already have joined successfully.
      const joined = await env.DB.prepare("SELECT 1 AS ok FROM members WHERE room_id = ? AND user_id = ?")
        .bind(room.id, userId).first();
      if (!joined) {
        const [userCount, memberCount] = await Promise.all([
          env.DB.prepare("SELECT count(*) AS count FROM members WHERE user_id = ?").bind(userId).first(),
          env.DB.prepare("SELECT count(*) AS count FROM members WHERE room_id = ?").bind(room.id).first(),
        ]);
        if (userCount.count >= 30) throw new ApiError(400, "参加できるルームは30個までです");
        if (memberCount.count >= 100) throw new ApiError(400, "ルームの人数が上限に達しています");
      }
    }
    await requireMember(env, userId, room.id);
  }
  return { id: room.id };
}

async function roomDetail(env, userId, roomId) {
  await requireMember(env, userId, roomId);
  const { results } = await env.DB.prepare(`
    SELECT u.id, u.name, u.avatar FROM users u JOIN members m ON m.user_id = u.id
    WHERE m.room_id = ? AND ${visibleUserSql('u', '?')} ORDER BY u.name
  `).bind(roomId, userId, userId).all();
  return { members: results };
}

async function listPosts(env, userId, roomId, before) {
  await requireMember(env, userId, roomId);
  let cursor = Number.MAX_SAFE_INTEGER;
  if (before) {
    const row = await env.DB.prepare("SELECT seq FROM posts WHERE id = ? AND room_id = ?")
      .bind(before, roomId).first();
    if (!row) throw new ApiError(400, "続きの記録が見つかりません");
    cursor = row.seq;
  }
  const { results } = await env.DB.prepare(`
    SELECT p.seq, p.id, p.user_id AS userId, u.name, p.created_at AS createdAt, p.payload
    FROM posts p JOIN users u ON u.id = p.user_id
    WHERE p.room_id = ? AND p.seq < ? AND ${visibleUserSql('u', '?')} ORDER BY p.seq DESC LIMIT 51
  `).bind(roomId, cursor, userId, userId).all();
  const hasMore = results.length > 50;
  const rows = results.slice(0, 50).map((row) => ({
    id: row.id,
    userId: row.userId,
    name: row.name,
    createdAt: row.createdAt,
    workout: JSON.parse(row.payload),
  }));
  return { posts: rows, nextCursor: hasMore ? rows.at(-1).id : null };
}

async function savePost(env, userId, roomId, data) {
  const payload = validateWorkout(data);
  await requireMember(env, userId, roomId);
  if (await env.DB.prepare('SELECT 1 FROM hidden_workouts WHERE room_id=? AND user_id=? AND client_id=?').bind(roomId,userId,payload.clientId).first()) throw new SafetyError(403, '運営により削除された記録は再共有できません');
  const existing = await env.DB.prepare(`
    SELECT id FROM posts WHERE room_id = ? AND user_id = ? AND client_id = ?
  `).bind(roomId, userId, payload.clientId).first();
  if (existing) return { id: existing.id };

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const dailyCount = await env.DB.prepare("SELECT count(*) AS count FROM posts WHERE user_id = ? AND created_at >= ?")
    .bind(userId, since).first();
  if (dailyCount.count >= 100) throw new ApiError(429, "1日に共有できる記録は100件までです");
  const roomCount = await env.DB.prepare("SELECT count(*) AS count FROM posts WHERE room_id = ?")
    .bind(roomId).first();
  if (roomCount.count >= 10_000) throw new ApiError(400, "このルームの記録数が上限に達しています");

  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO posts (id, room_id, user_id, client_id, created_at, payload)
    SELECT ?, ?, ?, ?, ?, ? WHERE EXISTS(SELECT 1 FROM members WHERE room_id=? AND user_id=?) ON CONFLICT(room_id, user_id, client_id) DO NOTHING
  `).bind(id, roomId, userId, payload.clientId, new Date().toISOString(), JSON.stringify(payload), roomId, userId).run();
  const saved = await env.DB.prepare(`
    SELECT id FROM posts WHERE room_id = ? AND user_id = ? AND client_id = ?
  `).bind(roomId, userId, payload.clientId).first();
  if (!saved) throw new ApiError(404, "ルームに参加していません");
  return { id: saved.id };
}

async function deletePost(env, userId, roomId, postId) {
  await requireMember(env, userId, roomId);
  const result = await env.DB.prepare("DELETE FROM posts WHERE id = ? AND room_id = ? AND user_id = ?")
    .bind(postId, roomId, userId).run();
  if (result.meta.changes === 0) throw new ApiError(404, "自分の投稿だけを削除できます");
  return {};
}

async function leaveRoom(env, userId, roomId) {
  await requireMember(env, userId, roomId);
  const room = await env.DB.prepare("SELECT owner_id FROM rooms WHERE id = ?").bind(roomId).first();
  if (!room) throw new ApiError(404, 'ルームが見つかりません');
  if (room.owner_id === userId) {
    await env.DB.prepare("DELETE FROM rooms WHERE id = ? AND owner_id = ?").bind(roomId, userId).run();
    return {};
  }
  // A concurrent transfer must not leave an owner without a membership.
  return manageRoom(env, userId, roomId, 'leave');
}

async function manageRoom(env, userId, roomId, action, targetId) {
  await requireMember(env, userId, roomId);
  if (action === 'leave') {
    // D1 batch is transactional: transfer before deleting the membership.
    await env.DB.batch([
      env.DB.prepare(`UPDATE rooms SET owner_id=(SELECT user_id FROM members
        WHERE room_id=? AND user_id<>? ORDER BY rowid,user_id LIMIT 1)
        WHERE id=? AND owner_id=? AND EXISTS(SELECT 1 FROM members WHERE room_id=? AND user_id<>?)`)
        .bind(roomId,userId,roomId,userId,roomId,userId),
      env.DB.prepare('DELETE FROM rooms WHERE id=? AND owner_id=?').bind(roomId,userId),
      env.DB.prepare('DELETE FROM posts WHERE room_id=? AND user_id=?').bind(roomId,userId),
      env.DB.prepare('DELETE FROM members WHERE room_id=? AND user_id=?').bind(roomId,userId),
    ]);
    return {};
  }
  const room = await env.DB.prepare('SELECT owner_id FROM rooms WHERE id=?').bind(roomId).first();
  if (room?.owner_id !== userId) throw new ApiError(403, '作成者だけが操作できます');
  if (action === 'invite') {
    const result = await env.DB.prepare('UPDATE rooms SET invite=? WHERE id=? AND owner_id=?')
      .bind(newInviteCode(),roomId,userId).run();
    if (!result.meta.changes) throw new ApiError(403, '作成者だけが操作できます');
    return {};
  }
  if (targetId === userId) throw new ApiError(400, '自分を除名できません。退出を選んでください');
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM posts WHERE room_id=? AND user_id=?
      AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND owner_id=?)`).bind(roomId,targetId,roomId,userId),
    env.DB.prepare(`DELETE FROM members WHERE room_id=? AND user_id=?
      AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND owner_id=?)`).bind(roomId,targetId,roomId,userId),
  ]);
  return {};
}

async function route(request, env) {
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method;
  if (method === "GET" && pathname === "/health") return { status: 200, data: { status: "ok" } };
  await rateLimit(env.API_LIMIT, request);

  const body = ["POST", "PUT", "PATCH"].includes(method) ? await parseBody(request) : {};
  if (method === "POST" && pathname === "/v1/account") {
    return { status: 200, data: await register(request, env, body) };
  }

  if (pathname === "/v1/auth/review" && method === "POST") {
    await rateLimit(env.REGISTER_LIMIT, request);
    requireTermsVersion(body.termsVersion);
    // Credentials live only in Worker secrets and Play's restricted access notes.
    // This account contains synthetic review data, never a real user's identity.
    if (!env.REVIEW_LOGIN || !/^[a-f0-9]{64}$/u.test(env.REVIEW_PASSWORD_SHA256 ?? '')) {
      throw new ApiError(503, 'デモログインは準備中です');
    }
    const password = typeof body.password === 'string' && body.password.length <= 128 ? body.password : '';
    const actual = await sha256(password);
    let difference = 0;
    for (let i = 0; i < 64; i++) difference |= actual.charCodeAt(i) ^ env.REVIEW_PASSWORD_SHA256.charCodeAt(i);
    if (body.login !== env.REVIEW_LOGIN || difference !== 0 || !password) {
      throw new ApiError(401, 'デモ用IDまたはパスワードを確認してください');
    }
    await env.DB.prepare('INSERT OR IGNORE INTO users(id,name,token_hash,review_login) VALUES (?,?,?,?)')
      .bind(crypto.randomUUID(), '審査用デモ', await sha256(newToken()), env.REVIEW_LOGIN).run();
    const user = await env.DB.prepare('SELECT id,name,avatar,suspended FROM users WHERE review_login=?').bind(env.REVIEW_LOGIN).first();
    if (user.suspended) throw new SafetyError(403, '共有機能の利用が停止されています');
    await acceptTerms(env, user.id, body.termsVersion);
    const token = newToken();
    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 86_400;
    await env.DB.prepare('INSERT INTO account_sessions(token_hash,user_id,expires_at) VALUES (?,?,?)')
      .bind(await sha256(token), user.id, expiresAt).run();
    return { status: 200, data: { id: user.id, name: user.name, avatar: user.avatar, token, expiresAt } };
  }

  if (pathname === "/v1/auth/google" && method === "POST") {
    await rateLimit(env.REGISTER_LIMIT, request);
    requireTermsVersion(body.termsVersion);
    if (!env.GOOGLE_WEB_CLIENT_ID) throw new ApiError(503, "Googleログインは準備中です");
    const { subject, picture, name: googleName } = await verifyGoogleToken(body.idToken, env.GOOGLE_WEB_CLIENT_ID, {
      authorizedPresenters: googleAndroidPresenters(env),
    });
    const current = request.headers.has("authorization") ? await authenticate(request, env) : null;
    if (current?.review_login) throw new ApiError(409, 'デモアカウントからログアウトしてください');
    if (current?.suspended) throw new SafetyError(403, '共有機能の利用が停止されています。お問い合わせをご利用ください');
    let user = await env.DB.prepare("SELECT id, name, avatar, suspended FROM users WHERE google_subject = ?").bind(subject).first();
    if (current) {
      if ((user && user.id !== current.id) || (current.google_subject && current.google_subject !== subject)) {
        throw new ApiError(409, "別のアカウントに連携済みです。データは統合していません");
      }
      try {
        await env.DB.prepare("UPDATE users SET google_subject = ? WHERE id = ? AND (google_subject IS NULL OR google_subject = ?)")
          .bind(subject, current.id, subject).run();
      } catch {
        throw new ApiError(409, "連携状態が変わりました。もう一度確認してください");
      }
      user = current;
    } else if (!user) {
      const id = crypto.randomUUID();
      const name = initialGoogleName(googleName, body.name);
      // A concurrent login may win the unique Google-subject constraint.
      await env.DB.prepare("INSERT OR IGNORE INTO users(id, name, token_hash, google_subject) VALUES (?, ?, ?, ?)")
        .bind(id, name, await sha256(newToken()), subject).run();
      user = await env.DB.prepare("SELECT id, name, avatar, suspended FROM users WHERE google_subject = ?").bind(subject).first();
    }
    if (user.suspended) throw new SafetyError(403, '共有機能の利用が停止されています。お問い合わせかWebのアカウント削除をご利用ください');
    await acceptTerms(env, user.id, body.termsVersion);
    user = await applyGooglePicture(env, user, picture);
    const token = newToken();
    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 86_400;
    await env.DB.prepare("INSERT INTO account_sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)")
      .bind(await sha256(token), user.id, expiresAt).run();
    return { status: 200, data: { id: user.id, name: user.name, avatar: user.avatar, token, expiresAt } };
  }

  if (pathname === "/v1/auth/session" && method === "DELETE") {
    // Logout revokes this Google session only. Legacy anonymous room tokens
    // are the account itself and end with account deletion.
    const authorization = request.headers.get("authorization") ?? "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (token.length < 20 || token.length > 100) throw new ApiError(401, "アカウントを確認してください");
    await env.DB.prepare("DELETE FROM account_sessions WHERE token_hash = ?").bind(await sha256(token)).run();
    return { status: 200, data: {} };
  }

  const user = await authenticate(request, env);
  if (pathname === '/v1/account' && method === 'DELETE') {
    await deleteUser(env, user.id);
    return { status: 200, data: {} };
  }
  if (user.suspended) throw new SafetyError(403, '共有機能の利用が停止されています。お問い合わせをご利用ください');
  if (pathname === '/v1/safety' && method === 'GET') return { status: 200, data: await safetyStatus(env, user.id) };
  if (pathname === '/v1/safety/terms' && method === 'POST') return { status: 200, data: await acceptTerms(env, user.id, body.termsVersion) };
  const block = pathname.match(/^\/v1\/safety\/blocks\/([a-f0-9-]{36})$/u);
  if (block && ['PUT','DELETE'].includes(method)) return { status: 200, data: await setBlock(env,user.id,block[1],method==='PUT') };
  const reportPath = pathname.match(/^\/v1\/rooms\/([a-f0-9-]{36})\/reports$/u);
  if (reportPath && method === 'POST') {
    await requireMember(env,user.id,reportPath[1]);
    return { status: 200, data: await report(env,user.id,reportPath[1],body) };
  }
  // Retraction, deletion, blocking, and reporting remain available without new consent.
  const uploads = (pathname === '/v1/account' && ['PUT','PATCH'].includes(method)) ||
    (method === 'POST' && (pathname === '/v1/rooms' || pathname === '/v1/rooms/join' || pathname.endsWith('/posts'))) ||
    (method === 'PUT' && (pathname.endsWith('/auto-workouts') || (pathname.endsWith('/sharing') && body.enabled)));
  if (uploads) await requireTerms(env,user.id);
  if (pathname === "/v1/sync" && method === "POST") {
    return { status: 200, data: await pushChanges(env, user, body) };
  }
  if (pathname === "/v1/sync" && method === "GET") {
    return { status: 200, data: await pullChanges(env, user, url.searchParams.get("cursor")) };
  }
  if (pathname === "/v1/account" && ["PUT", "PATCH"].includes(method)) {
    const name = text(body.name, "表示名", 32);
    // A name-only edit can echo the current Google photo, but cannot set another remote URL.
    const avatar = Object.hasOwn(body, 'avatar')
      ? (body.avatar === user.avatar && googlePicture(body.avatar) ? user.avatar : avatarValue(body.avatar))
      : user.avatar;
    const changed = avatar !== user.avatar;
    await env.DB.prepare("UPDATE users SET name = ?, avatar = ?, avatar_custom = CASE WHEN ? THEN 1 ELSE avatar_custom END WHERE id = ?")
      .bind(name, avatar, changed ? 1 : 0, user.id).run();
    return { status: 200, data: { name, avatar } };
  }
  if (pathname === "/v1/rooms" && method === "GET") {
    return { status: 200, data: await listRooms(env, user.id) };
  }
  if (pathname === "/v1/rooms" && method === "POST") {
    return { status: 200, data: await createRoom(env, user.id, body) };
  }
  if (pathname === "/v1/rooms/join" && method === "POST") {
    return { status: 200, data: await joinRoom(env, user.id, body) };
  }

  const management = pathname.match(/^\/v1\/rooms\/([a-f0-9-]{36})\/(invite|leave|members)(?:\/([a-f0-9-]{36}))?$/u);
  if (management) {
    const [, roomId, action, targetId] = management;
    if ((action === 'members' && targetId && method === 'DELETE') ||
        (action !== 'members' && !targetId && method === 'POST')) {
      return { status: 200, data: await manageRoom(env, user.id, roomId, action, targetId) };
    }
    throw new ApiError(405, 'この操作はできません');
  }

  const automatic = pathname.match(/^\/v1\/rooms\/([a-f0-9-]{36})\/(sharing|comparison|auto-workouts)(?:\/([A-Za-z0-9-]{1,100}))?$/u);
  if (automatic) {
    const [, roomId, action, clientId] = automatic;
    await requireMember(env, user.id, roomId);
    await pruneAutomatic(env, new Date(), roomId);
    if (action === 'sharing' && method === 'PUT' && !clientId) return { status: 200, data: await sharing(env, user.id, roomId, body.enabled, body.sinceMonth) };
    if (action === 'comparison' && method === 'GET' && !clientId) return { status: 200, data: await comparison(env, roomId, url.searchParams.get('month'), url.searchParams.get('cursor'), url.searchParams.get('memberId'), user.id) };
    if (action === 'auto-workouts' && method === 'PUT' && !clientId) return { status: 200, data: await saveAutomatic(env, user.id, roomId, body, validateWorkout) };
    if (action === 'auto-workouts' && method === 'GET' && !clientId) {
      const { results } = await env.DB.prepare('SELECT client_id FROM auto_workouts WHERE room_id=? AND user_id=? AND deleted=0').bind(roomId, user.id).all();
      return { status: 200, data: { clientIds: results.map((r) => r.client_id), used: results.length, limit: 1000 } };
    }
    if (action === 'auto-workouts' && method === 'DELETE' && clientId) return { status: 200, data: await deleteAutomatic(env, user.id, roomId, clientId) };
    throw new ApiError(405, 'この操作はできません');
  }
  const match = pathname.match(/^\/v1\/rooms\/([a-f0-9-]{36})(?:\/posts(?:\/([a-f0-9-]{36}))?)?$/u);
  if (!match) throw new ApiError(404, "見つかりません");
  const [, roomId, postId] = match;
  const postsPath = pathname.endsWith("/posts");
  if (postId && method === "DELETE") return { status: 200, data: await deletePost(env, user.id, roomId, postId) };
  if (postsPath && method === "GET") return { status: 200, data: await listPosts(env, user.id, roomId, url.searchParams.get("before")) };
  if (postsPath && method === "POST") return { status: 200, data: await savePost(env, user.id, roomId, body) };
  if (!postsPath && !postId && method === "GET") return { status: 200, data: await roomDetail(env, user.id, roomId) };
  if (!postsPath && !postId && method === "DELETE") return { status: 200, data: await leaveRoom(env, user.id, roomId) };
  throw new ApiError(405, "この操作はできません");
}

export default {
  async scheduled(_event, env) {
    await pruneAutomatic(env);
    await pruneSync(env);
    await pruneSafety(env);
  },
  async fetch(request, env) {
    try {
      const publicResponse = await publicRoute(request, env);
      if (publicResponse) return publicResponse;
      const result = await route(request, env);
      return response(result.data, result.status);
    } catch (error) {
      if (error instanceof ApiError || error instanceof SyncError || error instanceof ComparisonError || error instanceof SafetyError) return response({ error: error.message }, error.status);
      if (error instanceof GoogleAuthError) return response({ error: "Googleログインを確認してください" }, 401);
      // Dependency messages can contain bound SQL values or authentication data.
      console.error("rooms request failed");
      return response({ error: "サーバーに接続できませんでした。再度お試しください" }, 500);
    }
  },
};
