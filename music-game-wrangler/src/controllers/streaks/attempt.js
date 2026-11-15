// music-game-wrangler/src/controllers/streaks/attempt.js
//
// Submits a completed streak attempt.
//
// Body now includes `genre_id` (null for Default, X for genre).
// The attempt updates:
//   - challenge_attempts log
//   - the SPECIFIC profile_streaks row for (profile_id, genre_id)
//   - profiles.total_points (shared currency)

import {
  DAILY_PASS_BONUS,
  POWER_PASS_BONUS,
  POINTS_PER_CORRECT,
  POINTS_PER_CORRECT_POWER,
  POWER_ATTEMPTS_PER_DAY,
  totalMultiplier,
  MAX_BONUS_POWER,
} from './constants.js';

export async function submitAttempt(env, profileId, dateStr, body) {
  const {
    correct_count,
    total_count,
    batches_done,
    passed,
    mode = 'daily',
    genre_id = null,
  } = body;

  // 1. Validate
  if (mode !== 'daily' && mode !== 'power') {
    return { ok: false, error: 'Invalid mode' };
  }
  if (
    typeof correct_count !== 'number' || correct_count < 0 ||
    typeof total_count   !== 'number' || total_count <= 0 ||
    typeof batches_done  !== 'number' || batches_done < 0 ||
    typeof passed        !== 'boolean'
  ) {
    return { ok: false, error: 'Invalid attempt payload' };
  }
  if (correct_count > total_count) {
    return { ok: false, error: 'correct_count > total_count' };
  }

  // 2. Challenge must exist for (date, genre)
  const challenge = await env.DB.prepare(
    'SELECT * FROM challenges WHERE challenge_date = ? AND genre_id IS ?'
  ).bind(dateStr, genre_id).first();
  if (!challenge) return { ok: false, error: 'Challenge not found' };

  // 3. Fetch the specific streak row
  const streakRow = await env.DB.prepare(
    'SELECT * FROM profile_streaks WHERE profile_id = ? AND genre_id IS ?'
  ).bind(profileId, genre_id).first();

  if (!streakRow) return { ok: false, error: 'Streak not started' };

  const today = dateStr;

  // 4. Power attempt limit (shared across all streaks)
  //    We read the TOTAL power used across all streaks.
  const totalPowerRow = await env.DB.prepare(`
    SELECT
      SUM(CASE WHEN power_reset_date = ? THEN power_attempts_used ELSE 0 END) AS used,
      SUM(CASE WHEN power_reset_date = ? THEN bonus_power_attempts ELSE 0 END) AS bonus
    FROM profile_streaks
    WHERE profile_id = ?
  `).bind(today, today, profileId).first();

  let powerUsed = totalPowerRow?.used ?? 0;
  let bonusPower = totalPowerRow?.bonus ?? 0;

  if (mode === 'power') {
    const powerLimit = POWER_ATTEMPTS_PER_DAY + bonusPower;
    if (powerUsed >= powerLimit) {
      return {
        ok: false,
        error: 'No power attempts left today',
        power: { used: powerUsed, limit: powerLimit, bonus: bonusPower },
      };
    }
  }

  // 5. Points computation
  const parsedChallenge = {
    ...challenge,
    config: challenge.config ? JSON.parse(challenge.config) : {},
  };
  const multiplier = totalMultiplier(parsedChallenge, genre_id);

  let points = 0;
  if (mode === 'daily') {
    points = Math.round(correct_count * POINTS_PER_CORRECT * multiplier);
    if (passed) points += DAILY_PASS_BONUS;
  } else {
    points = Math.round(correct_count * POINTS_PER_CORRECT_POWER);
    if (passed) points += POWER_PASS_BONUS;
  }
  points = Math.max(0, Math.min(points, 100));

  // 6. INSERT attempt (UNIQUE handles duplicate daily)
  try {
    await env.DB.prepare(`
      INSERT INTO challenge_attempts
        (profile_id, challenge_date, genre_id, mode, passed, batches_done,
         correct_count, total_count, points_earned)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      profileId, dateStr, genre_id, mode, passed ? 1 : 0, batches_done,
      correct_count, total_count, points,
    ).run();
  } catch (e) {
    const msg = e?.message ?? '';
    if (msg.includes('UNIQUE constraint') || msg.includes('SQLITE_CONSTRAINT')) {
      return {
        ok: false,
        error: mode === 'daily'
          ? 'Already attempted daily challenge today for this streak'
          : 'This power attempt is already logged',
      };
    }
    throw e;
  }

  // 7. Update the streak row
  const lastDate = streakRow.last_challenge_date ?? null;
  const yesterday = new Date(new Date(dateStr).getTime() - 86400000)
    .toISOString().slice(0, 10);

  let newStreak = streakRow.current_streak ?? 0;
  let newFailures = streakRow.consecutive_failures ?? 0;
  let thisStreakPowerUsed = streakRow.power_attempts_used ?? 0;
  let thisStreakBonus = streakRow.bonus_power_attempts ?? 0;
  let thisStreakResetDate = streakRow.power_reset_date ?? null;

  if (mode === 'daily') {
    if (lastDate === yesterday)   newStreak += 1;
    else if (lastDate !== dateStr) newStreak = 1;

    if (passed) newFailures = 0;
    else        newFailures += 1;
  }

  const newLastDate = mode === 'daily' ? dateStr : (lastDate ?? null);
  const longest = Math.max(newStreak, streakRow.longest_streak ?? 0);
  const newPoints = (streakRow.streak_points ?? 0) + points;

  // Power bookkeeping — mark this streak's row as used if it's a power attempt
  if (mode === 'power') {
    if (thisStreakResetDate !== today) {
      thisStreakPowerUsed = 0;
      thisStreakBonus = bonusPower;   // inherit the day's bonus from any streak
      thisStreakResetDate = today;
    }
    thisStreakPowerUsed += 1;
  } else {
    // Daily doesn't touch power counters, but ensure reset date is current
    if (thisStreakResetDate !== today) {
      thisStreakResetDate = today;
      thisStreakPowerUsed = 0;
      thisStreakBonus = bonusPower;
    }
  }

  await env.DB.prepare(`
    INSERT INTO profile_streaks
      (profile_id, genre_id, genre_name, current_streak, longest_streak,
       last_challenge_date, streak_points, consecutive_failures,
       power_attempts_used, bonus_power_attempts, power_reset_date, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(profile_id, genre_id) DO UPDATE SET
      current_streak       = excluded.current_streak,
      longest_streak       = excluded.longest_streak,
      last_challenge_date  = excluded.last_challenge_date,
      streak_points        = excluded.streak_points,
      consecutive_failures = excluded.consecutive_failures,
      power_attempts_used  = excluded.power_attempts_used,
      bonus_power_attempts = excluded.bonus_power_attempts,
      power_reset_date     = excluded.power_reset_date,
      updated_at           = datetime('now')
  `).bind(
    profileId,
    genre_id,
    streakRow.genre_name ?? null,
    newStreak,
    longest,
    newLastDate,
    newPoints,
    newFailures,
    thisStreakPowerUsed,
    thisStreakBonus,
    thisStreakResetDate,
  ).run();

  // 8. Update profile.total_points
  await env.DB.prepare(`
    UPDATE profiles SET total_points = COALESCE(total_points, 0) + ? WHERE id = ?
  `).bind(points, profileId).run();

  const newTotalPower = powerUsed + (mode === 'power' ? 1 : 0);
  const powerLimit = POWER_ATTEMPTS_PER_DAY + bonusPower;

  return {
    ok: true,
    mode,
    genre_id,
    streak: {
      current: newStreak,
      longest,
      points: newPoints,
      points_earned: points,
      consecutive_failures: newFailures,
    },
    power: {
      used: newTotalPower,
      limit: powerLimit,
      remaining: Math.max(0, powerLimit - newTotalPower),
      bonus: bonusPower,
      max_bonus: MAX_BONUS_POWER,          // ← new
      base_limit: POWER_ATTEMPTS_PER_DAY,  // ← new
    },
  };
}