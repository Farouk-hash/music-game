// game/src/hooks/collections/useCollectionDraft.js
import { useState, useCallback } from 'react';
import { TIMER_SECONDS } from '@/constants/timer.js';

// Default: timer ON, using the "choose" preset (matches the game's actual timer).
const DEFAULT_TIMER = TIMER_SECONDS.short;   // 5
const DEFAULT_ROUNDS = 5;
const VALID_REVERSED_ANSWERS = ['no', 'some', 'all'];

function makeDefaultRound(level = 1) {
  return {
    level,
    questionTypes: ['name-track'],
    answerMode: 'choose',
    mode: 'speed',
    rounds: DEFAULT_ROUNDS,
    reversedAnswers: 'no',
    reversedAudio: false,
    instruments: 'none',
    timer: DEFAULT_TIMER,
  };
}

function emptyDraft() {
  return {
    name: '',
    levels: new Set([1]),
    years: null,
    genresIds: new Set(),
    artistsIds: new Set(),
    rounds: [makeDefaultRound(1)],
    coverFile: null,
    cover: { kind: 'generated', url: null },
  };
}

function readReversedAnswers(raw) {
  if (raw === 'no' || raw === 'some' || raw === 'all') return raw;
  if (raw === true) return 'some';
  if (raw === false) return 'no';
  return 'no';
}

function readTimer(raw, fallback) {
  if (raw === null) return null;        // explicitly no timer
  if (raw === undefined) return fallback;
  return raw;
}

export function draftFromCollection(collection) {
  if (!collection) return emptyDraft();

  const levelsSet = new Set(Array.isArray(collection.levels) ? collection.levels : [1]);
  const rounds = (collection.rounds ?? []).map((r) => ({
    level: r.level ?? 1,
    questionTypes: Array.isArray(r.questionTypes) ? r.questionTypes : ['name-track'],
    answerMode: r.answerMode ?? 'choose',
    mode: r.mode ?? 'speed',
    rounds: r.rounds ?? DEFAULT_ROUNDS,
    reversedAnswers: readReversedAnswers(r.reversedAnswers),
    reversedAudio: Boolean(r.reversedAudio),
    instruments: r.instruments ?? 'none',
    timer: readTimer(r.timer, DEFAULT_TIMER),
  }));

  return {
    name: collection.name ?? '',
    levels: levelsSet,
    years: collection.years ?? null,
    genresIds: new Set(collection.genresIds ?? []),
    artistsIds: new Set(collection.artistsIds ?? []),
    rounds: rounds.length > 0 ? rounds : [makeDefaultRound([...levelsSet][0] ?? 1)],
    coverFile: null,
    cover: collection.cover ?? { kind: 'generated', url: null },
  };
}

export function draftToBody(draft) {
  const levels = [...draft.levels].sort((a, b) => a - b);
  return {
    name: draft.name.trim(),
    levels,
    years: draft.years,
    genresIds: [...draft.genresIds],
    artistsIds: [...draft.artistsIds],
    rounds: draft.rounds.map((r, i) => ({
      position: i,
      level: r.level,
      questionTypes: r.questionTypes,
      answerMode: r.answerMode,
      mode: r.mode,
      rounds: r.rounds,
      reversedAnswers: r.reversedAnswers,
      reversedAudio: Boolean(r.reversedAudio),
      instruments: r.instruments,
      timer: r.timer ?? null,
    })),
  };
}

export function useCollectionDraft(initialDraft) {
  const [draft, setDraft] = useState(() => initialDraft ?? emptyDraft());

  const setName = useCallback((name) => setDraft((d) => ({ ...d, name })), []);

  const setCoverFile = useCallback(
    (file) => setDraft((d) => ({ ...d, coverFile: file })),
    []
  );

  const setCover = useCallback(
    (cover) => setDraft((d) => ({ ...d, cover })),
    []
  );

  const toggleLevel = useCallback((level) => {
    setDraft((d) => {
      const next = new Set(d.levels);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      if (next.size === 0) next.add(level);
      const lowest = Math.min(...next);
      const rounds = d.rounds.map((r) => (next.has(r.level) ? r : { ...r, level: lowest }));
      return { ...d, levels: next, rounds };
    });
  }, []);

  const toggleGenre = useCallback((id) => {
    setDraft((d) => {
      const next = new Set(d.genresIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) return { ...d, genresIds: next, artistsIds: new Set() };
      return { ...d, genresIds: next };
    });
  }, []);

  const toggleArtist = useCallback((id) => {
    setDraft((d) => {
      const next = new Set(d.artistsIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...d, artistsIds: next };
    });
  }, []);

  const toggleYear = useCallback((year) => {
    setDraft((d) => {
      const current = d.years?.type === 'set' ? new Set(d.years.values) : new Set();
      if (current.has(year)) current.delete(year);
      else current.add(year);
      if (current.size === 0) return { ...d, years: null };
      return { ...d, years: { type: 'set', values: [...current].sort((a, b) => a - b) } };
    });
  }, []);

  const setYearRange = useCallback((min, max) => {
    setDraft((d) => {
      if (min == null || max == null) return { ...d, years: null };
      return { ...d, years: { type: 'range', values: `${min}-${max}` } };
    });
  }, []);

  const addRound = useCallback(() => {
    setDraft((d) => {
      const lowest = Math.min(...d.levels);
      return { ...d, rounds: [...d.rounds, makeDefaultRound(lowest)] };
    });
  }, []);

  const removeRound = useCallback((index) => {
    setDraft((d) => {
      if (d.rounds.length <= 1) return d;
      return { ...d, rounds: d.rounds.filter((_, i) => i !== index) };
    });
  }, []);

  const updateRound = useCallback((index, patch) => {
    setDraft((d) => ({
      ...d,
      rounds: d.rounds.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }));
  }, []);

  const moveRound = useCallback((index, direction) => {
    setDraft((d) => {
      const target = index + direction;
      if (target < 0 || target >= d.rounds.length) return d;
      const next = [...d.rounds];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...d, rounds: next };
    });
  }, []);

  const validate = useCallback(() => {
    const errors = [];
    if (!draft.name.trim()) errors.push('Name is required.');
    if (draft.levels.size === 0) errors.push('Pick at least one level.');
    if (draft.rounds.length === 0) errors.push('Add at least one round.');
    draft.rounds.forEach((r, i) => {
      if (!draft.levels.has(r.level)) {
        errors.push(`Round ${i + 1}: level ${r.level} is not enabled.`);
      }
      if (!Array.isArray(r.questionTypes) || r.questionTypes.length === 0) {
        errors.push(`Round ${i + 1}: pick at least one question type.`);
      }
      if (r.mode !== 'speed' && r.mode !== 'collect') {
        errors.push(`Round ${i + 1}: mode must be speed or collect.`);
      }
      if (!VALID_REVERSED_ANSWERS.includes(r.reversedAnswers)) {
        errors.push(`Round ${i + 1}: reversed answers must be no, some, or all.`);
      }
    });
    return errors;
  }, [draft]);

  return {
    draft,
    setName, setCoverFile, setCover,
    toggleLevel,
    toggleGenre, toggleArtist, toggleYear, setYearRange,
    addRound, removeRound, updateRound, moveRound,
    validate,
  };
}