"""FitSwipe private workout rooms. WSGI application; run behind HTTPS in production."""
import hashlib
import json
import math
import os
import re
import secrets
import sqlite3
import threading
import time
import uuid
from datetime import datetime, timezone
from contextlib import contextmanager
from pathlib import Path
from urllib.parse import parse_qs


class ApiError(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message


def text(value, label, limit):
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > limit or not value.strip().isprintable():
        raise ApiError(400, f"{label}を確認してください")
    return value.strip()


def workout(data):
    """Keep a bounded, explicit snapshot, independent of the sender's local DB IDs."""
    result = {
        "clientId": text(data.get("clientId"), "記録ID", 100),
        "presetName": text(data.get("presetName"), "プリセット名", 80),
    }
    moments = []
    for key in ("startedAt", "endedAt"):
        try:
            raw = data[key]
            if not isinstance(raw, str) or len(raw) > 40:
                raise ValueError()
            date = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            if date.tzinfo is None:
                raise ValueError()
            moments.append(date)
            result[key] = date.astimezone(timezone.utc).isoformat()
        except (KeyError, TypeError, ValueError, OverflowError):
            raise ApiError(400, "記録の日時を確認してください") from None
    seconds = (moments[1] - moments[0]).total_seconds()
    if seconds < 0 or seconds > 7 * 86400:
        raise ApiError(400, "トレーニング時間を確認してください")
    result["durationMinutes"] = max(1, math.ceil(seconds / 60))
    exercises = data.get("exercises")
    if not isinstance(exercises, list) or not 1 <= len(exercises) <= 100:
        raise ApiError(400, "種目を確認してください")
    result["exercises"] = []
    total = 0
    for exercise in exercises:
        if not isinstance(exercise, dict):
            raise ApiError(400, "種目を確認してください")
        row = {"name": text(exercise.get("name"), "種目名", 80), "sets": []}
        sets = exercise.get("sets")
        if not isinstance(sets, list) or not 1 <= len(sets) <= 60:
            raise ApiError(400, "セットを確認してください")
        for entry in sets:
            if not isinstance(entry, dict):
                raise ApiError(400, "セットを確認してください")
            weight, reps, order, side = (entry.get(k) for k in ("weightKg", "reps", "order", "side"))
            if weight is not None and (type(weight) not in (int, float) or not math.isfinite(weight) or not 0 <= weight <= 10000):
                raise ApiError(400, "重量を確認してください")
            if type(reps) is not int or not 0 <= reps <= 10000 or type(order) is not int or not 1 <= order <= 100:
                raise ApiError(400, "回数・セット番号を確認してください")
            if side not in (None, "左", "右"):
                raise ApiError(400, "左右を確認してください")
            row["sets"].append({"weightKg": weight, "reps": reps, "order": order, "side": side})
            total += 1
        result["exercises"].append(row)
    if total > 600:
        raise ApiError(400, "セット数が多すぎます")
    return result


class Store:
    def __init__(self, path):
        self.path = str(path)
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript("""
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, name TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE);
                CREATE TABLE IF NOT EXISTS rooms(id TEXT PRIMARY KEY, name TEXT NOT NULL,
                    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, invite TEXT NOT NULL UNIQUE);
                CREATE TABLE IF NOT EXISTS members(room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
                    user_id TEXT REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(room_id,user_id));
                CREATE TABLE IF NOT EXISTS posts(seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
                    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, client_id TEXT NOT NULL,
                    created_at TEXT NOT NULL, payload TEXT NOT NULL, UNIQUE(room_id,user_id,client_id));
                CREATE INDEX IF NOT EXISTS room_posts ON posts(room_id,seq DESC);
                CREATE INDEX IF NOT EXISTS user_memberships ON members(user_id);
                CREATE INDEX IF NOT EXISTS user_posts ON posts(user_id,created_at);
            """)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def register(self, data):
        name = text(data.get("name"), "表示名", 32)
        token, identity = secrets.token_urlsafe(32), str(uuid.uuid4())
        with self.connect() as db:
            db.execute("INSERT INTO users VALUES(?,?,?)", (identity, name, hashlib.sha256(token.encode()).hexdigest()))
        return {"id": identity, "name": name, "token": token}

    def authenticate(self, authorization):
        token = authorization.removeprefix("Bearer ") if authorization.startswith("Bearer ") else ""
        if not 20 <= len(token) <= 100:
            raise ApiError(401, "アカウントを確認してください")
        with self.connect() as db:
            user = db.execute("SELECT id,name FROM users WHERE token_hash=?", (hashlib.sha256(token.encode()).hexdigest(),)).fetchone()
        if user is None:
            raise ApiError(401, "アカウントを確認してください")
        return dict(user)

    @staticmethod
    def member(db, user, room):
        if not db.execute("SELECT 1 FROM members WHERE room_id=? AND user_id=?", (room, user)).fetchone():
            raise ApiError(404, "ルームが見つからないか、参加していません")

    def rooms(self, user):
        with self.connect() as db:
            return {"rooms": [dict(row) for row in db.execute("""
                SELECT r.id,r.name,r.owner_id AS ownerId,r.invite AS inviteCode,
                    (SELECT count(*) FROM members m WHERE m.room_id=r.id) AS memberCount
                FROM rooms r JOIN members m ON m.room_id=r.id WHERE m.user_id=? ORDER BY r.rowid DESC
            """, (user,))]}

    def create_room(self, user, data):
        name = text(data.get("name"), "ルーム名", 40)
        identity, invite = str(uuid.uuid4()), "".join(secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(10))
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            if db.execute("SELECT count(*) FROM members WHERE user_id=?", (user,)).fetchone()[0] >= 30:
                raise ApiError(400, "参加できるルームは30個までです")
            db.execute("INSERT INTO rooms VALUES(?,?,?,?)", (identity, name, user, invite))
            db.execute("INSERT INTO members VALUES(?,?)", (identity, user))
        return {"id": identity}

    def join(self, user, data):
        invite = text(data.get("code"), "招待コード", 200).upper().replace("-", "").replace(" ", "")
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            room = db.execute("SELECT id FROM rooms WHERE invite=?", (invite,)).fetchone()
            if not room:
                raise ApiError(404, "招待コードが見つかりません")
            existing = db.execute("SELECT 1 FROM members WHERE room_id=? AND user_id=?", (room["id"], user)).fetchone()
            if not existing:
                if db.execute("SELECT count(*) FROM members WHERE user_id=?", (user,)).fetchone()[0] >= 30:
                    raise ApiError(400, "参加できるルームは30個までです")
                if db.execute("SELECT count(*) FROM members WHERE room_id=?", (room["id"],)).fetchone()[0] >= 100:
                    raise ApiError(400, "ルームの人数が上限に達しています")
                db.execute("INSERT INTO members VALUES(?,?)", (room["id"], user))
        return {"id": room["id"]}

    def detail(self, user, room):
        with self.connect() as db:
            self.member(db, user, room)
            members = [dict(row) for row in db.execute("SELECT u.id,u.name FROM users u JOIN members m ON m.user_id=u.id WHERE m.room_id=? ORDER BY u.name", (room,))]
        return {"members": members}

    def posts(self, user, room, before=None):
        with self.connect() as db:
            self.member(db, user, room)
            cursor = 2**63 - 1
            if before:
                row = db.execute("SELECT seq FROM posts WHERE id=? AND room_id=?", (before, room)).fetchone()
                if not row:
                    raise ApiError(400, "続きの記録が見つかりません")
                cursor = row["seq"]
            rows = db.execute("""SELECT p.*,u.name AS user_name FROM posts p JOIN users u ON u.id=p.user_id
                WHERE room_id=? AND seq<? ORDER BY seq DESC LIMIT 51""", (room, cursor)).fetchall()
        posts = [{"id": row["id"], "userId": row["user_id"], "name": row["user_name"],
                  "createdAt": row["created_at"], "workout": json.loads(row["payload"])} for row in rows[:50]]
        return {"posts": posts, "nextCursor": posts[-1]["id"] if len(rows) > 50 else None}

    def post(self, user, room, data):
        payload = workout(data)
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            self.member(db, user, room)
            existing = db.execute("SELECT id FROM posts WHERE room_id=? AND user_id=? AND client_id=?", (room, user, payload["clientId"])).fetchone()
            if existing:
                return {"id": existing["id"]}
            since = datetime.fromtimestamp(time.time() - 86400, timezone.utc).isoformat()
            if db.execute("SELECT count(*) FROM posts WHERE user_id=? AND created_at>=?", (user, since)).fetchone()[0] >= 100:
                raise ApiError(429, "1日に共有できる記録は100件までです")
            if db.execute("SELECT count(*) FROM posts WHERE room_id=?", (room,)).fetchone()[0] >= 10000:
                raise ApiError(400, "このルームの記録数が上限に達しています")
            identity = str(uuid.uuid4())
            db.execute("""INSERT INTO posts(id,room_id,user_id,client_id,created_at,payload) VALUES(?,?,?,?,?,?)
                ON CONFLICT(room_id,user_id,client_id) DO NOTHING""",
                (identity, room, user, payload["clientId"], datetime.now(timezone.utc).isoformat(), json.dumps(payload, ensure_ascii=False, allow_nan=False)))
            identity = db.execute("SELECT id FROM posts WHERE room_id=? AND user_id=? AND client_id=?", (room, user, payload["clientId"])).fetchone()[0]
        return {"id": identity}

    def delete_post(self, user, room, post):
        with self.connect() as db:
            self.member(db, user, room)
            row = db.execute("SELECT user_id FROM posts WHERE id=? AND room_id=?", (post, room)).fetchone()
            if not row or row[0] != user:
                raise ApiError(404, "自分の投稿だけを削除できます")
            db.execute("DELETE FROM posts WHERE id=?", (post,))
        return {}

    def leave(self, user, room):
        with self.connect() as db:
            self.member(db, user, room)
            owner = db.execute("SELECT owner_id FROM rooms WHERE id=?", (room,)).fetchone()[0]
            if owner == user:
                db.execute("DELETE FROM rooms WHERE id=?", (room,))
            else:
                # Shared copies disappear when their author leaves the room.
                db.execute("DELETE FROM posts WHERE room_id=? AND user_id=?", (room, user))
                db.execute("DELETE FROM members WHERE room_id=? AND user_id=?", (room, user))
        return {}

    def account(self, user, method, data):
        with self.connect() as db:
            if method == "DELETE":
                db.execute("DELETE FROM users WHERE id=?", (user,))
            else:
                db.execute("UPDATE users SET name=? WHERE id=?", (text(data.get("name"), "表示名", 32), user))
        return {}


class Application:
    def __init__(self, store):
        self.store = store
        self.limits = {}
        self.limit_lock = threading.Lock()

    def rate_limit(self, environ, registration):
        peer = environ.get("REMOTE_ADDR", "unknown")
        # Deployment binds to loopback behind a trusted TLS proxy only.
        if peer in ("127.0.0.1", "::1"):
            forwarded = environ.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
            peer = forwarded or peer
        now, window, cap = time.monotonic(), (3600 if registration else 60), (20 if registration else 300)
        key = (peer, registration)
        with self.limit_lock:
            self.limits = {k: v for k, v in self.limits.items() if now - v[0] < (3600 if k[1] else 60)}
            started, count = self.limits.get(key, (now, 0))
            if now - started >= window:
                started, count = now, 0
            if count >= cap:
                raise ApiError(429, "しばらく待ってからもう一度お試しください")
            self.limits[key] = (started, count + 1)

    def __call__(self, environ, start_response):
        status = 200
        try:
            method, path = environ["REQUEST_METHOD"], environ.get("PATH_INFO", "")
            self.rate_limit(environ, method == "POST" and path == "/v1/account")
            data = {}
            if method in ("POST", "PUT", "PATCH"):
                try:
                    length = int(environ.get("CONTENT_LENGTH", "0"))
                    if not 0 < length <= 131072:
                        raise ApiError(413, "送信する記録が大きすぎます")
                    data = json.loads(environ["wsgi.input"].read(length), parse_constant=lambda _: (_ for _ in ()).throw(ValueError()))
                    if not isinstance(data, dict):
                        raise ValueError()
                except (ValueError, TypeError, UnicodeError):
                    raise ApiError(400, "送信データを確認してください") from None
            if method == "GET" and path == "/health":
                result = {"status": "ok"}
            elif method == "POST" and path == "/v1/account":
                result = self.store.register(data)
            else:
                user = self.store.authenticate(environ.get("HTTP_AUTHORIZATION", ""))["id"]
                if path == "/v1/account" and method in ("PUT", "PATCH", "DELETE"):
                    result = self.store.account(user, method, data)
                elif path == "/v1/rooms" and method == "GET":
                    result = self.store.rooms(user)
                elif path == "/v1/rooms" and method == "POST":
                    result = self.store.create_room(user, data)
                elif path == "/v1/rooms/join" and method == "POST":
                    result = self.store.join(user, data)
                else:
                    match = re.fullmatch(r"/v1/rooms/([a-f0-9-]{36})(?:/posts(?:/([a-f0-9-]{36}))?)?", path)
                    if not match:
                        raise ApiError(404, "見つかりません")
                    room, post = match.groups()
                    if post and method == "DELETE":
                        result = self.store.delete_post(user, room, post)
                    elif path.endswith("/posts") and method == "GET":
                        result = self.store.posts(user, room, parse_qs(environ.get("QUERY_STRING", "")).get("before", [None])[0])
                    elif path.endswith("/posts") and method == "POST":
                        result = self.store.post(user, room, data)
                    elif not path.endswith("/posts") and not post and method == "GET":
                        result = self.store.detail(user, room)
                    elif not path.endswith("/posts") and not post and method == "DELETE":
                        result = self.store.leave(user, room)
                    else:
                        raise ApiError(405, "この操作はできません")
        except ApiError as error:
            status, result = error.status, {"error": error.message}
        except Exception:
            import logging
            logging.exception("rooms request failed")
            status, result = 500, {"error": "サーバーに接続できませんでした。再度お試しください"}
        body = json.dumps(result, ensure_ascii=False, allow_nan=False).encode("utf-8")
        reason = {200: "OK", 400: "Bad Request", 401: "Unauthorized", 404: "Not Found", 405: "Method Not Allowed", 413: "Content Too Large", 429: "Too Many Requests", 500: "Internal Server Error"}[status]
        start_response(f"{status} {reason}", [("Content-Type", "application/json; charset=utf-8"),
            ("Content-Length", str(len(body))), ("Cache-Control", "no-store"), ("X-Content-Type-Options", "nosniff")])
        return [body]


def create_app(path=None):
    return Application(Store(path or Path(os.environ.get("ROOMS_DATA_DIR", "/data")) / "rooms.sqlite3"))


if __name__ == "__main__":
    from wsgiref.simple_server import make_server
    with make_server("127.0.0.1", 8787, create_app()) as server:
        server.serve_forever()
