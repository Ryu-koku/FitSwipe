ALTER TABLE users ADD COLUMN review_login TEXT;
CREATE UNIQUE INDEX users_review_login ON users(review_login) WHERE review_login IS NOT NULL;
