

CREATE TABLE IF NOT EXISTS instruments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  artist_id    INTEGER NOT NULL,
  track_name   TEXT NOT NULL,
  position     TEXT NOT NULL,                
  r2_key       TEXT NOT NULL,
  album_name   TEXT,
  genre_ids    TEXT NOT NULL DEFAULT '[]',   
  source_url   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(artist_id, track_name, position)
);
CREATE INDEX IF NOT EXISTS idx_instruments_artist ON instruments(artist_id);
CREATE INDEX IF NOT EXISTS idx_instruments_name   ON instruments(track_name);

CREATE INDEX IF NOT EXISTS idx_instruments_artist_track
  ON instruments(artist_id, track_name);