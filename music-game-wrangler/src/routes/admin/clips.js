// src/routes/clips.js
import {
  uploadClip, headClip, deleteClip, serveClip,
} from '../../controllers/admin/clips.js';

export const clipRoutes = [
  // Serve by key (query param)
  {
    method: 'GET',
    pattern: /^\/clips\/serve$/,
    handler: (req, env) => serveClip(req, env),
  },

  // Upload — WIDEN to allow hyphens
  {
    method: 'POST',
    pattern: /^\/clips\/(?<trackId>[\w-]+)$/,     // ← was \d+
    handler: (req, env, params) => uploadClip(req, env, params),
  },

  // Head
  {
    method: 'GET',
    pattern: /^\/clips\/(?<trackId>[\w-]+)\/(?<position>[a-z]+)$/,   // ← was \d+
    handler: (req, env, params) => headClip(req, env, params),
  },

  // Delete
  {
    method: 'DELETE',
    pattern: /^\/clips\/(?<trackId>[\w-]+)\/(?<position>[a-z]+)$/,   // ← was \d+
    handler: (req, env, params) => deleteClip(req, env, params),
  },
];