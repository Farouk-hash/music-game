// admin/src/components/domain/FetchLyricsBar.jsx
import { useState } from 'react';
import { Button } from '../ui/Button';
import { MultiSelect } from '../ui/MultiSelect';

/**
 * Scope selector + "Fetch lyrics" button.
 *
 * Props:
 *   artists  — [{ id, name }, ...]
 *   onStart  — ({ scope, artistId, artistIds }) => Promise<void>
 *   disabled — true while another job is active
 *   starting — true while the start request is in flight
 */
export function FetchLyricsBar({ artists = [], onStart, disabled, starting }) {
  const [scope, setScope] = useState('artist');
  const [artistId, setArtistId] = useState('');
  const [artistIds, setArtistIds] = useState([]);   // array now

  const genreOptions = artists.map(a => ({
    value: a.id,
    label: a.name,
  }));

  async function handleStart() {
    if (scope === 'artist') {
      const id = Number(artistId);
      if (!Number.isInteger(id) || id <= 0) return;
      await onStart({ scope: 'artist', artistId: id });
    } else if (scope === 'artists') {
      if (artistIds.length === 0) return;
      await onStart({ scope: 'artists', artistIds });
    } else {
      await onStart({ scope: 'missing-only' });
    }
  }

  const canStart = !disabled && !starting && (
    (scope === 'artist'  && artistId !== '') ||
    (scope === 'artists' && artistIds.length > 0) ||
    (scope === 'missing-only')
  );

  return (
    <div className="rounded-lg border border-surface-border bg-surface-muted p-3 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs text-ink-muted">Scope:</label>

        <select
          value={scope}
          onChange={e => setScope(e.target.value)}
          className="h-9 px-2 rounded-lg bg-surface-subtle text-ink text-sm border border-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="artist">One artist</option>
          <option value="artists">Multiple artists</option>
          <option value="missing-only">Missing lyrics only</option>
        </select>

        {scope === 'artist' && (
          <select
            value={artistId}
            onChange={e => setArtistId(e.target.value)}
            className="h-9 px-2 rounded-lg bg-surface-subtle text-ink text-sm border border-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-[200px]"
          >
            <option value="">Select artist…</option>
            {artists.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}

        {scope === 'artists' && (
          <div className="flex-1 min-w-[260px]">
            <MultiSelect
              options={genreOptions}
              value={artistIds}
              onChange={setArtistIds}
              placeholder="Select artists…"
              emptyMessage="No artists match"
            />
          </div>
        )}

        {scope === 'missing-only' && (
          <span className="text-xs text-ink-muted">
            Runs the pipeline for every track that has no lyrics in D1.
          </span>
        )}
      </div>

      {scope === 'artists' && artistIds.length > 0 && (
        <p className="text-xs text-ink-subtle">
          {artistIds.length} artist{artistIds.length === 1 ? '' : 's'} selected
        </p>
      )}

      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={handleStart}
          disabled={!canStart}
          loading={starting}
        >
          {starting ? 'Starting…' : 'Fetch lyrics'}
        </Button>
      </div>

      {disabled && (
        <p className="text-xs text-warning">
          A pipeline job is already running. Cancel it before starting a new one.
        </p>
      )}
    </div>
  );
}