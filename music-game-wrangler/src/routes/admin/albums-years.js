import {
  listAlbumYears,
  getAlbumYear,
  getAlbumYearsByArtist,
  createAlbumYear,
  updateAlbumYear,
  deleteAlbumYear,
  bulkUpsertAlbumYears,
  albumYearsStats,
} from '../../controllers/admin/album-years.js';


/* ═══════════════════════════════════════════════════════════
   Route order matters:
     static paths (/stats, /by-artist, /bulk) MUST come before
     parameterized ones (/:id), otherwise /stats matches /:id.
   ═══════════════════════════════════════════════════════════ */

export const albumYearRoutes = [
  { method: 'GET',    pattern: /^\/album-years\/stats$/,      handler: (r, e) => albumYearsStats(r, e) },
  { method: 'GET',    pattern: /^\/album-years\/by-artist$/,  handler: (r, e) => getAlbumYearsByArtist(r, e) },
  { method: 'POST',   pattern: /^\/album-years\/bulk$/,       handler: (r, e) => bulkUpsertAlbumYears(r, e) },

  { method: 'GET',    pattern: /^\/album-years$/,             handler: (r, e) => listAlbumYears(r, e) },
  { method: 'POST',   pattern: /^\/album-years$/,             handler: (r, e) => createAlbumYear(r, e) },

  { method: 'GET',    pattern: /^\/album-years\/(?<id>\d+)$/, handler: (r, e, p) => getAlbumYear(r, e, p.id) },
  { method: 'PUT',    pattern: /^\/album-years\/(?<id>\d+)$/, handler: (r, e, p) => updateAlbumYear(r, e, p.id) },
  { method: 'DELETE', pattern: /^\/album-years\/(?<id>\d+)$/, handler: (r, e, p) => deleteAlbumYear(r, e, p.id) },
];