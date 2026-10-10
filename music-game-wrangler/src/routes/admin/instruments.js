// music-game-wrangler/src/routes/instruments.js
import {
  listInstruments,
  bulkUpsertInstruments,
  deleteInstrument,
  deleteInstrumentsByArtist,
  checkDuplicateNames,
} from '../../controllers/admin/instruments.js';
import {
  uploadInstrumental,
  serveInstrumental,
} from '../../controllers/admin/instrumentals-upload.js';

export const instrumentRoutes = [
  /* ── D1: instruments metadata ──────────────────────── */
  {
    method: 'GET',
    pattern: /^\/instruments$/,
    handler: listInstruments,
  },
  {
    method: 'POST',
    pattern: /^\/instruments\/bulk$/,
    handler: bulkUpsertInstruments,
  },
  {
    method: 'POST',
    pattern: /^\/instruments\/check-duplicates$/,
    handler: checkDuplicateNames,
  },
  {
    method: 'DELETE',
    pattern: /^\/instruments\/artist\/(?<artistId>\d+)$/,
    handler: deleteInstrumentsByArtist,
  },
  {
    method: 'DELETE',
    pattern: /^\/instruments\/(?<id>\d+)$/,
    handler: deleteInstrument,
  },

  /* ── R2: instrumental files ────────────────────────── */
  {
  method: 'PUT',
  pattern: /^\/instrumentals\/upload$/,
  handler: uploadInstrumental,
},
{
  method: 'GET',
  pattern: /^\/instrumentals\/serve$/,
  handler: serveInstrumental,
},
];