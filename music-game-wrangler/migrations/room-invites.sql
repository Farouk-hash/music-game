-- Room invitations sent to friends.
--
-- Host of a room selects followers from the Friends modal, submits, and
-- each selected friend gets a row here. The friend's client polls
-- /invites/pending and shows a notification.
--
-- When the friend clicks the invite → navigates to /sporcle/play/<code>.
-- If that fails (room expired), the invite is dismissed.

CREATE TABLE IF NOT EXISTS room_invites (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id   TEXT NOT NULL,           
  room_code    TEXT NOT NULL,
  invited_by   TEXT NOT NULL,           
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  seen_at      TEXT,                   
  UNIQUE(profile_id, room_code)
);

CREATE INDEX IF NOT EXISTS idx_invites_profile_pending
  ON room_invites(profile_id, seen_at);

CREATE INDEX IF NOT EXISTS idx_invites_code
  ON room_invites(room_code);