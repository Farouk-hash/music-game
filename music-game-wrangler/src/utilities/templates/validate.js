// music-game-wrangler/src/utilities/templates/validate.js
import { validateCollectionName } from '../collections/validate.js';

export {
  validateLevels,
  validateYears,
  validateGenresIds,
  validateArtistsIds,
  validateRounds,
} from '../collections/validate.js';

const ok = (value) => ({ ok: true, value });
const fail = (error) => ({ ok: false, error });

export const TEMPLATE_NAME_MAX = 64;
export const TEMPLATE_DESC_MAX = 500;

export function validateTemplateName(raw) {
  return validateCollectionName(raw);
}

export function validateDescription(raw) {
  if (raw == null) return ok(null);
  if (typeof raw !== 'string') return fail('description must be a string');
  const t = raw.trim();
  if (t.length === 0) return ok(null);
  if (t.length > TEMPLATE_DESC_MAX) {
    return fail(`description must be ≤${TEMPLATE_DESC_MAX} characters`);
  }
  return ok(t);
}

export function validateSortOrder(raw) {
  if (raw == null) return ok(0);
  const n = Number(raw);
  if (!Number.isInteger(n)) return fail('sort_order must be an integer');
  if (n < 0) return fail('sort_order must be ≥0');
  return ok(n);
}