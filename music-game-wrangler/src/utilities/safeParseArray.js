
export function safeParseArray(str) {
  try { return JSON.parse(str || '[]'); }
  catch { return []; }
}