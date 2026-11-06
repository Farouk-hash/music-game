// game/src/components/domain/Setup/Modals/Level1Modal.jsx
import { LevelModalWrapper } from './LevelModalWrapper.jsx';

export function Level1Modal({ open, onClose, onPlay, disabledTypes = new Set(), reversedClipsCount = 0 }) {
  return (
    <LevelModalWrapper
      open={open}
      onClose={onClose}
      onPlay={onPlay}
      level="1"
      title="One question per clip"
      disabledTypes={disabledTypes}
      reversedClipsCount={reversedClipsCount}
      allowInstruments={true}
    />
  );
}