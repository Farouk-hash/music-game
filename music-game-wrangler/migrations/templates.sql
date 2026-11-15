-- Templates: server-curated game presets.
-- Same shape as collections, minus profile_id / clones.
-- Owned by no one; created by admins.

CREATE TABLE IF NOT EXISTS templates (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  description    TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  is_public      INTEGER NOT NULL DEFAULT 0,
  cover_kind     TEXT NOT NULL DEFAULT 'generated',
  cover_r2_key   TEXT,
  levels         TEXT NOT NULL DEFAULT '[]',
  years          TEXT,
  genres_ids     TEXT NOT NULL DEFAULT '[]',
  artists_ids    TEXT NOT NULL DEFAULT '[]',
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_templates_sort
  ON templates(sort_order ASC, created_at DESC);

CREATE TABLE IF NOT EXISTS template_rounds (
  template_id      INTEGER NOT NULL,
  position         INTEGER NOT NULL,
  level            INTEGER NOT NULL,
  question_types   TEXT NOT NULL DEFAULT '[]',
  answer_mode      TEXT NOT NULL,
  rounds           INTEGER NOT NULL DEFAULT 1,
  mode             TEXT NOT NULL DEFAULT 'speed',
  reversed_answers TEXT NOT NULL DEFAULT 'no',
  reversed_audio   INTEGER NOT NULL DEFAULT 0,
  instruments      TEXT NOT NULL DEFAULT 'none',
  timer            INTEGER,
  PRIMARY KEY (template_id, position)
);

CREATE INDEX IF NOT EXISTS idx_template_rounds_tid
  ON template_rounds(template_id);


  
