// game/src/hooks/collections/usePlayCollection.js
import { parseYears } from '@/components/domain/Templates/templateYears';
import { useNavigate } from 'react-router-dom';

export function usePlayCollection() {
  const navigate = useNavigate();

  function launch(game, level, onPlay) {
    if (!game || !level) return;

    const targetRound =
      game.rounds?.find(r => Number(r.level) === Number(level)) ||
      game.rounds?.[0] ||
      {};

    const payload = {
      genres: game.genresIds || [],
      artists: game.artistsIds || [],
      years: parseYears(game.years),

      types: targetRound.questionTypes || [],
      answerMode: targetRound.answerMode || 'choose',
      timer: targetRound.timer ?? null,
      reversed: targetRound.reversedAnswers || 'no',
      instruments: targetRound.instruments || 'none',
      rendition: targetRound.reversedAudio ? 'reverse' : 'forward',
      count: targetRound.rounds || 10,

      // ✅ NEW: Extract lifelines from collection round config
      skips: targetRound.skips ?? 0,
      removes: targetRound.removes ?? 0,
      reveals: targetRound.reveals ?? 0,

      // ✅ NEW: Include Memory Game mode
      memoryGame: targetRound.memoryGame || 'none',

      level: Number(level),
    };

    sessionStorage.setItem('game.lastPlayParams', JSON.stringify(payload));

    const path = level === 3 ? '/play-three' : level === 2 ? '/play-two' : '/play';
    navigate(path);
    if (onPlay) onPlay();
  }

  const startGame = (collection, level, onPlay) => launch(collection, level, onPlay);
  const startTemplate = (template, level, onPlay) => launch(template, level, onPlay);

  return { startGame, startTemplate };
}