// admin/src/components/domain/PipelineJobPanel.jsx
import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';

/* Stage labels — both pipelines included. Unknown stages fall through
   to the raw stage string, so new stages are still visible in the UI. */
const STAGE_LABELS = {
  // lyrics pipeline
  dump: 'Dumping D1',
  filter: 'Filtering tracks',
  'matb3aa-search': 'Searching matb3aa',
  'matb3aa-fetch': 'Fetching matb3aa lyrics',
  'lyricsnu-match': 'Matching lyrics.nu',
  'lyricsnu-fetch': 'Fetching lyrics.nu',
  compare: 'Comparing sources',
  'bulk-insert': 'Saving to D1',

  // album-years pipeline
  'albumaty-index': 'Indexing albumaty',
  resolve: 'Resolving album years',

  // terminal
  done: 'Done',
  failed: 'Failed',

  reverse: 'Reversing clips',

};

function useElapsedSeconds(startedAt, active) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000))
  );

  useEffect(() => {
    if (!active) return;
    const tick = () => {
      setElapsed(Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, active]);

  return elapsed;
}

/* ═══════════════════════════════════════════════════════════
   Live-scrolling log. Auto-follows the tail while active;
   user scroll-up pauses following so they can inspect history.
   ═══════════════════════════════════════════════════════════ */

function JobLog({ lines, active }) {
  const ref = useRef(null);
  const [follow, setFollow] = useState(true);

  // Auto-scroll to bottom when new lines arrive and follow is on.
  useEffect(() => {
    if (!follow) return;
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lines.length, follow]);

  function handleScroll() {
    const el = ref.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    setFollow(atBottom);
  }

  if (!lines || lines.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-muted">
          Log ({lines.length} line{lines.length === 1 ? '' : 's'})
        </span>
        {!follow && active && (
          <button
            type="button"
            onClick={() => {
              setFollow(true);
              const el = ref.current;
              if (el) el.scrollTop = el.scrollHeight;
            }}
            className="text-brand-400 hover:text-brand-300"
          >
            ↓ Jump to latest
          </button>
        )}
      </div>
      <pre
        ref={ref}
        onScroll={handleScroll}
        className="p-2 rounded bg-surface-subtle text-ink-subtle text-[11px] font-mono whitespace-pre-wrap max-h-56 overflow-y-auto border border-surface-border"
      >
        {lines.join('\n')}
      </pre>
    </div>
  );
}

export function PipelineJobPanel({ job, onCancel, cancelling }) {
  const elapsed = useElapsedSeconds(
    job?.startedAt ?? new Date(0).toISOString(),
    !!(job && (job.status === 'running' || job.status === 'starting'))
  );
  if (!job) return null;

  const isActive = job.status === 'running' || job.status === 'starting';
  const stageLabel = STAGE_LABELS[job.stage] ?? job.stage ?? 'Starting…';

  const pct = job.progress && job.progress.total > 0
    ? Math.round((job.progress.done / job.progress.total) * 100)
    : null;

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${
      job.status === 'failed'
        ? 'border-danger/40 bg-danger-subtle'
        : job.status === 'done'
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : 'border-brand-500/40 bg-brand-500/5'
    }`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">
            {isActive ? '⏳' : job.status === 'done' ? '✓' : job.status === 'cancelled' ? '⊘' : '✕'}{' '}
            {stageLabel}
          </p>
          <p className="text-xs text-ink-muted mt-1">
            Scope: {job.scope}
            {job.args?.artistId ? ` · artist #${job.args.artistId}` : ''}
            {job.args?.artistIds ? ` · artists ${job.args.artistIds.join(', ')}` : ''}
            {job.scope === 'album-years' && Array.isArray(job.args?.pairs)
              ? ` · ${job.args.pairs.length} artists, ${
                  job.args.pairs.reduce((n, p) => n + (p.album_names?.length ?? 0), 0)
                } pairs`
              : ''}
            {' · '}{elapsed}s elapsed
          </p>
        </div>

        {isActive && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onCancel(job.id)}
            disabled={cancelling}
            className="text-danger hover:bg-danger/10"
          >
            {cancelling ? 'Cancelling…' : 'Cancel'}
          </Button>
        )}
      </div>

      {pct !== null && (
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-surface-subtle overflow-hidden">
            <div
              className="h-full bg-brand-500 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-ink-subtle tabular-nums text-right">
            {job.progress.done} / {job.progress.total} ({pct}%)
          </p>
        </div>
      )}

      {job.error && (
        <p className="text-xs text-danger">Error: {job.error}</p>
      )}

      {job.summary && (
        <div className="text-xs text-ink-muted grid grid-cols-2 gap-x-4 gap-y-1">
          {/* Lyrics pipeline summary */}
          {job.summary.tracksTotal     != null && (<><span>Tracks total</span><span className="text-ink tabular-nums">{job.summary.tracksTotal}</span></>)}
          {job.summary.matb3aaMatched  != null && (<><span>matb3aa matched</span><span className="text-ink tabular-nums">{job.summary.matb3aaMatched}</span></>)}
          {job.summary.lyricsNuMatched != null && (<><span>lyrics.nu matched</span><span className="text-ink tabular-nums">{job.summary.lyricsNuMatched}</span></>)}
          {job.summary.withLyrics      != null && (<><span>With lyrics</span><span className="text-ink tabular-nums">{job.summary.withLyrics}</span></>)}

          {/* Album-years pipeline summary */}
          {job.summary.artists     != null && (<><span>Artists</span><span className="text-ink tabular-nums">{job.summary.artists}</span></>)}
          {job.summary.pairsTotal  != null && (<><span>Album pairs</span><span className="text-ink tabular-nums">{job.summary.pairsTotal}</span></>)}
          {job.summary.resolved    != null && (<><span>Resolved</span><span className="text-emerald-400 tabular-nums">{job.summary.resolved}</span></>)}
          {job.summary.unresolved  != null && (<><span>Unresolved</span><span className="text-ink tabular-nums">{job.summary.unresolved}</span></>)}

          {/* Shared */}
          {job.summary.inserted != null && (<><span>Inserted</span><span className="text-emerald-400 tabular-nums">{job.summary.inserted}</span></>)}
          {job.summary.updated  != null && (<><span>Updated</span><span className="text-ink tabular-nums">{job.summary.updated}</span></>)}
          {job.summary.skipped  != null && (<><span>Skipped</span><span className="text-ink tabular-nums">{job.summary.skipped}</span></>)}
          {job.summary.errors   != null && (<><span>Errors</span><span className={job.summary.errors > 0 ? 'text-danger tabular-nums' : 'text-ink tabular-nums'}>{job.summary.errors}</span></>)}


          {/* Reverse-batch summary */}
          {job.summary.total    != null && (<><span>Total</span><span className="text-ink tabular-nums">{job.summary.total}</span></>)}
          {job.summary.reversed != null && (<><span>Reversed</span><span className="text-emerald-400 tabular-nums">{job.summary.reversed}</span></>)}
          {job.summary.skipped  != null && (<><span>Skipped</span><span className="text-ink tabular-nums">{job.summary.skipped}</span></>)}
                  
        </div>
      )}

      <JobLog lines={job.log ?? []} active={isActive} />
    </div>
  );
}