// game/src/components/domain/Setup/Modals/Level2Modal.jsx
import { LevelModalWrapper } from './LevelModalWrapper.jsx';

export function Level2Modal({ open, onClose, onPlay, disabledTypes = new Set(), reversedClipsCount = 0 }) {
  return (
    <LevelModalWrapper
      open={open}
      onClose={onClose}
      onPlay={onPlay}
      level="2"
      title="Multiple questions per clip"
      disabledTypes={disabledTypes}
      reversedClipsCount={reversedClipsCount}
      allowInstruments={true}
    />
  );
}