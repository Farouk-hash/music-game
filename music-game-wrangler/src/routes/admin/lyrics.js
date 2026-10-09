// music-game-wrangler/src/routes/lyrics.js
import {
  listLyrics,
  getLyrics,
  getLyricsByTrack,
  createLyrics,
  updateLyrics,
  deleteLyrics,
  bulkUpsertLyrics,
  lyricsStats,
} from '../../controllers/admin/lyrics.js';

export const lyricsRoutes = [
  // IMPORTANT: specific routes before parameterised ones
  { method: 'GET',    pattern: /^\/lyrics$/,                     handler: (r, e) => listLyrics(r, e) },
  { method: 'GET',    pattern: /^\/lyrics\/stats$/,              handler: (r, e) => lyricsStats(r, e) },
  { method: 'GET',    pattern: /^\/lyrics\/by-track$/,           handler: (r, e) => getLyricsByTrack(r, e) },
  { method: 'POST',   pattern: /^\/lyrics$/,                     handler: (r, e) => createLyrics(r, e) },
  { method: 'POST',   pattern: /^\/lyrics\/bulk$/,               handler: (r, e) => bulkUpsertLyrics(r, e) },

  // Named capture group `id` — router extracts it into `params.id`
  { method: 'GET',    pattern: /^\/lyrics\/(?<id>\d+)$/,         handler: (r, e, p) => getLyrics(r, e, p.id) },
  { method: 'PUT',    pattern: /^\/lyrics\/(?<id>\d+)$/,         handler: (r, e, p) => updateLyrics(r, e, p.id) },
  { method: 'DELETE', pattern: /^\/lyrics\/(?<id>\d+)$/,         handler: (r, e, p) => deleteLyrics(r, e, p.id) },
];