#!/usr/bin/env node
/**
 * Compare lyrics from two sources (lyrics.nu vs matb3aa) and produce
 * a single lyrics-final.json with the winner for each track.
 *
 * Rules:
 *   1. Discard matb3aa entries with charCount < 100 (placeholders).
 *   2. Keep all lyrics.nu entries (no length filter).
 *   3. If only one source has lyrics → that one wins.
 *   4. If both have lyrics → longest wins; tie → matb3aa.
 *   5. If neither has lyrics → track marked no-lyrics.
 *
 * Reads:
 *   ../lyrics-scrapping/lyrics-bodies.json
 *   ../matb3aa-lyrics/lyrics-bodies.json
 *
 * Writes:
 *   lyrics-final.json
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LYRICS_NU_FILE = join(__dirname, '..', 'lyrics-scrapping', 'lyrics-bodies.json');
const MATB3AA_FILE   = join(__dirname, '..', 'matb3aa-lyrics', 'lyrics-bodies.json');
const OUTPUT_FILE    = join(__dirname, 'lyrics-final.json');

const MATB3AA_MIN_CHARS = 100;

/* ═══════════════════════════════════════════════════════════ */

function key(artistId, trackName) {
  return `${artistId}::${trackName}`;
}

function isValidMatb3aa(t) {
  if (!t || !t.lyrics) return false;
  return (t.charCount ?? t.lyrics.length) >= MATB3AA_MIN_CHARS;
}

function isValidLyricsNu(t) {
  return !!(t && t.lyrics);
}

function countLines(text) {
  if (!text) return 0;
  return text.split('\n').filter(l => l.trim()).length;
}

/* ═══════════════════════════════════════════════════════════
   Main
   ═══════════════════════════════════════════════════════════ */

async function main() {
  console.log('Reading lyrics-scrapping/lyrics-bodies.json ...');
  const lnRaw = JSON.parse(await readFile(LYRICS_NU_FILE, 'utf8'));
  const lnTracks = lnRaw.tracks ?? [];
  console.log(`  ${lnTracks.length} entries from lyrics.nu`);

  console.log('Reading matb3aa-lyrics/lyrics-bodies.json ...');
  const mbRaw = JSON.parse(await readFile(MATB3AA_FILE, 'utf8'));
  const mbTracks = mbRaw.tracks ?? [];
  console.log(`  ${mbTracks.length} entries from matb3aa`);

  // Index both by (artistId, trackName)
  const lnMap = new Map();
  for (const t of lnTracks) {
    if (!isValidLyricsNu(t)) continue;
    lnMap.set(key(t.artistId, t.trackName), t);
  }
  const mbMap = new Map();
  for (const t of mbTracks) {
    if (!isValidMatb3aa(t)) continue;
    mbMap.set(key(t.artistId, t.trackName), t);
  }

  console.log(`\nValid lyrics.nu entries    : ${lnMap.size}`);
  console.log(`Valid matb3aa entries      : ${mbMap.size}`);

  // Union of all keys — every track we've tried
  const allKeys = new Set([...lnMap.keys(), ...mbMap.keys()]);
  console.log(`Total unique tracks        : ${allKeys.size}\n`);

  const summary = {
    tracksTotal: 0,
    fromLyricsNuOnly: 0,
    fromMatb3aaOnly: 0,
    fromBothLongest: 0,
    fromBothTieMatb3aa: 0,
    discardedMatb3aaPlaceholder: 0,
    noLyrics: 0,
    coverage: 0,
  };

  const results = [];

  for (const k of allKeys) {
    const ln = lnMap.get(k) ?? null;
    const mb = mbMap.get(k) ?? null;

    const base = {
      artistId: ln?.artistId ?? mb?.artistId ?? null,
      artistName: ln?.artistName ?? mb?.artistName ?? null,
      trackName: ln?.trackName ?? mb?.trackName ?? null,
    };

    // Track whether matb3aa had a lyrics entry we discarded for being too short
    const mbRawEntry = mbTracks.find(
      t => t.artistId === base.artistId && t.trackName === base.trackName && t.lyrics
    );
    const mbDiscarded = !!(mbRawEntry && (mbRawEntry.charCount ?? mbRawEntry.lyrics.length) < MATB3AA_MIN_CHARS);

    let winner = null;
    let source = null;
    let sourceDetail = null;

    if (ln && mb) {
      // Both present — longest wins, tie → matb3aa
      const lnLen = ln.charCount ?? ln.lyrics.length;
      const mbLen = mb.charCount ?? mb.lyrics.length;
      if (mbLen > lnLen) {
        winner = mb;
        source = 'matb3aa';
        sourceDetail = `longest-matb3aa(${mbLen}vs${lnLen})`;
        summary.fromBothLongest++;
      } else if (lnLen > mbLen) {
        winner = ln;
        source = 'lyrics-nu';
        sourceDetail = `longest-lyrics-nu(${lnLen}vs${mbLen})`;
        summary.fromBothLongest++;
      } else {
        winner = mb;
        source = 'matb3aa';
        sourceDetail = 'tie-matb3aa';
        summary.fromBothTieMatb3aa++;
      }
    } else if (ln) {
      winner = ln;
      source = 'lyrics-nu';
      sourceDetail = mbDiscarded ? 'matb3aa-placeholder-lyrics-nu-wins' : 'lyrics-nu-only';
      summary.fromLyricsNuOnly++;
      if (mbDiscarded) summary.discardedMatb3aaPlaceholder++;
    } else if (mb) {
      winner = mb;
      source = 'matb3aa';
      sourceDetail = 'matb3aa-only';
      summary.fromMatb3aaOnly++;
    } else {
      // Neither has usable lyrics
      results.push({
        ...base,
        lyrics: null,
        source: null,
        sourceDetail: mbDiscarded ? 'both-but-matb3aa-placeholder' : 'no-lyrics-either',
        bytes: 0,
        charCount: 0,
        lineCount: 0,
        matb3aaId: mbRawEntry?.matb3aaId ?? null,
        songUrl: ln?.songUrl ?? null,
        isSynced: false,
      });
      summary.noLyrics++;
      continue;
    }

    const lyrics = winner.lyrics;
    results.push({
      ...base,
      lyrics,
      source,
      sourceDetail,
      bytes: winner.bytes ?? Buffer.byteLength(lyrics, 'utf8'),
      charCount: winner.charCount ?? lyrics.length,
      lineCount: winner.lineCount ?? countLines(lyrics),
      matb3aaId: winner.matb3aaId ?? mbRawEntry?.matb3aaId ?? null,
      songUrl: winner.songUrl ?? null,
      isSynced: !!winner.isSynced,
    });
  }

  summary.tracksTotal = results.length;
  const withLyrics = results.filter(r => r.lyrics).length;
  summary.coverage = summary.tracksTotal > 0
    ? Math.round((withLyrics / summary.tracksTotal) * 1000) / 10
    : 0;

  // Sort: artistId asc, then trackName
  results.sort((a, b) => {
    if (a.artistId !== b.artistId) return (a.artistId ?? 0) - (b.artistId ?? 0);
    return String(a.trackName ?? '').localeCompare(String(b.trackName ?? ''), 'ar');
  });

  const output = {
    generatedAt: new Date().toISOString(),
    summary,
    tracks: results,
  };

  await writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

  console.log('════════════ Summary ════════════');
  console.log(`Tracks total                  : ${summary.tracksTotal}`);
  console.log(`  ✓ lyrics.nu only            : ${summary.fromLyricsNuOnly}`);
  console.log(`  ✓ matb3aa only              : ${summary.fromMatb3aaOnly}`);
  console.log(`  ✓ both — longest won        : ${summary.fromBothLongest}`);
  console.log(`  ✓ both — tie → matb3aa      : ${summary.fromBothTieMatb3aa}`);
  console.log(`  ✗ no lyrics (either source) : ${summary.noLyrics}`);
  if (summary.discardedMatb3aaPlaceholder > 0) {
    console.log(`    (${summary.discardedMatb3aaPlaceholder} matb3aa placeholders < ${MATB3AA_MIN_CHARS} chars discarded)`);
  }
  console.log(`\nCoverage                      : ${summary.coverage}%`);
  console.log(`Wrote ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});