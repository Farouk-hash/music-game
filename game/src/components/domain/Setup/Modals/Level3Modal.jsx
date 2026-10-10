// game/src/components/domain/Setup/Modals/Level3Modal.jsx
import { Modal } from '../../../Modal/Modal.jsx';
import { Button } from '../../../ui/Button.jsx';
import { SharedGameSettings } from './SharedGameSettings.jsx';

export function Level3Modal({
  open,
  onClose,
  onPlay,
  disabledTypes = new Set(),
  reversedClipsCount = 0,
  genreMode,
  effectiveSelectedArtistsCount,
}) {
  const noGenre = genreMode === 'idle';
  const singleArtist = effectiveSelectedArtistsCount === 1;
  const canPlay = !noGenre && !singleArtist;

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="rounded-lg border border-border bg-surface p-6 space-y-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
              Level 3
            </p>
            <h2 className="text-xl font-bold text-ink mt-1">
              Mixed tracks, set questions
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-subtle hover:text-ink text-sm"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

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

        <SharedGameSettings
          disabledTypes={disabledTypes}
          reversedClipsCount={reversedClipsCount}
          allowInstruments={false}
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onPlay} disabled={!canPlay}>
            Play
          </Button>
        </div>
      </div>
    </Modal>
  );
}