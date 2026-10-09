// src/components/domain/LyricsEditModal.jsx
import { useState } from 'react';
import { ModalForm } from '../Modal/ModalForm';

/**
 * Edit or create one lyrics row.
 *
 * State is initialised from `row.lyrics` on mount. The parent should
 * pass a `key` that changes with the row so React remounts this
 * component when the target row changes — that avoids the
 * "setState in useEffect" pattern and gives clean isolation.
 *
 * Props:
 *   open       — bool
 *   row        — existing lyrics row (with id, artist_id, track_name, lyrics) OR
 *                a "pending" object { artist_id, track_name, lyrics: null } for new rows
 *   onClose    — () => void
 *   onSubmit   — (payload) => Promise<void>   payload = { lyrics }
 */
export function LyricsEditModal({ open, row, onClose, onSubmit }) {
  const [lyrics, setLyrics] = useState(row?.lyrics ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ lyrics: lyrics.trim() || null });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save lyrics');
    } finally {
      setSubmitting(false);
    }
  }

  const isNew = !row?.id;
  const charCount = lyrics.length;

  return (
    <ModalForm
      open={open}
      onClose={onClose}
      title={isNew ? 'Add Lyrics' : 'Edit Lyrics'}
      submitLabel={isNew ? 'Create' : 'Save Changes'}
      submitting={submitting}
      error={error}
      onSubmit={handleSubmit}
    >
      {row && (
        <p className="text-xs text-ink-muted">
          <span className="font-medium text-ink">{row.track_name}</span>
          {row.artist_name ? <> · {row.artist_name}</> : row.artist_id ? <> · artist #{row.artist_id}</> : null}
        </p>
      )}

      <div className="space-y-1">
        <label htmlFor="lyrics" className="block text-sm font-medium text-ink">
          Lyrics
        </label>
        <textarea
          id="lyrics"
          value={lyrics}
          onChange={e => setLyrics(e.target.value)}
          rows={18}
          dir="auto"
          className="
            w-full px-3 py-2 rounded-lg
            bg-surface-subtle text-ink text-sm
            border border-surface-border
            focus:outline-none focus:ring-2 focus:ring-brand-500
            font-mono leading-relaxed
          "
          placeholder="Paste lyrics here…"
        />
        <p className="text-xs text-ink-subtle text-right tabular-nums">
          {charCount} chars
        </p>
      </div>
    </ModalForm>
  );
}