DROP TABLE IF EXISTS genres;

CREATE TABLE genres (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,       
  display_name  TEXT NOT NULL,
  image         TEXT
);

CREATE INDEX idx_genres_display_name ON genres(display_name);
