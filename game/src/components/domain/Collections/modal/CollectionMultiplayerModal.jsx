// game/src/components/domain/Collections/modal/CollectionMultiplayerModal.jsx
import { MultiplayerModal } from '@/components/domain/Multiplayer/MultiplayerModal.jsx';

export function CollectionMultiplayerModal({
  collection,
  onClose,
  onStart,
  disabledTypes = new Set(),
  reversedClipsCount, 
}) {
  if (!collection) return null;

  return (
    <MultiplayerModal
      key={collection.id}
      open={true}
      onClose={onClose}
      onStart={onStart}
      starting={false}
      disabledTypes={disabledTypes}
      reversedClipsCount={reversedClipsCount}
    />
  );
}