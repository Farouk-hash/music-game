-- ─────────────────────────────────────────────────────────────
-- album_years: release year per (artist, album name)
-- One row per (artist_id, album_name).
-- album_name is stored exactly as it appears in tracks.album_name.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS album_years (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  artist_id     INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  album_name    TEXT    NOT NULL,
  released_year INTEGER NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_album_years_unique
  ON album_years(artist_id, album_name);

CREATE INDEX IF NOT EXISTS idx_album_years_artist
  ON album_years(artist_id);

CREATE INDEX IF NOT EXISTS idx_album_years_year
  ON album_years(released_year);