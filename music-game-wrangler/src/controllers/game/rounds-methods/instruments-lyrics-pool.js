// music-game-wrangler/src/controllers/game/rounds-methods/instruments-lyrics-pool.js
import { normalize } from '../../../utilities/normalize.js';
import { chunkedIn, D1_CHUNK_SIZE } from '../../../utilities/chunkedIn.js';
import { extractMiddleSnippet } from './lyric-snippets.js';

const MIN_LYRICS_LEN = 200;

/* ═══════════════════════════════════════════════════════════
   Bulk lyrics fetcher.

   Called once per request. Returns a Map keyed by
   `artist_id::track_name` so the builder can look up:
     - this track's snippet
     - candidate distractor snippets
   ═══════════════════════════════════════════════════════════ */

export async function fetchLyricsPool(env, scopeArtistIds) {
  if (!scopeArtistIds.length) return new Map();

  const byKey = new Map();

  await chunkedIn(scopeArtistIds, D1_CHUNK_SIZE, async (chunk) => {
    const ph = chunk.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      `SELECT l.artist_id, l.track_name, l.lyrics
         FROM lyrics l
        WHERE l.artist_id IN (${ph})
          AND l.lyrics IS NOT NULL
          AND length(l.lyrics) >= ${MIN_LYRICS_LEN}`
    ).bind(...chunk).all();

    for (const r of results ?? []) {
      const key = `${r.artist_id}::${r.track_name}`;
      const snippet = extractMiddleSnippet(r.lyrics);
      if (!snippet) continue;
      byKey.set(key, {
        artist_id: r.artist_id,
        track_name: r.track_name,
        snippet,
        normalized: normalize(snippet),
      });
    }
    return [];
  });

  return byKey;
}

/** All snippets except the given key, as an array. */
export function buildDistractorPool(lyricsByKey, excludeKey) {
  const out = [];
  for (const [key, entry] of lyricsByKey) {
    if (key === excludeKey) continue;
    out.push(entry);
  }
  return out;
}