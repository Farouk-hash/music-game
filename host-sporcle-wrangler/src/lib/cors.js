// E:\matb3aa-game\host-sporcle-wrangler\src\lib\cors.js
import { CORS_HEADERS } from './response.js';

/**
 * Handle CORS preflight. Returns a Response if the request is OPTIONS,
 * otherwise returns null to signal "continue processing".
 */
export function handleCors(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }
  return null;
}