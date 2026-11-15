// game/src/hooks/setup/useCapabilityGates.js
import { useMemo, useEffect } from 'react';
import { QUESTION_TYPE_VALUES } from '@/constants';

export const LYRICS_TYPES = QUESTION_TYPE_VALUES.filter(t => t.startsWith('lyrics-'));
export const ALL_TYPES = [...QUESTION_TYPE_VALUES];

export function useCapabilityGates({
  // Source
  capabilities = null,
  lyricsCount: rawLyricsCount = 0,
  instrumentsCount: rawInstrumentsCount = 0,

  // Restrictions
  selectedArtistsCount = 0,
  reasonLyrics = 'No lyrics available.',
  allowedTypes = null,   // <-- explicit whitelist

  // Optional auto-reset
  questionTypes = null,
  instruments = null,
  onSanitizeQuestionTypes = null,
  onSanitizeInstruments = null,
} = {}) {
  const lyricsCount = capabilities?.lyricsCount ?? rawLyricsCount ?? 0;
  const instrumentsCount = capabilities?.instrumentsCount ?? rawInstrumentsCount ?? 0;

  const allowLyrics      = lyricsCount > 0;
  const allowInstruments = instrumentsCount > 0;

  const disabledTypes = useMemo(() => {
    const s = new Set();

    if (selectedArtistsCount === 1) {
      s.add('name-artist');
      s.add('lyrics-artist');
    }
    if (!allowLyrics) {
      for (const t of LYRICS_TYPES) s.add(t);
    }
    if (Array.isArray(allowedTypes) && allowedTypes.length > 0) {
      const allowedSet = new Set(allowedTypes);
      for (const t of ALL_TYPES) {
        if (!allowedSet.has(t)) s.add(t);
      }
    }

    return s;
  }, [selectedArtistsCount, allowLyrics, allowedTypes]);

  const disabledReasons = useMemo(() => {
    const m = new Map();

    if (!allowLyrics) {
      for (const t of LYRICS_TYPES) m.set(t, reasonLyrics);
    }
    if (selectedArtistsCount === 1) {
      m.set('name-artist', 'Needs at least 2 selected artists.');
      m.set('lyrics-artist', 'Needs at least 2 selected artists.');
    }
    if (Array.isArray(allowedTypes) && allowedTypes.length > 0) {
      const allowedSet = new Set(allowedTypes);
      for (const t of ALL_TYPES) {
        if (!allowedSet.has(t) && !m.has(t)) {
          m.set(t, 'Not used in this template.');
        }
      }
    }

    return m;
  }, [allowLyrics, selectedArtistsCount, reasonLyrics, allowedTypes]);

  function filterTypes(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.filter(t => !disabledTypes.has(t));
  }

  function sanitizeQuestionTypes(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.filter(t => !disabledTypes.has(t));
  }

  function sanitizeInstruments(value) {
    return allowInstruments || value === 'none' ? value : 'none';
  }

  const effectiveQuestionTypes = useMemo(
    () => (Array.isArray(questionTypes) ? questionTypes.filter(t => !disabledTypes.has(t)) : []),
    [questionTypes, disabledTypes]
  );

  useEffect(() => {
    if (!onSanitizeInstruments || instruments == null) return;
    const next = sanitizeInstruments(instruments);
    if (next !== instruments) onSanitizeInstruments(next);
  }, [allowInstruments, instruments, onSanitizeInstruments]);

  useEffect(() => {
    if (!onSanitizeQuestionTypes || !Array.isArray(questionTypes)) return;
    const next = sanitizeQuestionTypes(questionTypes);
    if (next.length !== questionTypes.length) onSanitizeQuestionTypes(next);
  }, [allowLyrics, allowedTypes, questionTypes, onSanitizeQuestionTypes]);

  return {
    allowLyrics,
    allowInstruments,
    disabledTypes,
    disabledReasons,
    effectiveQuestionTypes,
    filterTypes,
    sanitizeQuestionTypes,
    sanitizeInstruments,
    lyricsCount,
    instrumentsCount,
  };
}