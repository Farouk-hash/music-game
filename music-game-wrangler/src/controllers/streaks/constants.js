// music-game-wrangler/src/controllers/streaks/constants.js
//
// Compatibility shim. All constants now live in challenge-config.js.
// This file just re-exports them under the legacy names.

import { CHALLENGE_CONFIG } from './challenge-config.js';

export const POWER_ATTEMPTS_PER_DAY = CHALLENGE_CONFIG.powerAttemptsPerDay;
export const MAX_BONUS_POWER        = CHALLENGE_CONFIG.maxBonusPower;
export const MAX_ACTIVE_STREAKS     = CHALLENGE_CONFIG.maxActiveStreaks;
export const DAILY_PASS_BONUS       = CHALLENGE_CONFIG.dailyPassBonus;
export const POWER_PASS_BONUS       = CHALLENGE_CONFIG.powerPassBonus;
export const POINTS_PER_CORRECT     = CHALLENGE_CONFIG.pointsPerCorrect;
export const POINTS_PER_CORRECT_POWER = CHALLENGE_CONFIG.pointsPerCorrectPower;
export const DEFAULT_GENRE_MULTIPLIER = CHALLENGE_CONFIG.defaultGenreMultiplier;

export function levelMultiplier(challenge) {
  const levels = challenge?.config?.batches?.map(b => b.level ?? 2) ?? [2];
  const maxLevel = Math.max(...levels);
  return CHALLENGE_CONFIG.levelMultipliers[maxLevel] ?? 1.0;
}

export function totalMultiplier(challenge, genreId) {
  const levelMul = levelMultiplier(challenge);
  const genreMul = genreId == null ? DEFAULT_GENRE_MULTIPLIER : 1.0;
  return levelMul * genreMul;
}