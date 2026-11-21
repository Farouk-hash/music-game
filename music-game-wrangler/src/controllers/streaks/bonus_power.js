// music-game-wrangler/src/controllers/streaks/bonus_power.js
//
// Grants +1 bonus power attempt (max 3 per day across ALL streaks).

import { MAX_BONUS_POWER, POWER_ATTEMPTS_PER_DAY } from './constants.js';

export async function grantBonusPower(env, profileId, dateStr) {
  const today = dateStr;

  // Look at the Default streak row to store the day's power state
  // (power is shared across all streaks — the Default row is the canonical one)
  let canonical = await env.DB.prepare(
    'SELECT * FROM profile_streaks WHERE profile_id = ? AND genre_id IS NULL'
  ).bind(profileId).first();

  // If no Default streak, use the first streak row
  if (!canonical) {
    canonical = await env.DB.prepare(
      'SELECT * FROM profile_streaks WHERE profile_id = ? LIMIT 1'
    ).bind(profileId).first();
  }

  if (!canonical) {
    return { ok: false, error: 'No streak rows for this profile' };
  }

  let resetDate = canonical.power_reset_date ?? null;
  let bonusPower = canonical.bonus_power_attempts ?? 0;

  if (resetDate !== today) {
    resetDate = today;
    bonusPower = 0;
  }

  if (bonusPower >= MAX_BONUS_POWER) {   // ← use the imported constant
    return {
      ok: false,
      error: 'Bonus limit reached for today',
      power: {
        used: canonical.power_attempts_used ?? 0,
        limit: POWER_ATTEMPTS_PER_DAY + bonusPower,
        bonus: bonusPower,
        max_bonus: MAX_BONUS_POWER,
      },
    };
  }

  bonusPower += 1;

  // Update all streak rows to share the same reset_date and bonus
  await env.DB.prepare(`
    UPDATE profile_streaks
       SET bonus_power_attempts = ?,
           power_reset_date     = ?,
           updated_at           = datetime('now')
     WHERE profile_id = ?
  `).bind(bonusPower, resetDate, profileId).run();

  const powerLimit = POWER_ATTEMPTS_PER_DAY + bonusPower;
  const powerUsed = canonical.power_attempts_used ?? 0;

  return {
    ok: true,
    power: {
      used: powerUsed,
      limit: powerLimit,
      remaining: Math.max(0, powerLimit - powerUsed),
      bonus: bonusPower,
      max_bonus: MAX_BONUS_POWER, 
    },
  };
}