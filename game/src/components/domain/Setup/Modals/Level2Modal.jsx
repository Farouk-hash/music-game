// game/src/components/domain/Setup/Modals/Level2Modal.jsx
import { Modal } from '../../../Modal/Modal.jsx';
import { Button } from '../../../ui/Button.jsx';
import { SharedGameSettings } from './SharedGameSettings.jsx';

export function Level2Modal({ open, onClose, onPlay, disabledTypes = new Set(), reversedClipsCount = 0 }) {
  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="rounded-lg border border-border bg-surface p-6 space-y-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
              Level 2
            </p>
            <h2 className="text-xl font-bold text-ink mt-1">
              Multiple questions per clip
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

        <SharedGameSettings disabledTypes={disabledTypes} reversedClipsCount={reversedClipsCount}/>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onPlay}>Play</Button>
        </div>
      </div>
    </Modal>
  );
}