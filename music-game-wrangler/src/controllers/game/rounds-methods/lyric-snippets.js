// music-game-wrangler/src/controllers/game/rounds-methods/lyric-snippets.js

const HEADER_RE = /^كلمات\s/;
const HEADER_MAX_LEN = 120;
const MIN_LINE_LEN = 3;
const MIN_SNIPPET_LEN = 20;

// Skip the first/last 20% of the cleaned body so we don't grab
// headers, opening refrains, or truncated tails.
const EDGE_FRACTION = 0.20;

// Allowed snippet lengths (lines). Rolled per request.
const SNIPPET_LINE_CHOICES = [2, 2, 3]; // 2/3 weighting toward 2

/**
 * Extract a random middle snippet from a lyric body.
 *
 * Design:
 *   - Strip a source header line if present.
 *   - Drop empty and very short lines.
 *   - Roll a random start position in the middle 60% of the body.
 *   - Roll a random length (2 or 3 lines).
 *   - Clamp the window so it stays in bounds.
 *   - Fall back to shorter windows if the picked one is too short.
 *
 * Non-deterministic: the same song yields a different snippet on each
 * call. That's intentional — the game uses this to make repeated
 * listens feel fresh.
 */
export function extractMiddleSnippet(text) {
  if (!text || typeof text !== 'string') return null;

  // 1. Split, trim, drop empties.
  const raw = text.split('\n').map(l => l.trim()).filter(Boolean);

  // 2. Strip a header line if the first non-empty line looks like one.
  let lines = raw;
  if (lines.length > 0) {
    const first = lines[0];
    if (HEADER_RE.test(first) && first.length < HEADER_MAX_LEN) {
      lines = lines.slice(1);
    }
  }

  // 3. Drop very short lines.
  lines = lines.filter(l => l.length >= MIN_LINE_LEN);

  if (lines.length === 0) return null;
  if (lines.length <= 3) return lines.join('\n');

  // 4. Compute the allowed start window.
  const skip = Math.floor(lines.length * EDGE_FRACTION);
  const minStart = skip;
  const maxStart = lines.length - 1 - skip;
  const startRange = Math.max(0, maxStart - minStart);

  // 5. Roll a length, then a start.
  const len = SNIPPET_LINE_CHOICES[Math.floor(Math.random() * SNIPPET_LINE_CHOICES.length)];
  const start = minStart + Math.floor(Math.random() * (startRange + 1));
  const end = Math.min(lines.length, start + len);

  const window = lines.slice(start, end);

  // 6. If the window is too short, extend backward.
  let joined = window.join('\n');
  if (joined.length < MIN_SNIPPET_LEN) {
    const backwardStart = Math.max(0, start - 1);
    joined = lines.slice(backwardStart, end).join('\n');
  }

  // 7. Still too short? Take the single middle line.
  if (joined.length < MIN_SNIPPET_LEN) {
    const mid = Math.floor(lines.length / 2);
    joined = lines[mid] ?? '';
  }

  // 8. Give up — return the whole cleaned body as a last resort.
  if (!joined) return lines.join('\n');

  return joined;
}