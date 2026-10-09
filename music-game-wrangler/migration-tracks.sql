DROP TABLE IF EXISTS tracks;

CREATE TABLE tracks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  artist_id   INTEGER,
  r2_key      TEXT,
  position    TEXT,
  label       TEXT , 
  r2_reversed_key TEXT , 
  album_name TEXT , 
  featured_artists TEXT
);

CREATE INDEX idx_tracks_artist_id ON tracks(artist_id);
CREATE INDEX idx_tracks_position  ON tracks(position);

-- One clip per (artist, track name, position).
CREATE UNIQUE INDEX idx_tracks_unique_clip
  ON tracks(artist_id, name, position);