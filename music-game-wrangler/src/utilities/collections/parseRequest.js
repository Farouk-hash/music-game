// music-game-wrangler/src/utilities/collections/parseRequest.js
//
// Parse a collection request that may be JSON or multipart/form-data.
//
// Returns:
//   { ok: true, body: {...}, file: File | null }
//   { ok: false, error: string }
//
// In multipart mode, every form field whose name does not start with
// "file:" is treated as a JSON-encoded field. The cover file is read
// from the `file` field (single-file). This convention lets the client
// send structured data (arrays, nested objects) over multipart without
// inventing a bespoke format.

export async function parseCollectionRequest(request) {
  const ct = request.headers.get('content-type') || '';

  // JSON path.
  if (ct.includes('application/json')) {
    const body = await request.json().catch(() => null);
    if (!body) return { ok: false, error: 'Invalid JSON body' };
    return { ok: true, body, file: null };
  }

  // Multipart path.
  if (ct.includes('multipart/form-data')) {
    let form;
    try {
      form = await request.formData();
    } catch {
      return { ok: false, error: 'Expected multipart/form-data' };
    }

    const body = {};
    let file = null;

    for (const [key, value] of form.entries()) {
      if (key === 'file') {
        file = value;
        continue;
      }
      // Each non-file field is JSON-encoded. The client sends:
      //   name         → JSON string
      //   levels       → JSON array
      //   years        → JSON { type, values } | null
      //   genresIds    → JSON array
      //   artistsIds   → JSON array
      //   rounds       → JSON array
      //   isPublic     → JSON bool
      try {
        body[key] = JSON.parse(value);
      } catch {
        return { ok: false, error: `Field "${key}" is not valid JSON` };
      }
    }

    return { ok: true, body, file };
  }

  return { ok: false, error: 'Content-Type must be application/json or multipart/form-data' };
}