import { Modal } from '../../../components/Modal/Modal';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { PipelineJobPanel } from '../../../components/domain/PipelineJobPanel';
import { useInstrumentalBatch } from '../../../hooks/cloud-flare/Instrumental/useInstrumentalPatch';
import { useInstrumentalStatus } from '../../../hooks/cloud-flare/Instrumental/useInstrumentalStatus';
import { fetchArtistCatalogue } from '../../../hooks/cloud-flare/useArtistCatalogue';
import { useEffect, useRef, useState } from 'react';
import { useMemo } from 'react';

export function InstrumentalBatchModal({ open, onClose, artists }) {
  const batch = useInstrumentalBatch();
  const status = useInstrumentalStatus();
  const startedRef = useRef(false);

  // ── Collection phase ────────────────────────────────
  const [collecting, setCollecting] = useState(false);
  const [collectedTracks, setCollectedTracks] = useState([]);
  const [collectProgress, setCollectProgress] = useState({ done: 0, total: 0, current: '' });

  // ── Selection ───────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // Fetch tracks when the modal opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function collect() {
      setCollecting(true);
      setCollectedTracks([]);
      setSelectedIds(new Set());
      setCollectProgress({ done: 0, total: artists.length, current: '' });

      // ── NEW: fetch local status (uploaded / ready) ──
      const localByKey = new Map();   // `${artistId}::${trackName}` → { uploaded, segments }
      try {
        const loaded = await status.load(artists);
        if (cancelled) return;
        for (const t of loaded) {
          localByKey.set(`${t.artistId}::${t.trackName}`, t);
        }
      } catch (e) {
        console.warn('[instrumental] local status failed:', e.message);
      }

      if (cancelled) return;

      const all = [];
      for (let i = 0; i < artists.length; i++) {
        const a = artists[i];
        if (cancelled) return;
        setCollectProgress({ done: i, total: artists.length, current: a.name });

        try {
          const slug = a.wp_slug ?? a.slug ?? a.id;
          const cat = await fetchArtistCatalogue(slug);
          const tracks = (cat.tracks ?? []).filter(t => t.src);
          for (const t of tracks) {
            // ── NEW: derive state from local status ──
            const key = `${a.id}::${t.name}`;
            const local = localByKey.get(key);
            let state;
            if (!local)               state = 'new';
            else if (local.uploaded)  state = 'uploaded';
            else                      state = 'ready';

            all.push({
              artistId: a.id,
              artistName: a.name,
              trackId: t.id,
              trackName: t.name,
              albumName: t.album_name ?? null,
              src: t.src,
              duration: t.duration ?? null,
              state,   // ── NEW ──
            });
          }
        } catch (e) {
          console.warn(`[instrumental] artist "${a.name}" failed:`, e.message);
        }
      }

      if (cancelled) return;
      setCollectedTracks(all);

      // ── NEW: default-select only un-uploaded ──
      setSelectedIds(new Set(
        all.filter(t => t.state === 'new').map(t => t.trackId)
      ));

      setCollectProgress({ done: artists.length, total: artists.length, current: '' });
      setCollecting(false);
    }

    collect();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, artists]);

  /* ── Selection helpers ────────────────────────────── */
  function toggleOne(trackId) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }

  // ── CHANGED: skip uploaded ──
  function selectAll() {
    setSelectedIds(new Set(
      collectedTracks.filter(t => t.state === 'new').map(t => t.trackId)
    ));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  const grouped = useMemo(() => groupByArtist(collectedTracks), [collectedTracks]);

  const selectedCount = selectedIds.size;

  const selectedTracks = useMemo(
    () => collectedTracks.filter(t => selectedIds.has(t.trackId)),
    [collectedTracks, selectedIds],
  );

  // ── NEW: counts per state ──
  const counts = useMemo(() => collectedTracks.reduce(
    (acc, t) => { acc[t.state] = (acc[t.state] ?? 0) + 1; return acc; },
    { new: 0, ready: 0, uploaded: 0 },
  ), [collectedTracks]);

  if (!open) return null;

  const phase =
    collecting       ? 'collecting' :
    batch.starting   ? 'starting'   :
    batch.error      ? 'error'      :
    batch.jobId      ? 'running'    :
                       'confirm';

  function handleStart() {
    if (startedRef.current) return;
    if (selectedTracks.length === 0) return;
    startedRef.current = true;
    batch.start({ tracks: selectedTracks });
  }

  return (
    <Modal open onClose={onClose} title="Publish instruments only" size="2xl">
      <div className="space-y-4 py-2">

        {/* ── Collecting ──────────────────────────────── */}
        {phase === 'collecting' && (
          <>
            <div className="flex items-center gap-3">
              <Spinner size="md" className="text-brand-500 shrink-0" />
              <div>
                <p className="text-sm text-ink">
                  Fetching tracks for{' '}
                  <span className="font-medium">{collectProgress.total}</span>{' '}
                  {collectProgress.total === 1 ? 'artist' : 'artists'}…
                </p>
                {collectProgress.current && (
                  <p className="text-xs text-ink-muted mt-1" dir="auto">
                    Currently: {collectProgress.current}
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-ink-subtle">
              Artists fetched: {collectProgress.done} / {collectProgress.total}
            </p>
            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
            </div>
          </>
        )}

        {/* ── Confirm + selection ─────────────────────── */}
        {phase === 'confirm' && (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* ── CHANGED: show per-state counts ── */}
              <p className="text-sm text-ink">
                <span className="font-medium">{collectedTracks.length}</span> total
                {' · '}
                <span className="text-brand-400 font-medium">{counts.new}</span> new
                {' · '}
                <span className="text-emerald-400 font-medium">{counts.ready}</span> ready
                {' · '}
                <span className="text-yellow-400 font-medium">{counts.uploaded}</span> uploaded
                {' · '}
                <span className="font-medium">{selectedCount}</span> selected
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={selectAll}
                  disabled={selectedCount === counts.new}
                >
                  Select all
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={deselectAll}
                  disabled={selectedCount === 0}
                >
                  Deselect all
                </Button>
              </div>
            </div>

            {/* Grouped, selectable track list */}
            <div className="rounded border border-surface-border bg-surface max-h-96 overflow-y-auto">
              <ul className="divide-y divide-surface-border">
                {grouped.map(({ artist, tracks }) => {
                  const artistSelected = tracks.filter(t => selectedIds.has(t.trackId)).length;
                  return (
                    <li key={artist.id} className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-ink" dir="auto">
                          {artist.name}{' '}
                          <span className="text-xs text-ink-subtle">
                            ({artistSelected}/{tracks.length})
                          </span>
                        </p>
                        <div className="flex gap-2">
                          {/* ── CHANGED: skip uploaded ── */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedIds(prev => {
                                const next = new Set(prev);
                                for (const t of tracks) {
                                    if (t.state === 'new') next.add(t.trackId);

                                }
                                return next;
                              });
                            }}
                            className="text-xs text-brand-500 hover:underline"
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedIds(prev => {
                                const next = new Set(prev);
                                for (const t of tracks) next.delete(t.trackId);
                                return next;
                              });
                            }}
                            className="text-xs text-ink-muted hover:text-ink"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <ul className="text-xs space-y-1 ps-1">
                        {tracks.map(t => {
                          const checked = selectedIds.has(t.trackId);
                          return (
                            <li key={t.trackId}>
                              <label className="flex items-center gap-2 cursor-pointer hover:bg-surface-subtle rounded px-1 py-0.5">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleOne(t.trackId)}
                                  className="w-3.5 h-3.5 accent-brand-500"
                                />
                                <span
                                  className={[
                                    'truncate flex-1',
                                    // ── CHANGED: dim uploaded ──
                                    t.state === 'uploaded'
                                      ? 'text-ink-subtle'
                                      : checked ? 'text-ink' : 'text-ink-subtle',
                                  ].join(' ')}
                                  dir="auto"
                                  title={t.trackName}
                                >
                                  {t.trackName}
                                </span>

                                {/* ── NEW: state badges ── */}
                                {t.state === 'uploaded' && (
                                  <span className="text-[10px] uppercase tracking-wider text-yellow-400 shrink-0">
                                    uploaded
                                  </span>
                                )}
                                {t.state === 'ready' && (
                                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 shrink-0">
                                    ready
                                  </span>
                                )}
                                {t.state === 'new' && (
                                  <span className="text-[10px] uppercase tracking-wider text-brand-400 shrink-0">
                                    new
                                  </span>
                                )}

                                {t.albumName && (
                                  <span
                                    className="text-ink-subtle shrink-0 truncate max-w-[40%]"
                                    dir="auto"
                                    title={t.albumName}
                                  >
                                    {t.albumName}
                                  </span>
                                )}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Info banner */}
            <div className="rounded-md border border-surface-border bg-surface-subtle p-3 text-xs text-ink-muted space-y-1">
              <p>
                <span className="text-brand-400 font-medium">new</span> — not generated yet
                {' · '}
                <span className="text-emerald-400 font-medium">ready</span> — MP3s on disk, not uploaded
                {' · '}
                <span className="text-yellow-400 font-medium">uploaded</span> — already in R2 + D1
              </p>
              <p>Per track: download audio → remove vocals (demucs) → cut segments → save MP3s.</p>
              <p className="text-yellow-400">
                Estimated: ~{selectedCount} min for {selectedCount} {selectedCount === 1 ? 'track' : 'tracks'}.
                This runs on the local server.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={handleStart} disabled={selectedCount === 0}>
                Start ({selectedCount})
              </Button>
            </div>
          </>
        )}

        {/* ── Starting / Running / Error ──────────────── */}
        {phase === 'starting' && (
          <div className="flex items-center gap-3 py-4">
            <Spinner size="md" className="text-brand-500 shrink-0" />
            <p className="text-sm text-ink">Starting job…</p>
          </div>
        )}

        {phase === 'running' && (
          <>
            <div className="flex items-center gap-3">
              <Spinner size="md" className="text-brand-500 shrink-0" />
              <div>
                <p className="text-sm text-ink">
                  Processing <span className="font-medium">{batch.count ?? selectedTracks.length}</span>{' '}
                  {(batch.count ?? selectedTracks.length) === 1 ? 'track' : 'tracks'}…
                </p>
                <p className="text-xs text-ink-muted mt-0.5">
                  You can close this window — the job runs in the background.
                </p>
              </div>
            </div>
            {batch.job && (
              <PipelineJobPanel
                job={batch.job}
                onCancel={async () => {
                  try {
                    await fetch(`/api/pipeline/jobs/${batch.jobId}/cancel`, { method: 'POST' });
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

        {phase === 'error' && (
          <>
            <p className="text-sm text-danger">{batch.error}</p>
            <div className="flex justify-end pt-1">
              <Button onClick={onClose}>Close</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function groupByArtist(tracks) {
  const map = new Map();
  for (const t of tracks) {
    if (!map.has(t.artistId)) {
      map.set(t.artistId, { artist: { id: t.artistId, name: t.artistName }, tracks: [] });
    }
    map.get(t.artistId).tracks.push(t);
  }
  return [...map.values()];
}