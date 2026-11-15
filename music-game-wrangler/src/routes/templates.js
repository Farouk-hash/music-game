// music-game-wrangler/src/routes/templates.js
import {
  listTemplates,
  createTemplate,
  getTemplate,
  saveTemplate,
  deleteTemplate,
} from '../controllers/templates/templates.js';
import {
  uploadCover,
  deleteCover,
  serveCover,
} from '../controllers/templates/cover.js';

const INT = '\\d+';

export const templateRoutes = [
  // Collection
  { method: 'GET',    pattern: /^\/templates$/,                                    handler: listTemplates },
  { method: 'POST',   pattern: /^\/templates$/,                                    handler: createTemplate },

  // Cover — BEFORE /:id
  { method: 'GET',    pattern: new RegExp(`^/templates/(?<id>${INT})/cover$`),     handler: serveCover },
  { method: 'POST',   pattern: new RegExp(`^/templates/(?<id>${INT})/cover$`),     handler: uploadCover },
  { method: 'DELETE', pattern: new RegExp(`^/templates/(?<id>${INT})/cover$`),     handler: deleteCover },

  // Per-template
  { method: 'GET',    pattern: new RegExp(`^/templates/(?<id>${INT})$`),           handler: getTemplate },
  { method: 'PUT',    pattern: new RegExp(`^/templates/(?<id>${INT})$`),           handler: saveTemplate },
  { method: 'DELETE', pattern: new RegExp(`^/templates/(?<id>${INT})$`),           handler: deleteTemplate },
];