// game/src/components/domain/Setup/Modals/LevelModalWrapper.jsx
import { Modal } from '@/components/Modal/Modal.jsx';
import { SharedGameSettings } from './SharedGameSettings.jsx';
import { IconClose } from '@/icons/index.js';

export function LevelModalWrapper({
  open,
  onClose,
  onPlay,
  level,
  title,
  disabledTypes,
  reversedClipsCount,
  allowInstruments,
  canPlay = true,
  errorMessage = null,
  children, // For any extra content (like Level 3 warnings)
}) {
  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="rounded-lg border border-border bg-surface p-6 space-y-6 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
              Level {level}
            </p>
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

        {/* Optional Error / Warning blocks passed from parent */}
        {errorMessage}
        {children}

        {/* Shared Game Settings */}
        <SharedGameSettings
          disabledTypes={disabledTypes}
          reversedClipsCount={reversedClipsCount}
          allowInstruments={allowInstruments}
        />

        {/* Footer Buttons - Flexible Full Width */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 w-full pt-4 border-t border-border">
          <button 
            className="flex-1 w-full h-11 px-4 rounded-md bg-surface-2 text-ink border border-border hover:bg-surface hover:border-accent-2 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onClose}
          >
            Close
          </button>
          
          <button 
            className="flex-1 w-full h-11 px-4 rounded-md bg-accent text-bg border border-accent hover:bg-accent-2 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onPlay}
            disabled={!canPlay}
          >
            Play
          </button>
        </div>
      </div>
    </Modal>
  );
}