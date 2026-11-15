// E:\matb3aa-game\host-sporcle-wrangler\src\question-fetcher.js

/**
 * Fetch the question set for a room and normalize it for the DO.
 *
 * Calls music-game-wrangler over a Service Binding. The public origin is
 * used as the URL host so the response's `clip.serveUrl` values are
 * browser-reachable; the Service Binding discards the host internally and
 * only routes by path.
 *
 * Both /game/round and /game/round-multi are POST endpoints that read
 * their parameters from a JSON body (not the query string). We send a
 * JSON body matching the shape getRound / getRoundMulti expect.
 */

const MUSIC_GAME_PUBLIC = 'https://music-game-wrangler.abdulrahman-muhammad2090.workers.dev';

/* ─────────────────────────────────────────────────────────────
   Public entry point
   ───────────────────────────────────────────────────────────── */

export async function fetchQuestions(env, config) {
  const isL2 = config.level === 2;
  const path = isL2 ? '/game/round-multi' : '/game/round';

  // Body shape matches getRound / getRoundMulti — see
  // music-game-wrangler/src/controllers/game/rounds.js (L1) and
  // round-mutli.js (L2). Query params are ignored by both handlers.
  const body = {
    level:       config.level ?? 1,
    genres:      config.genres  ?? [],
    artists:     config.artists ?? [],
    years:       config.years   ?? [],
    types:       config.types   ?? [],
    count:       config.count   ?? 10,
    rendition:   config.rendition === 'reverse' ? 'reverse' : 'forward',
    instruments: config.instruments ?? 'none',
  };

  const url = `${MUSIC_GAME_PUBLIC}${path}`;
  console.log('[question-fetcher] POST:', url, body);

  const res = await env.MUSIC_GAME.fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  console.log('[question-fetcher] status:', res.status);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Round fetch failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const rounds = data?.rounds ?? [];
  return normalizeRounds(rounds, body.level);
}

/* ─────────────────────────────────────────────────────────────
   Normalization — unchanged
   ───────────────────────────────────────────────────────────── */

function normalizeRounds(rounds, level) {
  const out = [];
  let idx = 0;

  for (const round of rounds) {
    const source     = round.source ?? null;
    const clip       = round.clip ?? null;
    const revealClip = round.revealClip ?? null;

    if (level === 2 && Array.isArray(round.questions)) {
      for (const q of round.questions) {
        out.push({
          idx: idx++,
          clip,
          lyrics: round.lyrics ?? null,
          revealClip,
          source,
          type: q.type,
          prompt: q.prompt,
          options: q.options,
          correctValue: q.correctValue,
        });
      }
    } else if (round.question) {
      out.push({
        idx: idx++,
        clip,
        lyrics: round.lyrics ?? null,
        revealClip,
        source,
        type: round.type ?? round.question.type,
        prompt: round.question.prompt,
        options: round.question.options,
        correctValue: round.question.correctValue,
      });
    }
  }

  return out;
}