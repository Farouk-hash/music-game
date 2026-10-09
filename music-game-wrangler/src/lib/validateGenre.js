
export function validateGenre(body, { requireId = false } = {}) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return ['Request body must be a JSON object'];
  }

  if (requireId) {
    if (!Number.isInteger(body.id)) errors.push('id must be an integer');
  }

  if (typeof body.name !== 'string' || !body.name.trim()) {
    errors.push('name is required');
  }

  if (typeof body.display_name !== 'string' || !body.display_name.trim()) {
    errors.push('display_name is required');
  }

  if (body.image != null && typeof body.image !== 'string') {
    errors.push('image must be a string or null');
  }

  return errors;
}