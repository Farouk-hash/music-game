// music-game-wrangler/src/controllers/game/round-multiplayer.js
import { json, error } from '../../lib/response.js';
import { clamp } from '../../utilities/clamp.js';
import { getRound } from './rounds.js';
import { getRoundMulti } from './round-mutli.js';
import { getRoundSet } from './round-sets.js';

/* ═══════════════════════════════════════════════════════════
   GET /game/round-multiplayer

   Thin wrapper around the three existing round endpoints.
   Multiplies `count` by the number of players and slices the
   resulting flat rounds array into per-player buckets using
   round-robin assignment:

     round[0] → player[0]
     round[1] → player[1]
     ...
     round[N] → player[N % playerCount]

   Query params:
     level     1 | 2 | 3         (required)
     players   2..5              (default 2)
     count     1..100            (rounds per player, default 5)
     ...all the same params the underlying endpoints accept
   ═══════════════════════════════════════════════════════════ */

const MAX_PLAYERS = 5;
const MAX_ROUNDS_PER_PLAYER = 100;

function parseLevel(raw) {
  if (raw === '1' || raw === 'one') return 1;
  if (raw === '2' || raw === 'two') return 2;
  if (raw === '3' || raw === 'three') return 3;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 3 ? n : 1;
}

export async function getRoundMultiplayer(request, env) {
  const url = new URL(request.url);

  const level = parseLevel(url.searchParams.get('level'));
  const playerCount = clamp(
    Number(url.searchParams.get('players') ?? 2),
    2, MAX_PLAYERS
  );
  const roundsPerPlayer = clamp(
    Number(url.searchParams.get('count') ?? 5),
    1, MAX_ROUNDS_PER_PLAYER
  );
  const totalCount = playerCount * roundsPerPlayer;

  // Build an internal request with the multiplied count. Everything
  // else (genres, artists, years, types, etc.) passes through.
  const innerUrl = new URL(request.url);
  innerUrl.searchParams.set('count', String(totalCount));
  innerUrl.pathname = '/game/round';
  const innerReq = new Request(innerUrl.toString(), { method: 'GET' });

  let response;
  try {
    if (level === 3)      response = await getRoundSet(innerReq, env);
    else if (level === 2) response = await getRoundMulti(innerReq, env);
    else                  response = await getRound(innerReq, env);
  } catch (err) {
    return error(`Multiplayer round build failed: ${err.message}`, 500);
  }

  if (response.status !== 200) return response;

  const body = await response.json();

  // Level 3 uses `sets`, levels 1 and 2 use `rounds`. Normalize to
  // a single `rounds` array before slicing.
  const flatRounds = Array.isArray(body.rounds)
    ? body.rounds
    : Array.isArray(body.sets)
      ? body.sets
      : [];

  const players = Array.from({ length: playerCount }, (_, i) => ({
    index: i,
    rounds: [],
  }));
  flatRounds.forEach((round, i) => {
    players[i % playerCount].rounds.push(round);
  });

  return json({
    players,
    meta: {
      ...(body.meta ?? {}),
      level,
      playerCount,
      roundsPerPlayer,
      totalRounds: flatRounds.length,
      generatedAt: new Date().toISOString(),
    },
  });
}