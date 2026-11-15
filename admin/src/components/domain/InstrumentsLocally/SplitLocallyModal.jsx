// admin/src/components/domain/InstrumentsLocally/SplitLocallyModal.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../../Modal/Modal';
import { Button } from '../../ui/Button';
import { Spinner } from '../../ui/Spinner';
import { PipelineJobPanel } from '../PipelineJobPanel';
import { useInstrumentsLocallyBatch } from '../../../hooks/cloud-flare/InstrumentsLocally/useInstrumentsLocallyBatch';
import { useInstrumentsLocallyStatus } from '../../../hooks/cloud-flare/InstrumentsLocally/useInstrumentsLocallyStatus';
import { fetchArtistCatalogue } from '../../../hooks/cloud-flare/useArtistCatalogue';

export function SplitLocallyModal({ open, onClose, artists }) {
  const batch  = useInstrumentsLocallyBatch();
  const status = useInstrumentsLocallyStatus();
  const startedRef = useRef(false);

  const [collecting, setCollecting]           = useState(false);
  const [collectedTracks, setCollectedTracks] = useState([]);
  const [collectProgress, setCollectProgress] = useState({ done: 0, total: 0, current: '' });
  const [selectedIds, setSelectedIds]         = useState(() => new Set());

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function collect() {
      setCollecting(true);
      setCollectedTracks([]);
      setSelectedIds(new Set());
      setCollectProgress({ done: 0, total: artists.length, current: '' });

      // Fetch local status (state: ready | stale) once per artist.
      const localByKey = new Map();  // `${artistId}::${trackId}` → { state }
      try {
        const loaded = await status.load(artists);
        if (cancelled) return;
        for (const t of loaded) {
          localByKey.set(`${t.artistId}::${t.trackId}`, t);
        }
      } catch (e) {
        console.warn('[instruments-locally] status failed:', e.message);
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
            const key = `${a.id}::${t.id}`;
            const local = localByKey.get(key);
            const state =
              !local                    ? 'new'    :
              local.state === 'ready'   ? 'ready'  :
                                          'stale';
            all.push({
              artistId: a.id,
              artistName: a.name,
              trackId: t.id,
              trackName: t.name,
              albumName: t.album_name ?? null,
              src: t.src,
              duration: t.duration ?? null,
              state,
            });
          }
        } catch (e) {
          console.warn(`[instruments-locally] artist "${a.name}" failed:`, e.message);
        }
      }

      if (cancelled) return;
      setCollectedTracks(all);
      // Default-select new + stale.
      setSelectedIds(new Set(all.filter(t => t.state !== 'ready').map(t => t.trackId)));
      setCollectProgress({ done: artists.length, total: artists.length, current: '' });
      setCollecting(false);
    }

    collect();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, artists]);

  const grouped = useMemo(() => groupByArtist(collectedTracks), [collectedTracks]);
  const selectedTracks = useMemo(
    () => collectedTracks.filter(t => selectedIds.has(t.trackId)),
    [collectedTracks, selectedIds],
  );
  const counts = useMemo(() => collectedTracks.reduce(
    (acc, t) => { acc[t.state] = (acc[t.state] ?? 0) + 1; return acc; },
    { new: 0, ready: 0, stale: 0 },
  ), [collectedTracks]);

  if (!open) return null;

  const phase =
    collecting      ? 'collecting' :
    batch.starting  ? 'starting'   :
    batch.error     ? 'error'      :
    batch.jobId     ? 'running'    :
                      'confirm';

  function toggleOne(trackId) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(collectedTracks.filter(t => t.state !== 'ready').map(t => t.trackId)));
  }
  function deselectAll() { setSelectedIds(new Set()); }

  function handleStart() {
    if (startedRef.current) return;
    if (selectedTracks.length === 0) return;
    startedRef.current = true;
    batch.start({
      tracks: selectedTracks.map(t => ({
        artistId:   t.artistId,
        artistName: t.artistName,
        trackId:    t.trackId,
        trackName:  t.trackName,
        albumName:  t.albumName,
        src:        t.src,
      })),
    });
  }

  return (
    <Modal open onClose={onClose} title="Split 30s locally (no-vocals)" size="2xl">
      <div className="space-y-4 py-2">

        {phase === 'collecting' && (
          <>
            <div className="flex items-center gap-3">
              <Spinner size="md" className="text-brand-500 shrink-0" />
              <div>
                <p className="text-sm text-ink">
                  Fetching tracks for <span className="font-medium">{collectProgress.total}</span>{' '}
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

        {phase === 'confirm' && (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-ink">
                <span className="font-medium">{collectedTracks.length}</span> total
                {' · '}
                <span className="text-brand-400 font-medium">{counts.new}</span> new
                {' · '}
                <span className="text-emerald-400 font-medium">{counts.ready}</span> ready
                {' · '}
                <span className="text-yellow-400 font-medium">{counts.stale}</span> stale
                {' · '}
                <span className="font-medium">{selectedIds.size}</span> selected
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={selectAll}>
                  Select all (new + stale)
                </Button>
                <Button variant="secondary" size="sm" onClick={deselectAll} disabled={selectedIds.size === 0}>
                  Deselect all
                </Button>
              </div>
            </div>

            <div className="rounded border border-surface-border bg-surface max-h-96 overflow-y-auto">
              <ul className="divide-y divide-surface-border">
                {grouped.map(({ artist, tracks }) => {
                  const artistSelected = tracks.filter(t => selectedIds.has(t.trackId)).length;
                  return (
                    <li key={artist.id} className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-ink" dir="auto">
                          {artist.name}{' '}
                          <span className="text-xs text-ink-subtle">({artistSelected}/{tracks.length})</span>
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedIds(prev => {
                                const next = new Set(prev);
                                for (const t of tracks) if (t.state !== 'ready') next.add(t.trackId);
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
                                    t.state === 'ready'
                                      ? 'text-ink-subtle'
                                      : checked ? 'text-ink' : 'text-ink-subtle',
                                  ].join(' ')}
                                  dir="auto"
                                  title={t.trackName}
                                >
                                  {t.trackName}
                                </span>
                                {t.state === 'ready' && (
                                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 shrink-0">ready</span>
                                )}
                                {t.state === 'stale' && (
                                  <span className="text-[10px] uppercase tracking-wider text-yellow-400 shrink-0">stale</span>
                                )}
                                {t.state === 'new' && (
                                  <span className="text-[10px] uppercase tracking-wider text-brand-400 shrink-0">new</span>
                                )}
                                {t.albumName && (
                                  <span className="text-ink-subtle shrink-0 truncate max-w-[40%]" dir="auto" title={t.albumName}>
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

            <div className="rounded-md border border-surface-border bg-surface-subtle p-3 text-xs text-ink-muted space-y-1">
              <p>
                <span className="text-brand-400 font-medium">new</span> — never generated
                {' · '}
                <span className="text-emerald-400 font-medium">ready</span> — full-nv + all parts present
                {' · '}
                <span className="text-yellow-400 font-medium">stale</span> — meta.json exists but files missing / schema mismatch
              </p>
              <p>Per track: download full song → remove vocals (demucs) → save full-nv.mp3 → slice into 30s parts → keep local only.</p>
              <p className="text-yellow-400">
                Roughly 3–5 min per track (CPU). Runs in the background on the server.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={handleStart} disabled={selectedIds.size === 0}>
                Start ({selectedIds.size})
              </Button>
            </div>
          </>
        )}

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