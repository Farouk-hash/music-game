
CREATE TABLE IF NOT EXISTS collections (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id    TEXT NOT NULL,
  name          TEXT NOT NULL,
  is_public     INTEGER NOT NULL DEFAULT 0,
  cover_kind    TEXT NOT NULL DEFAULT 'generated',
  cover_r2_key  TEXT,
  levels        TEXT NOT NULL DEFAULT '[]',   
  years         TEXT,                         
  genres_ids    TEXT NOT NULL DEFAULT '[]',  
  artists_ids   TEXT NOT NULL DEFAULT '[]',  
  source_id INTEGER DEFAULT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_collections_profile ON collections(profile_id);

CREATE TABLE IF NOT EXISTS collection_rounds (
  collection_id    INTEGER NOT NULL,
  position         INTEGER NOT NULL,
  level            INTEGER NOT NULL,              
  question_types   TEXT NOT NULL DEFAULT '[]',
  answer_mode      TEXT NOT NULL,                  
  rounds           INTEGER NOT NULL DEFAULT 1,
  mode TEXT NOT NULL DEFAULT 'speed',
  reversed_answers TEXT NOT NULL DEFAULT 'no',
  reversed_audio   INTEGER NOT NULL DEFAULT 0,
  instruments      TEXT NOT NULL DEFAULT 'none',
  timer            INTEGER,                       
  PRIMARY KEY (collection_id, position)
);

CREATE INDEX IF NOT EXISTS idx_collection_rounds_cid ON collection_rounds(collection_id);