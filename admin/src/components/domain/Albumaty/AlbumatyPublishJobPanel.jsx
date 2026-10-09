// admin/src/components/domain/AlbumatyPublishJobPanel.jsx
import { useState, useEffect } from 'react';
import { Button } from '../../ui/Button';

const STAGE_LABELS = {
  'ensure-artist':  'Ensuring artists in D1',
  'publish-tracks': 'Publishing tracks',
  'artist-done':    'Artist complete',
  'artist-failed':  'Artist failed',
  done:             'Done',
  failed:           'Failed',
};

function useElapsedSeconds(startedAt, active) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000))
  );

  useEffect(() => {
    if (!active) return;
    const tick = () => {
      setElapsed(
        Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000))
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, active]);

  return elapsed;
}

export function AlbumatyPublishJobPanel({ job, onCancel, cancelling }) {
  const isActive = job.status === 'running' || job.status === 'starting';
  const stageLabel = STAGE_LABELS[job.stage] ?? job.stage ?? 'Starting…';
  const elapsed = useElapsedSeconds(job.startedAt, isActive);

  const pct = job.progress && job.progress.total > 0
    ? Math.round((job.progress.done / job.progress.total) * 100)
    : null;

  const artistPct =
    job.progress?.artistsTotal > 0
      ? `${job.progress.artistsDone} / ${job.progress.artistsTotal} artists`
      : null;

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 ${
        job.status === 'failed'
          ? 'border-danger/40 bg-danger-subtle'
          : job.status === 'done'
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : 'border-brand-500/40 bg-brand-500/5'
      }`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">
            {isActive ? '⏳' : job.status === 'done' ? '✓' : job.status === 'cancelled' ? '⊘' : '✕'}{' '}
            {stageLabel}
          </p>
          <p className="text-xs text-ink-muted mt-1">
            {job.artistsTotal > 0 ? `${job.artistsTotal} artist${job.artistsTotal === 1 ? '' : 's'} · ` : ''}
            {job.tracksTotal} track{job.tracksTotal === 1 ? '' : 's'}
            {' · '}
            {elapsed}s elapsed
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
          <div className="flex justify-between text-xs text-ink-subtle tabular-nums">
            <span>{job.progress.done} / {job.progress.total} tracks</span>
            {artistPct && <span>{artistPct}</span>}
          </div>
        </div>
      )}

      {job.error && (
        <p className="text-xs text-danger">Error: {job.error}</p>
      )}

      {job.summary && (
        <div className="text-xs text-ink-muted grid grid-cols-2 gap-x-4 gap-y-1">
          <span>Artists total</span>
          <span className="text-ink tabular-nums">{job.summary.artistsTotal}</span>
          <span>Succeeded</span>
          <span className="text-emerald-400 tabular-nums">{job.summary.artistsSucceeded}</span>
          <span>Partial / failed</span>
          <span className={job.summary.artistsFailed > 0 ? 'text-warning tabular-nums' : 'text-ink tabular-nums'}>
            {job.summary.artistsFailed}
          </span>
          <span>Tracks total</span>
          <span className="text-ink tabular-nums">{job.summary.tracksTotal}</span>
          <span>Tracks succeeded</span>
          <span className="text-emerald-400 tabular-nums">{job.summary.tracksSucceeded}</span>
          <span>Tracks failed</span>
          <span className={job.summary.tracksFailed > 0 ? 'text-danger tabular-nums' : 'text-ink tabular-nums'}>
            {job.summary.tracksFailed}
          </span>
        </div>
      )}

      {job.log && job.log.length > 0 && isActive && (
        <details className="text-xs">
          <summary className="cursor-pointer text-ink-muted hover:text-ink">
            Show log ({job.log.length} lines)
          </summary>
          <pre className="mt-2 p-2 rounded bg-surface-subtle text-ink-subtle text-[11px] font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
            {job.log.slice(-20).join('\n')}
          </pre>
        </details>
      )}
    </div>
  );
}