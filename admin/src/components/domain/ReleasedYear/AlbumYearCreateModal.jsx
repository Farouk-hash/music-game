
import { useState } from 'react';
import { useArtistAlbumNames } from '../../../hooks/cloud-flare/ReleaseYears/useArtistAlbumNames';
import {ModalForm} from '../../Modal/ModalForm';

export function AlbumYearCreateModal({ open, artists, onClose, onSubmit, submitting, error }) {
  const [artistId, setArtistId]   = useState('');
  const [albumName, setAlbumName] = useState('');
  const [year, setYear]           = useState(new Date().getFullYear());

  const numericArtistId = Number(artistId);
  const {
    data: albumData,
    isLoading: albumsLoading,
    error: albumsError,
  } = useArtistAlbumNames(artistId ? numericArtistId : undefined);

  const suggestions = albumData?.albumNames ?? [];

  function handleArtistChange(value) {
    setArtistId(value);
    // Clear the album name when the artist changes — otherwise you
    // can carry over an album from a different artist by accident.
    setAlbumName('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await onSubmit({
      artist_id:     numericArtistId,
      album_name:    albumName.trim(),
      released_year: Number(year),
    });
  }

  return (
    <ModalForm
      open={open}
      title="Add album"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      submitLabel="Add"
      submitDisabled={!artistId || !albumName.trim()}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1.5">
            Artist
          </label>
          <select
            value={artistId}
            onChange={e => handleArtistChange(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-surface-subtle text-ink text-sm border border-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Select an artist…</option>
            {artists.map(a => (
              <option key={a.id} value={a.id}>
                {a.name} (#{a.id})
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label className="block text-xs font-medium text-ink-muted">
              Album name
            </label>
            {artistId && (
              <span className="text-[11px] text-ink-subtle">
                {albumsLoading
                  ? 'Loading suggestions…'
                  : albumsError
                    ? 'Could not load suggestions'
                    : `${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'}`}
              </span>
            )}
          </div>

          <input
            type="text"
            value={albumName}
            onChange={e => setAlbumName(e.target.value)}
            dir="auto"
            list={artistId && suggestions.length > 0 ? `album-suggestions-${artistId}` : undefined}
            placeholder={
              artistId && suggestions.length > 0
                ? 'Pick a suggestion or type a new album…'
                : 'e.g. البوم تملي معاك'
            }
            className="w-full h-10 px-3 rounded-lg bg-surface-subtle text-ink text-sm border border-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          {artistId && suggestions.length > 0 && (
            <datalist id={`album-suggestions-${artistId}`}>
              {suggestions.map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
          )}

          {artistId && suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.slice(0, 12).map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setAlbumName(name)}
                  className="px-2 py-0.5 rounded-md text-[11px] bg-surface-muted text-ink-muted hover:text-ink hover:bg-surface-subtle transition-colors"
                  dir="auto"
                >
                  {name}
                </button>
              ))}
              {suggestions.length > 12 && (
                <span className="text-[11px] text-ink-subtle self-center">
                  +{suggestions.length - 12} more (use the dropdown)
                </span>
              )}
            </div>
          )}
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