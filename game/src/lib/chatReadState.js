// game/src/lib/chatReadState.js

const KEY = (code) => `sporcle:${code}:chat:lastReadId`;

export function getLastReadId(code) {
  try {
    const raw = localStorage.getItem(KEY(code));
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

export function setLastReadId(code, id) {
  try {
    localStorage.setItem(KEY(code), String(id));
  } catch {}
}

/**
 * Count messages addressed to the current player that arrived after
 * the last-read marker.
 *
 * @param {Array}  messages   — state.messages
 * @param {string} myId       — my player id (not profile id)
 * @param {number} lastReadId
 */
export function countUnread(messages, myId, lastReadId) {
  if (!messages.length) return 0;
  let n = 0;
  for (const m of messages) {
    if (m.id > lastReadId && m.playerId !== myId) n++;
  }
  return n;
}