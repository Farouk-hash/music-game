// game/src/lib/reverseText.js

/**
 * Reverse the order of words in a string, keeping each word intact.
 *   reverseWords("عمرو دياب")  →  "دياب عمرو"
 *   reverseWords("أنا بحبك أوي")  →  "أوي بحبك أنا"
 */
export function reverseWords(s) {
  if (!s) return s;
  return s.split(/\s+/).reverse().join(' ');
}

/**
 * Reverse the character order of a string.
 *   scrambleLetters("عمرو دياب")  →  "بايد ورمع"
 *   scrambleLetters("تامر حسني")   →  "ينسح رمات"
 *
 * Uses Array.from to handle surrogate pairs and combining marks safely.
 */
export function scrambleLetters(s) {
  if (!s) return s;
  return Array.from(s).reverse().join('');
}

export const REVERSAL_STYLES = {
  words:   reverseWords,
  letters: scrambleLetters,
};

/**
 * Apply a reversal style. `style` is 'words' or 'letters'.
 * Unknown styles return the input unchanged.
 */
export function applyReversal(s, style) {
  const fn = REVERSAL_STYLES[style];
  return fn ? fn(s) : s;
}

/**
 * Pick a reversal style at random. Used when a round is reversed —
 * the game flips a coin between word-swap and letter-scramble each round.
 */
export function randomStyle() {
  return Math.random() < 0.5 ? 'words' : 'letters';
}