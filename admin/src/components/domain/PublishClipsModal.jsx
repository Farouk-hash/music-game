// src/components/domain/PublishClipsModal.jsx
import { useState, useMemo, useEffect } from 'react';
import { Modal } from '../Modal/Modal';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { EmptyState } from '../ui/EmptyState';
import { computeFeaturedArtists } from '../../lib/featuredArtists';
const POSITIONS = ['start', 'middle', 'end', 'custom'];
const DEFAULT_DURATION = 10;
const MAX_DURATION = 120;

/* ═══════════════════════════════════════════════════════════
   Duration probing hook
   ═══════════════════════════════════════════════════════════ */

function useTrackDurations(tracks) {
  const [durations, setDurations] = useState({});

  useEffect(() => {
    const needsProbe = tracks.filter(t => {
      if (t.duration && t.duration > 0) return false;
      if (durations[t.id] != null) return false;
      return t.src instanceof File || typeof t.src === 'string';
    });
    if (needsProbe.length === 0) return;

    let cancelled = false;
    const audio = new Audio();
    audio.preload = 'metadata';
    const objectUrls = [];

    (async () => {
      for (const track of needsProbe) {
        if (cancelled) break;

        let src;
        if (track.src instanceof File) {
          src = URL.createObjectURL(track.src);
          objectUrls.push(src);
        } else {
          src = track.src;
        }

        await new Promise((resolve) => {
          audio.onloadedmetadata = () => {
            if (!cancelled && Number.isFinite(audio.duration)) {
              setDurations(prev => ({ ...prev, [track.id]: audio.duration }));
            }
            resolve();
          };
          audio.onerror = () => resolve();
          audio.src = src;
        });
      }
    })();

    return () => {
      cancelled = true;
      audio.src = '';
      objectUrls.forEach(u => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks]);

  const probing = tracks.some(t => {
    if (t.duration && t.duration > 0) return false;
    if (durations[t.id] != null) return false;
    return t.src instanceof File || typeof t.src === 'string';
  });

  return { durations, probing };
}

/* ═══════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════ */

function makePositionConfig() {
  return {
    enabled: false,
    duration: DEFAULT_DURATION,
    forward: true,
    reversed: false,
    startSec: 0,
  };
}

function makeRow(track) {
  return {
    trackId: track.id,
    positions: {
      start:  { ...makePositionConfig(), enabled: true },
      middle: makePositionConfig(),
      end:    makePositionConfig(),
      custom: makePositionConfig(),
    },
  };
}

function computeStartSec(position, cfg, trackDurationMs) {
  const trackSec = trackDurationMs / 1000;
  if (position === 'start')  return 0;
  if (position === 'middle') return Math.max(0, (trackSec - cfg.duration) / 2);
  if (position === 'end')    return Math.max(0, trackSec - cfg.duration);
  if (position === 'custom') return cfg.startSec;
  return 0;
}

function formatDuration(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Count how many renditions a single position config produces. */
function renditionsIn(cfg) {
  if (!cfg.enabled) return 0;
  return (cfg.forward ? 1 : 0) + (cfg.reversed ? 1 : 0);
}

/* ═══════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════ */

export function PublishClipsModal({
  open,
  onClose,
  tracks,
  artistId,
  onPublish,                  // batch mode: (clips) => void
  publishing,
  result,
  error,
  onReset,
  // ── Upload mode ──────────────────────────────────────
  uploadFiles = null,         // Map<trackId, File> | null
  onPublishUpload = null,     // ({ files, positions }) => void
}) {
  const { durations, probing } = useTrackDurations(tracks);

  const enrichedTracks = useMemo(
    () => tracks.map(t => ({
      ...t,
      duration: durations[t.id] != null
        ? Math.round(durations[t.id] * 1000)
        : (t.duration ?? 0),
    })),
    [tracks, durations]
  );

  const [rows, setRows] = useState(() => tracks.map(makeRow));

  const [applyDefaults, setApplyDefaults] = useState({
    start:  { ...makePositionConfig(), enabled: true },
    middle: makePositionConfig(),
    end:    makePositionConfig(),
    custom: makePositionConfig(),
  });

  const totalClips = useMemo(
    () => rows.reduce(
      (sum, r) => sum + POSITIONS.reduce((s, p) => s + renditionsIn(r.positions[p]), 0),
      0
    ),
    [rows]
  );

  // ── Row mutations ────────────────────────────────────────
  function patchRow(trackId, position, patch) {
    setRows(prev => prev.map(r => {
      if (r.trackId !== trackId) return r;
      return {
        ...r,
        positions: {
          ...r.positions,
          [position]: { ...r.positions[position], ...patch },
        },
      };
    }));
  }

  function toggleRowPosition(trackId, position) {
    setRows(prev => prev.map(r => {
      if (r.trackId !== trackId) return r;
      const next = !r.positions[position].enabled;
      // When enabling a position, ensure at least one rendition is on.
      const cfg = r.positions[position];
      const patch = { enabled: next };
      if (next && !cfg.forward && !cfg.reversed) {
        patch.forward = true;
      }
      return {
        ...r,
        positions: {
          ...r.positions,
          [position]: { ...cfg, ...patch },
        },
      };
    }));
  }

  function setRowDuration(trackId, position, duration) {
    const d = Math.min(MAX_DURATION, Math.max(1, Number(duration) || 1));
    patchRow(trackId, position, { duration: d });
  }

  function setRowStartSec(trackId, startSec) {
    const s = Math.max(0, Number(startSec) || 0);
    patchRow(trackId, 'custom', { startSec: s });
  }

  function toggleRowForward(trackId, position) {
    setRows(prev => prev.map(r => {
      if (r.trackId !== trackId) return r;
      const cfg = r.positions[position];
      const nextForward = !cfg.forward;
      // Don't let both renditions go off while the position is enabled.
      if (!nextForward && !cfg.reversed) return r;
      return {
        ...r,
        positions: {
          ...r.positions,
          [position]: { ...cfg, forward: nextForward },
        },
      };
    }));
  }

  function toggleRowReversed(trackId, position) {
    setRows(prev => prev.map(r => {
      if (r.trackId !== trackId) return r;
      const cfg = r.positions[position];
      const nextReversed = !cfg.reversed;
      if (!nextReversed && !cfg.forward) return r;
      return {
        ...r,
        positions: {
          ...r.positions,
          [position]: { ...cfg, reversed: nextReversed },
        },
      };
    }));
  }

  // ── Apply-to-all mutations ───────────────────────────────
  function toggleApplyPosition(position) {
    setApplyDefaults(prev => {
      const cfg = prev[position];
      const next = !cfg.enabled;
      const patch = { enabled: next };
      if (next && !cfg.forward && !cfg.reversed) patch.forward = true;
      return { ...prev, [position]: { ...cfg, ...patch } };
    });
  }

  function setApplyDuration(position, duration) {
    const d = Math.min(MAX_DURATION, Math.max(1, Number(duration) || 1));
    setApplyDefaults(prev => ({
      ...prev,
      [position]: { ...prev[position], duration: d },
    }));
  }

  function setApplyStartSec(startSec) {
    const s = Math.max(0, Number(startSec) || 0);
    setApplyDefaults(prev => ({
      ...prev,
      custom: { ...prev.custom, startSec: s },
    }));
  }

  function toggleApplyForward(position) {
    setApplyDefaults(prev => {
      const cfg = prev[position];
      const nextForward = !cfg.forward;
      if (!nextForward && !cfg.reversed) return prev;
      return { ...prev, [position]: { ...cfg, forward: nextForward } };
    });
  }

  function toggleApplyReversed(position) {
    setApplyDefaults(prev => {
      const cfg = prev[position];
      const nextReversed = !cfg.reversed;
      if (!nextReversed && !cfg.forward) return prev;
      return { ...prev, [position]: { ...cfg, reversed: nextReversed } };
    });
  }

  function applyToAll() {
    setRows(prev => prev.map(r => ({
      ...r,
      positions: {
        start:  { ...r.positions.start,  ...applyDefaults.start },
        middle: { ...r.positions.middle, ...applyDefaults.middle },
        end:    { ...r.positions.end,    ...applyDefaults.end },
        custom: { ...r.positions.custom, ...applyDefaults.custom },
      },
    })));
  }

  // ── Publish ──────────────────────────────────────────────
  function handlePublish() {
    // ══════════════════════════════════════════════════════
    // UPLOAD MODE
    // ══════════════════════════════════════════════════════
    if (uploadFiles && onPublishUpload) {
      const list = Array.from(uploadFiles.values());
      if (list.length === 0) return;

      // Shared config from the first row. Bulk mode relies on "Apply to all".
      const row = rows[0];
      if (!row) return;

      const positions = POSITIONS
        .filter(p => row.positions[p].enabled)
        .map(p => ({
          position: p,
          enabled: true,
          duration: row.positions[p].duration,
          forward: row.positions[p].forward,
          reversed: row.positions[p].reversed,
        }))
        .filter(cfg => cfg.forward || cfg.reversed);

      if (positions.length === 0) return;

      onPublishUpload({ files: list, positions });
      return;
    }

    // ══════════════════════════════════════════════════════
    // BATCH MODE (matb3aa / mp3quran)
    // ══════════════════════════════════════════════════════
    const clips = [];

    for (const row of rows) {
      const track = enrichedTracks.find(t => t.id === row.trackId);
      if (!track) continue;

      const trackDurationMs = track.duration ?? 0;
      const trackDurationSec = Math.round(trackDurationMs / 1000);

      for (const position of POSITIONS) {
        const cfg = row.positions[position];
        if (!cfg.enabled) continue;

        const forward = cfg.forward !== false;
        const reversed = cfg.reversed === true;
        if (!forward && !reversed) continue;

        // Custom-position room check
        if (position === 'custom' && trackDurationSec > 0) {
          const startSec = cfg.startSec;
          if (startSec + cfg.duration > trackDurationSec) {
            clips.push({
              _invalid: true,
              reason: `Custom start ${startSec}s + duration ${cfg.duration}s exceeds track length (${trackDurationSec}s)`,
              trackId: track.id,
              name: track.name,
              position,
            });
            continue;
          }
        }

        const startSec = computeStartSec(position, cfg, trackDurationMs);
        
        const resolvedArtistId = track._primaryArtistId ?? track.artistId ?? artistId;

        clips.push({
          trackId: track.id,
          sourceSrc: track.src,
          name: track.displayName || track.name,
          artistId: resolvedArtistId,   // per-track for bulk, prop for single
          position,
          startSec: Math.round(startSec),
          seconds: cfg.duration,
          forward,
          reversed,
          album_name: track._albumName ?? track.album_name ?? null,
          featured_artists: computeFeaturedArtists(track, resolvedArtistId),
        });
      
      }
    }

    // Drop any invalid entries before sending. They were only added to the
    // list so the modal could surface them; the server should never see them.
    const valid = clips.filter(c => !c._invalid);
    if (valid.length === 0) return;
    onPublish?.(valid);
  }

  function handleClose() {
    if (publishing) return;
    onClose?.();
    if (result) onReset?.();
  }

  const footer = result ? (
    <div className="flex items-center justify-end">
      <Button variant="primary" onClick={handleClose}>Done</Button>
    </div>
  ) : (
    <div className="flex items-center justify-end gap-2">
      <Button variant="ghost" onClick={handleClose} disabled={publishing}>
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={handlePublish}
        disabled={publishing || totalClips === 0}
        loading={publishing}
      >
        {publishing
          ? 'Publishing…'
          : `Publish ${totalClips} clip${totalClips === 1 ? '' : 's'}`}
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={result ? 'Publish complete' : 'Publish Clips'}
      size="xl"
      footer={footer}
    >
      {result && (
        <div className="space-y-4">
          <div className={`p-4 rounded-lg border ${
            result.failed === 0
              ? 'border-emerald-500/40 bg-emerald-500/5'
              : 'border-warning/40 bg-warning-subtle'
          }`}>
            <p className="font-medium">
              {result.succeeded} of {result.total} clips published successfully
            </p>
            <p className="text-xs text-ink-muted mt-1">
              Took {(result.elapsed / 1000).toFixed(1)} seconds
            </p>
          </div>

          <ul className="space-y-2">
            {result.results?.map((r, i) => (
              <li
                key={i}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  r.ok ? 'bg-surface-subtle' : 'bg-danger-subtle'
                }`}
              >
                <span className={r.ok ? 'text-emerald-400' : 'text-danger'}>
                  {r.ok ? '✓' : '✕'}
                </span>
                {r.rendition && (
                  <span
                    className={
                      r.rendition === 'reversed'
                        ? 'text-brand-400 text-xs font-medium shrink-0'
                        : 'text-ink-subtle text-xs font-medium shrink-0'
                    }
                  >
                    {r.rendition === 'reversed' ? '↺ rev' : '→ fwd'}
                  </span>
                )}
                <span className="flex-1 truncate">
                  {r.name ?? r.position ?? `Clip ${i + 1}`}
                </span>
                <span className="text-xs text-ink-muted shrink-0">
                  {r.ok
                    ? `${r.position ?? ''}${r.size_bytes ? ` — ${(r.size_bytes / 1024).toFixed(0)} KB` : ''}`
                    : r.error}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!result && (
        <div className="space-y-4">
          {error && (
            <EmptyState icon="⚠️" title="Publish failed" description={error} className="py-4" />
          )}

          {probing && (
            <div className="p-2 rounded bg-brand-500/10 text-brand-400 text-xs text-center">
              Loading audio durations…
            </div>
          )}

          {/* ── Apply to all ───────────────────────────── */}
          <div className="p-3 rounded-lg bg-surface-subtle border border-surface-border">
            <p className="text-xs font-medium text-ink mb-3">Apply to all</p>

            <div className="space-y-2">
              {POSITIONS.map(p => {
                const cfg = applyDefaults[p];
                const atLeastOne = cfg.forward || cfg.reversed;

                return (
                  <div key={p} className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-1.5 cursor-pointer w-24 shrink-0">
                      <Checkbox
                        checked={cfg.enabled}
                        onChange={() => toggleApplyPosition(p)}
                        size="sm"
                      />
                      <span className="text-xs text-ink capitalize">{p}</span>
                    </label>

                    {p === 'custom' && cfg.enabled && (
                      <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                        From
                        <input
                          type="number"
                          min="0"
                          value={cfg.startSec}
                          onChange={e => setApplyStartSec(e.target.value)}
                          className="w-16 h-7 px-2 rounded bg-surface text-ink text-xs border border-surface-border"
                        />
                        s
                      </label>
                    )}

                    <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                      <Checkbox
                        checked={cfg.forward}
                        onChange={() => toggleApplyForward(p)}
                        disabled={!cfg.enabled || (cfg.forward && !cfg.reversed)}
                        size="sm"
                      />
                      Fwd
                    </label>

                    <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                      <Checkbox
                        checked={cfg.reversed}
                        onChange={() => toggleApplyReversed(p)}
                        disabled={!cfg.enabled || (cfg.reversed && !cfg.forward)}
                        size="sm"
                      />
                      Rev
                    </label>

                    <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                      Duration
                      <input
                        type="number"
                        min="1"
                        max={MAX_DURATION}
                        value={cfg.duration}
                        onChange={e => setApplyDuration(p, e.target.value)}
                        disabled={!cfg.enabled}
                        className="w-16 h-7 px-2 rounded bg-surface text-ink text-xs border border-surface-border disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      s
                    </label>

                    {cfg.enabled && !atLeastOne && (
                      <span className="text-xs text-warning">pick fwd or rev</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="secondary" onClick={applyToAll}>
                Apply to all tracks
              </Button>
            </div>
          </div>

          {/* ── Per-track rows ─────────────────────────── */}
          <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {rows.map(row => {
              const track = enrichedTracks.find(t => t.id === row.trackId);
              if (!track) return null;

              const trackDurationMs = track.duration ?? 0;
              const trackDurationSec = Math.round(trackDurationMs / 1000);
              const hasDuration = trackDurationMs > 0;

              return (
                <li
                  key={row.trackId}
                  className="p-3 rounded-lg border border-surface-border bg-surface-muted"
                >
                  <div className="flex items-baseline justify-between gap-2 mb-3">
                    <p
                      className="text-sm font-medium text-ink truncate"
                      title={track.displayName || track.name}
                    >
                      {track.displayName || track.name}
                    </p>
                    <span className="text-xs text-ink-subtle shrink-0 tabular-nums">
                      {hasDuration ? formatDuration(trackDurationSec) : '—'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {POSITIONS.map(p => {
                      const cfg = row.positions[p];
                      const requiresDuration = p === 'middle' || p === 'end';
                      const durationMissing = requiresDuration && !hasDuration;
                      const disabled = durationMissing;
                      const atLeastOne = cfg.forward || cfg.reversed;

                      return (
                        <div key={p} className="flex items-center gap-3 flex-wrap">
                          <label
                            className={`flex items-center gap-1.5 w-20 shrink-0 ${
                              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                            }`}
                          >
                            <Checkbox
                              checked={cfg.enabled && !disabled}
                              onChange={() =>
                                !disabled && toggleRowPosition(row.trackId, p)
                              }
                              disabled={disabled}
                              size="sm"
                            />
                            <span className="text-xs text-ink capitalize">{p}</span>
                          </label>

                          {p === 'custom' && cfg.enabled && (
                            <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                              From
                              <input
                                type="number"
                                min="0"
                                max={
                                  hasDuration
                                    ? Math.max(0, trackDurationSec - cfg.duration)
                                    : undefined
                                }
                                value={cfg.startSec}
                                onChange={e =>
                                  setRowStartSec(row.trackId, e.target.value)
                                }
                                className="w-14 h-7 px-2 rounded bg-surface text-ink text-xs border border-surface-border"
                              />
                              s
                            </label>
                          )}

                          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                            <Checkbox
                              checked={cfg.forward}
                              onChange={() => toggleRowForward(row.trackId, p)}
                              disabled={
                                !cfg.enabled ||
                                disabled ||
                                (cfg.forward && !cfg.reversed)
                              }
                              size="sm"
                            />
                            Fwd
                          </label>

                          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                            <Checkbox
                              checked={cfg.reversed}
                              onChange={() => toggleRowReversed(row.trackId, p)}
                              disabled={
                                !cfg.enabled ||
                                disabled ||
                                (cfg.reversed && !cfg.forward)
                              }
                              size="sm"
                            />
                            Rev
                          </label>

                          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                            Duration
                            <input
                              type="number"
                              min="1"
                              max={MAX_DURATION}
                              value={cfg.duration}
                              onChange={e =>
                                setRowDuration(row.trackId, p, e.target.value)
                              }
                              disabled={!cfg.enabled || disabled}
                              className="w-14 h-7 px-2 rounded bg-surface text-ink text-xs border border-surface-border disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            s
                          </label>

                          {p !== 'custom' && cfg.enabled && hasDuration && (
                            <span className="text-xs text-ink-subtle tabular-nums">
                              starts at{' '}
                              {Math.round(
                                computeStartSec(p, cfg, trackDurationMs)
                              )}
                              s
                            </span>
                          )}

                          {cfg.enabled && !atLeastOne && (
                            <span className="text-xs text-warning">
                              pick fwd or rev
                            </span>
                          )}

                          {durationMissing && (
                            <span className="text-xs text-ink-subtle">
                              duration unknown
                            </span>
                          )}

                          {p === 'custom' &&
                            cfg.enabled &&
                            hasDuration &&
                            cfg.startSec + cfg.duration > trackDurationSec && (
                              <span className="text-xs text-warning">
                                exceeds track length
                              </span>
                            )}
                        </div>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="text-xs text-ink-subtle text-center">
            Total clips to publish:{' '}
            <span className="text-ink font-medium">{totalClips}</span>
          </p>
        </div>
      )}
    </Modal>
  );
}