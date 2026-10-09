// server/lib/albumaty-crawl.js
/**
 * Crawl albumaty.com — artist page + album pages.
 * Returns structured data. No storage, no side effects.
 *
 * Album titles follow the pattern "<artist>  <album>  <year>", e.g.
 *   "روبي إبقى قابلني 2004"
 *   "عمرو دياب ابتدينا 2025"
 *   "مجدي طلعت تمن الغربة"        (no year)
 *
 * `cleanAlbumTitle` strips the artist prefix, the "البوم" word, and the
 * trailing year, so callers get just the album name. The raw title is
 * preserved as `nameRaw` for disambiguation.
 */

const BASE = 'https://www.albumaty.com';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'ar,en;q=0.9',
};

const DELAY_MS = 400;
const MAX_ALBUM_PAGES = 60;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchHtml(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function cleanText(s) {
  return (s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract a 4-digit year from a string that may contain Arabic-Indic
 * digits or surrounding noise (e.g. "2004" or "٢٠٠٤").
 */
function extractYearFromText(s) {
  if (!s) return null;
  const west = String(s)
    .replace(/[\u0660-\u0669]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 0x30))
    .replace(/[\u06F0-\u06F9]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 0x30));
  const m = west.match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
}

/**
 * Normalize Arabic text for comparison. Used to match artist names that
 * may be spelled with different alef / ya / ta-marbuta variants.
 */
function normalizeArabicForMatch(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFC')
    .replace(/[\u064B-\u065F\u0670]/g, '')       // diacritics
    .replace(/\u0640/g, '')                       // tatweel
    .replace(/[\u0622\u0623\u0625]/g, '\u0627')   // آ أ إ → ا
    .replace(/[\u0649\u0626]/g, '\u064A')         // ى ئ → ي
    .replace(/\u0629/g, '\u0647')                 // ة → ه
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clean an album title by stripping:
 *   1. a leading artist name (matched word by word, Arabic-normalized)
 *   2. a leading "البوم" / "ألبوم" word
 *   3. a trailing 4-digit year
 *
 *   cleanAlbumTitle("روبي إبقى قابلني 2004", "روبي")               → "إبقى قابلني"
 *   cleanAlbumTitle("عمرو دياب ابتدينا 2025", "عمرو دياب")          → "ابتدينا"
 *   cleanAlbumTitle("مجدي طلعت البوم الذكريات", "مجدي طلعت")        → "الذكريات"
 *   cleanAlbumTitle("مجدي طلعت تمن الغربة", "مجدي طلعت")            → "تمن الغربة"
 */
function cleanAlbumTitle(raw, artistName) {
  let s = (raw ?? '').trim();
  if (!s) return '';

  // 1. Strip leading artist name, word by word
  if (artistName) {
    const words = s.split(/\s+/);
    const artistWords = artistName.trim().split(/\s+/);
    let matchCount = 0;
    for (let i = 0; i < artistWords.length && i < words.length; i++) {
      if (
        normalizeArabicForMatch(words[i]) ===
        normalizeArabicForMatch(artistWords[i])
      ) {
        matchCount++;
      } else {
        break;
      }
    }
    if (matchCount === artistWords.length && matchCount > 0) {
      s = words.slice(artistWords.length).join(' ').trim();
    }
  }

  // 2. Strip "البوم" / "ألبوم" prefix
  s = s.replace(/^[اأ]لبوم\s+/, '').trim();

  // 3. Strip trailing 4-digit year
  s = s.replace(/\s+\d{4}\s*$/, '').trim();

  return s;
}

/* ═══════════════════════════════════════════════════════════
   Parsers
   ═══════════════════════════════════════════════════════════ */

function parseArtistPage(html, artistName) {
  // ── Image ──
  let image = null;
  let fallbackImage = null;
  const imgRe = /<img\s+src="(https:\/\/www\.albumaty\.com\/uploads\/(?:cdnimg|albums)\/[^"]+)"[^>]*alt="([^"]*)"/g;
  for (const m of html.matchAll(imgRe)) {
    const src = m[1];
    const alt = cleanText(m[2]);
    if (artistName && alt === artistName) { image = src; break; }
    if (!fallbackImage && src.includes('/cdnimg/')) fallbackImage = src;
  }
  if (!image) image = fallbackImage;

  // ── Albums ──
  const albums = [];
  const albumBlock = html.match(/<div class="singer-albums">([\s\S]*?)<\/ul>\s*<\/div>/);
  if (albumBlock) {
    const items = [...albumBlock[1].matchAll(
      /<li[^>]*>\s*<a href="(https:\/\/www\.albumaty\.com\/album\/(\d+)\.html)">([\s\S]*?)<\/a>\s*<\/li>/g
    )];
    for (const m of items) {
      const raw = m[3]
        .replace(/<img[^>]*>/g, '')
        .replace(/<small[^>]*>[^<]*<\/small>/g, '');
      const nameRaw = cleanText(raw).replace(/^ألبوم\s+/, '');
      albums.push({
        id: Number(m[2]),
        name: nameRaw,      // cleaned later, after artist name is known
        nameRaw,
        url: m[1],
      });
    }
  }

  // ── All songs ──
  const songs = [];
  const songBlock = html.match(/<div class="singer-songs">([\s\S]*?)<\/ul>\s*<\/div>/);
  if (songBlock) {
    const items = [...songBlock[1].matchAll(
      /<a href="(https:\/\/www\.albumaty\.com\/song\/(\d+)\.html)">([\s\S]*?)<\/a>/g
    )];
    for (const m of items) {
      songs.push({ id: Number(m[2]), name: cleanText(m[3]), url: m[1] });
    }
  }

  return { image, albums, songs };
}

function parseAlbumPage(html) {
  let albumName = null;
  const h2 = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
  if (h2) {
    const raw = h2[1].replace(/<[^>]+>/g, '');
    const cleaned = cleanText(raw)
      .replace(/^اغاني\s+/, '')
      .replace(/^البوم\s+/, '')
      .replace(/كاملة\s*$/, '')
      .trim();
    if (cleaned) albumName = cleaned;
  }

  const songs = [];
  const songMatches = [...html.matchAll(
    /<a href="(https:\/\/www\.albumaty\.com\/song\/(\d+)\.html)">([\s\S]*?)<\/a>/g
  )];
  for (const m of songMatches) {
    songs.push({ id: Number(m[2]), name: cleanText(m[3]), url: m[1] });
  }

  return { albumName, songs };
}

function parseSongPage(html) {
  const m = html.match(/https?:\/\/serv\d+\.albumaty\.com\/[^\s"'<>]+\.mp3/);
  if (m) return m[0];
  const m2 = html.match(/https?:\/\/[^\s"'<>]+\.mp3/);
  return m2 ? m2[0] : null;
}

/* ═══════════════════════════════════════════════════════════
   Public API
   ═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   Public API
   ═══════════════════════════════════════════════════════════ */

// Category pages to crawl for the singer list.
// Each page is a top-level catalogue (arabic, old, foreign, etc.)
// and they all use the same `country-singers` block structure.
const SINGER_CATEGORIES = [
  { id: 1, url: `${BASE}/cat/1.html` },   // اغاني عربية
  { id: 2, url: `${BASE}/cat/2.html` },   // اغاني قديمة - زمن الفن الجميل
  { id: 3, url: `${BASE}/cat/3.html` },   // (verify what this one is)
];

/**
 * Fetch the albumaty singer list by crawling several category pages
 * and merging the results.
 *
 * Deduplicates by singer id. If the same singer appears on multiple
 * categories, the entry from the lower category id wins (they usually
 * all have the same name anyway).
 *
 * Returns an array of { id, name, url, categories: number[] } sorted
 * alphabetically by Arabic name.
 */
export async function fetchSingers(onProgress = () => {}) {
  const byId = new Map(); // id → singer
  const categoriesById = new Map(); // id → Set of category ids

  for (let i = 0; i < SINGER_CATEGORIES.length; i++) {
    const cat = SINGER_CATEGORIES[i];
    onProgress({
      stage: 'fetch-category',
      done: i,
      total: SINGER_CATEGORIES.length,
      categoryId: cat.id,
    });

    try {
      const html = await fetchHtml(cat.url);
      const items = [...html.matchAll(
        /<div class="country-singers">\s*<a href="(https:\/\/www\.albumaty\.com\/singer\/(\d+)\.html)">([\s\S]*?)<\/a>/g
      )];

      for (const m of items) {
        const id = Number(m[2]);
        const name = cleanText(m[3]).replace(/^اغاني\s+/, '').trim();
        if (!id || !name) continue;

        if (!byId.has(id)) {
          byId.set(id, { id, name, url: m[1] });
        }

        const cats = categoriesById.get(id) ?? new Set();
        cats.add(cat.id);
        categoriesById.set(id, cats);
      }

      onProgress({
        stage: 'fetch-category-done',
        done: i + 1,
        total: SINGER_CATEGORIES.length,
        categoryId: cat.id,
        added: byId.size,
      });
    } catch (e) {
      onProgress({
        stage: 'fetch-category-error',
        categoryId: cat.id,
        error: e.message,
      });
    }

    // Small pause between category pages — albumaty is a modest site
    if (i < SINGER_CATEGORIES.length - 1) await sleep(DELAY_MS);
  }

  // Attach categories list to each singer
  const singers = [...byId.values()].map(s => ({
    ...s,
    categories: [...(categoriesById.get(s.id) ?? new Set())].sort(),
  }));

  singers.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  return singers;
}

/**
 * Crawl one albumaty artist.
 * Returns { albumatyId, name, image, albums, singles, counts }.
 *
 * Each album: { id, name, nameRaw, url, songs: [{id, name, url}] }
 * Each single: { id, name, url }
 */
export async function crawlArtist(albumatyId, onProgress = () => {}) {
  const id = Number(albumatyId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('albumatyId must be a positive integer');
  }

  const artistUrl = `${BASE}/singer/${id}.html`;
  onProgress({ stage: 'fetch-artist', url: artistUrl });

  const artistHtml = await fetchHtml(artistUrl);

  // Extract the artist name FIRST so we can clean album titles against it
  let name = null;
  const titleMatch = artistHtml.match(/<title>([\s\S]*?)<\/title>/);
  if (titleMatch) {
    name = cleanText(titleMatch[1])
      .replace(/^تحميل\s+اغاني\s+/, '')
      .replace(/\s+-\s+mp3\s*$/i, '')
      .replace(/^[-–—\s]+/, '')
      .replace(/[-–—\s]+$/, '')
      .trim();
  }

  const { image, albums, songs } = parseArtistPage(artistHtml, name);

  // Crawl each album page
  const albumsWithSongs = [];
  const albumSongIds = new Set();

  const albumsToCrawl = albums.slice(0, MAX_ALBUM_PAGES);
  for (let i = 0; i < albumsToCrawl.length; i++) {
    const album = albumsToCrawl[i];
    try {
      onProgress({
        stage: 'fetch-album',
        done: i + 1,
        total: albumsToCrawl.length,
        albumId: album.id,
        albumName: album.name,
      });

      const albumHtml = await fetchHtml(album.url);
      const { albumName, songs: albumSongs } = parseAlbumPage(albumHtml);

      // Dedupe songs by id
      const seenIds = new Set();
      const dedupedSongs = [];
      for (const s of albumSongs) {
        if (seenIds.has(s.id)) continue;
        seenIds.add(s.id);
        dedupedSongs.push(s);
        albumSongIds.add(s.id);
      }

      // Use the album-page H2 title if we have it, else the album-list entry
      const rawTitle = albumName || album.nameRaw || album.name;

      // Clean: strip artist prefix, "البوم", trailing year
      const cleanedName = cleanAlbumTitle(rawTitle, name);

      albumsWithSongs.push({
        id: album.id,
        name: cleanedName || rawTitle,     // fall back to raw if cleaning ate everything
        nameRaw: rawTitle,
        url: album.url,
        songs: dedupedSongs,
      });
    } catch (e) {
      onProgress({
        stage: 'fetch-album-error',
        albumId: album.id,
        error: e.message,
      });
    }
    if (i < albumsToCrawl.length - 1) await sleep(DELAY_MS);
  }

  // Singles = songs not in any album
  const singles = songs.filter(s => !albumSongIds.has(s.id));

  return {
    albumatyId: id,
    name,
    image,
    albums: albumsWithSongs,
    singles,
    counts: {
      albums: albumsWithSongs.length,
      songsTotal: songs.length,
      singles: singles.length,
    },
  };
}

export async function fetchSongMp3Url(albumatySongId) {
  const url = `${BASE}/song/${albumatySongId}.html`;
  const html = await fetchHtml(url);
  const mp3Url = parseSongPage(html);
  if (!mp3Url) throw new Error(`No MP3 URL found on ${url}`);
  return mp3Url;
}