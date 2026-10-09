// src/hooks/useAlphabeticalGroups.js
import { useMemo } from 'react';

/**
 * Group items by the first letter of a text field.
 *
 * Handles Arabic and Latin letters in a single pass:
 * - Latin A–Z appear first, in alphabetical order
 * - Arabic letters follow, in their native order
 * - "#" (digits, symbols, unknown) comes last
 *
 * Arabic variants are normalized:
 *   أ إ آ ٱ → ا
 *   ة → ه,  ى → ي,  ؤ → و,  ئ → ي
 */
export function useAlphabeticalGroups(items = [], { key = 'name' } = {}) {
  return useMemo(() => {
    if (!items.length) return [];

    const buckets = new Map();

    for (const item of items) {
      const raw = (item?.[key] ?? '').toString().trim();
      const letter = firstLetterOf(raw);
      if (!buckets.has(letter)) buckets.set(letter, []);
      buckets.get(letter).push(item);
    }

    // Sort: Latin A-Z first, then Arabic, then "#"
    const sortedLetters = [...buckets.keys()].sort((a, b) => {
      const ra = scriptRank(a);
      const rb = scriptRank(b);
      if (ra !== rb) return ra - rb;
      return a.localeCompare(b, 'ar');
    });

    return sortedLetters.map(letter => ({
      letter,
      items: buckets.get(letter),
    }));
  }, [items, key]);
}

/** Rank used to order letter groups: Latin=0, Arabic=1, other=2 */
function scriptRank(ch) {
  if (/[A-Z]/.test(ch)) return 0;
  if (/[\u0600-\u06FF]/.test(ch)) return 1;
  return 2;   // '#' and anything else
}

function firstLetterOf(str) {
  if (!str) return '#';

  const cleaned = str.replace(/^[\s"'\-_.·•]+/u, '');
  if (!cleaned) return '#';

  const first = cleaned[0];

  if (/[a-zA-Z]/.test(first)) return first.toUpperCase();
  if (/[\u0600-\u06FF]/.test(first)) return normalizeArabicLetter(first);

  return '#';
}

function normalizeArabicLetter(ch) {
  const map = {
    'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ٲ': 'ا', 'ٳ': 'ا',
    'ة': 'ه',
    'ى': 'ي', 'ئ': 'ي',
    'ؤ': 'و',
  };
  return map[ch] ?? ch;
}