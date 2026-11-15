// game/src/components/domain/Setup/Modals/Level2Modal.jsx
import { LevelModalWrapper } from './LevelModalWrapper.jsx';

export function Level2Modal({
  open, onClose, onPlay,
  disabledTypes = new Set(),
  disabledReasons,
  reversedClipsCount = 0,
  allowInstruments = true,
  onQuestionTypeUnfavorited,
}) {
  return (
    <LevelModalWrapper
      open={open}
      onClose={onClose}
      onPlay={onPlay}
      level="2"
      title="Multiple questions per clip"
      disabledTypes={disabledTypes}
      disabledReasons={disabledReasons}
      reversedClipsCount={reversedClipsCount}
      allowInstruments={allowInstruments}
      onQuestionTypeUnfavorited={onQuestionTypeUnfavorited}
    />
  );
}