// music-game-wrangler/src/routes/collections.js
import {
  listCollections,
  createCollection,
  getCollection,
  saveCollection,
  deleteCollection,
  cloneCollection
} from '../controllers/collections/collections.js';

import { uploadCover, deleteCover, serveCover } from '../controllers/collections/cover.js';

const UUID = '[0-9a-fA-F-]{36}';
const INT  = '\\d+';

export const collectionRoutes = [
  { method: 'POST',   pattern: new RegExp(`^/profiles/(?<profileId>${UUID})/collections$`),                 handler: createCollection },
  { method: 'POST', pattern: new RegExp(`^/profiles/(?<profileId>${UUID})/collections/clone$`), handler: cloneCollection },
  { method: 'GET',    pattern: new RegExp(`^/profiles/(?<profileId>${UUID})/collections$`),                 handler: listCollections },

  { method: 'GET',    pattern: new RegExp(`^/profiles/(?<profileId>${UUID})/collections/(?<id>${INT})/cover$`), handler: serveCover },
  { method: 'POST',   pattern: new RegExp(`^/profiles/(?<profileId>${UUID})/collections/(?<id>${INT})/cover$`), handler: uploadCover },
  { method: 'DELETE', pattern: new RegExp(`^/profiles/(?<profileId>${UUID})/collections/(?<id>${INT})/cover$`), handler: deleteCover },

  { method: 'GET',    pattern: new RegExp(`^/profiles/(?<profileId>${UUID})/collections/(?<id>${INT})$`),       handler: getCollection },
  { method: 'PUT',    pattern: new RegExp(`^/profiles/(?<profileId>${UUID})/collections/(?<id>${INT})$`),       handler: saveCollection },
  { method: 'DELETE', pattern: new RegExp(`^/profiles/(?<profileId>${UUID})/collections/(?<id>${INT})$`),       handler: deleteCollection },
];