// music-game-wrangler/src/utilities/collections/validate.js
import {
  COLLECTION_NAME_MAX,
  ROUNDS_PER_COLLECTION_MAX,
  GENRES_PER_COLLECTION_MAX,
  ARTISTS_PER_COLLECTION_MAX,
  YEARS_PER_SET_MAX,
  ROUNDS_COUNT_MIN,
  ROUNDS_COUNT_MAX,
  TIMER_MIN,
  TIMER_MAX,
  VALID_LEVELS,
  VALID_MODES,
  VALID_ANSWER_MODES,
  VALID_QUESTION_TYPES,
  VALID_INSTRUMENTS,
  QUESTION_TYPES_PER_ROUND_MAX,
} from './limits.js';

const ok = (value) => ({ ok: true, value });
const fail = (error) => ({ ok: false, error });

/* ── Name ────────────────────────────────────────────────── */
export function validateCollectionName(raw) {
  if (typeof raw !== 'string') return fail('name is required');
  const trimmed = raw.trim();
  if (trimmed.length === 0) return fail('name is required');
  if (trimmed.length > COLLECTION_NAME_MAX) {
    return fail(`name must be ≤${COLLECTION_NAME_MAX} characters`);
  }
  return ok(trimmed);
}

/* ── Levels ──────────────────────────────────────────────── */
export function validateLevels(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return fail('levels must be a non-empty array');
  }
  const seen = new Set();
  for (const v of raw) {
    const n = Number(v);
    if (!Number.isInteger(n) || !VALID_LEVELS.includes(n)) {
      return fail(`levels must contain only ${VALID_LEVELS.join(', ')}`);
    }
    seen.add(n);
  }
  return ok([...seen].sort((a, b) => a - b));
}

/* ── Years ───────────────────────────────────────────────── */
export function validateYears(raw) {
  if (raw == null) return ok(null);

  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return fail('years must be null or { type, values }');
  }
  const { type, values } = raw;

  if (type === 'range') {
    if (typeof values !== 'string') {
      return fail('years.values must be a string for type="range"');
    }
    const m = /^(\d{4})-(\d{4})$/.exec(values.trim());
    if (!m) return fail('years.values must look like "1997-2015"');
    const lo = Number(m[1]);
    const hi = Number(m[2]);
    if (lo < 1900 || hi > 2100) return fail('years must be within 1900–2100');
    if (lo > hi) return fail('years range: min must be ≤ max');
    return ok({ type: 'range', values: `${lo}-${hi}` });
  }

  if (type === 'set') {
    if (!Array.isArray(values)) {
      return fail('years.values must be an array for type="set"');
    }
    if (values.length === 0) return fail('years.values must not be empty');
    if (values.length > YEARS_PER_SET_MAX) {
      return fail(`years.values must have ≤${YEARS_PER_SET_MAX} entries`);
    }
    const seen = new Set();
    for (const v of values) {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1900 || n > 2100) {
        return fail('years.values must contain integers 1900–2100');
      }
      seen.add(n);
    }
    return ok({ type: 'set', values: [...seen].sort((a, b) => a - b) });
  }

  return fail('years.type must be "range" or "set"');
}

/* ── ID arrays (genres / artists) ────────────────────────── */
function validateIntArray(raw, { minLength, maxLength, label }) {
  if (!Array.isArray(raw)) return fail(`${label} must be an array`);
  if (raw.length < minLength) {
    return fail(`${label} must have at least ${minLength} entr${minLength === 1 ? 'y' : 'ies'}`);
  }
  if (raw.length > maxLength) {
    return fail(`${label} must have ≤${maxLength} entries`);
  }
  const seen = new Set();
  const out = [];
  for (const v of raw) {
    const n = Number(v);
    if (!Number.isInteger(n) || n <= 0) {
      return fail(`${label} must contain positive integers`);
    }
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return ok(out);
}

export function validateGenresIds(raw) {
  return validateIntArray(raw, { minLength: 0, maxLength: GENRES_PER_COLLECTION_MAX, label: 'genresIds' });
}

export function validateArtistsIds(raw) {
  return validateIntArray(raw, { minLength: 0, maxLength: ARTISTS_PER_COLLECTION_MAX, label: 'artistsIds' });
}

/* ── Question types (per round) ──────────────────────────── */
export function validateQuestionTypes(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return fail('questionTypes must be a non-empty array');
  }
  if (raw.length > QUESTION_TYPES_PER_ROUND_MAX) {
    return fail(`questionTypes must have ≤${QUESTION_TYPES_PER_ROUND_MAX} entries`);
  }
  const seen = new Set();
  const out = [];
  for (const v of raw) {
    const t = String(v ?? '').trim();
    if (!VALID_QUESTION_TYPES.includes(t)) {
      return fail(`questionTypes must contain only: ${VALID_QUESTION_TYPES.join(', ')}`);
    }
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return ok(out);
}

/* ── Rounds ──────────────────────────────────────────────── */
export function validateRounds(raw, allowedLevels) {
  if (!Array.isArray(raw)) return fail('rounds must be an array');
  if (raw.length === 0) return fail('rounds must have at least 1 entry');
  if (raw.length > ROUNDS_PER_COLLECTION_MAX) {
    return fail(`rounds must have ≤${ROUNDS_PER_COLLECTION_MAX} entries`);
  }

  const allowed = new Set(allowedLevels);
  const out = [];

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    if (!r || typeof r !== 'object' || Array.isArray(r)) {
      return fail(`rounds[${i}] must be an object`);
    }

    const level = Number(r.level);
    if (!Number.isInteger(level) || !VALID_LEVELS.includes(level)) {
      return fail(`rounds[${i}].level must be 1, 2 or 3`);
    }
    if (!allowed.has(level)) {
      return fail(`rounds[${i}].level=${level} is not in collections.levels`);
    }

    const typesV = validateQuestionTypes(r.questionTypes);
    if (!typesV.ok) return fail(`rounds[${i}]: ${typesV.error}`);

    // Input mode — choose | type
    const answerMode = String(r.answerMode ?? 'choose').trim();
    if (!VALID_ANSWER_MODES.includes(answerMode)) {
      return fail(`rounds[${i}].answerMode must be one of ${VALID_ANSWER_MODES.join(', ')}`);
    }

    // Game mode — speed | collect
    const mode = String(r.mode ?? 'speed').trim();
    if (!VALID_MODES.includes(mode)) {
      return fail(`rounds[${i}].mode must be one of ${VALID_MODES.join(', ')}`);
    }

    const roundsCount = Number(r.rounds ?? 1);
    if (!Number.isInteger(roundsCount) ||
        roundsCount < ROUNDS_COUNT_MIN ||
        roundsCount > ROUNDS_COUNT_MAX) {
      return fail(`rounds[${i}].rounds must be ${ROUNDS_COUNT_MIN}–${ROUNDS_COUNT_MAX}`);
    }

    const instruments = String(r.instruments ?? 'none').trim();
    if (!VALID_INSTRUMENTS.includes(instruments)) {
      return fail(`rounds[${i}].instruments must be one of ${VALID_INSTRUMENTS.join(', ')}`);
    }

    let timer = null;
    if (r.timer !== undefined && r.timer !== null) {
      const n = Number(r.timer);
      if (!Number.isInteger(n) || n < TIMER_MIN || n > TIMER_MAX) {
        return fail(`rounds[${i}].timer must be ${TIMER_MIN}–${TIMER_MAX} or null`);
      }
      timer = n;
    }

    const reversedAnswers = normalizeReversedAnswers(r.reversedAnswers);
      if (reversedAnswers == null) {
        return fail(`rounds[${i}].reversedAnswers must be 'no', 'some', or 'all'`);
      }

    out.push({
      position:        i,
      level,
      questionTypes:   typesV.value,
      answerMode,
      mode,
      rounds:          roundsCount,
      reversedAnswers: reversedAnswers,
      reversedAudio:   Boolean(r.reversedAudio),
      instruments,
      timer,
    });
  }

  return ok(out);
}


function normalizeReversedAnswers(raw) {
  if (raw === 'no' || raw === 'some' || raw === 'all') return raw;
  if (raw === true)  return 'some';   // legacy boolean from pre-0011 clients
  if (raw === false) return 'no';
  if (raw == null)   return 'no';     // default if absent
  return null;                        // invalid
}