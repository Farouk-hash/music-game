// server/scripts/albumaty-crawl/publish-job.js
/**
 * Child process for an albumaty publish job.
 *
 * Payload:
 *   {
 *     artists: [
 *       {
 *         albumatyId,
 *         name,
 *         image,
 *         genre_ids,           // optional, defaults to [45]
 *         tracks: [{ albumatySongId, name, album_name }]
 *       }
 *     ]
 *   }
 *
 * Per-artist failures do not abort the job. Cancellation by SIGKILL.
 */

import { ensureArtist, publishOneTrack } from '../../lib/albumaty-publish.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const TRACK_DELAY_MS = 400;

function emit(payload) {
  process.stdout.write(JSON.stringify(payload) + '\n');
}

function log(msg) {
  process.stdout.write(String(msg) + '\n');
}

async function main() {
  const raw = process.env.ALBUMATY_JOB_PAYLOAD;
  if (!raw) {
    emit({ stage: 'failed', status: 'failed', error: 'ALBUMATY_JOB_PAYLOAD not set' });
    process.exit(1);
  }

  let payload;
  try { payload = JSON.parse(raw); }
  catch (e) {
    emit({ stage: 'failed', status: 'failed', error: `payload JSON parse: ${e.message}` });
    process.exit(1);
  }

  const artists = Array.isArray(payload.artists) ? payload.artists : [];
  const artistsTotal = artists.length;
  const tracksTotal = artists.reduce((sum, a) => sum + a.tracks.length, 0);

  log(`Albumaty publish — ${artistsTotal} artists, ${tracksTotal} tracks total`);

  const summary = {
    artistsTotal,
    tracksTotal,
    artistsSucceeded: 0,
    artistsFailed: 0,
    tracksSucceeded: 0,
    tracksFailed: 0,
    artistResults: [],
  };

  let done = 0;

  for (let ai = 0; ai < artists.length; ai++) {
    const artist = artists[ai];
    const artistResult = {
      albumatyId: artist.albumatyId,
      name: artist.name,
      d1ArtistId: null,
      artistCreated: null,
      genreIds: artist.genre_ids ?? [45],
      tracksTotal: artist.tracks.length,
      tracksSucceeded: 0,
      tracksFailed: 0,
      failures: [],
    };

    log('');
    log(`[Artist ${ai + 1}/${artistsTotal}] ${artist.name} (albumaty ${artist.albumatyId})`);
    log(`  genres: [${(artist.genre_ids ?? [45]).join(', ')}]`);

    emit({
      stage: 'ensure-artist',
      artistIndex: ai,
      artistsTotal,
      artistsDone: ai,
      done,
      total: tracksTotal,
    });

    let d1ArtistId;
    try {
      const result = await ensureArtist({
        albumatyId: artist.albumatyId,
        name: artist.name,
        image: artist.image,
        genre_ids: artist.genre_ids,
      });
      d1ArtistId = result.id;
      artistResult.d1ArtistId = d1ArtistId;
      artistResult.artistCreated = result.created;
      log(`  → D1 artist_id = ${d1ArtistId}${result.created ? ' (new)' : ' (existing)'}`);
    } catch (e) {
      log(`  ✗ ensureArtist failed: ${e.message}`);
      artistResult.failures.push({ stage: 'ensure-artist', error: e.message });
      artistResult.tracksFailed = artist.tracks.length;
      summary.artistsFailed++;
      summary.tracksFailed += artist.tracks.length;
      summary.artistResults.push(artistResult);
      done += artist.tracks.length;
      emit({
        stage: 'artist-failed',
        artistIndex: ai,
        artistsTotal,
        artistsDone: ai + 1,
        done,
        total: tracksTotal,
      });
      continue;
    }

    for (let ti = 0; ti < artist.tracks.length; ti++) {
      const t = artist.tracks[ti];
      const albumLabel = t.album_name ? ` [${t.album_name}]` : '';
      log(`  [${ti + 1}/${artist.tracks.length}] ${t.name}${albumLabel}`);

      try {
        const result = await publishOneTrack({
          albumatySongId: t.albumatySongId,
          name: t.name,
          artistId: d1ArtistId,
          albumName: t.album_name ?? null,
          source: 'music',
        });

        if (result.ok) {
          artistResult.tracksSucceeded++;
          summary.tracksSucceeded++;
          log(`    ✓ published`);
        } else {
          artistResult.tracksFailed++;
          summary.tracksFailed++;
          const errMsg = result.errors.map(e => e.error).join('; ');
          artistResult.failures.push({ song: t.name, error: errMsg });
          log(`    ✗ ${errMsg}`);
        }
      } catch (e) {
        artistResult.tracksFailed++;
        summary.tracksFailed++;
        artistResult.failures.push({ song: t.name, error: e.message });
        log(`    ✗ ${e.message}`);
      }

      done++;
      emit({
        stage: 'publish-tracks',
        artistIndex: ai,
        artistsTotal,
        artistsDone: ai,
        done,
        total: tracksTotal,
      });
      await sleep(TRACK_DELAY_MS);
    }

    if (artistResult.tracksFailed === 0) summary.artistsSucceeded++;
    else summary.artistsFailed++;

    summary.artistResults.push(artistResult);

    emit({
      stage: 'artist-done',
      artistIndex: ai,
      artistsTotal,
      artistsDone: ai + 1,
      done,
      total: tracksTotal,
    });
  }

  log('');
  log('════════════════════════════════════');
  log(`Artists total      : ${summary.artistsTotal}`);
  log(`  ✓ fully published: ${summary.artistsSucceeded}`);
  log(`  ⚠ partial/failed : ${summary.artistsFailed}`);
  log(`Tracks total       : ${summary.tracksTotal}`);
  log(`  ✓ succeeded      : ${summary.tracksSucceeded}`);
  log(`  ✗ failed         : ${summary.tracksFailed}`);
  log('════════════════════════════════════');

  emit({ stage: 'done', status: 'done', summary });
}

main().catch(err => {
  emit({ stage: 'failed', status: 'failed', error: err.message });
  process.exit(1);
});