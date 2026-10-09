// server/scripts/albumaty-crawl/fetch-singers.js
/**
 * Fetch albumaty's /cat/1.html and cache the singer list to a JSON file.
 * Re-run to refresh. Otherwise the crawler can read the cached file.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'output');
const OUT_FILE = join(OUT_DIR, 'albumaty-singers.json');

const URL = 'https://www.albumaty.com/cat/1.html';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html',
  'Accept-Language': 'ar,en;q=0.9',
};

function cleanText(s) {
  return (s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  console.log(`Fetching ${URL} ...`);
  const res = await fetch(URL, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  console.log(`  ${html.length} chars`);

  // Extract singer links from the country-singers blocks
  // <div class="country-singers"><a href="...singer/123.html">اغاني عمرو دياب</a></div>
  const items = [...html.matchAll(
    /<div class="country-singers">\s*<a href="(https:\/\/www\.albumaty\.com\/singer\/(\d+)\.html)">([\s\S]*?)<\/a>/g
  )];

  const seen = new Set();
  const singers = [];
  for (const m of items) {
    const id = Number(m[2]);
    if (seen.has(id)) continue;
    seen.add(id);

    let name = cleanText(m[3]).replace(/^اغاني\s+/, '').trim();
    if (!name) continue;

    singers.push({ id, name, url: m[1] });
  }

  console.log(`Unique singers: ${singers.length}`);

  const output = {
    generatedAt: new Date().toISOString(),
    source: URL,
    count: singers.length,
    singers,
  };

  await writeFile(OUT_FILE, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Wrote ${OUT_FILE}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});