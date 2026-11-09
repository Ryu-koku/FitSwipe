ALTER TABLE users ADD COLUMN terms_version TEXT;
ALTER TABLE users ADD COLUMN terms_accepted_at TEXT;
ALTER TABLE users ADD COLUMN suspended INTEGER NOT NULL DEFAULT 0 CHECK(suspended IN (0,1));
CREATE TABLE user_blocks (
  blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY(blocker_id, blocked_id),
  CHECK(blocker_id <> blocked_id)
);
CREATE INDEX blocked_users ON user_blocks(blocked_id, blocker_id);
CREATE TABLE safety_reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  post_id TEXT,
  reason TEXT NOT NULL,
  details TEXT NOT NULL,
  evidence TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved'))
);
CREATE INDEX open_reports ON safety_reports(status, created_at);
CREATE TABLE support_requests (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('support','deletion')),
  email TEXT NOT NULL,
  account_hint TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved'))
);
CREATE INDEX open_support ON support_requests(status, created_at);
-- Prevent a client retry from restoring a workout removed by moderation.
CREATE TABLE hidden_workouts (
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  PRIMARY KEY(room_id, user_id, client_id),
  FOREIGN KEY(room_id, user_id) REFERENCES members(room_id, user_id) ON DELETE CASCADE
);
