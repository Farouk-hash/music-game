// admin/src/routes/Youtube/PublishModal.jsx
import { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../Modal/Modal';
import { fmtSec } from '../../../lib/Youtube/segments';

const HARDCODED_ARTISTS = [
  { id: 1,  name: 'شريف الجسر' },
  { id: 2,  name: 'عمرو دياب' },
  { id: 3,  name: 'شيرين' },
  { id: 4,  name: 'محمد حماقي' },
  { id: 5,  name: 'تامر حسني' },
  { id: 6,  name: 'أم كلثوم' },
  { id: 7,  name: 'حسين الجسمي' },
  { id: 8,  name: 'إليسا' },
  { id: 9,  name: 'سميرة سعيد' },
  { id: 10, name: 'دونيا سمير غانم' },
];

/**
 * Publish modal with multi-artist grouping.
 *
 * State model:
 *   groups = [
 *     { id: 'g1', artistId: '', videoIds: Set }
 *   ]
 *
 * A video can only live in one group. When checked in group A, it's
 * automatically unchecked in every other group. On open, group 1 is
 * pre-seeded with all selected videos so the user only needs to pick
 * an artist and confirm — or split them into more groups.
 *
 * Unassigned videos are allowed: they simply don't get published.
 */
export default function PublishModal({
  open,
  onClose,
  videos,          // selected videos only
  selections,      // { [videoId]: { segments } }
  skipFirst,
  segmentCount,
}) {
  const [groups, setGroups] = useState(() => [seedFirstGroup(videos)]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  /* ── Group helpers ─────────────────────────────────── */
  function seedFirstGroup(vids) {
    return {
      id: 'g1',
      artistId: '',
      videoIds: new Set(vids.map(v => v.videoId)),
    };
  }

  function makeEmptyGroup(id) {
    return { id, artistId: '', videoIds: new Set() };
  }

  function resetAndClose() {
    setGroups([seedFirstGroup(videos)]);
    setSubmitted(false);
    setError(null);
    onClose();
  }

  function addGroup() {
    setGroups(prev => [...prev, makeEmptyGroup(`g${Date.now()}`)]);
  }

  function removeGroup(groupId) {
    setGroups(prev => prev.filter(g => g.id !== groupId));
  }

  function setGroupArtist(groupId, artistId) {
    setGroups(prev =>
      prev.map(g => (g.id === groupId ? { ...g, artistId } : g))
    );
  }

  function toggleVideoInGroup(groupId, videoId) {
    setGroups(prev =>
      prev.map(g => {
        const next = new Set(g.videoIds);
        if (g.id === groupId) {
          if (next.has(videoId)) next.delete(videoId);
          else next.add(videoId);
        } else {
          // A video lives in exactly one group.
          next.delete(videoId);
        }
        return { ...g, videoIds: next };
      })
    );
  }

  function selectAllInGroup(groupId) {
    setGroups(prev =>
      prev.map(g => {
        if (g.id !== groupId) {
          // Remove every video from other groups.
          const next = new Set(g.videoIds);
          for (const v of videos) next.delete(v.videoId);
          return { ...g, videoIds: next };
        }
        return { ...g, videoIds: new Set(videos.map(v => v.videoId)) };
      })
    );
  }

  function clearGroup(groupId) {
    setGroups(prev =>
      prev.map(g =>
        g.id === groupId ? { ...g, videoIds: new Set() } : g
      )
    );
  }

  /* ── Derived totals ────────────────────────────────── */
  const totals = useMemo(() => {
    let assignedVideos = 0;
    let totalClips = 0;
    for (const g of groups) {
      for (const vid of g.videoIds) {
        assignedVideos++;
        const segs = selections[vid]?.segments ?? [];
        totalClips += segs.filter(s => s.included).length;
      }
    }
    const nonEmptyGroups = groups.filter(g => g.videoIds.size > 0).length;
    const unassigned = videos.length - assignedVideos;
    return { assignedVideos, totalClips, nonEmptyGroups, unassigned };
  }, [groups, selections, videos.length]);

  const canConfirm = useMemo(() => {
    if (totals.assignedVideos === 0) return false;
    for (const g of groups) {
      if (g.videoIds.size > 0 && !g.artistId) return false;
    }
    return true;
  }, [groups, totals]);

  function handleConfirm() {
    if (totals.assignedVideos === 0) {
      setError('Assign at least one video to an artist.');
      return;
    }
    for (const g of groups) {
      if (g.videoIds.size > 0 && !g.artistId) {
        setError('Every group with videos needs an artist.');
        return;
      }
    }
    setError(null);
    setSubmitted(true);
  }

  /* ── Preview payload ───────────────────────────────── */
  const previewPayload = useMemo(() => {
    return groups
      .filter(g => g.videoIds.size > 0)
      .map(g => {
        const artist = HARDCODED_ARTISTS.find(
          a => String(a.id) === String(g.artistId)
        );
        return {
          artist: artist ? { id: artist.id, name: artist.name } : null,
          videos: [...g.videoIds].map(vid => {
            const v = videos.find(x => x.videoId === vid);
            const segs = (selections[vid]?.segments ?? []).filter(s => s.included);
            return {
              videoId: vid,
              title: v?.title,
              url: v?.url,
              segments: segs.map(s => ({
                index: s.index,
                startSec: s.startSec,
                endSec: s.endSec,
              })),
            };
          }),
        };
      });
  }, [groups, videos, selections]);

  return (
    <Modal open={open} onClose={resetAndClose} size="2xl">
      <div className="p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-ink">
            {submitted ? 'Publish preview' : 'Group videos by artist'}
          </h2>
          <p className="text-sm text-ink-muted mt-1">
            {submitted
              ? 'Nothing was saved — this is a preview of what would be published.'
              : `Assign each of the ${videos.length} selected videos to an artist. A video belongs to exactly one artist.`}
          </p>
        </div>

        {!submitted && (
          <>
            {/* Hint */}
            <div className="rounded-md border border-surface-border bg-surface-subtle p-3 text-xs text-ink-muted">
              All {videos.length} selected {videos.length === 1 ? 'video is' : 'videos are'} pre-assigned to group 1.
              Uncheck any you don&apos;t want, or add another group and move videos into it.
            </div>

            {/* Groups */}
            <div className="space-y-4">
              {groups.map((g, gi) => (
                <div
                  key={g.id}
                  className="rounded-lg border border-surface-border bg-surface-subtle p-4 space-y-3"
                >
                  {/* Header */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs tabular-nums text-ink-subtle shrink-0 w-10">
                      #{gi + 1}
                    </span>
                    <select
                      value={g.artistId}
                      onChange={(e) => setGroupArtist(g.id, e.target.value)}
                      className="flex-1 h-9 px-3 rounded bg-surface text-ink text-sm border border-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">— Pick an artist —</option>
                      {HARDCODED_ARTISTS.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <span className="text-xs text-ink-subtle shrink-0">
                      {g.videoIds.size} video{g.videoIds.size === 1 ? '' : 's'}
                    </span>
                    {groups.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeGroup(g.id)}
                        className="text-xs text-ink-muted hover:text-red-400 px-2"
                        title="Remove this group"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Video checklist */}
                  <div className="rounded border border-surface-border bg-surface max-h-[240px] overflow-y-auto">
                    <ul className="divide-y divide-surface-border">
                      {videos.map(v => {
                        const checked = g.videoIds.has(v.videoId);
                        const inOtherGroup = groups.some(
                          other => other.id !== g.id && other.videoIds.has(v.videoId)
                        );
                        const segs = selections[v.videoId]?.segments ?? [];
                        const includedCount = segs.filter(s => s.included).length;

                        return (
                          <li key={v.videoId}>
                            <label
                              className={[
                                'flex items-center gap-2 px-3 py-2 text-xs cursor-pointer',
                                inOtherGroup
                                  ? 'opacity-40 cursor-not-allowed'
                                  : 'hover:bg-surface-subtle',
                              ].join(' ')}
                              title={inOtherGroup ? 'Already assigned to another artist' : undefined}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={inOtherGroup}
                                onChange={() => toggleVideoInGroup(g.id, v.videoId)}
                                className="w-3.5 h-3.5 accent-brand-500"
                              />
                              <span className="flex-1 truncate text-ink" dir="auto">
                                {v.index}. {v.title}
                              </span>
                              <span className="text-ink-subtle shrink-0 tabular-nums">
                                {includedCount}/{segs.length}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => selectAllInGroup(g.id)}
                      title="Move every video into this group"
                    >
                      Select all
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => clearGroup(g.id)}
                      disabled={g.videoIds.size === 0}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="secondary" onClick={addGroup}>
              + Add artist group
            </Button>

            {/* Summary */}
            <div className="rounded-md border border-surface-border bg-surface-subtle p-4 space-y-1">
              <p className="text-sm font-medium text-ink">Summary</p>
              <ul className="text-xs text-ink-muted space-y-1">
                <li>
                  Videos assigned:{' '}
                  <span className="text-ink">{totals.assignedVideos}</span> / {videos.length}
                </li>
                {totals.unassigned > 0 && (
                  <li className="text-yellow-400">
                    {totals.unassigned} video{totals.unassigned === 1 ? '' : 's'} will be skipped
                  </li>
                )}
                <li>
                  Groups with videos:{' '}
                  <span className="text-ink">{totals.nonEmptyGroups}</span>
                </li>
                <li>
                  Total clips to publish:{' '}
                  <span className="text-ink">{totals.totalClips}</span>
                </li>
                <li>
                  Skip first: <span className="text-ink">{skipFirst}s</span> · Segments/video:{' '}
                  <span className="text-ink">{segmentCount}</span>
                </li>
              </ul>
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={resetAndClose}>Cancel</Button>
              <Button onClick={handleConfirm} disabled={!canConfirm}>
                Confirm
              </Button>
            </div>
          </>
        )}

        {submitted && (
          <>
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-4 space-y-1">
              <p className="text-sm font-medium text-emerald-400">
                ✓ Ready to publish (preview only)
              </p>
              <p className="text-xs text-ink-muted">
                {totals.assignedVideos} videos → {totals.nonEmptyGroups} artists →{' '}
                {totals.totalClips} clips
                {totals.unassigned > 0 && ` · ${totals.unassigned} skipped`}
              </p>
            </div>

            <div className="space-y-4">
              {previewPayload.map((group, gi) => (
                <div
                  key={gi}
                  className="rounded-md border border-surface-border bg-surface-subtle p-4 space-y-2"
                >
                  <p className="text-sm font-semibold text-ink">
                    {group.artist?.name ?? '(no artist)'}{' '}
                    <span className="text-xs text-ink-subtle">
                      (id {group.artist?.id})
                    </span>
                  </p>
                  <ul className="text-xs space-y-2">
                    {group.videos.map(v => (
                      <li key={v.videoId} className="space-y-0.5">
                        <p className="text-ink" dir="auto">{v.title}</p>
                        <p className="text-ink-subtle break-all" dir="ltr">{v.url}</p>
                        <ul className="ps-3 text-ink-muted" dir="ltr">
                          {v.segments.map(s => (
                            <li key={s.index}>
                              Seg {s.index + 1}: {fmtSec(s.startSec)}–{fmtSec(s.endSec)} ({s.startSec.toFixed(1)}s → {s.endSec.toFixed(1)}s)
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setSubmitted(false)}>Back</Button>
              <Button onClick={resetAndClose}>Close</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}