// game/src/components/domain/Setup/Years/YearRangeModal.jsx
import { useState, useEffect } from 'react';
import { Modal } from '../../../Modal/Modal.jsx';
import { Button } from '../../../ui/Button.jsx';

export function YearRangeModal({ open, onClose, years, onApply }) {
  const yearNumbers = years.map(y => y.year).sort((a, b) => a - b);
  const minYear = yearNumbers[0] ?? 1950;
  const maxYear = yearNumbers[yearNumbers.length - 1] ?? 2026;

  const [from, setFrom] = useState(minYear);
  const [to, setTo] = useState(maxYear);

  // Reset values when the modal opens
  useEffect(() => {
    if (open) {
      setFrom(minYear);
      setTo(maxYear);
    }
  }, [open, minYear, maxYear]);

  function handleApply() {
    const start = Math.min(from, to);
    const end = Math.max(from, to);
    
    // Find all available years in the catalogue that fall within this range
    const yearsToSelect = yearNumbers.filter(y => y >= start && y <= end);
    onApply(yearsToSelect);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="rounded-lg border border-border bg-surface p-6 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-ink">Select Year Range</h2>
            <p className="text-sm text-ink-muted mt-1">
              Quickly select a block of years.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-subtle hover:text-ink text-sm shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
              From
            </label>
            <select
              value={from}
              onChange={(e) => setFrom(Number(e.target.value))}
              className="w-full h-11 rounded-md border border-border bg-surface-2 px-3 text-ink focus:border-accent focus:outline-none"
            >
              {yearNumbers.map((y) => (
                <option key={`from-${y}`} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <span className="text-ink-muted pt-6">to</span>
          <div className="flex-1 space-y-2">
            <label className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
              To
            </label>
            <select
              value={to}
              onChange={(e) => setTo(Number(e.target.value))}
              className="w-full h-11 rounded-md border border-border bg-surface-2 px-3 text-ink focus:border-accent focus:outline-none"
            >
              {yearNumbers.map((y) => (
                <option key={`to-${y}`} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleApply}>Apply Range</Button>
        </div>
      </div>
    </Modal>
  );
}