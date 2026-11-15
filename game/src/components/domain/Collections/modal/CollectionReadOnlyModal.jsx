// game/src/components/domain/Collections/modal/CollectionReadOnlyModal.jsx
import { useState } from 'react';
import { draftFromCollection } from '@/hooks/collections/useCollectionDraft.js';
import { usePlayCollection } from '@/hooks/collections/usePlayCollection.js';
import { useCatalog } from '@/hooks/setup/useCatalog.js';
import { CollectionModalShell } from './CollectionModalShell.jsx';
import { LevelPickerModal } from './LevelPickerModal.jsx';

export function CollectionReadOnlyModal({ 
  open, 
  onClose, 
  collection, 
  onPlay, 
  onMultiplayer,
  disabledTypes, 
  disabledReasons 
}) {
  const [levelPickerOpen, setLevelPickerOpen] = useState(false);
  const { startGame } = usePlayCollection();
  const { data: catalog } = useCatalog(); 
  const reversedClipsCount = catalog?.counts?.reversedClips ?? 0; 

  if (!open || !collection) return null;

  const draft = draftFromCollection(collection);
  const availableLevels = collection.levels || [];

  function handlePlayClick() {
    if (availableLevels.length === 1) {
      startGame(collection, availableLevels[0], onPlay);
    } else if (availableLevels.length > 1) {
      setLevelPickerOpen(true);
    }
  }

  function handleSelectLevel(level) {
    setLevelPickerOpen(false);
    startGame(collection, level, onPlay);
  }

  return (
    <>
      <CollectionModalShell
        open={open}
        onClose={onClose}
        title={collection.name}
        subtitle="Community Collection"
        collection={collection}
        draft={draft}
        readOnly={true}
        disabledTypes={disabledTypes}
        disabledReasons={disabledReasons}
        reversedClipsCount={reversedClipsCount}
        availableLevels={availableLevels}
        onPlay={handlePlayClick}
        onMultiplayer={onMultiplayer}
      />
      
      <LevelPickerModal 
        open={levelPickerOpen} 
        onClose={() => setLevelPickerOpen(false)} 
        levels={availableLevels} 
        onSelect={handleSelectLevel} 
      />
    </>
  );
}