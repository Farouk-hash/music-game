// E:\matb3aa-game\host-sporcle-wrangler\src\question-fetcher.js

/**
 * Fetch the question set for a room and normalize it for the DO.
 *
 * The Service Binding call uses the real public origin as its host so
 * that `music-game-wrangler` builds `clip.serveUrl` with the correct
 * origin. The Service Binding discards the host internally — only the
 * path reaches the target Worker — so this costs nothing extra, but it
 * means downstream responses already carry browser-reachable URLs.
 */

const MUSIC_GAME_PUBLIC = 'https://music-game-wrangler.abdulrahman-muhammad2090.workers.dev';

/* ─────────────────────────────────────────────────────────────
   Public entry point
   ───────────────────────────────────────────────────────────── */

export async function fetchQuestions(env, config) {
  const params = new URLSearchParams();

  if (config.genres?.length)  params.set('genres',  config.genres.join(','));
  if (config.artists?.length) params.set('artists', config.artists.join(','));
  if (config.years?.length)   params.set('years',   config.years.join(','));
  if (config.types?.length)   params.set('types',   config.types.join(','));
  if (config.rendition && config.rendition !== 'forward') {
    params.set('rendition', config.rendition);
  }
  if (config.instruments && config.instruments !== 'none') {
    params.set('instruments', config.instruments);
  }
  params.set('count', String(config.count ?? 10));

  const path = config.level === 2
    ? `/game/round-multi?${params.toString()}`
    : `/game/round?${params.toString()}`;

  const url = `${MUSIC_GAME_PUBLIC}${path}`;
  console.log('[question-fetcher] fetch:', url);

  const res = await env.MUSIC_GAME.fetch(url);
  console.log('[question-fetcher] status:', res.status);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Round fetch failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const rounds = data?.rounds ?? [];
  return normalizeRounds(rounds, config.level ?? 1);
}

/* ─────────────────────────────────────────────────────────────
   Normalization
   ───────────────────────────────────────────────────────────── */

/**
 * Flatten the L1 or L2 round payload into a list of questions, each
 * carrying its own clip. `idx` is the room's global question index
 * across all rounds.
 *
 * Clip URLs come back from `music-game-wrangler` already correct —
 * no rewriting required — because we call it with its real origin.
 */
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