// admin/src/routes/Youtube/YoutubeImport.jsx
import { useCallback, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { BackLink } from '../../components/layout/BackLink';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import SegmentPicker from '../../components/domain/Youtube/SegmentPicker';
import PublishModal from '../../components/domain/Youtube/PublishModal';
import {
  computeEqualSegments,
  DEFAULT_SEGMENT_COUNT,
  DEFAULT_SKIP_FIRST_SECONDS,
} from '../../lib/Youtube/segments';

export default function YoutubeImport() {
  const [url, setUrl]             = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [videos, setVideos]       = useState([]);
  const [selected, setSelected]   = useState(new Set());
  const [crawledUrl, setCrawledUrl] = useState(null);

  // Global segment defaults
  const [skipFirst, setSkipFirst]       = useState(DEFAULT_SKIP_FIRST_SECONDS);
  const [segmentCount, setSegmentCount] = useState(DEFAULT_SEGMENT_COUNT);

  // Per-video segment overrides: { [videoId]: { segments, editorOpen } }
  const [selections, setSelections] = useState({});

  // Which video's segment editor is currently expanded (or null)
  const [openSegmentFor, setOpenSegmentFor] = useState(null);

  // Publish modal
  const [publishOpen, setPublishOpen] = useState(false);

  /* ── Crawl ──────────────────────────────────────────── */
  const handleCrawl = useCallback(async (e) => {
    e?.preventDefault?.();
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setVideos([]);
    setSelected(new Set());
    setSelections({});
    setOpenSegmentFor(null);
    setCrawledUrl(null);

    try {
      const data = await api.post('/youtube/extract-playlist', { url: trimmed });
      setVideos(data.videos ?? []);
      setCrawledUrl(trimmed);
    } catch (err) {
      setError(err.message ?? 'Failed to crawl');
    } finally {
      setLoading(false);
    }
  }, [url]);
  function seedSegmentsFor(videoId) {
    setSelections(prev => {
      if (prev[videoId]?.segments) return prev;
      const v = videos.find(x => x.videoId === videoId);
      if (!v) return prev;
      return {
        ...prev,
        [videoId]: {
          ...(prev[videoId] ?? {}),
          segments: computeEqualSegments(v.durationSec, {
            count: segmentCount,
            skipFirst,
          }),
        },
      };
    });
  }

  function toggleOne(videoId) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
        seedSegmentsFor(videoId);
      }
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(videos.map(v => v.videoId)));
    setSelections(prev => {
      const next = { ...prev };
      for (const v of videos) {
        if (!next[v.videoId]?.segments) {
          next[v.videoId] = {
            ...(next[v.videoId] ?? {}),
            segments: computeEqualSegments(v.durationSec, {
              count: segmentCount,
              skipFirst,
            }),
          };
        }
      }
      return next;
    });
  }
  function deselectAll() {
    setSelected(new Set());
  }

  const selectedCount = selected.size;
  const allSelected = videos.length > 0 && selectedCount === videos.length;

  /* ── Per-video segment defaults ────────────────────── */
  function getSegmentsFor(video) {
    if (selections[video.videoId]?.segments) {
      return selections[video.videoId].segments;
    }
    return computeEqualSegments(video.durationSec, {
      count: segmentCount,
      skipFirst,
    });
  }

  function updateSegments(videoId, segments) {
    setSelections(prev => ({
      ...prev,
      [videoId]: { ...(prev[videoId] ?? {}), segments },
    }));
  }

  /* ── Global segment controls applied to everything ── */
  function applyGlobalSegments() {
    setSelections(prev => {
      const next = { ...prev };
      for (const v of videos) {
        next[v.videoId] = {
          ...(prev[v.videoId] ?? {}),
          segments: computeEqualSegments(v.durationSec, {
            count: segmentCount,
            skipFirst,
          }),
        };
      }
      return next;
    });
  }

  /* ── Publish eligibility ───────────────────────────── */
  const publishEligible = useMemo(() => {
    if (selectedCount === 0) return false;
    for (const id of selected) {
      const v = videos.find(x => x.videoId === id);
      if (!v) continue;
      const segs = getSegmentsFor(v);
      if (segs.some(s => s.included)) return true;
    }
    return false;
  }, [selected, videos, selections, skipFirst, segmentCount]);

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="space-y-6 pb-32">
      <BackLink to="/">Home</BackLink>

      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Import from YouTube</h1>
          <p className="text-sm text-ink-muted mt-1">
            Paste a playlist or single-video URL. We&apos;ll fetch the list
            without downloading anything.
          </p>
        </div>

        <form onSubmit={handleCrawl} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 min-w-[240px]">
            <Input
              name="url"
              placeholder="https://www.youtube.com/playlist?list=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button type="submit" disabled={loading || !url.trim()}>
            {loading ? 'Crawling…' : 'Crawl'}
          </Button>
        </form>

        {crawledUrl && !loading && (
          <p className="text-xs text-ink-subtle">
            Last crawled: <span className="font-mono" dir="ltr">{crawledUrl}</span>
          </p>
        )}
      </header>

      {error && (
        <Card className="border border-red-500/30 bg-red-500/5">
          <div className="p-4 space-y-1">
            <p className="text-sm font-medium text-red-400">Crawl failed</p>
            <p className="text-xs text-ink-muted break-all" dir="ltr">{error}</p>
          </div>
        </Card>
      )}

      {videos.length > 0 && (
        <>
          {/* Global segment defaults */}
          <Card>
            <div className="p-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-ink-muted">Skip first</label>
                <input
                  type="number"
                  value={skipFirst}
                  onChange={(e) => setSkipFirst(Math.max(0, Number(e.target.value) || 0))}
                  step="1"
                  min="0"
                  className="w-20 h-9 px-2 rounded bg-surface-subtle text-ink text-sm border border-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500 tabular-nums"
                />
                <span className="text-sm text-ink-subtle">sec</span>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-ink-muted">Segments</label>
                <select
                  value={segmentCount}
                  onChange={(e) => setSegmentCount(Number(e.target.value))}
                  className="h-9 px-2 rounded bg-surface-subtle text-ink text-sm border border-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {[3, 4, 5, 6, 7].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <Button variant="secondary" size="sm" onClick={applyGlobalSegments}>
                Apply to all videos
              </Button>
            </div>
          </Card>

          {/* Selection controls */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink-muted">
                {videos.length} {videos.length === 1 ? 'video' : 'videos'} found
              </span>
              <span className="text-ink-subtle">·</span>
              <span className="text-sm text-ink-muted">
                <span className="font-medium text-ink">{selectedCount}</span> selected
              </span>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={selectAll} disabled={allSelected}>
                Select all
              </Button>
              <Button variant="secondary" size="sm" onClick={deselectAll} disabled={selectedCount === 0}>
                Deselect all
              </Button>
            </div>
          </div>

          {/* Video list */}
          <Card>
            <ul className="divide-y divide-surface-border">
              {videos.map((v) => {
                const isChecked = selected.has(v.videoId);
                const segs = getSegmentsFor(v);
                const includedCount = segs.filter(s => s.included).length;
                const isOpen = openSegmentFor === v.videoId;

                return (
                  <li key={v.videoId} className="border-b border-surface-border last:border-b-0">
                    <div
                      className={[
                        'flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer',
                        isChecked ? 'bg-brand-500/5' : 'hover:bg-surface-subtle',
                      ].join(' ')}
                      onClick={() => toggleOne(v.videoId)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(v.videoId)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 shrink-0 accent-brand-500"
                      />

                      <span className="text-xs tabular-nums text-ink-subtle shrink-0 w-8 text-end">
                        {v.index}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-ink truncate" dir="auto" title={v.title}>
                          {v.title}
                        </p>
                        {v.uploader && (
                          <p className="text-xs text-ink-subtle truncate" dir="auto">{v.uploader}</p>
                        )}
                      </div>

                      <span className="text-xs tabular-nums text-ink-subtle shrink-0">
                        {formatDuration(v.durationSec)}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenSegmentFor(isOpen ? null : v.videoId);
                        }}
                        className={[
                          'text-xs px-2 py-1 rounded border transition-colors shrink-0',
                          isOpen
                            ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                            : 'border-surface-border text-ink-muted hover:border-brand-500 hover:text-brand-500',
                        ].join(' ')}
                      >
                        Cut ({includedCount}/{segs.length})
                      </button>

                      <a
                        href={v.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-brand-500 hover:underline shrink-0"
                        title="Open on YouTube"
                      >
                        ▶
                      </a>
                    </div>

                    {/* Inline segment editor */}
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 bg-surface-subtle">
                        <SegmentPicker
                          video={v}
                          segments={segs}
                          onChange={(next) => updateSegments(v.videoId, next)}
                          skipFirst={skipFirst}
                          segmentCount={segmentCount}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Bottom bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-border p-4 flex items-center justify-between gap-4 z-10">
            <p className="text-sm text-ink-muted">
              <span className="font-medium text-ink">{selectedCount}</span>{' '}
              {selectedCount === 1 ? 'video' : 'videos'} selected
            </p>
            <Button
              onClick={() => setPublishOpen(true)}
              disabled={!publishEligible}
              title={
                publishEligible
                  ? 'Preview what would be published'
                  : 'Select at least one video with an included segment'
              }
            >
              Publish…
            </Button>
          </div>

          <PublishModal
            open={publishOpen}
            onClose={() => setPublishOpen(false)}
            videos={videos.filter(v => selected.has(v.videoId))}
            selections={selections}
            skipFirst={skipFirst}
            segmentCount={segmentCount}
          />
        </>
      )}

      {!videos.length && !loading && !error && (
        <Card>
          <div className="p-8 text-center text-sm text-ink-muted">
            No videos yet. Paste a URL above and click Crawl.
          </div>
        </Card>
      )}
    </div>
  );
}

function formatDuration(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}