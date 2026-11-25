// game/src/lib/answerCheck.js

/**
 * Normalizes a string for answer comparison.
 * Handles Arabic alef/yaa/taa-marbuta variants, diacritics, case,
 * punctuation, whitespace, and strips leading metadata words
 * "اغنية" (song) and "البوم" (album).
 */
export function normalizeAnswer(s) {
  let out = String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')   // tashkeel + tatweel
    .replace(/[أإآا]/g, 'ا')                         // alef variants
    .replace(/[يى]/g, 'ي')                           // yaa variants
    .replace(/ة/g, 'ه')                              // taa marbuta
    .replace(/\s+/g, ' ')
    .replace(/[.,!?؟،:;"'\-_()\[\]{}]/g, '')
    .trim();

  out = out.replace(/^اغنيه\s+/, '');
  out = out.replace(/^البوم\s+/, '');

  return out;
}

/**
 * Split a string into individual names, treating commas, ampersands,
 * pluses, and the standalone conjunction "و" (surrounded by spaces)
 * as separators. Multi-word names stay intact.
 */
export function splitNames(s) {
  return String(s ?? '')
    .split(/\s*(?:,|،|&|\+)\s*|\s+و\s+/)
    .map(t => t.trim())
    .filter(Boolean);
}

/**
 * Compare user input to the correct answer.
 *
 * Match rules, applied in order:
 *
 *   1. Exact match after normalization.
 *
 *   2. Segment match — the input and/or the correct answer may be
 *      a list of names joined by commas or "و". Correct if every
 *      segment of the correct answer appears as a segment of the
 *      input.
 *
 * This lets a player type "ليجي سي و سادات" when the correct
 * answer is "ليجي سي", or type "ليجي سي" when the correct answer
 * is "ليجي سي و سادات" would fail (they didn't list all names —
 * but since we ask for one featured artist at a time, this case
 * doesn't occur in practice).
 */
export function isAnswerCorrect(userInput, correctValue) {
  const u = normalizeAnswer(userInput);
  const c = normalizeAnswer(correctValue);
  if (!u || !c) return false;

  if (u === c) return true;

  const inputSegments = splitNames(u).map(normalizeAnswer);
  const correctSegments = splitNames(c).map(normalizeAnswer);

  if (correctSegments.length === 0 || inputSegments.length === 0) return false;

  return correctSegments.every(cs => inputSegments.includes(cs));
}