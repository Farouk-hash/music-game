// rounds-methods/work-set.js
import { clamp } from '../../../utilities/clamp.js';
import { shuffle } from '../../../utilities/shuffle.js';

/** Hard cap on rounds/sets built in one request (free-tier CPU). */
export const MAX_ROUNDS_PER_REQUEST = 50;

/**
 * The small subset of artists whose data is actually loaded from KV and parsed.
 * The full scope is still used for distractor names.
 */
export function workSetFor(scopeArtistIds, count) {
  const cap = clamp(Math.ceil(count / 3) + 2, 5, 8);
  return scopeArtistIds.length <= cap
    ? scopeArtistIds
    : shuffle(scopeArtistIds.slice()).slice(0, cap);
}