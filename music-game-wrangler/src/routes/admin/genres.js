// src/routes/genres.js
import {
  listGenres,
  getGenre,
  createGenre,
  updateGenre,
  deleteGenre,
} from '../../controllers/admin/genres.js';


export const genreRoutes = [
  {
    method: 'GET',
    pattern: /^\/genres$/,
    handler: (req, env) => listGenres(req, env),
  },
  {
    method: 'POST',
    pattern: /^\/genres$/,
    handler: (req, env) => createGenre(req, env),
  },
  {
    method: 'GET',
    pattern: /^\/genres\/(?<id>\d+)$/,
    handler: (req, env, params) => getGenre(req, env, params),
  },
  {
    method: 'PUT',
    pattern: /^\/genres\/(?<id>\d+)$/,
    handler: (req, env, params) => updateGenre(req, env, params),
  },
  {
    method: 'DELETE',
    pattern: /^\/genres\/(?<id>\d+)$/,
    handler: (req, env, params) => deleteGenre(req, env, params),
  },
];