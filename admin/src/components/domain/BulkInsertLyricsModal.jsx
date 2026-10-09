// src/components/domain/BulkInsertLyricsModal.jsx
import { useState } from 'react';
import { Modal } from '../Modal/Modal';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

/**
 * Paste or upload a JSON array of lyrics objects, then bulk-upsert to D1.
 *
 * Accepted shape (array OR { tracks: [...] }):
 *   [
 *     { artist_id: 65, track_name: "...", lyrics: "..." },
 *     ...
 *   ]
 *
 * The Worker route accepts max 200 items per request; this component
 * batches the input into chunks of 200.
 */
const BATCH_SIZE = 200;

export function BulkInsertLyricsModal({ open, onClose, onBulkInsert, inserting, error }) {
  const [text, setText] = useState('');
  const [parseError, setParseError] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [result, setResult] = useState(null);

  function reset() {
    setText('');
    setParseError(null);
    setParsed(null);
    setResult(null);
  }

  function handleClose() {
    if (inserting) return;
    onClose();
    reset();
  }

  /* ═══════════════════════════════════════════════════════════
   Shape normalizer
   Accepts either:
     - snake_case: { artist_id, track_name, lyrics }
     - camelCase:  { artistId, trackName, lyrics }   ← lyrics-final.json
   Drops nothing; returns the row as-is if it already has the right keys.
   ═══════════════════════════════════════════════════════════ */

    function normalizeRow(it) {
    if (!it || typeof it !== 'object') return null;

    const artist_id  = it.artist_id  ?? it.artistId  ?? null;
    const track_name = it.track_name ?? it.trackName ?? null;
    const lyrics     = it.lyrics     ?? null;

    if (!Number.isInteger(artist_id) || typeof track_name !== 'string' || !track_name.trim()) {
        return null;
    }

    return { artist_id, track_name: track_name.trim(), lyrics };
    }

    function parseInput(raw) {
    setParseError(null);
    setParsed(null);
    setResult(null);

    if (!raw.trim()) return;

    let json;
    try {
        json = JSON.parse(raw);
    } catch (e) {
        setParseError(`Invalid JSON: ${e.message}`);
        return;
    }

    // Accept an array, or an object with a `tracks` array
    // (which is what lyrics-final.json uses)
    const list = Array.isArray(json)
        ? json
        : Array.isArray(json?.tracks)
        ? json.tracks
        : null;

    if (!list) {
        setParseError('Expected a top-level array, or an object with a "tracks" array.');
        return;
    }
    if (list.length === 0) {
        setParseError('Array is empty.');
        return;
    }

    // Normalize + validate
    const normalized = [];
    const failures = [];
    for (let i = 0; i < list.length; i++) {
        const r = normalizeRow(list[i]);
        if (!r) {
        failures.push(i);
        continue;
        }
        normalized.push(r);
    }

    if (normalized.length === 0) {
        setParseError(
        `None of the ${list.length} items have a valid artist_id/artistId and track_name/trackName. ` +
        `First item keys: ${Object.keys(list[0] ?? {}).join(', ') || '(empty object)'}`
        );
        return;
    }

    if (failures.length > 0) {
        setParseError(
        `${failures.length} item(s) skipped (invalid artist_id or track_name). ` +
        `First bad index: ${failures[0]}.`
        );
    }

    setParsed(normalized);
    }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target.result;
      setText(typeof content === 'string' ? content : '');
      parseInput(typeof content === 'string' ? content : '');
    };
    reader.readAsText(file);
  }

  async function handleInsert() {
    if (!parsed || parsed.length === 0) return;
    setResult(null);

    const batches = [];
    for (let i = 0; i < parsed.length; i += BATCH_SIZE) {
      batches.push(parsed.slice(i, i + BATCH_SIZE));
    }

    const aggregate = { total: parsed.length, inserted: 0, updated: 0, skipped: 0, batches: batches.length, errors: [] };

    try {
      for (let i = 0; i < batches.length; i++) {
        const res = await onBulkInsert(batches[i]);
        aggregate.inserted += res?.inserted ?? 0;
        aggregate.updated  += res?.updated  ?? 0;
        aggregate.skipped  += res?.skipped  ?? 0;
        if (Array.isArray(res?.errors) && res.errors.length) {
          aggregate.errors.push(...res.errors.map(e => ({ batch: i + 1, ...e })));
        }
      }
      setResult(aggregate);
    } catch (err) {
      setParseError(err.message || 'Bulk insert failed');
    }
  }

  const canInsert = parsed && parsed.length > 0 && !inserting;

  const footer = result ? (
    <div className="flex items-center justify-end gap-2">
      <Button variant="secondary" onClick={reset}>Insert another batch</Button>
      <Button variant="primary" onClick={handleClose}>Done</Button>
    </div>
  ) : (
    <div className="flex items-center justify-end gap-2">
      <Button variant="ghost" onClick={handleClose} disabled={inserting}>
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={handleInsert}
        disabled={!canInsert}
        loading={inserting}
      >
        {inserting
          ? 'Inserting…'
          : parsed
            ? `Insert ${parsed.length} rows`
            : 'Insert'}
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={result ? 'Bulk insert complete' : 'Bulk insert lyrics'}
      size="xl"
      footer={footer}
    >
      {result ? (
        <div className="space-y-3">
          <div
            className={`p-4 rounded-lg border ${
              result.errors.length === 0
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-warning/40 bg-warning-subtle'
            }`}
          >
            <p className="font-medium">
              {result.inserted + result.updated} of {result.total} rows processed
            </p>
            <p className="text-xs text-ink-muted mt-1">
              {result.batches} batches · inserted {result.inserted}, updated {result.updated}, skipped {result.skipped}
            </p>
          </div>

          {result.errors.length > 0 && (
            <ul className="space-y-1 max-h-60 overflow-y-auto">
              {result.errors.slice(0, 50).map((e, i) => (
                <li key={i} className="text-xs px-3 py-1.5 rounded bg-danger-subtle text-danger">
                  batch {e.batch}: {e.reason ?? 'error'}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {(error || parseError) && (
            <EmptyState
              icon="⚠️"
              title="Cannot insert"
              description={error || parseError}
              className="py-4"
            />
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="bulk" className="block text-sm font-medium text-ink">
                Paste JSON
              </label>
              <label className="text-xs text-brand-500 hover:underline cursor-pointer">
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFile}
                  className="hidden"
                />
                Upload file…
              </label>
            </div>

            <textarea
              id="bulk"
              value={text}
              onChange={e => { setText(e.target.value); parseInput(e.target.value); }}
              rows={14}
              dir="auto"
              className="
                w-full px-3 py-2 rounded-lg
                bg-surface-subtle text-ink text-xs font-mono
                border border-surface-border
                focus:outline-none focus:ring-2 focus:ring-brand-500
              "
              placeholder='[{"artist_id": 65, "track_name": "...", "lyrics": "..."}]'
            />

            {parsed && (
              <p className="text-xs text-ink-muted">
                <span className="text-emerald-400">✓</span> Parsed {parsed.length} rows ·
                will send in {Math.ceil(parsed.length / BATCH_SIZE)} batch
                {Math.ceil(parsed.length / BATCH_SIZE) === 1 ? '' : 'es'}
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}