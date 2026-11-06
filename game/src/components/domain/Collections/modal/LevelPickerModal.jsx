// game/src/components/domain/Collections/modal/LevelPickerModal.jsx
import { Modal } from '@/components/Modal/Modal.jsx';

export function LevelPickerModal({ open, onClose, levels, onSelect }) {
  if (!open) return null;

  // Sort levels ascending (1, 2, 3)
  const sortedLevels = [...(levels || [])].sort((a, b) => a - b);

  return (
    <Modal open={open} onClose={onClose} size="md">
      <div className="rounded-lg border border-border bg-surface p-6 space-y-4">
        <header>
          <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Play Collection
          </p>
          <h3 className="text-xl font-bold text-ink mt-1">Which level?</h3>
          <p className="text-sm text-ink-muted mt-1">
            This collection has multiple levels. Pick the one you want to play.
          </p>
        </header>
        
        <div className="flex flex-col gap-2 pt-2">
          {sortedLevels.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => onSelect(lvl)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-md border border-border bg-surface-2 hover:border-accent hover:bg-surface transition-colors text-ink font-medium"
            >
              <span>Level {lvl}</span>
              <span className="text-xs text-ink-subtle">
                {lvl === 1 ? 'One per clip' : lvl === 2 ? 'Multi per clip' : 'Mix rounds'}
              </span>
            </button>
          ))}
        </div>
        
        <footer className="pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 w-full h-11 px-4 rounded-md border text-sm bg-surface-2 text-ink-muted border-border hover:bg-surface hover:border-accent-2 transition-colors font-semibold"
          >
            Cancel
          </button>
        </footer>
      </div>
    </Modal>
  );
}