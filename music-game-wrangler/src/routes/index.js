import { albumYearRoutes } from './admin/albums-years.js';
import { artistRoutes } from './admin/artists.js';
import { clipRoutes } from './admin/clips.js';
import { genreRoutes } from './admin/genres.js';
import { lyricsRoutes } from './admin/lyrics.js';
import { trackRoutes } from './admin/tracks.js';
import { catalogRoutes } from './game/catalog.js';
import { roundRoutes } from './game/rounds.js';
import { instrumentRoutes } from './admin/instruments.js';
const allRoutes = [
  // GAME ROUTES ;
  ...catalogRoutes,
  ...roundRoutes,

  // ADMIN PANEL ROUTES ;
  ...genreRoutes,
  ...artistRoutes,
  ...trackRoutes,
  ...clipRoutes,
  ...lyricsRoutes,
  ...albumYearRoutes,
  ...instrumentRoutes,                                      
];


export function matchRoute(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  for (const route of allRoutes) {
    if (route.method !== method) continue;

    const match = path.match(route.pattern);
    if (!match) continue;

    // Named capture groups become params
    const params = { ...(match.groups ?? {}) };

    // Coerce numeric params to numbers
    for (const [k, v] of Object.entries(params)) {
      if (/^\d+$/.test(v)) params[k] = Number(v);
    }

    return { handler: route.handler, params };
  }

  return null;
}

export function pathExists(path) {
  return allRoutes.some(route => route.pattern.test(path));
}