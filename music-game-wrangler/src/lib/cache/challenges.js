// music-game-wrangler/src/lib/cache/challenges.js

function challengeKey(dateStr, genreId) {
  const genrePart = genreId == null ? 'default' : String(genreId);
  return `streak-challenge:${dateStr}:${genrePart}:v1`;
}

export async function getCachedChallenge(env, dateStr, genreId) {
  if (!env.CATALOG_CACHE) return null;
  try {
    return await env.CATALOG_CACHE.get(challengeKey(dateStr, genreId), { type: 'json' });
  } catch (err) {
    console.warn('challenge KV read failed', err?.message);
    return null;
  }
}

export async function setCachedChallenge(env, dateStr, genreId, challenge) {
  if (!env.CATALOG_CACHE) return;
  try {
    await env.CATALOG_CACHE.put(
      challengeKey(dateStr, genreId),
      JSON.stringify(challenge),
      { expirationTtl: 2147483647  }
    );
  } catch (err) {
    console.warn('challenge KV write failed', err?.message);
  }
}

export async function invalidateChallenges(env, ctx, originUrl) {
  if (!env.CATALOG_CACHE) return;
  try {
    let cursor;
    do {
      const list = await env.CATALOG_CACHE.list({ prefix: 'streak-challenge:', cursor });
      const tasks = (list.keys ?? []).map(k => env.CATALOG_CACHE.delete(k.name).catch(() => {}));
      await Promise.all(tasks);
      cursor = list.cursor;
    } while (cursor);
  } catch (err) {
    console.warn('challenge invalidate failed', err?.message);
  }
}