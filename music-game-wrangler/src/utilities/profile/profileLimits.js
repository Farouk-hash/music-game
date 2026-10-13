// src/utilities/profile/profileLimits.js

export const NICKNAME_MAX = 24;
export const FAVORITES_PER_KIND_MAX = 100;
export const FAVORITES_TOTAL_MAX = 300;

export const VALID_KINDS = new Set(['artist', 'genre', 'track', 'question-type']);

export function validateNickname(raw) {
  const s = String(raw ?? '').trim();
  if (s.length === 0) return { ok: false, error: 'Nickname is required' };
  if (s.length > NICKNAME_MAX) {
    return { ok: false, error: `Nickname exceeds ${NICKNAME_MAX} characters` };
  }
  return { ok: true, value: s };
}

export function validateFavorite(kind, value) {
  if (!VALID_KINDS.has(kind)) {
    return { ok: false, error: `kind must be one of: ${[...VALID_KINDS].join(', ')}` };
  }
  const v = String(value ?? '').trim();
  if (v.length === 0) return { ok: false, error: 'value is required' };

  if (kind === 'question-type') {
    // Slugs are lowercase with dashes; leave the check loose.
    if (v.length > 64) return { ok: false, error: 'value too long' };
  } else {
    // artist/genre/track → must be a positive integer
    if (!/^\d+$/.test(v)) return { ok: false, error: 'value must be an integer id' };
  }
  return { ok: true, kind, value: v };
}