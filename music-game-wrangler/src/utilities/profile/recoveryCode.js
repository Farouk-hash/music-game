    // src/utilities/profile/recoveryCode.js
// 8-character recovery codes: uppercase, no O/0/I/1 to avoid misreads.

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LENGTH = 8;

export function generateRecoveryCode() {
  let out = '';
  for (let i = 0; i < LENGTH; i++) {
    out += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return out;
}

/**
 * Normalize user input: uppercase, strip spaces and dashes.
 *   "abcd-2345" → "ABCD2345"
 */
export function normalizeRecoveryCode(raw) {
  return String(raw ?? '').toUpperCase().replace(/[\s-]/g, '');
}