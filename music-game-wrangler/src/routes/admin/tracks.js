// music-game-wrangler/src/routes/tracks.js
import {
  listTracks,
  getTrack,
  createTrack,
  updateTrack,
  deleteTrack,
  deleteReversedRendition,
  artistsWithClips,
} from '../../controllers/admin/tracks.js';

export const trackRoutes = [
  // ── List + create ─────────────────────────────────────
  { method: 'GET',    pattern: /^\/tracks$/,                       handler: (r, e) => listTracks(r, e) },
  { method: 'POST',   pattern: /^\/tracks$/,                       handler: (r, e) => createTrack(r, e) },

  { method: 'GET',    pattern: /^\/tracks\/artists-with-clips$/,   handler: (r, e) => artistsWithClips(r, e) },

  // ── More specific /:id routes first ───────────────────
  { method: 'DELETE', pattern: /^\/tracks\/(?<id>\d+)\/reversed$/, handler: (r, e, p) => deleteReversedRendition(r, e, p) },

  // ── Single-item CRUD ──────────────────────────────────
  { method: 'GET',    pattern: /^\/tracks\/(?<id>\d+)$/,           handler: (r, e, p) => getTrack(r, e, p) },
  { method: 'PUT',    pattern: /^\/tracks\/(?<id>\d+)$/,           handler: (r, e, p) => updateTrack(r, e, p) },
  { method: 'DELETE', pattern: /^\/tracks\/(?<id>\d+)$/,           handler: (r, e, p) => deleteTrack(r, e, p) },
];