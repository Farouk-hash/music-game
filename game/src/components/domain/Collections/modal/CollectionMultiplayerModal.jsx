// game/src/components/domain/Collections/modal/CollectionMultiplayerModal.jsx
import { MultiplayerModal } from '@/components/domain/Multiplayer/Modal/MultiPlayerModal.jsx';

export function CollectionMultiplayerModal({
  collection,
  onClose,
  onStart,
  disabledTypes = new Set(),
  reversedClipsCount, 
}) {
  if (!collection) return null;
  const seedRound = collection.rounds?.[0];
  const defaultRounds = seedRound?.rounds || 5;
  return (
    <MultiplayerModal
      key={collection.id}
      open={true}
      onClose={onClose}
      onStart={onStart}
      starting={false}
      disabledTypes={disabledTypes}
      reversedClipsCount={reversedClipsCount}
      defaultRoundsPerPlayer={defaultRounds}
    />
  );
}