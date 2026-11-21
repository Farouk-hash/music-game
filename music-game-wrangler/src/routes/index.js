// music-game-wrangler/src/routes/index.js
import { albumYearRoutes } from './admin/albums-years.js';
import { artistRoutes } from './admin/artists.js';
import { clipRoutes } from './admin/clips.js';
import { genreRoutes } from './admin/genres.js';
import { lyricsRoutes } from './admin/lyrics.js';
import { trackRoutes } from './admin/tracks.js';
import { catalogRoutes } from './game/catalog.js';
import { roundRoutes } from './game/rounds.js';
import { instrumentRoutes } from './admin/instruments.js';
import { profileRoutes } from './profiles.js';
import { followRoutes } from './follows.js';
import { inviteRoutes } from './invites.js';
import { collectionRoutes } from './collections.js';
import { streakRoutes } from './streak.js';
import { templateRoutes } from './templates.js';

const allRoutes = [
  // GAME ROUTES ;
  ...catalogRoutes,
  ...roundRoutes,

  // GAME ROUTES -> STREAKS ;
  ...streakRoutes,

  // GAME ROUTES -> PROFILE ROUTE ;
  ...profileRoutes,

  // GAME ROUTES -> FOLLOWERS , INVITES ;
  ...followRoutes,
  ...inviteRoutes,

  ...collectionRoutes,

  // ADMIN PANEL ROUTES ;
  ...genreRoutes,
  ...artistRoutes,
  ...trackRoutes,
  ...clipRoutes,
  ...lyricsRoutes,
  ...albumYearRoutes,
  ...instrumentRoutes,
  ...templateRoutes,
];

export function matchRoute(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  for (const route of allRoutes) {
    if (route.method !== method) continue;
    const match = path.match(route.pattern);
    if (!match) continue;

    const params = { ...(match.groups ?? {}) };
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