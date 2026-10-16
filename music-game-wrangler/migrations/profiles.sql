-- 0007_profiles.sql
-- Profile system: anonymous, device-id-driven, cross-device via recovery code.

CREATE TABLE IF NOT EXISTS profiles (
  id              TEXT PRIMARY KEY,
  nickname        TEXT NOT NULL,
  recovery_code   TEXT UNIQUE,
  avatar_kind     TEXT NOT NULL DEFAULT 'generated',
  avatar_style    TEXT,
  avatar_seed     TEXT,
  avatar_r2_key   TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_profiles_recovery ON profiles(recovery_code);

CREATE TABLE IF NOT EXISTS profile_favorites (
  profile_id      TEXT NOT NULL,
  kind            TEXT NOT NULL,
  value           TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (profile_id, kind, value)
);

CREATE INDEX IF NOT EXISTS idx_profile_favorites_profile ON profile_favorites(profile_id);