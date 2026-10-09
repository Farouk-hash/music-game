// src/routes/artists.js
import {
  listArtists,
  getArtist,
  createArtist,
  updateArtist,
  deleteArtist
} from '../../controllers/admin/artists.js';

export const artistRoutes = [
  {
    method: 'GET',
    pattern: /^\/artists$/,
    handler: (req, env) => listArtists(req, env),
  },
  {
    method: 'POST',
    pattern: /^\/artists$/,
    handler: (req, env) => createArtist(req, env),
  },
  {
    method: 'GET',
    pattern: /^\/artists\/(?<id>\d+)$/,
    handler: (req, env, params) => getArtist(req, env, params.id),
  },
  {
    method: 'PUT',
    pattern: /^\/artists\/(?<id>\d+)$/,
    handler: (req, env, params) => updateArtist(req, env, params.id),
  },
  {
    method: 'DELETE',
    pattern: /^\/artists\/(?<id>\d+)$/,
    handler: (req, env, params) => deleteArtist(req, env, params.id),
  }
];