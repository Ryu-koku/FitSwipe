ALTER TABLE users ADD COLUMN avatar_custom INTEGER NOT NULL DEFAULT 0 CHECK (avatar_custom IN (0, 1));
-- Photos saved before this migration were explicitly selected in the app.
UPDATE users SET avatar_custom = 1 WHERE avatar IS NOT NULL;
