// music-game-wrangler/src/lib/validateTrack.js
export function validateTrack(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return ['Request body must be a JSON object'];
  }

  if (typeof body.name !== 'string' || !body.name.trim()) {
    errors.push('name is required');
  }

  if (body.artist_id != null && !Number.isInteger(body.artist_id)) {
    errors.push('artist_id must be an integer or null');
  }

  if (body.r2_key != null && typeof body.r2_key !== 'string') {
    errors.push('r2_key must be a string or null');
  }

  if (body.r2_reversed_key != null && typeof body.r2_reversed_key !== 'string') {
    errors.push('r2_reversed_key must be a string or null');
  }

  const validPositions = ['start', 'middle', 'end', 'custom'];
  const isPositionValid =
    body.position == null ||
    validPositions.includes(body.position);

  if (!isPositionValid) {
    errors.push('position must be one of: start, middle, end, custom, or null');
  }

  if (body.label != null && typeof body.label !== 'string') {
    errors.push('label must be a string or null');
  }

  if (body.album_name != null && typeof body.album_name !== 'string') {
    errors.push('album_name must be a string or null');
  }

  if (body.featured_artists != null && typeof body.featured_artists !== 'string') {
    errors.push('featured_artists must be a string or null');
  }

  return errors;
}