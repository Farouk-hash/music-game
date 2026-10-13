// src/utilities/profile/imageValidation.js

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 256 * 1024;   // 256 KB

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
};

/**
 * Validate an uploaded avatar file.
 * Returns { ok: true, ext } or { ok: false, error }.
 */
export function validateAvatarUpload(file) {
  if (!file || typeof file === 'string') {
    return { ok: false, error: 'No file provided' };
  }
  if (!file.type || !ALLOWED_MIME.has(file.type)) {
    return {
      ok: false,
      error: `Unsupported image type. Use: ${[...ALLOWED_MIME].join(', ')}`,
    };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: `Image exceeds ${Math.round(MAX_BYTES / 1024)} KB limit`,
    };
  }
  return { ok: true, ext: EXT_BY_MIME[file.type] };
}