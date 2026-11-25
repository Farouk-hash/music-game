// game/src/components/domain/Setup/Modals/LevelModalWrapper.jsx
import { Modal } from '@/components/Modal/Modal.jsx';
import { SharedGameSettings } from '../Shared-Game-Settings/SharedGameSettings.jsx';
import { IconClose, IconPlay } from '@/icons/index.js';

export function LevelModalWrapper({
  open,
  onClose,
  onPlay,
  level,
  eyebrow,                 // overrides "Level {level}" (e.g. "Multiplayer")
  title,
  disabledTypes,
  disabledReasons,
  reversedClipsCount,
  allowInstruments,
  canPlay = true,
  playLabel = 'Play',
  hideRoundCount = false,  // forwarded to the shared settings (multiplayer sets its own rounds)
  errorMessage = null,
  onQuestionTypeUnfavorited,
  children,
  isInMultiplayerModal = false,
}) {
  const heading = eyebrow ?? (level != null ? `Level ${level}` : '');

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="rounded-lg border border-border bg-surface p-6 space-y-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            {heading && (
              <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
                {heading}
              </p>
            )}
            <h2 className="text-xl font-bold text-ink mt-1">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-subtle hover:text-ink text-sm p-1 -m-1"
            aria-label="Close"
          >
            <IconClose />
          </button>
        </div>

        {errorMessage}
        {children}

        <SharedGameSettings
          disabledTypes={disabledTypes}
          disabledReasons={disabledReasons}
          reversedClipsCount={reversedClipsCount}
          allowInstruments={allowInstruments}
          onQuestionTypeUnfavorited={onQuestionTypeUnfavorited}
          hideRoundCount={hideRoundCount}
          isInMultiplayerModal={isInMultiplayerModal}
        />

        <div className="flex flex-row gap-3 sm:gap-4 w-full pt-4 border-t border-border">
          <button
            className="flex-1 h-11 px-2 sm:px-4 rounded-md bg-surface-2 text-ink border border-border hover:bg-surface hover:border-accent-2 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <IconClose className="w-5 h-5 shrink-0" />
            <span className="hidden sm:inline">Close</span>
          </button>

          <button
            className="flex-1 h-11 px-2 sm:px-4 rounded-md bg-accent text-bg border border-accent hover:bg-accent-2 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            onClick={onPlay}
            disabled={!canPlay}
            aria-label={playLabel}
            title={playLabel}
          >
            <IconPlay className="w-5 h-5 shrink-0" />
            <span className="hidden sm:inline">{playLabel}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}