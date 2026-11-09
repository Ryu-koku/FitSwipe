-- Receipts only need to outlive transport retries; record their age so the
-- daily cron can prune them. Existing rows (0) are pruned on the first run.
ALTER TABLE sync_receipts ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0;
CREATE INDEX sync_receipt_age ON sync_receipts(created_at);
CREATE INDEX account_session_expiry ON account_sessions(expires_at);
