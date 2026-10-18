// host-sporcle-wrangler/src/controllers/chat.js

const MAX_MESSAGES = 200;
const MAX_TEXT_LEN = 200;

/**
 * Insert a new chat message.
 *
 * Called from HostSporcle's #chat action handler. Enforces:
 *   - Non-empty text
 *   - Max 200 characters (truncates)
 *   - Max 200 messages in the room (deletes oldest beyond that)
 *
 * Returns { ok: true, version } on success.
 */
export function chatInsert(sql, player, text, now) {
  const trimmed = String(text ?? '').trim().slice(0, MAX_TEXT_LEN);
  if (!trimmed) return { ok: false, error: 'Empty message' };

  sql.exec(
    'INSERT INTO messages (player_id, text, created_at) VALUES (?, ?, ?)',
    player.id, trimmed, now
  );

  // Prune old messages if over the cap.
  const total = sql.exec('SELECT COUNT(*) AS n FROM messages').one().n;
  if (total > MAX_MESSAGES) {
    sql.exec(
      `DELETE FROM messages
        WHERE id IN (
          SELECT id FROM messages
           ORDER BY id ASC
           LIMIT ?
        )`,
      total - MAX_MESSAGES
    );
  }

  return { ok: true };
}

/**
 * Fetch the chat messages for the room state payload.
 *
 * Joins players to include author name and profileId so the client can
 * render avatars without an extra request.
 */
export function chatList(sql) {
  const rows = sql.exec(
    `SELECT m.id, m.player_id, m.text, m.created_at,
            p.name AS author_name, p.profile_id
       FROM messages m
       JOIN players p ON p.id = m.player_id
      ORDER BY m.id ASC
      LIMIT ${MAX_MESSAGES}`
  ).toArray();

  return rows.map(r => ({
    id: r.id,
    playerId: r.player_id,
    authorName: r.author_name,
    profileId: r.profile_id ?? null,
    text: r.text,
    createdAt: r.created_at,
  }));
}