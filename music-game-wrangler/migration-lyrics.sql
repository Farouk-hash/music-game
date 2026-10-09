-- migration-lyrics.sql
-- Adds a lyrics table keyed by (artist_id, track_name).
-- One row per song, not per slot — multiple track rows in `tracks`
-- with the same (artist_id, name) share one lyrics row.

CREATE TABLE IF NOT EXISTS lyrics (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  artist_id     INTEGER NOT NULL,
  track_name    TEXT    NOT NULL,
  lyrics        TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lyrics_unique
  ON lyrics(artist_id, track_name);

CREATE INDEX IF NOT EXISTS idx_lyrics_artist
  ON lyrics(artist_id);