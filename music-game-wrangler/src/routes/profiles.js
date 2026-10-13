// src/routes/profiles.js
import {
  createProfile,
  recoverProfile,
  getProfile,
  patchProfile,
  saveProfile,
} from '../controllers/profiles/profiles.js';
import {
  addFavorite,
  removeFavorite,
} from '../controllers/profiles/favorites.js';
import {
  uploadAvatar,
  deleteAvatar,
  serveAvatar,
} from '../controllers/profiles/avatar.js';

const UUID = '[0-9a-fA-F-]{36}';

export const profileRoutes = [
  // /recover must come before /:id — otherwise `recover` matches as a UUID.
  { method: 'POST',   pattern: /^\/profiles\/recover$/,                                        handler: recoverProfile },

  { method: 'POST',   pattern: /^\/profiles$/,                                                 handler: createProfile },

  // Avatar
  { method: 'GET',    pattern: new RegExp(`^/profiles/(?<id>${UUID})/avatar$`),                 handler: serveAvatar },
  { method: 'POST',   pattern: new RegExp(`^/profiles/(?<id>${UUID})/avatar$`),                 handler: uploadAvatar },
  { method: 'DELETE', pattern: new RegExp(`^/profiles/(?<id>${UUID})/avatar$`),                 handler: deleteAvatar },

  // Favorites — single-item add/remove
  { method: 'POST',   pattern: new RegExp(`^/profiles/(?<id>${UUID})/favorites$`),              handler: addFavorite },
  { method: 'DELETE', pattern: new RegExp(`^/profiles/(?<id>${UUID})/favorites$`),              handler: removeFavorite },

  // Profile — read / partial update / bulk replace
  { method: 'GET',    pattern: new RegExp(`^/profiles/(?<id>${UUID})$`),                        handler: getProfile },
  { method: 'PATCH',  pattern: new RegExp(`^/profiles/(?<id>${UUID})$`),                        handler: patchProfile },
  { method: 'PUT',    pattern: new RegExp(`^/profiles/(?<id>${UUID})$`),                        handler: saveProfile },
];