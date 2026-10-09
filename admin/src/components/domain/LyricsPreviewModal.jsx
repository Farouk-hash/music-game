// src/components/domain/LyricsPreviewModal.jsx
import { Modal } from '../Modal/Modal';
import { Button } from '../ui/Button';

export function LyricsPreviewModal({ open, row, onClose }) {
  if (!row) return null;

  const lyrics = row.lyrics ?? '';
  const lineCount = lyrics.split('\n').filter(Boolean).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={row.track_name || 'Lyrics'}
      size="lg"
      footer={
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-xs text-ink-muted flex-wrap">
          <span>Artist #{row.artist_id}</span>
          <span>·</span>
          <span>{lyrics.length} chars</span>
          <span>·</span>
          <span>{lineCount} lines</span>
        </div>

        <div
          dir="auto"
          className="
            p-4 rounded-lg bg-surface-subtle border border-surface-border
            text-ink text-sm leading-loose whitespace-pre-wrap
            max-h-[60vh] overflow-y-auto
          "
        >
          {lyrics || <span className="text-ink-subtle italic">No lyrics</span>}
        </div>
      </div>
    </Modal>
  );
}