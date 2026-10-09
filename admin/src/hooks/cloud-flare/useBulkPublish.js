// admin/src/hooks/cloud-flare/useBulkPublish.js
import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fetchArtistCatalogue } from './useArtistCatalogue';
import { api } from '../../lib/api';

const BATCH_SIZE = 25;
const COLLECTION_CONCURRENCY = 2;

/**
 * Runs a list of async tasks with a concurrency limit.
 * Results are returned in the input order.
 */
async function runLimited(items, limit, worker) {
  const results = new Array(items.length);
  const queue = items.map((item, idx) => ({ item, idx }));

  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (queue.length) {
        const { item, idx } = queue.shift();
        try {
          results[idx] = { ok: true, value: await worker(item, idx) };
        } catch (e) {
          results[idx] = { ok: false, error: e };
        }
      }
    }
  );
  await Promise.all(runners);
  return results;
}

/**
 * Orchestrates a bulk publish across multiple artists.
 *
 *   const flow = useBulkPublish();
 *   await flow.start(artists);            // collect phase
 *   flow.publish(clips);                  // publish phase
 *   flow.cancel();
 *   flow.reset();
 *
 * status:
 *   'idle' | 'collecting' | 'ready' | 'publishing' | 'done' | 'error'
 */
export function useBulkPublish() {
  const queryClient = useQueryClient();
  const cancelRef = useRef(false);

  const [status, setStatus] = useState('idle');
  const [collectedTracks, setCollectedTracks] = useState([]);
  const [error, setError] = useState(null);

  const [progress, setProgress] = useState({
    // Collection phase
    artistsTotal: 0,
    artistsDone: 0,
    artistsFailed: 0,
    currentArtistName: '',

    // Publish phase
    clipsTotal: 0,
    clipsDone: 0,
    succeeded: 0,
    duplicates: 0,
    failed: 0,
    currentBatch: 0,
    totalBatches: 0,
    failures: [],   // { name, position, error }
  });

  const reset = useCallback(() => {
    cancelRef.current = false;
    setStatus('idle');
    setCollectedTracks([]);
    setError(null);
    setProgress({
      artistsTotal: 0,
      artistsDone: 0,
      artistsFailed: 0,
      currentArtistName: '',
      clipsTotal: 0,
      clipsDone: 0,
      succeeded: 0,
      duplicates: 0,
      failed: 0,
      currentBatch: 0,
      totalBatches: 0,
      failures: [],
    });
  }, []);

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  /**
   * Phase 1 — collect.
   * Fetches each artist's catalogue, merges, dedupes by track id,
   * and shapes the result for PublishClipsModal.
   */
  const start = useCallback(async (artists) => {
    if (!Array.isArray(artists) || artists.length === 0) return;

    cancelRef.current = false;
    setStatus('collecting');
    setError(null);
    setCollectedTracks([]);

    setProgress(p => ({
      ...p,
      artistsTotal: artists.length,
      artistsDone: 0,
      artistsFailed: 0,
      currentArtistName: artists[0]?.name ?? '',
    }));

    const results = await runLimited(
      artists,
      COLLECTION_CONCURRENCY,
      async (artist) => {
        if (cancelRef.current) throw new Error('Cancelled');

        setProgress(p => ({
          ...p,
          currentArtistName: artist.name ?? '',
        }));

        // Ensure the slug exists. Fall back to id if not.
        const slug = artist.wp_slug ?? artist.slug ?? artist.id;
        const catalogue = await fetchArtistCatalogue(slug);

        // Attach the primary artist id (this batch's artist) so the
        // modal knows which artist to publish under for each track.
        const tracks = (catalogue.tracks ?? []).map(t => ({
          ...t,
          // The publisher's artist for this track (set once here so the
          // modal doesn't have to figure it out).
          _primaryArtistId: catalogue.artist.id,
          _albumId: t.album_id ?? null,
          _albumName: t.album_name ?? null,
        }));

        return tracks;
      }
    );

    if (cancelRef.current) {
      setStatus('idle');
      return;
    }

    // Merge all artists' tracks, dedupe by (primaryArtistId, trackId).
    // Two different artists may share a track — we keep both because
    // each is published under its own primary artist.
    const seen = new Set();
    const merged = [];
    let artistsFailed = 0;

    for (const r of results) {
      if (!r.ok) {
        artistsFailed += 1;
        continue;
      }
      for (const t of r.value) {
        const key = `${t._primaryArtistId}::${t.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(t);
      }
    }

    setCollectedTracks(merged);
    setProgress(p => ({
      ...p,
      artistsDone: artists.length - artistsFailed,
      artistsFailed,
      clipsTotal: merged.length,
    }));

    if (merged.length === 0) {
      setError(new Error('No tracks found across the selected artists.'));
      setStatus('error');
      return;
    }

    setStatus('ready');
  }, []);

  /**
   * Phase 2 — publish.
   * Slices clips into batches, POSTs them sequentially.
   * Duplicates (409 / DUPLICATE_CLIP) are counted separately from failures.
   */
  const publish = useCallback(async (clips) => {
    if (!Array.isArray(clips) || clips.length === 0) return;

    cancelRef.current = false;
    setStatus('publishing');

    const totalBatches = Math.ceil(clips.length / BATCH_SIZE);
    setProgress(p => ({
      ...p,
      clipsTotal: clips.length,
      clipsDone: 0,
      succeeded: 0,
      duplicates: 0,
      failed: 0,
      currentBatch: 0,
      totalBatches,
      failures: [],
    }));

    let succeeded = 0;
    let duplicates = 0;
    let failed = 0;
    const failures = [];

    for (let i = 0; i < clips.length; i += BATCH_SIZE) {
      if (cancelRef.current) break;

      const batch = clips.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

      try {
        const response = await api.post(
          '/cloudflare/tracks/publish-clips',
          { clips: batch }
        );

        // The Express batch endpoint returns per-rendition results.
        // We count successes, duplicates, and failures.
        for (const r of response.results ?? []) {
          if (r.ok) succeeded += 1;
          else if (r.code === 'DUPLICATE_CLIP' || /already exists/i.test(r.error ?? '')) {
            duplicates += 1;
          } else {
            failed += 1;
            failures.push({
              name: r.name ?? '?',
              position: r.position ?? '?',
              error: r.error ?? 'unknown',
            });
          }
        }
      } catch (e) {
        // Whole batch failed (network, 500, etc.)
        failed += batch.length;
        failures.push({
          name: `batch ${batchNumber}`,
          position: 'batch',
          error: e.message,
        });
      }

      setProgress(p => ({
        ...p,
        clipsDone: Math.min(i + BATCH_SIZE, clips.length),
        succeeded,
        duplicates,
        failed,
        currentBatch: batchNumber,
        failures: [...failures],
      }));
    }

    // Invalidate the published lists so the UI refreshes
    queryClient.invalidateQueries({ queryKey: ['cloudflare-tracks'] });
    queryClient.invalidateQueries({ queryKey: ['cloudflare-artists'] });

    setStatus('done');
  }, [queryClient]);

  return {
    status,
    progress,
    collectedTracks,
    error,
    start,
    publish,
    cancel,
    reset,
  };
}