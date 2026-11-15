-- Streaks v2: multi-genre streaks per profile.
-- Clean slate — assumes old streak tables are dropped.
--
-- Design:
--   - profile_streaks: one row per (profile_id, genre_id). genre_id = NULL → Default.
--   - challenges: one row per (challenge_date, genre_id). genre_id = NULL → Default rotation.
--   - challenge_attempts: one row per attempt, genre-aware.
--   - profiles.total_points: shared currency, sum of all streak points.


-- Consistency: Everyone gets the same challenge on the same day, regardless of when they request it or what code is running on the server.

-- Performance: The expensive generation happens once. Subsequent requests are a single SELECT.

-- Auditability: If you want to debug a challenge, you can look at the config column in the DB and see exactly what the player saw. 
-- Without it, you would have to re-run the generator and hope it produces the same output.

-- The trade-off: DELETE FROM challenges clears today's cache.
-- Use it when you intentionally change PRESET_DECK or CHALLENGE_CONFIG and want the new one to take effect immediately.

CREATE TABLE challenges (
  challenge_date  TEXT NOT NULL,
  genre_id        INTEGER,                         -- NULL = Default rotation
  genre_name      TEXT NOT NULL,
  artist_ids      TEXT NOT NULL,                   -- JSON array
  artist_names    TEXT NOT NULL,                   -- JSON array
  config          TEXT NOT NULL,                   -- JSON
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (challenge_date, genre_id)
);

CREATE INDEX idx_challenges_date  ON challenges(challenge_date);
CREATE INDEX idx_challenges_genre ON challenges(genre_id);

-- ── profile_streaks ─────────────────────────────────────────
CREATE TABLE profile_streaks (
  profile_id           TEXT NOT NULL,
  genre_id             INTEGER,                    -- NULL = Default
  genre_name           TEXT,                       -- cached for display
  current_streak       INTEGER NOT NULL DEFAULT 0,
  longest_streak       INTEGER NOT NULL DEFAULT 0,
  last_challenge_date  TEXT,
  streak_points        INTEGER NOT NULL DEFAULT 0,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  freeze_tokens        INTEGER NOT NULL DEFAULT 0,
  power_attempts_used  INTEGER NOT NULL DEFAULT 0,
  bonus_power_attempts INTEGER NOT NULL DEFAULT 0,
  power_reset_date     TEXT,
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (profile_id, genre_id)
);

CREATE INDEX idx_streaks_profile ON profile_streaks(profile_id);
CREATE INDEX idx_streaks_genre   ON profile_streaks(genre_id);
CREATE INDEX idx_streaks_last    ON profile_streaks(last_challenge_date);

-- ── challenge_attempts ──────────────────────────────────────
CREATE TABLE challenge_attempts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id      TEXT NOT NULL,
  challenge_date  TEXT NOT NULL,
  genre_id        INTEGER,                         -- NULL = Default
  mode            TEXT NOT NULL DEFAULT 'daily',
  passed          INTEGER NOT NULL DEFAULT 0,
  batches_done    INTEGER NOT NULL DEFAULT 0,
  correct_count   INTEGER NOT NULL DEFAULT 0,
  total_count     INTEGER NOT NULL DEFAULT 0,
  points_earned   INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One daily per (profile, date, genre). Power is unlimited.
CREATE UNIQUE INDEX idx_attempts_daily_unique
  ON challenge_attempts(profile_id, challenge_date, genre_id)
  WHERE mode = 'daily';

CREATE INDEX idx_attempts_profile ON challenge_attempts(profile_id);
CREATE INDEX idx_attempts_date    ON challenge_attempts(challenge_date);
CREATE INDEX idx_attempts_genre   ON challenge_attempts(profile_id, genre_id);

-- ── profiles.total_points ───────────────────────────────────
-- Add total_points to profiles if it doesn't exist.
-- SQLite doesn't have IF NOT EXISTS for columns, so this will
-- fail if the column exists — ignore the error and continue.
ALTER TABLE profiles ADD COLUMN total_points INTEGER NOT NULL DEFAULT 0;