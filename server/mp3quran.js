// server/mp3quran.js
import 'dotenv/config';
import { surahName } from './surahs.js';

const API_BASE = 'https://www.mp3quran.net/api/v3';
const TTL = 30 * 60 * 1000;

let recitersCache = null;
let recitersExpires = 0;

async function fetchJson(path) {
  const r = await fetch(API_BASE + path, {
    headers: { 'Accept': 'application/json' },
  });
  if (!r.ok) throw new Error(`mp3quran ${r.status} on ${path}`);
  return r.json();
}

export async function getReciters() {
  if (recitersCache && recitersExpires > Date.now()) return recitersCache;
  const data = await fetchJson('/reciters?language=ar');
  recitersCache = data.reciters ?? [];
  recitersExpires = Date.now() + TTL;
  return recitersCache;
}

export async function getReciter(id) {
  const all = await getReciters();
  return all.find(r => r.id === Number(id)) ?? null;
}

/**
 * Transform mp3quran reciter → a lean object for the RECITER LIST page.
 * No wp_slug, no image — the frontend uses /quran/:id and a letter avatar.
 */
export function reciterToCard(reciter) {
  const totalSurahs = (reciter.moshaf ?? []).reduce(
    (sum, m) => sum + (m.surah_list || '').split(',').filter(Boolean).length,
    0
  );

  return {
    id: reciter.id,
    name: reciter.name,
    letter: reciter.letter || reciter.name.charAt(0),
    moshafCount: reciter.moshaf?.length ?? 0,
    surahCount: totalSurahs,
    date: reciter.date ?? null,
  };
}

/**
 * Transform a reciter → the shape the DETAIL page needs.
 * Contains the reciter meta + every surah as a track-like object.
 */
export function reciterToDetail(reciter) {
  const moshafs = reciter.moshaf ?? [];
  const allTracks = moshafs.flatMap(m => moshafToTracks(reciter, m));

  return {
    reciter: {
      id: reciter.id,
      name: reciter.name,
      letter: reciter.letter || reciter.name.charAt(0),
      moshafCount: moshafs.length,
      surahCount: allTracks.length,
    },
    moshafs: moshafs.map(m => ({
      id: m.id,
      name: m.name,
      rewaya_id: m.rewaya_id,
      surahTotal: m.surah_total,
    })),
    surahs: allTracks,
  };
}

/**
 * Transform one moshaf into a list of surah objects.
 * Each surah has a full CDN URL, ready to stream or clip.
 */
export function moshafToTracks(reciter, moshaf) {
  const numbers = (moshaf.surah_list || '')
    .split(',')
    .map(s => Number(s.trim()))
    .filter(Number.isInteger);

  return numbers.map(num => {
    const padded = String(num).padStart(3, '0');
    return {
      id: `${reciter.id}-${moshaf.id}-${num}`,
      number: num,
      name: `${surahName(num)} — ${moshaf.name}`,                        // surah name only
      displayName: `${surahName(num)} — ${moshaf.name}`,  // for the modal
      src: `${moshaf.server}${padded}.mp3`,
      duration: 0,
      reciterId: reciter.id,
      reciterName: reciter.name,
      moshafId: moshaf.id,
      moshafName: moshaf.name,
    };
  });
}
export const mp3quran = {
  getReciters,
  getReciter,
  reciterToCard,
  reciterToDetail,
  moshafToTracks,
};