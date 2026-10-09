// server/scripts/albumaty-crawl/diagnose.js
// Diagnose why specific albumaty names don't match D1.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTISTS_FILE = join(__dirname, 'artists.json');
const TRACKS_FILE  = join(__dirname, 'tracks.json');

function unwrap(j) {
  if (Array.isArray(j) && j[0]?.results) return j[0].results;
  if (Array.isArray(j)) return j;
  if (Array.isArray(j?.results)) return j.results;
  return [];
}

function normalizeName(s) {
  if (!s) return '';
  let out = String(s);
  out = out.replace(/[\u064B-\u065F\u0670]/g, '');
  out = out.replace(/\u0640/g, '');
  out = out.replace(/[\u0622\u0623\u0625]/g, '\u0627');
  out = out.replace(/[\u0649\u0626]/g, '\u064A');
  out = out.replace(/\u0629/g, '\u0647');
  out = out.replace(/[^\p{L}\p{Nd}]+/gu, '');
  out = out.replace(/^اغني[هة]/, '');
  return out;
}

async function main() {
  const artists = unwrap(JSON.parse(await readFile(ARTISTS_FILE, 'utf8')));
  const tracks  = unwrap(JSON.parse(await readFile(TRACKS_FILE, 'utf8')));

  console.log('Artists loaded:', artists.length);
  console.log('Tracks loaded :', tracks.length);

  // Find artist 9 in both
  const a9 = artists.find(a => a.artist_id === 9);
  console.log('\nArtist 9 in artists.json:', JSON.stringify(a9));

  // Build the exact same Set the classifier builds
  const d1TrackKeys = new Set();
  for (const t of tracks) {
    const k = String(t.artist_id) + '::' + normalizeName(t.track_name);
    d1TrackKeys.add(k);
  }

  console.log('Total key set size:', d1TrackKeys.size);

  // Count keys with 9:: prefix
  const artist9Keys = [...d1TrackKeys].filter(k => k.startsWith('9::'));
  console.log('Keys starting with "9::":', artist9Keys.length);

  // Show 5 sample keys
  console.log('\nSample 9:: keys:');
  artist9Keys.slice(0, 5).forEach(k => console.log('  ', JSON.stringify(k)));

  // Check specific targets
  const targets = [
    'شايف قمر',
    'حبيبتي ملاك',
    'ما تقلقش',
    'خبر ابيض',
    'خطفوني',
    'ماليش بديل',
    'يلا',
    'قفلتي اللعبة',
    'دايما فاكر',
    '١٢ بالليل',
  ];

  console.log('\n─── Target lookups ───');
  for (const name of targets) {
    const norm = normalizeName(name);
    const key = '9::' + norm;
    const hit = d1TrackKeys.has(key);
    console.log('  ' + JSON.stringify(name) + ' → ' + JSON.stringify(norm) + '  ' + (hit ? 'FOUND' : 'MISSING'));
  }

  // Now test the exact same thing with the "اغنية X" form
  console.log('\n─── Same targets with "اغنية " prefix ───');
  for (const name of targets) {
    const prefixed = 'اغنية ' + name;
    const norm = normalizeName(prefixed);
    const key = '9::' + norm;
    const hit = d1TrackKeys.has(key);
    console.log('  ' + JSON.stringify(prefixed) + ' → ' + JSON.stringify(norm) + '  ' + (hit ? 'FOUND' : 'MISSING'));
  }

  // Print the cps for the first target
  console.log('\n─── Codepoints ───');
  const sampleD1   = 'اغنية شايف قمر';
  const sampleAB   = 'شايف قمر';
  const normD1     = normalizeName(sampleD1);
  const normAB     = normalizeName(sampleAB);
  console.log('D1:', JSON.stringify(sampleD1), '→', JSON.stringify(normD1));
  console.log('   cps:', [...normD1].map(c => c.codePointAt(0).toString(16).padStart(4, '0')).join(' '));
  console.log('AB:', JSON.stringify(sampleAB), '→', JSON.stringify(normAB));
  console.log('   cps:', [...normAB].map(c => c.codePointAt(0).toString(16).padStart(4, '0')).join(' '));
  console.log('Equal:', normD1 === normAB);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});