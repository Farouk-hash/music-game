// admin/src/components/domain/Instrumental/InstrumentalUploadModal.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../../Modal/Modal';
import { Button } from '../../ui/Button';
import { Spinner } from '../../ui/Spinner';
import { PipelineJobPanel } from '../PipelineJobPanel';
import { useInstrumentalUpload } from '../../../hooks/cloud-flare/Instrumental/useInstrumentalUpload';
import { useInstrumentalLocal } from '../../../hooks/cloud-flare/Instrumental/useInstrumentalLocal';

/**
 * Upload modal.
 *
 * Phases:
 *   scanning  → run /api/instrumental/local to find ready tracks
 *   confirm   → list tracks + segments; duplicates are grayed
 *   starting  → POST to /api/instrumental/upload
 *   running   → PipelineJobPanel with live progress
 *   error     → show error, allow close
 *
 * Duplicate rule: if the same track name appears under more than one
 * selected artist, all instances are disabled.
 */
export function InstrumentalUploadModal({ open, onClose, artists }) {
  const upload = useInstrumentalUpload();
  const local = useInstrumentalLocal();
  const startedRef = useRef(false);

  const [duplicates, setDuplicates] = useState(new Set());

  // Fetch local tracks + cross-artist duplicates when opening.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function scan() {
      // 1. Local scan (with artist genres merged in the hook)
      await local.scan(artists);
      if (cancelled) return;

      // 2. Duplicate check across the selected artists
      try {
        const res = await fetch(
          '/api/cloudflare/remote/instruments/check-duplicates',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ artist_ids: artists.map(a => a.id) }),
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setDuplicates(new Set(data.duplicates ?? []));
      } catch (e) {
        // Duplicate check is best-effort — don't block the upload
        console.warn('[instrumental-upload] duplicate check failed:', e.message);
        if (!cancelled) setDuplicates(new Set());
      }
    }

    scan();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

 
   const items = useMemo(() => local.items ?? [], [local.items]);

    // Split into uploadable vs skipped (duplicate name)
    const { uploadable, skipped } = useMemo(() => {
    const up = [];
    const sk = [];
    for (const it of items) {
        if (duplicates.has(it.trackName)) sk.push(it);
        else up.push(it);
    }
    return { uploadable: up, skipped: sk };
    }, [items, duplicates]);

  if (!open) return null;

  const phase =
    local.scanning ? 'scanning'   :
    upload.starting ? 'starting'  :
    upload.error    ? 'error'     :
    upload.jobId    ? 'running'   :
                      'confirm';

  function handleStart() {
    if (startedRef.current) return;
    if (uploadable.length === 0) return;
    startedRef.current = true;
    upload.start({ items: uploadable });
  }

  const totalSegments = uploadable.reduce(
    (sum, it) => sum + (it.segments?.length ?? 0),
    0
  );

  return (
    <Modal open onClose={onClose} title="Upload instruments" size="2xl">
      <div className="space-y-4 py-2">

        {/* ── Scanning ─────────────────────────────────── */}
        {phase === 'scanning' && (
          <div className="flex items-center gap-3 py-6">
            <Spinner size="md" className="text-brand-500 shrink-0" />
            <div>
              <p className="text-sm text-ink">
                Scanning local output folders…
              </p>
              <p className="text-xs text-ink-muted mt-1">
                Looking for {artists.length === 1 ? 'the selected artist' : 'the selected artists'}
              </p>
            </div>
          </div>
        )}

        {/* ── Confirm ──────────────────────────────────── */}
        {phase === 'confirm' && (
          <>
            <p className="text-sm text-ink">
              <span className="font-medium">{uploadable.length}</span>{' '}
              {uploadable.length === 1 ? 'track' : 'tracks'} ready
              {' · '}
              <span className="font-medium">{totalSegments}</span>{' '}
              {totalSegments === 1 ? 'segment' : 'segments'} to upload.
              {skipped.length > 0 && (
                <>
                  {' '}
                  <span className="text-yellow-400">
                    {skipped.length} skipped
                  </span>{' '}
                  <span className="text-ink-muted">(duplicate names).</span>
                </>
              )}
            </p>

            {items.length === 0 && (
              <div className="rounded-md border border-surface-border bg-surface-subtle p-4 text-sm text-ink-muted">
                Nothing to upload. Generate instruments first from the
                Published Artists page.
              </div>
            )}

            {items.length > 0 && (
              <div className="rounded border border-surface-border bg-surface max-h-80 overflow-y-auto">
                <ul className="divide-y divide-surface-border text-xs">
                  {items.map((it, i) => {
                    const isDup = duplicates.has(it.trackName);
                    return (
                      <li
                        key={`${it.artistId}-${it.trackName}-${i}`}
                        className={`flex items-center gap-2 px-3 py-2 ${isDup ? 'opacity-50' : ''}`}
                      >
                        <span className="text-ink-subtle w-8 text-end tabular-nums shrink-0">
                          {it.artistId}
                        </span>
                        <span
                          className="flex-1 truncate text-ink"
                          dir="auto"
                          title={it.trackName}
                        >
                          {it.trackName}
                        </span>
                        <span
                          className="text-ink-muted truncate max-w-[35%]"
                          dir="auto"
                          title={it.artistName}
                        >
                          {it.artistName}
                        </span>
                        {isDup && (
                          <span className="text-yellow-400 shrink-0">
                            duplicate
                          </span>
                        )}
                        <span className="text-ink-subtle shrink-0 tabular-nums">
                          {it.segments?.length ?? 0} seg
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="rounded-md border border-surface-border bg-surface-subtle p-3 text-xs text-ink-muted space-y-1">
              <p>
                Each track uploads 2 MP3s to R2 at{' '}
                <span className="font-mono text-ink">instrumentals/…</span>.
              </p>
              <p>
                One D1 row per segment is inserted into{' '}
                <span className="font-mono text-ink">instruments</span>.
              </p>
              <p className="text-yellow-400">
                Local MP3 files are deleted after successful upload. Their
                folders keep <span className="font-mono">meta.json</span>.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={handleStart} disabled={uploadable.length === 0}>
                Upload ({uploadable.length})
              </Button>
            </div>
          </>
        )}

        {/* ── Starting ─────────────────────────────────── */}
        {phase === 'starting' && (
          <div className="flex items-center gap-3 py-4">
            <Spinner size="md" className="text-brand-500 shrink-0" />
            <p className="text-sm text-ink">Starting upload job…</p>
          </div>
        )}

        {/* ── Running ──────────────────────────────────── */}
        {phase === 'running' && (
          <>
            <div className="flex items-center gap-3">
              <Spinner size="md" className="text-brand-500 shrink-0" />
              <div>
                <p className="text-sm text-ink">
                  Uploading{' '}
                  <span className="font-medium">{upload.count ?? uploadable.length}</span>{' '}
                  {(upload.count ?? uploadable.length) === 1 ? 'track' : 'tracks'}…
                </p>
                <p className="text-xs text-ink-muted mt-0.5">
                  You can close this window — the job runs in the background.
                </p>
              </div>
            </div>

            {upload.job && (
              <PipelineJobPanel
                job={upload.job}
                onCancel={async () => {
                  try {
                    await fetch(`/api/pipeline/jobs/${upload.jobId}/cancel`, {
                      method: 'POST',
                    });
                  } catch { /* ignore */ }
                }}
                cancelling={false}
              />
            )}

            <div className="flex justify-end pt-1">
              <Button variant="ghost" onClick={onClose}>Close</Button>
            </div>
          </>
        )}

        {/* ── Error ────────────────────────────────────── */}
        {phase === 'error' && (
          <>
            <p className="text-sm text-danger">{upload.error}</p>
            <div className="flex justify-end pt-1">
              <Button onClick={onClose}>Close</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}