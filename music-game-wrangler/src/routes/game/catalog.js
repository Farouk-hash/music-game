// music-game-wrangler/src/routes/game/catalog.js
import { getCatalog, invalidateCatalog } from '../../controllers/game/catalog.js';
import { rebuildArtists } from '../../rebuild-pools/rebuildArtists.js';

export const catalogRoutes = [
  // Public — cached via KV + Edge (24h / 1h)
  { method: 'GET',  pattern: /^\/game\/catalog$/,            handler: getCatalog },

  // Admin — clear cache explicitly
  { method: 'POST', pattern: /^\/game\/catalog\/invalidate$/, handler: invalidateCatalog },

  { method: 'POST', pattern: /^\/game\/catalog\/rebuild-artists$/, handler: rebuildArtists },
];