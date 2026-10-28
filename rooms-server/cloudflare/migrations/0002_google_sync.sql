ALTER TABLE users ADD COLUMN google_subject TEXT;
CREATE UNIQUE INDEX google_identity ON users(google_subject) WHERE google_subject IS NOT NULL;

CREATE TABLE account_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
);
CREATE INDEX account_session_users ON account_sessions(user_id);

CREATE TABLE sync_accounts (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    revision INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE sync_records (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK(kind IN ('exercise', 'session', 'set', 'preset', 'setting')),
    record_id TEXT NOT NULL,
    revision INTEGER NOT NULL,
    deleted INTEGER NOT NULL CHECK(deleted IN (0, 1)),
    payload TEXT,
    PRIMARY KEY(user_id, kind, record_id)
);
CREATE INDEX sync_record_changes ON sync_records(user_id, revision);
CREATE TABLE sync_receipts (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mutation_id TEXT NOT NULL,
    PRIMARY KEY(user_id, mutation_id)
);
