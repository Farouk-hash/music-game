// game/src/hooks/collections/usePlayCollection.js
import { useNavigate } from 'react-router-dom';

export function usePlayCollection() {
  const navigate = useNavigate();

  const startGame = (collection, level, onPlay) => {
    if (!collection || !level) return;

    // 1. Find the specific round that matches the selected level
    const targetRound = collection.rounds?.find(r => Number(r.level) === Number(level)) 
                     || collection.rounds?.[0] 
                     || {};

    // 2. Build the payload from that specific round's settings
    const payload = {
      genres: collection.genresIds || [],
      artists: collection.artistsIds || [],
      years: collection.years?.values || [],
      
      // Use the settings from the matched round
      types: targetRound.questionTypes || [],
      answerMode: targetRound.answerMode || 'choose',
      timer: targetRound.timer ? 'on' : 'off',
      reversed: targetRound.reversedAnswers || 'no',
      instruments: targetRound.instruments || 'none',
      rendition: targetRound.reversedAudio ? 'reverse' : 'forward',
      count: targetRound.rounds || 10, 
      
      // Ensure the level is correctly set
      level: Number(level),
    };


    sessionStorage.setItem('game.lastPlayParams', JSON.stringify(payload));

    
    const path = level === 3 ? '/play-three' : level === 2 ? '/play-two' : '/play';
    navigate(path);
    if (onPlay) onPlay(); 
  };

  return { startGame };
}