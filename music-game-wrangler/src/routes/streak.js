import { json } from '../lib/response.js';
import { ensureChallenge } from '../controllers/streaks/generator.js';
import { submitAttempt } from '../controllers/streaks/attempt.js';
import { grantBonusPower } from '../controllers/streaks/bonus_power.js';
import { MAX_ACTIVE_STREAKS, MAX_BONUS_POWER, POWER_ATTEMPTS_PER_DAY } from '../controllers/streaks/constants.js';
import { CHALLENGE_CONFIG } from '../controllers/streaks/challenge-config.js';

const DATE = '\\d{4}-\\d{2}-\\d{2}';
const UUID = '[0-9a-fA-F-]{36}';

async function getChallengeHandler(request, env, params) {
  try {
    const url = new URL(request.url);
    const genreParam = url.searchParams.get('genreId');
    const genreId = genreParam === null || genreParam === 'default'
      ? null
      : Number(genreParam);

    const challenge = await ensureChallenge(env, params.date, genreId);
    return json({ ok: true, challenge });
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
}

async function submitAttemptHandler(request, env, params) {
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }
  if (!body.profileId) return json({ ok: false, error: 'profileId required' }, 400);

  try {
    const result = await submitAttempt(env, body.profileId, params.date, body);
    return json(result, result.ok ? 200 : 400);
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
}

async function grantBonusPowerHandler(request, env, params) {
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }
  if (!body.profileId) return json({ ok: false, error: 'profileId required' }, 400);

  try {
    const result = await grantBonusPower(env, body.profileId, params.date);
    return json(result, result.ok ? 200 : 400);
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
}

async function listStreaksHandler(request, env, params) {
  const today = new Date().toISOString().slice(0, 10);
  const profileId = params.profileId;

  try {
    const streaks = await env.DB.prepare(`
      SELECT * FROM profile_streaks
      WHERE profile_id = ?
      ORDER BY genre_id IS NULL DESC, genre_id ASC
    `).bind(profileId).all();

    // Shared power pool — sum across all streaks for today
    let powerUsed = 0;
    let bonusPower = 0;
    for (const s of streaks.results ?? []) {
      if (s.power_reset_date === today) {
        powerUsed += s.power_attempts_used ?? 0;
        bonusPower = Math.max(bonusPower, s.bonus_power_attempts ?? 0);
      }
    }
    const powerLimit = POWER_ATTEMPTS_PER_DAY + bonusPower;

    const powerRemaining = Math.max(0, powerLimit - powerUsed);

    const enhanced = await Promise.all((streaks.results ?? []).map(async (s) => {
      const attempted = await env.DB.prepare(`
        SELECT id FROM challenge_attempts
        WHERE profile_id = ? AND challenge_date = ? AND mode = 'daily'
          AND genre_id IS ?
        LIMIT 1
      `).bind(profileId, today, s.genre_id).first();

      return {
        genre_id: s.genre_id,
        genre_name: s.genre_name,
        is_default: s.genre_id === null,
        current_streak: s.current_streak,
        longest_streak: s.longest_streak,
        streak_points: s.streak_points,
        consecutive_failures: s.consecutive_failures,
        last_challenge_date: s.last_challenge_date,
        daily_attempted: !!attempted,
      };
    }));

    const profile = await env.DB.prepare(
      'SELECT total_points FROM profiles WHERE id = ?'
    ).bind(profileId).first();

    return json({
      ok: true,
      streaks: enhanced,
      total_points: profile?.total_points ?? 0,
      power: {
        used: powerUsed,
        limit: powerLimit,
        remaining: powerRemaining,
        bonus: bonusPower,
        max_bonus: MAX_BONUS_POWER,          // ← new field
        base_limit: POWER_ATTEMPTS_PER_DAY,  // ← bonus: exposes the base
      },
      today,
    });
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
}

async function startStreakHandler(request, env, params) {
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

  const { profileId, genreId } = body;
  if (!profileId) return json({ ok: false, error: 'profileId required' }, 400);

  try {
    // Verify genre exists (if not Default)
    if (genreId != null) {
      const genre = await env.DB.prepare(
        'SELECT id, name FROM genres WHERE id = ?'
      ).bind(genreId).first();
      if (!genre) return json({ ok: false, error: 'Genre not found' }, 404);
    }

    // Check if streak already exists
    const existing = await env.DB.prepare(
      'SELECT profile_id FROM profile_streaks WHERE profile_id = ? AND genre_id IS ?'
    ).bind(profileId, genreId).first();
    if (existing) {
      return json({ ok: false, error: 'Streak already exists' });
    }

    // Cap check — Default counts as one
    const count = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM profile_streaks WHERE profile_id = ?'
    ).bind(profileId).first();
    if (count.n >= MAX_ACTIVE_STREAKS) {
      return json({ ok: false, error: `Maximum ${MAX_ACTIVE_STREAKS} active streaks` });
    }

    // Get the genre name
    let genreName = 'Default';
    if (genreId != null) {
      const genre = await env.DB.prepare(
        'SELECT name FROM genres WHERE id = ?'
      ).bind(genreId).first();
      genreName = genre.name;
    }

    // Create the row
    await env.DB.prepare(`
      INSERT INTO profile_streaks (profile_id, genre_id, genre_name, updated_at)
      VALUES (?, ?, ?, datetime('now'))
    `).bind(profileId, genreId, genreName).run();

    return json({ ok: true, genre_id: genreId, genre_name: genreName });
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
}

async function abandonStreakHandler(request, env, params) {
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

  const { profileId, genreId } = body;
  if (!profileId) return json({ ok: false, error: 'profileId required' }, 400);
  if (genreId == null) {
    return json({ ok: false, error: 'Cannot abandon Default streak' }, 400);
  }

  try {
    // Verify the streak exists before deleting
    const existing = await env.DB.prepare(
      'SELECT profile_id FROM profile_streaks WHERE profile_id = ? AND genre_id = ?'
    ).bind(profileId, genreId).first();

    if (!existing) {
      return json({ ok: false, error: 'Streak not found' }, 404);
    }

    // Delete streak row + all attempts for this (profile, genre)
    await env.DB.batch([
      env.DB.prepare(
        'DELETE FROM challenge_attempts WHERE profile_id = ? AND genre_id = ?'
      ).bind(profileId, genreId),
      env.DB.prepare(
        'DELETE FROM profile_streaks WHERE profile_id = ? AND genre_id = ?'
      ).bind(profileId, genreId),
    ]);

    return json({ ok: true, deleted: true });
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
}


async function getConfigHandler(request, env, params) {
  return json({ ok: true, config: CHALLENGE_CONFIG });
}

export const streakRoutes = [
  {
    method: 'GET',
    pattern: new RegExp(`^/streaks/challenge/(?<date>${DATE})$`),
    handler: getChallengeHandler,
  },
  {
    method: 'POST',
    pattern: new RegExp(`^/streaks/attempt/(?<date>${DATE})$`),
    handler: submitAttemptHandler,
  },
  {
    method: 'POST',
    pattern: new RegExp(`^/streaks/bonus-power/(?<date>${DATE})$`),
    handler: grantBonusPowerHandler,
  },
  {
    method: 'GET',
    pattern: new RegExp(`^/streaks/list/(?<profileId>${UUID})$`),
    handler: listStreaksHandler,
  },
  {
    method: 'POST',
    pattern: /^\/streaks\/new$/,
    handler: startStreakHandler,
  },
  {
    method: 'POST',
    pattern: /^\/streaks\/abandon$/,
    handler: abandonStreakHandler,
  },
   {
    method: 'GET',
    pattern: /^\/streaks\/config$/,
    handler: getConfigHandler,
  },
];