// \music-game-wrangler\src\lib\validateArtist.js
/**
 * Shared helpers for the artists controller.
 */

/* ═══════════════════════════════════════════════════════════
   Source
   ═══════════════════════════════════════════════════════════ */

export const VALID_SOURCES = ['matb3aa', 'albumaty', 'mp3quran', 'manual'];

export const DEFAULT_SOURCE = 'matb3aa';

/**
 * Coerce an arbitrary value to a valid source string.
 * Returns DEFAULT_SOURCE for anything invalid or missing.
 */
export function sanitizeSource(src) {
  if (typeof src !== 'string') return DEFAULT_SOURCE;
  return VALID_SOURCES.includes(src) ? src : DEFAULT_SOURCE;
}

/* ═══════════════════════════════════════════════════════════
   genre_ids serialization
   ═══════════════════════════════════════════════════════════ */

/**
 * Serialize a genre_ids array to a JSON string for storage.
 * Filters non-integers. Returns '[]' for non-arrays.
 */
export function serializeGenreIds(arr) {
  if (!Array.isArray(arr)) return '[]';
  return JSON.stringify(arr.filter(Number.isInteger));
}

/* ═══════════════════════════════════════════════════════════
   genre_ids deserialization
   ═══════════════════════════════════════════════════════════ */

/**
 * Parse a stored genre_ids JSON string back into an array of integers.
 * Returns [] for anything invalid. Idempotent if given an array.
 */
export function parseGenreIds(v) {
  if (Array.isArray(v)) return v.filter(Number.isInteger);
  if (typeof v !== 'string') return [];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed.filter(Number.isInteger) : [];
  } catch {
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════
   Validation
   ═══════════════════════════════════════════════════════════ */

/**
 * Validate an artist request body.
 *
 * @param {object} body                Parsed JSON body
 * @param {object} [opts]
 * @param {boolean} [opts.requireId]   Require a positive integer `id`
 * @param {boolean} [opts.requireName] Require a non-empty `name` (default true)
 * @param {boolean} [opts.requireGenres] Require a non-empty `genre_ids` (default true)
 * @param {boolean} [opts.allowPartial] If true, missing fields are OK (for PATCH)
 *
 * Returns an array of error strings. Empty array means valid.
 */
export function validateArtist(body, {
  requireId = false,
  requireName = true,
  requireGenres = true,
  allowPartial = false,
} = {}) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return ['Request body must be a JSON object'];
  }

  // id
  if (requireId) {
    if (!Number.isInteger(body.id) || body.id <= 0) {
      errors.push('id must be a positive integer');
    }
  } else if (body.id != null) {
    // id is optional, but if provided must be valid
    if (!Number.isInteger(body.id) || body.id <= 0) {
      errors.push('id must be a positive integer');
    }
  }

  // name
  if (requireName || body.name != null) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      if (requireName || body.name != null) {
        errors.push('name must be a non-empty string');
      }
    }
  }

  // genre_ids
  if (requireGenres || body.genre_ids != null) {
    if (!Array.isArray(body.genre_ids)) {
      if (requireGenres || body.genre_ids != null) {
        errors.push('genre_ids must be an array of integers');
      }
    } else if (!body.genre_ids.every(Number.isInteger)) {
      errors.push('genre_ids must contain only integers');
    } else if (requireGenres && body.genre_ids.length === 0 && !allowPartial) {
      errors.push('genre_ids must contain at least one integer');
    }
  }

  // image
  if (body.image != null && typeof body.image !== 'string') {
    errors.push('image must be a string or null');
  }

  // tracks_count
  if (body.tracks_count != null && !Number.isInteger(body.tracks_count)) {
    errors.push('tracks_count must be an integer');
  }

  // is_customized
  if (body.is_customized != null && typeof body.is_customized !== 'boolean' && typeof body.is_customized !== 'number') {
    errors.push('is_customized must be a boolean or number');
  }

  // source
  if (body.source != null && !VALID_SOURCES.includes(body.source)) {
    errors.push(`source must be one of: ${VALID_SOURCES.join(', ')}`);
  }

  return errors;
}