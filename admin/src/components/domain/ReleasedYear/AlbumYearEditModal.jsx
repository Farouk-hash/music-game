// src/components/domain/AlbumYearEditModal.jsx
import { useState } from 'react';
import { ModalForm } from '../../Modal/ModalForm';

export function AlbumYearEditModal({ open, row, onClose, onSubmit }) {
  const [albumName, setAlbumName] = useState(row?.album_name ?? '');
  const [year, setYear]           = useState(row?.released_year ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState(null);

  if (!row) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const trimmed = albumName.trim();
    const yearNum = Number(year);

    if (!trimmed) {
      setError('Album name is required');
      return;
    }
    if (!Number.isInteger(yearNum) || yearNum < 1900 || yearNum > 2100) {
      setError('Year must be between 1900 and 2100');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ album_name: trimmed, released_year: yearNum });
      onClose();
    } catch (err) {
      setError(err.message ?? 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalForm
      open={open}
      title="Edit album"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      submitLabel="Save"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1.5">
            Album name
          </label>
          <input
            type="text"
            value={albumName}
            onChange={e => setAlbumName(e.target.value)}
            dir="auto"
            className="w-full h-10 px-3 rounded-lg bg-surface-subtle text-ink text-sm border border-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1.5">
            Released year
          </label>
          <input
            type="number"
            value={year}
            onChange={e => setYear(e.target.value)}
            min={1900}
            max={2100}
            className="w-full h-10 px-3 rounded-lg bg-surface-subtle text-ink text-sm border border-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>
    </ModalForm>
  );
}