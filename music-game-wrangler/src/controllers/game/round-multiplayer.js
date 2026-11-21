// src/controllers/game/round-multiplayer.js
import { json, error } from '../../lib/response.js';
import { clamp } from '../../utilities/clamp.js';
import { getRound } from './rounds.js';
import { getRoundMulti } from './round-mutli.js';
import { getRoundSet } from './round-sets.js';
import { MAX_ROUNDS_PER_REQUEST } from './rounds-methods/work-set.js';

/* ═══════════════════════════════════════════════════════════
   POST /game/round-multiplayer

   The inner builders cap a single request at MAX_ROUNDS_PER_REQUEST
   (free-tier CPU). So roundsPerPlayer is limited to
   floor(MAX_ROUNDS_PER_REQUEST / playerCount); the effective value is
   returned in meta.roundsPerPlayer, and the requested one in
   meta.requestedRoundsPerPlayer.
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

export async function getRoundMultiplayer(request, env, ctx) {
  const body = await request.json().catch(() => ({}));

  const level = parseLevel(body.level);
  const playerCount = clamp(Number(body.players ?? 2), 2, MAX_PLAYERS);

  const requestedRoundsPerPlayer = clamp(
    Number(body.count ?? 5), 1, MAX_ROUNDS_PER_PLAYER
  );
  const perPlayerCap = Math.max(1, Math.floor(MAX_ROUNDS_PER_REQUEST / playerCount));
  const roundsPerPlayer = Math.min(requestedRoundsPerPlayer, perPlayerCap);
  const totalCount = playerCount * roundsPerPlayer;

  const innerReq = new Request(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, count: totalCount }),
  });

  let response;
  try {
    if (level === 3)      response = await getRoundSet(innerReq, env, ctx);
    else if (level === 2) response = await getRoundMulti(innerReq, env, ctx);
    else                  response = await getRound(innerReq, env, ctx);
  } catch (err) {
    return error(`Multiplayer round build failed: ${err.message}`, 500);
  }

  if (response.status !== 200) return response;

  const resBody = await response.json();

  // Level 3 uses `sets`, levels 1 and 2 use `rounds`.
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
      requestedRoundsPerPlayer,
      totalRounds: flatRounds.length,
      generatedAt: new Date().toISOString(),
    },
  });
}