#!/usr/bin/env node
/**
 * Reverse-batch orchestrator.
 *
 * Reads a JSON file listing slot IDs (from argv: --ids-file=<path>).
 * For each ID:
 *   1. Fetch the slot via the Worker (/tracks/:id)
 *   2. If it has no forward clip or already has a reversed clip → skip
 *   3. Call reverseExistingClip to produce the reversed rendition
 *   4. PUT the new r2_reversed_key back on the row
 *
 * Emits JSON progress lines (same protocol as pipeline/run.js):
 *   {"stage":"reverse","done":N,"total":M,"current":"track-name"}
 *   {"stage":"done","status":"done","summary":{...}}
 *
 * Non-JSON lines go to the log.
 */

import { readFile } from 'node:fs/promises';
import { reverseExistingClip } from '../lib/publish-clip.js';

const WORKER_BASE = process.env.CF_API_BASE
  || 'https://music-game-wrangler.abdulrahman-muhammad2090.workers.dev';

function emit(payload) { process.stdout.write(JSON.stringify(payload) + '\n'); }
function log(msg)      { process.stdout.write(String(msg) + '\n'); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchTrack(id) {
  const res = await fetch(`${WORKER_BASE}/tracks/${id}`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GET /tracks/${id} → ${res.status}: ${text.slice(0, 200)}`);
  }
  const body = await res.json();
  return body?.track ?? null;
}

async function saveReversedKey(track, newReversedKey) {
  const res = await fetch(`${WORKER_BASE}/tracks/${track.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: track.name,
      artist_id: track.artist_id,
      r2_key: track.r2_key,
      r2_reversed_key: newReversedKey,
      position: track.position,
      label: track.label ?? null,
      album_name: track.album_name ?? null,
      featured_artists: track.featured_artists ?? null,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PUT /tracks/${track.id} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find(a => a.startsWith('--ids-file='));
  if (!fileArg) {
    emit({ stage: 'failed', status: 'failed', error: 'Provide --ids-file=<path>' });
    process.exit(1);
  }

  const path = fileArg.slice('--ids-file='.length);
  let ids;
  try {
    ids = JSON.parse(await readFile(path, 'utf8'));
  } catch (e) {
    emit({ stage: 'failed', status: 'failed', error: `Cannot read ids file: ${e.message}` });
    process.exit(1);
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    emit({ stage: 'failed', status: 'failed', error: 'ids must be a non-empty array' });
    process.exit(1);
  }

  log(`Scope: ${ids.length} slot IDs`);

  let reversed = 0;
  let skipped = 0;
  let errors = 0;
  const errorSamples = [];

  emit({ stage: 'reverse', done: 0, total: ids.length });

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    let track;
    try {
      track = await fetchTrack(id);
    } catch (e) {
      errors++;
      if (errorSamples.length < 5) errorSamples.push({ id, error: e.message });
      log(`  [${id}] fetch failed: ${e.message}`);
      emit({ stage: 'reverse', done: i + 1, total: ids.length, current: `#${id}` });
      continue;
    }

    if (!track) {
      skipped++;
      emit({ stage: 'reverse', done: i + 1, total: ids.length, current: `#${id}` });
      continue;
    }

    if (!track.r2_key) {
      skipped++;
      log(`  [${id}] skipped: no forward clip`);
      emit({ stage: 'reverse', done: i + 1, total: ids.length, current: track.name });
      continue;
    }

    if (track.r2_reversed_key) {
      skipped++;
      log(`  [${id}] skipped: already reversed`);
      emit({ stage: 'reverse', done: i + 1, total: ids.length, current: track.name });
      continue;
    }

    // Parse the forward key for trackId, position, duration, source
    const m = track.r2_key.match(
      /track-([\w-]+)-([a-z]+)(?:-(\d+)s)?-(\d+)s(-rev)?\.mp3$/
    );
    if (!m) {
      errors++;
      if (errorSamples.length < 5) {
        errorSamples.push({ id, error: `Cannot parse r2_key: ${track.r2_key}` });
      }
      log(`  [${id}] bad r2_key: ${track.r2_key}`);
      emit({ stage: 'reverse', done: i + 1, total: ids.length, current: track.name });
      continue;
    }
    const parsedTrackId  = m[1];
    const parsedPosition = m[2] || track.position || 'start';
    const parsedDuration = Number(m[4]) || 10;
    const source = track.r2_key.startsWith('clips/quran/')  ? 'quran'
                 : track.r2_key.startsWith('clips/upload/') ? 'upload'
                 : 'music';

    try {
      const result = await reverseExistingClip({
        trackId: parsedTrackId,
        forwardKey: track.r2_key,
        position: parsedPosition,
        durationSec: parsedDuration,
        startSec: 0,
        source,
        onProgress: () => {},   // quiet per-clip progress
      });

      await saveReversedKey(track, result.r2_key);
      reversed++;
      log(`  [${id}] reversed ${track.name} (${track.position}) → ${result.r2_key}`);
    } catch (e) {
      errors++;
      if (errorSamples.length < 5) errorSamples.push({ id, error: e.message });
      log(`  [${id}] reverse failed: ${e.message}`);
    }

    emit({
      stage: 'reverse',
      done: i + 1,
      total: ids.length,
      current: track.name,
    });

    // Small delay to let the CPU breathe — FFmpeg is heavy.
    await sleep(100);
  }

  const summary = {
    total: ids.length,
    reversed,
    skipped,
    errors,
    errorSamples,
  };

  log('');
  log('════════════════ Summary ════════════');
  log(`Total     : ${ids.length}`);
  log(`Reversed  : ${reversed}`);
  log(`Skipped   : ${skipped}`);
  log(`Errors    : ${errors}`);

  emit({ stage: 'done', status: 'done', summary });
}

main().catch(err => {
  emit({ stage: 'failed', status: 'failed', error: err.message });
  process.exit(1);
});