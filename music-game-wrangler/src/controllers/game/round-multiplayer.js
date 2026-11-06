// music-game-wrangler/src/controllers/game/round-multiplayer.js
import { json, error } from '../../lib/response.js';
import { clamp } from '../../utilities/clamp.js';
import { getRound } from './rounds.js';
import { getRoundMulti } from './round-mutli.js';
import { getRoundSet } from './round-sets.js';

/* ═══════════════════════════════════════════════════════════
   POST /game/round-multiplayer
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
  // ── CHANGED: Read from POST body ──
  const body = await request.json().catch(() => ({}));

  const level = parseLevel(body.level);
  const playerCount = clamp(
    Number(body.players ?? 2),
    2, MAX_PLAYERS
  );
  const roundsPerPlayer = clamp(
    Number(body.count ?? 5),
    1, MAX_ROUNDS_PER_PLAYER
  );
  const totalCount = playerCount * roundsPerPlayer;

  // Build an internal POST request with the multiplied count.
  const innerBody = { ...body, count: totalCount };
  const innerReq = new Request(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(innerBody)
  });

  let response;
  try {
    if (level === 3)      response = await getRoundSet(innerReq, env);
    else if (level === 2) response = await getRoundMulti(innerReq, env);
    else                  response = await getRound(innerReq, env);
  } catch (err) {
    return error(`Multiplayer round build failed: ${err.message}`, 500);
  }

  if (response.status !== 200) return response;

  const resBody = await response.json();

  // Level 3 uses `sets`, levels 1 and 2 use `rounds`. Normalize to
  // a single `rounds` array before slicing.
  const flatRounds = Array.isArray(resBody.rounds)
    ? resBody.rounds
    : Array.isArray(resBody.sets)
      ? resBody.sets
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
      ...(resBody.meta ?? {}),
      level,
      playerCount,
      roundsPerPlayer,
      totalRounds: flatRounds.length,
      generatedAt: new Date().toISOString(),
    },
  });
}