-- Two-row follow model (M2 — mutual with accept).
--
-- Each direction is its own row. A pending request is one row with
-- status='pending'. An accepted friendship is TWO rows with status
-- 'accepted' (one per direction).
--
-- "Am I friends with X?" → EXISTS (me→X, accepted) AND EXISTS (X→me, accepted)

CREATE TABLE IF NOT EXISTS follows (
  follower_id  TEXT NOT NULL,
  followee_id  TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'accepted'
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_at  TEXT,
  PRIMARY KEY (follower_id, followee_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_followee
  ON follows(followee_id, status);

CREATE INDEX IF NOT EXISTS idx_follows_follower
  ON follows(follower_id, status);