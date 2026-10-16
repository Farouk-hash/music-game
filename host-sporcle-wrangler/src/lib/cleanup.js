// host-sporcle-wrangler/src/lib/cleanup.js

/**
 * Notify music-game-wrangler that a room has been destroyed.
 * Deletes all invite rows for that room code.
 *
 * Called after the DO returns `version: 0` from a `leave` action,
 * which is the DO's signal that it just called `deleteAll()`.
 *
 * Fire-and-forget — the caller does not await this.
 */
export function notifyRoomDestroyed(env, code) {
  if (!code) return Promise.resolve();

  return env.MUSIC_GAME
    .fetch('https://music-game-wrangler/invites/cleanup-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: code }),
    })
    .then((res) => {
      console.log('[cleanup] response status:', res.status);
    })
    .catch((err) => {
      console.error('[cleanup] failed:', err);
    });
}
/**
 * Detect whether a `handleAction` result indicates the room was
 * just destroyed. The DO returns `version: 0` in that case.
 */
export function wasRoomDestroyed(result) {
  return result?.ok === true && result.version === 0;
}