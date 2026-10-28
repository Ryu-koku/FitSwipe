CREATE TABLE room_sharing (
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  since_month TEXT NOT NULL,
  PRIMARY KEY (room_id, user_id),
  FOREIGN KEY (room_id, user_id) REFERENCES members(room_id, user_id) ON DELETE CASCADE
);
CREATE TABLE auto_workouts (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  legacy_client_id TEXT,
  created_at TEXT NOT NULL,
  payload TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  UNIQUE(room_id, user_id, client_id),
  FOREIGN KEY (room_id, user_id) REFERENCES room_sharing(room_id, user_id) ON DELETE CASCADE
);
CREATE INDEX auto_room_workouts ON auto_workouts(room_id, user_id);
CREATE VIEW room_comparison AS
  SELECT p.id, p.room_id, p.user_id, p.client_id, p.created_at, p.payload, 0 AS automatic
  FROM posts p WHERE NOT EXISTS (
    SELECT 1 FROM auto_workouts a WHERE a.room_id = p.room_id AND a.user_id = p.user_id
      AND (a.client_id = p.client_id OR a.legacy_client_id = p.client_id)
  )
  UNION ALL
  SELECT id, room_id, user_id, client_id, created_at, payload, 1 AS automatic
  FROM auto_workouts WHERE deleted = 0;
