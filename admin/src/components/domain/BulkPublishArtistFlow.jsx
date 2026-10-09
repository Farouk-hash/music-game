// admin/src/components/domain/BulkPublishArtistFlow.jsx
import { Modal } from '../Modal/Modal';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { PublishClipsModal } from './PublishClipsModal';
import { useBulkPublish } from '../../hooks/cloud-flare/useBulkPublish';
import { useEffect, useRef } from 'react';

/**
 * Full-screen flow that:
 *   1. Collects catalogues for the selected artists
 *   2. Opens the standard PublishClipsModal for configuration
 *   3. Publishes clips in batches of 25, showing progress
 */
export function BulkPublishArtistFlow({ open, onClose, artists, autoStart = false }) {

   const flow = useBulkPublish();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    if (!autoStart) return;
    if (startedRef.current) return;
    startedRef.current = true;
    flow.start(artists);
  }, [open, autoStart, artists, flow]);
  // Kick off collection when the flow opens (once).
  // We rely on `open` + an internal `started` ref to avoid re-running.
  // (Simplest: run start() directly in the parent when they click.)

  if (!open) return null;

  // ── Collecting ────────────────────────────────────────
  if (flow.status === 'idle' || flow.status === 'collecting') {
    return (
      <Modal open onClose={onClose} title="Preparing to publish" size="md">
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3">
            <Spinner size="md" className="text-brand-500 shrink-0" />
            <div>
              <p className="text-sm text-ink">
                Fetching tracks and albums for{' '}
                <span className="font-medium">{flow.progress.artistsTotal}</span>{' '}
                {flow.progress.artistsTotal === 1 ? 'artist' : 'artists'}…
              </p>
              {flow.progress.currentArtistName && (
                <p className="text-xs text-ink-muted mt-1">
                  Currently: {flow.progress.currentArtistName}
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-ink-subtle">
            Artists fetched: {flow.progress.artistsDone} / {flow.progress.artistsTotal}
          </p>
          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Ready — configure positions in the reused modal ──
  if (flow.status === 'ready') {
    return (
      <PublishClipsModal
        open
        onClose={onClose}
        tracks={flow.collectedTracks}
        // The modal will read track._primaryArtistId per clip.
        artistId={null}
        onPublish={flow.publish}
        publishing={false}
        result={null}
        error={null}
        onReset={flow.reset}
      />
    );
  }

  // ── Publishing — progress view ────────────────────────
  if (flow.status === 'publishing') {
    const {
      clipsTotal, clipsDone, succeeded, duplicates, failed,
      currentBatch, totalBatches,
    } = flow.progress;

    const pct = clipsTotal > 0
      ? Math.round((clipsDone / clipsTotal) * 100)
      : 0;

    return (
      <Modal
        open
        onClose={() => {}}
        closeOnBackdrop={false}
        title="Publishing clips"
        size="md"
      >
        <div className="space-y-4 py-4">
          <div>
            <div className="flex items-center justify-between text-xs text-ink-muted mb-1.5">
              <span>
                Batch {currentBatch} of {totalBatches}
              </span>
              <span className="tabular-nums">{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <ul className="text-sm space-y-1">
            <li className="flex justify-between text-ink">
              <span>Clips processed</span>
              <span className="tabular-nums">{clipsDone} / {clipsTotal}</span>
            </li>
            <li className="flex justify-between text-emerald-400">
              <span>Succeeded</span>
              <span className="tabular-nums">{succeeded}</span>
            </li>
            <li className="flex justify-between text-ink-muted">
              <span>Already published (skipped)</span>
              <span className="tabular-nums">{duplicates}</span>
            </li>
            <li className="flex justify-between text-danger">
              <span>Failed</span>
              <span className="tabular-nums">{failed}</span>
            </li>
          </ul>

          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={flow.cancel}>Cancel</Button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Done — summary ────────────────────────────────────
  if (flow.status === 'done') {
    const {
      succeeded, duplicates, failed, failures, clipsTotal,
    } = flow.progress;

    return (
      <Modal open onClose={onClose} title="Bulk publish complete" size="md">
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Succeeded" value={succeeded} tone="success" />
            <Stat label="Skipped" value={duplicates} tone="muted" />
            <Stat label="Failed" value={failed} tone="danger" />
          </div>

          <p className="text-xs text-ink-subtle text-center">
            Total clips attempted: {clipsTotal}
          </p>

          {failures.length > 0 && (
            <div className="pt-2 border-t border-surface-border">
              <p className="text-sm font-medium text-danger mb-2">
                Failures ({failures.length})
              </p>
              <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
                {failures.slice(0, 20).map((f, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-ink truncate">{f.name}</span>
                    <span className="text-ink-subtle">({f.position})</span>
                    <span className="text-danger truncate">{f.error}</span>
                  </li>
                ))}
                {failures.length > 20 && (
                  <li className="text-ink-subtle">
                    … {failures.length - 20} more
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={onClose}>Done</Button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Error ─────────────────────────────────────────────
  if (flow.status === 'error') {
    return (
      <Modal open onClose={onClose} title="Something went wrong" size="md">
        <div className="space-y-4 py-4">
          <p className="text-sm text-wrong">
            {flow.error?.message ?? 'Unknown error'}
          </p>
          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={onClose}>Close</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return null;
}

function Stat({ label, value, tone = 'default' }) {
  const toneClass =
    tone === 'success' ? 'text-emerald-400' :
    tone === 'danger'  ? 'text-danger'      :
    tone === 'muted'   ? 'text-ink-muted'   :
                         'text-ink';
  return (
    <div className="p-3 rounded-lg bg-surface-subtle border border-surface-border text-center">
      <p className={`text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      <p className="text-xs text-ink-subtle mt-0.5">{label}</p>
    </div>
  );
}