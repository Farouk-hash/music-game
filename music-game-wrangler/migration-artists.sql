
CREATE TABLE artists (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  genre_ids     TEXT NOT NULL DEFAULT '[]',   -- JSON array of genre IDs, e.g. "[1,5]"
  image         TEXT,
  tracks_count  INTEGER NOT NULL DEFAULT 0,
  is_customized INTEGER NOT NULL DEFAULT 0 , 
  source TEXT NOT NULL DEFAULT 'matb3aa' -- matb3aa , Quran , albumaty , manual 
);

CREATE INDEX idx_artists_name         ON artists(name);
CREATE INDEX idx_artists_tracks_count ON artists(tracks_count);