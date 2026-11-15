// music-game-wrangler/src/controllers/streaks/generator.js
//
// Deterministic daily challenge generator.
// Supports two modes:
//   - genre_id = NULL → Default rotation (game-picked genre, cycles through ranked list)
//   - genre_id = X    → Player-picked genre (same genre every day, different artists)
import { PRESET_DECK } from './challenge-config.js';

const EPOCH_DATE = '2026-01-01';

/* ── Deterministic PRNG ─────────────────────────────────── */

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededRandom(seed) {
  return mulberry32(xmur3(seed)());
}

function seededShuffle(array, seed) {
  const rand = seededRandom(seed);
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function daysSinceEpoch(dateStr) {
  return Math.floor(
    (new Date(dateStr) - new Date(EPOCH_DATE)) / (1000 * 60 * 60 * 24)
  );
}

function buildConfig(seed) {
  // Group presets into phases of 3 for the difficulty curve.
  // The client slices the deck by the player's streak length.
  const PHASE_SIZE = 3;
  const PHASES = [];
  
  for (let i = 0; i < PRESET_DECK.length; i += PHASE_SIZE) {
    const phase = [];
    for (let j = i; j < i + PHASE_SIZE && j < PRESET_DECK.length; j++) {
      phase.push(j);
    }
    PHASES.push(phase);
  }

  const orderedPresets = PHASES.flatMap((indices, phaseNum) => {
    const phasePresets = indices.map(i => PRESET_DECK[i]).filter(Boolean);
    return seededShuffle(phasePresets, `${seed}-phase-${phaseNum}`);
  });

  const batches = orderedPresets.map(p => ({
    key: p.key,
    level: p.level,
    types: p.types,
    instruments: p.instruments,
    rendition: p.rendition,
    reversed: p.reversed,
    answerMode: p.answerMode,
    timer: p.timer,
  }));

  return {
    maxBatches: PRESET_DECK.length,
    batches,
    timerByBatch: batches.map(b => b.timer),
    levelByBatch: batches.map(b => b.level),
    instrumentsByBatch: batches.map(b => b.instruments),
  };
}


/* ── Main generator ─────────────────────────────────────── */


async function pickGenre(env, dateStr, genreId) {
  const db = env.DB;

  // Player-picked genre
  if (genreId != null) {
    const genre = await db.prepare(
      'SELECT id, name FROM genres WHERE id = ?'
    ).bind(genreId).first();
    if (!genre) throw new Error(`Genre ${genreId} not found`);
    return genre;
  }

  // Default rotation — rank viable genres, cycle by date
  const genresResult = await db.prepare(`
    SELECT g.id, g.name,
           COUNT(DISTINCT a.id) AS artist_count,
           COALESCE(SUM(a.tracks_count), 0) AS track_count
    FROM genres g
    JOIN artists a ON EXISTS (
      SELECT 1 FROM json_each(a.genre_ids) je
      WHERE je.value = g.id
    )
    GROUP BY g.id
    HAVING artist_count >= 3 AND track_count >= 10
    ORDER BY track_count DESC, g.id ASC
  `).all();

  const genres = genresResult.results ?? [];
  if (genres.length === 0) throw new Error('No viable genres for challenge');

  const dayIndex = daysSinceEpoch(dateStr);
  return genres[((dayIndex % genres.length) + genres.length) % genres.length];
}

async function pickArtists(env, genre, dateStr, totalBatches) {
  const db = env.DB;

  // Slice the deck to see what capabilities the challenge needs.
  const activePresets = PRESET_DECK.slice(0, totalBatches);

  const requiresLyrics = activePresets.some(p =>
    p.types?.some(t => t.startsWith('lyrics-'))
  );

  const requiresInstruments = activePresets.some(p =>
    p.instruments === 'mixed' || p.instruments === 'all'
  );

  // Build the SQL query dynamically based on requirements.
  // Counts come from the denormalized columns on `artists` — no JOIN,
  // no correlated subqueries. `tracks_count` is used for both the
  // eligibility gate and the ordering key.
  let sql = `
    SELECT a.id,
           a.name,
           a.tracks_count      AS track_count,
           a.lyrics_count      AS lyric_count,
           a.instruments_count AS instrument_count
    FROM artists a
    WHERE EXISTS (
      SELECT 1 FROM json_each(a.genre_ids) je
      WHERE je.value = ?
    )
    AND a.tracks_count >= 5
  `;

  if (requiresLyrics)      sql += ` AND a.lyrics_count >= 1`;
  if (requiresInstruments) sql += ` AND a.instruments_count >= 1`;

  sql += ` ORDER BY a.tracks_count DESC, a.id ASC LIMIT 30`;

  const artistsResult = await db.prepare(sql).bind(genre.id).all();
  const eligible = artistsResult.results ?? [];

  if (eligible.length < 3) {
    throw new Error(
      `Genre "${genre.name}" does not have enough eligible artists for this challenge`
    );
  }

  // Seeded shuffle for daily rotation.
  const seed = `artists-${dateStr}-${genre.id}`;
  const shuffled = seededShuffle(eligible, seed);

  // Anchor = #1 artist by track count (always included, deterministic).
  const anchor = eligible[0];
  const rest = shuffled.filter(a => a.id !== anchor.id).slice(0, 4);

  return [anchor, ...rest];
}

export async function generateChallenge(env, dateStr, genreId = null) {
  const genre = await pickGenre(env, dateStr, genreId);

  // Build for the max deck size so the artist pool supports every phase
  const maxBatches = PRESET_DECK.length;

  const artists = await pickArtists(env, genre, dateStr, maxBatches);
  const seed = `challenge-${dateStr}-${genre.id}`;
  const config = buildConfig(seed);

  return {
    challenge_date: dateStr,
    genre_id: genreId,
    genre_name: genre.name,
    artist_ids: artists.map(a => a.id),
    artist_names: artists.map(a => a.name),
    config,
  };
}


/* ── Cached fetch ───────────────────────────────────────── */

export async function ensureChallenge(env, dateStr, genreId = null) {
  // SQLite: `IS ?` matches NULL correctly
  const existing = await env.DB.prepare(
    'SELECT * FROM challenges WHERE challenge_date = ? AND genre_id IS ?'
  ).bind(dateStr, genreId).first();

  if (existing) {
    return {
      ...existing,
      artist_ids: JSON.parse(existing.artist_ids),
      artist_names: JSON.parse(existing.artist_names),
      config: JSON.parse(existing.config),
    };
  }

  const fresh = await generateChallenge(env, dateStr, genreId);

  await env.DB.prepare(`
    INSERT INTO challenges
    (challenge_date, genre_id, genre_name, artist_ids, artist_names, config)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    fresh.challenge_date,
    fresh.genre_id,
    fresh.genre_name,
    JSON.stringify(fresh.artist_ids),
    JSON.stringify(fresh.artist_names),
    JSON.stringify(fresh.config),
  ).run();

  return fresh;
}