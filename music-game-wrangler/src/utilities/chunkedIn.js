/* ═══════════════════════════════════════════════════════════
   D1 hard-caps bound parameters at 100 per query. Any query
   that binds a variable-length array (artist IDs, years, etc.)
   must chunk to stay under the limit.

   CHUNK_SIZE = 90 leaves headroom for the other bound params
   in the same query (LIMIT ?, extra filters, etc.).

   Usage:
     const rows = await chunkedIn(ids, 90, async (chunk) => {
       const ph = chunk.map(() => '?').join(',');
       const { results } = await env.DB.prepare(
         `SELECT ... WHERE artist_id IN (${ph})`
       ).bind(...chunk).all();
       return results ?? [];
     });
   ═══════════════════════════════════════════════════════════ */

export const D1_CHUNK_SIZE = 90;

export async function chunkedIn(items, chunkSize, fn) {
  if (!items.length) return [];
  const size = chunkSize > 0 ? chunkSize : D1_CHUNK_SIZE;
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const rows = await fn(chunk);
    for (const r of rows) out.push(r);
  }
  return out;
}