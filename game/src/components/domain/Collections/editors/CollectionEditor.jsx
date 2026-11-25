// game/src/components/domain/Collections/editor/CollectionEditor.jsx
import { useMemo, useState } from 'react';
import { usePlayCollection } from '@/hooks/collections/usePlayCollection.js';
import { CollectionModalShell } from '../modal/CollectionModalShell.jsx';
import { LevelPickerModal } from '../modal/LevelPickerModal.jsx';

export function CollectionEditor({
  draft,
  mutations,
  initialSignature,
  disabledTypes,
  reversedClipsCount,
  onCancel,
  onSave,
  saving = false,
  saveError = null,
  isExisting = false,
  collectionId = null,
  isPublic = false,
  setIsPublic,
  isClone = false,
  onPlay,
  onMultiplayer
}) {
  const [levelPickerOpen, setLevelPickerOpen] = useState(false);
  const { startGame } = usePlayCollection();
  const { validate } = mutations;

  const signature = useMemo(() => {
    const levels = [...draft.levels].sort((a, b) => a - b);
    const genres = [...draft.genresIds].sort((a, b) => a - b);
    const artists = [...draft.artistsIds].sort((a, b) => a - b);
    const years = draft.years
      ? draft.years.type === 'range'
        ? `r:${draft.years.values}`
        : `s:${[...draft.years.values].sort((a, b) => a - b).join(',')}`
      : 'null';
    
      const rounds = draft.rounds.map((r) =>
        `${r.level}|${r.mode}|${r.questionTypes.join('+')}|${r.answerMode}|${r.rounds}|${r.reversedAnswers ? 1 : 0}|${r.reversedAudio ? 1 : 0}|${r.instruments}|${r.timer ?? ''}|${r.skips ?? 0}|${r.removes ?? 0}|${r.reveals ?? 0}|${r.memoryGame || 'none'}`
      ).join(';');
  
    const cover = draft.coverFile ? 'staged' : (draft.cover?.kind ?? 'generated');
    return `${draft.name.trim()}|${levels.join(',')}|${genres.join(',')}|${artists.join(',')}|${years}|${rounds}|${cover}`;
  }, [draft]);

  const dirty = initialSignature == null
    ? signature.length > 0 && draft.name.trim().length > 0
    : signature !== initialSignature;

  const availableLevels = Array.from(draft.levels || []);

  function handlePlayClick() {
    if (availableLevels.length === 1) {
      playLevel(availableLevels[0]);
    } else if (availableLevels.length > 1) {
      setLevelPickerOpen(true);
    }
  }

  function playLevel(level) {
    setLevelPickerOpen(false);
    const tempCollection = {
      genresIds: Array.from(draft.genresIds),
      artistsIds: Array.from(draft.artistsIds),
      years: draft.years,
      rounds: draft.rounds,
      levels: availableLevels,
    };
    startGame(tempCollection, level, onPlay); 
  }

  function handleSaveClick() {
    const errors = validate();
    if (errors.length > 0) { onSave(null, errors); return; }
    onSave(draft, null);
  }

  return (
    <>
      <CollectionModalShell
        open={true} // always true when mounted
        onClose={onCancel}
        title={isExisting ? `Edit "${draft.name}"` : 'New collection'}
        subtitle="Collections"
        draft={draft}
        mutations={mutations}
        readOnly={false}
        isClone={isClone}
        isPublic={isPublic}
        setIsPublic={setIsPublic}
        disabledTypes={disabledTypes}
        reversedClipsCount={reversedClipsCount}
        collectionId={collectionId}
        isExisting={isExisting}
        dirty={dirty}
        saving={saving}
        availableLevels={availableLevels}
        onPlay={handlePlayClick}
        onMultiplayer={onMultiplayer}
        onSave={handleSaveClick}
      />

      <LevelPickerModal
        open={levelPickerOpen} 
        onClose={() => setLevelPickerOpen(false)} 
        levels={availableLevels} 
        onSelect={playLevel} 
      />
    </>
  );
}