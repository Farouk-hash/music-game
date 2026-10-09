// game/src/hooks/usePlayParams.js
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export const TIMER_SECONDS = {
  off: 0,
  choose: 5,
  type:   15,
};

const VALID_TYPES = new Set([
  // Audio
  'name-track',
  'name-artist',
  'name-album',
  'name-featured',
  'name-position',
  // Lyrics
  'lyrics-track',
  'lyrics-artist',
  'lyrics-album',
]);

const VALID_REVERSED = new Set(['no', 'some', 'all']);

function parseTypes(searchParams) {
  const typesCsv = searchParams.get('types');
  if (typesCsv) {
    const arr = typesCsv.split(',').map(s => s.trim()).filter(Boolean);
    const valid = arr.filter(t => VALID_TYPES.has(t));
    return valid.length === arr.length ? valid : [];
  }

  const single = searchParams.get('type');
  if (!single || single === 'mixed') return [];
  return VALID_TYPES.has(single) ? [single] : [];
}

export function usePlayParams() {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    const genres = (searchParams.get('genres') || '')
      .split(',').filter(Boolean).map(Number);
    const artists = (searchParams.get('artists') || '')
      .split(',').filter(Boolean).map(Number);
    const years = (searchParams.get('years') || '')
      .split(',').filter(Boolean).map(Number);
    const rendition = searchParams.get('rendition') === 'reverse' ? 'reverse' : 'forward';
    const types = parseTypes(searchParams);
    const answerMode = searchParams.get('answerMode') === 'type' ? 'type' : 'choose';
    const timer = searchParams.get('timer') === 'on' ? 'on' : 'off';
    const count = Math.min(
      20,
      Math.max(1, Number(searchParams.get('count')) || 5)
    );

    const reversedRaw = searchParams.get('reversed');
    const reversed = VALID_REVERSED.has(reversedRaw) ? reversedRaw : 'no';

    const timerSeconds = timer === 'on'
      ? (answerMode === 'type' ? TIMER_SECONDS.type : TIMER_SECONDS.choose)
      : TIMER_SECONDS.off;

    return {
      genres, artists, years, types, rendition,
      answerMode, timer, timerSeconds, count, reversed,
    };
  }, [searchParams]);
}