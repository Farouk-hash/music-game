// game/src/components/domain/Setup/Modals/Level3Modal.jsx
import { LevelModalWrapper } from './LevelModalWrapper.jsx';

export function Level3Modal({
  open, onClose, onPlay,
  disabledTypes = new Set(),
  disabledReasons,
  reversedClipsCount = 0,
  allowInstruments = false,   // L3 doesn't support instruments yet
  genreMode,
  effectiveSelectedArtistsCount,
  onQuestionTypeUnfavorited,
}) {
  const noGenre = genreMode === 'idle';
  const singleArtist = effectiveSelectedArtistsCount === 1;
  const canPlay = !noGenre && !singleArtist;

  const errorMessage = (
    <>
      {noGenre && (
        <p className="text-sm text-wrong rounded-md border border-wrong/40 bg-wrong-soft px-3 py-2">
          Level 3 needs a genre. Pick one on the Setup screen.
        </p>
      )}
      {!noGenre && singleArtist && (
        <p className="text-sm text-wrong rounded-md border border-wrong/40 bg-wrong-soft px-3 py-2">
          Level 3 needs multiple artists. Select more, or clear the artist filter.
        </p>
      )}
    </>
  );

  return (
    <LevelModalWrapper
      open={open}
      onClose={onClose}
      onPlay={onPlay}
      level="3"
      title="Mixed tracks, set questions"
      disabledTypes={disabledTypes}
      disabledReasons={disabledReasons}
      reversedClipsCount={reversedClipsCount}
      allowInstruments={allowInstruments}
      canPlay={canPlay}
      errorMessage={errorMessage}
      onQuestionTypeUnfavorited={onQuestionTypeUnfavorited}
    />
  );
}