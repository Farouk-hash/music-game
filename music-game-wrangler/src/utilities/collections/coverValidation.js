// music-game-wrangler/src/utilities/collections/coverValidation.js
import { COVER_MAX_BYTES, COVER_ALLOWED_MIME } from './limits.js';

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
};

export function validateCoverUpload(file) {
  if (!file || typeof file !== 'object' || typeof file.arrayBuffer !== 'function') {
    return { ok: false, error: 'file is required' };
  }
  if (!COVER_ALLOWED_MIME.includes(file.type)) {
    return { ok: false, error: `file.type must be one of ${COVER_ALLOWED_MIME.join(', ')}` };
  }
  if (typeof file.size !== 'number' || file.size <= 0) {
    return { ok: false, error: 'file is empty' };
  }
  if (file.size > COVER_MAX_BYTES) {
    return { ok: false, error: `file must be ≤${Math.round(COVER_MAX_BYTES / 1024)} KB` };
  }
  return { ok: true, ext: EXT_BY_MIME[file.type] };
}