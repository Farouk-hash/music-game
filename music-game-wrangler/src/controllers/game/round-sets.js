// music-game-wrangler/src/controllers/game/round-sets.js
import { json, error } from '../../lib/response.js';
import { clamp } from '../../utilities/clamp.js';
import { dedupe } from '../../utilities/dedupe.js';
import { normalize } from '../../utilities/normalize.js';
import { parseIdList } from '../../utilities/parseIdList.js';
import { shuffle } from '../../utilities/shuffle.js';
import { slotsForArtist } from './rounds-methods/slots.js';
import { artistsInGenreAndYears } from './rounds-methods/resolvers-years.js';

/* ═══════════════════════════════════════════════════════════
   GET /game/round-set
   Level 3: 1–4 clips from distinct artists in the same genre,
   played simultaneously. Questions ask about the whole mix.

   Question pool per set:
     - 2 required: one artist-focused + one track-focused
     - up to 2 optional extras: album, featured, how-many

   Album and featured questions only fire when at least one clip
   in the mix carries that data. Sets remain valid even when the
   mix has sparse data — the required pair is always built.

   Year handling: when `years` is present, the genre's artist pool
   is restricted to artists who have at least one clip in a
   matching year, and per-artist slot picks are year-filtered.
   If that leaves fewer than 2 artists, the endpoint fails with
   an honest 404 — dropping the year filter silently would produce
   rounds the player didn't ask for.
   ═══════════════════════════════════════════════════════════ */

/**
 * Mix size 1–4, weighted toward 3.
 * Set the first threshold to 0 to disable size-1 mixes entirely.
 */
const MAX_COUNT = 500;

function pickMixSize() {
  const r = Math.random();
  if (r < 0.0) return 1;   // effectively disabled
  if (r < 0.30) return 2;
  if (r < 0.85) return 3;
  return 4;
}

// How many optional questions (album / featured / count) can
// appear per set, on top of the required artist + track pair.
const MAX_EXTRA_QUESTIONS = 2;

export async function getRoundSet(request, env) {
  const url = new URL(request.url);
  const count = clamp(Number(url.searchParams.get('count') ?? 3), 1, MAX_COUNT);
  const genreIds = parseIdList(url.searchParams.get('genres'));
  const artistIds = parseIdList(url.searchParams.get('artists'));
  const years = parseIdList(url.searchParams.get('years'));

  if (genreIds.length === 0) {
    return error(
      'Level 3 requires a genre filter. Pass ?genres=… to select one.',
      400
    );
  }

  if (artistIds.length === 1) {
    return error(
      'Level 3 needs at least 2 artists. Provide multiple, or omit artists entirely.',
      400
    );
  }

  const genreId = genreIds[Math.floor(Math.random() * genreIds.length)];

  const hasYears = years.length > 0;

  // ── Artist pool for this genre (year-filtered if applicable) ──
  const allArtistsInGenre = hasYears
    ? await artistsInGenreAndYears(env, genreId, years)
    : await artistsInGenre(env, genreId);

  const scopeTier = hasYears ? 'genre∩years' : 'genre';

  if (allArtistsInGenre.length < 2) {
    const msg = hasYears
      ? `Genre needs at least 2 artists with clips in the selected years ` +
        `(found ${allArtistsInGenre.length}).`
      : `Genre needs at least 2 artists with clips to play level 3 ` +
        `(found ${allArtistsInGenre.length}).`;
    return error(msg, 404);
  }

  let mixCandidates = allArtistsInGenre;
  if (artistIds.length > 0) {
    const allowed = new Set(artistIds);
    mixCandidates = allArtistsInGenre.filter(a => allowed.has(a.id));
    if (mixCandidates.length < 2) {
      const msg = hasYears
        ? `The selected artists don't have enough distinct members in genre ${genreId} ` +
          `for the selected years (found ${mixCandidates.length}, need 2).`
        : `The selected artists don't have enough distinct members in genre ${genreId} ` +
          `(found ${mixCandidates.length}, need 2).`;
      return error(msg, 404);
    }
  }

  const sets = [];
  const maxAttempts = count * 4;
  let attempts = 0;

  while (sets.length < count && attempts < maxAttempts) {
    attempts += 1;

    const set = await buildSet(env, genreId, mixCandidates, allArtistsInGenre, years);
    if (!set) continue;

    sets.push(set);
  }

  if (sets.length === 0) {
    return error('Could not build any sets from the selected genre.', 500);
  }

  const origin = new URL(request.url).origin;
  const debug = url.searchParams.get('debug') === '1';

  const publicSets = sets.map((s, i) => ({
    setId: `s${i + 1}`,
    genreId: s.genreId,
    clips: s.clips.map(c => ({
      index: c.index,
      slotId: c.slotId,
      serveUrl: `${origin}/clips/serve?key=${encodeURIComponent(c.r2Key)}`,
      trackName: c.trackName,
      artistName: c.artistName,
      ...(debug ? { position: c.position, r2Key: c.r2Key } : {}),
    })),
    questions: s.questions,
  }));

  return json({
    sets: publicSets,
    meta: {
      scope: {
        genreId,
        artistCount: allArtistsInGenre.length,
        mixPoolSize: mixCandidates.length,
        years,
        tier: scopeTier,
      },
      requestedSets: count,
      generatedSets: publicSets.length,
      generatedAt: new Date().toISOString(),
    },
  });
}

/* ═══════════════════════════════════════════════════════════
   Set builder
   ═══════════════════════════════════════════════════════════ */

async function artistsInGenre(env, genreId) {
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT a.id, a.name
     FROM artists a, json_each(a.genre_ids) g
     WHERE CAST(g.value AS INTEGER) = ?
       AND a.tracks_count > 0`
  ).bind(genreId).all();

  return shuffle(results ?? []);
}

async function buildSet(env, genreId, candidateArtists, allGenreArtists, years) {
  const mixSize = Math.min(pickMixSize(), candidateArtists.length);
  const chosenArtists = shuffle(candidateArtists).slice(0, mixSize);

  const chosenClips = [];
  for (const artist of chosenArtists) {
    const slot = await pickSlotForArtist(env, artist.id, years);
    if (!slot) return null;
    chosenClips.push({
      artistId:    artist.id,
      artistName:  artist.name,
      slotId:      slot.id,
      trackName:   slot.name,
      r2Key:       slot.r2_key,
      position:    slot.position,
      albumName:   slot.album_name,
      featured:    slot.featured_artists,
    });
  }

  const clips = shuffle(chosenClips);

  const singleTrack = clips.length === 1;

  // ── Required pair: one artist + one track question ──
  const artistQType = singleTrack
    ? 'which-artist-in-mix'
    : (Math.random() < 0.5 ? 'which-artist-in-mix' : 'which-artist-not-in-mix');
  const trackQType = singleTrack
    ? 'which-track-in-mix'
    : (Math.random() < 0.5 ? 'which-track-in-mix' : 'which-track-not-in-mix');

  const artistQ = await buildArtistQuestion(
    env, genreId, clips, allGenreArtists, artistQType
  );
  const trackQ = await buildTrackQuestion(
    env, genreId, clips, allGenreArtists, trackQType
  );

  if (!artistQ || !trackQ) return null;

  const questions = [artistQ, trackQ];

  // ── Optional extras ─────────────────────────────────
  const extras = [];

  const albumQType = Math.random() < 0.5
    ? 'which-album-in-mix'
    : 'which-album-not-in-mix';
  const albumQ = await buildAlbumQuestion(
    env, genreId, clips, allGenreArtists, albumQType
  );
  if (albumQ) extras.push(albumQ);

  const featuredQType = Math.random() < 0.5
    ? 'which-featured-in-mix'
    : 'which-featured-not-in-mix';
  const featuredQ = await buildFeaturedQuestion(
    env, genreId, clips, allGenreArtists, featuredQType
  );
  if (featuredQ) extras.push(featuredQ);

  if (!singleTrack) {
    const countQ = buildCountQuestion(clips);
    if (countQ) extras.push(countQ);
  }

  const shuffledExtras = shuffle(extras);
  for (const q of shuffledExtras.slice(0, MAX_EXTRA_QUESTIONS)) {
    questions.push(q);
  }

  return {
    genreId,
    clips: clips.map((c, i) => ({
      index: i,
      slotId: c.slotId,
      r2Key: c.r2Key,
      artistId: c.artistId,
      artistName: c.artistName,
      trackName: c.trackName,
      position: c.position,
    })),
    questions,
  };
}

/* ═══════════════════════════════════════════════════════════
   Question builders — Artist and Track (unchanged)
   ═══════════════════════════════════════════════════════════ */

async function buildArtistQuestion(env, genreId, clips, allGenreArtists, type) {
  const mixArtistIds = new Set(clips.map(c => c.artistId));
  const inMixNames = clips.map(c => c.artistName);

  if (type === 'which-artist-in-mix') {
    const correctName = inMixNames[Math.floor(Math.random() * inMixNames.length)];

    const outsiders = allGenreArtists
      .filter(a => !mixArtistIds.has(a.id))
      .map(a => a.name);

    let distractors = dedupe(shuffle(outsiders)).slice(0, 3);
    if (distractors.length < 3) {
      const filler = await anyArtistNames(env, 3 - distractors.length, [
        ...inMixNames,
        ...outsiders,
      ]);
      distractors.push(...filler);
    }
    if (distractors.length < 3) return null;

    const options = shuffle([correctName, ...distractors.slice(0, 3)]);
    return {
      type,
      prompt: 'Which artist IS in the mix?',
      answerKind: 'text-label',
      options: options.map(n => ({ label: n, value: normalize(n) })),
      correctValue: normalize(correctName),
    };
  }

  if (clips.length < 2) return null;

  const outsiders = allGenreArtists
    .filter(a => !mixArtistIds.has(a.id))
    .map(a => a.name);

  if (outsiders.length === 0) return null;

  const correctName = outsiders[Math.floor(Math.random() * outsiders.length)];
  const distractors = dedupe(inMixNames).slice(0, 3);
  if (distractors.length < 3) return null;

  const options = shuffle([correctName, ...distractors]);
  return {
    type,
    prompt: 'Which artist is NOT in the mix?',
    answerKind: 'text-label',
    options: options.map(n => ({ label: n, value: normalize(n) })),
    correctValue: normalize(correctName),
  };
}

async function buildTrackQuestion(env, genreId, clips, allGenreArtists, type) {
  const mixArtistIds = new Set(clips.map(c => c.artistId));
  const mixTrackNames = clips.map(c => c.trackName);
  const mixTrackNamesNorm = new Set(mixTrackNames.map(normalize));

  async function fetchOutsiderTracks() {
    const outsiders = allGenreArtists.filter(a => !mixArtistIds.has(a.id));
    const outsiderIds = outsiders.map(a => a.id);
    if (outsiderIds.length === 0) return [];

    const placeholders = outsiderIds.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      `SELECT DISTINCT name FROM tracks
       WHERE artist_id IN (${placeholders})
         AND r2_key IS NOT NULL
       LIMIT 20`
    ).bind(...outsiderIds).all();

    return dedupe(
      (results ?? [])
        .map(r => r.name)
        .filter(n => !mixTrackNamesNorm.has(normalize(n)))
    );
  }

  if (type === 'which-track-in-mix') {
    const correctName = mixTrackNames[Math.floor(Math.random() * mixTrackNames.length)];

    let distractors = shuffle(await fetchOutsiderTracks()).slice(0, 3);
    if (distractors.length < 3) return null;

    const options = shuffle([correctName, ...distractors]);
    return {
      type,
      prompt: 'Which track IS in the mix?',
      answerKind: 'text-label',
      options: options.map(n => ({ label: n, value: normalize(n) })),
      correctValue: normalize(correctName),
    };
  }

  if (clips.length < 2) return null;

  const outsiderTracks = await fetchOutsiderTracks();
  if (outsiderTracks.length === 0) return null;

  const correctName = outsiderTracks[Math.floor(Math.random() * outsiderTracks.length)];
  const distractors = dedupe(mixTrackNames).slice(0, 3);
  if (distractors.length < 3) return null;

  const options = shuffle([correctName, ...distractors]);
  return {
    type,
    prompt: 'Which track is NOT in the mix?',
    answerKind: 'text-label',
    options: options.map(n => ({ label: n, value: normalize(n) })),
    correctValue: normalize(correctName),
  };
}

/* ═══════════════════════════════════════════════════════════
   Question builders — Album
   ═══════════════════════════════════════════════════════════ */

async function buildAlbumQuestion(env, genreId, clips, allGenreArtists, type) {
  const mixAlbums = dedupe(
    clips.map(c => c.albumName).filter(Boolean)
  );
  if (mixAlbums.length === 0) return null;

  const mixAlbumNorm = new Set(mixAlbums.map(normalize));

  if (type === 'which-album-in-mix') {
    if (mixAlbums.length === 1 && clips.every(c => normalize(c.albumName) === normalize(mixAlbums[0]))) {
      return null;
    }

    const correctName = mixAlbums[Math.floor(Math.random() * mixAlbums.length)];

    const outsiderIds = allGenreArtists
      .filter(a => !clips.some(c => c.artistId === a.id))
      .map(a => a.id);
    if (outsiderIds.length === 0) return null;

    const placeholders = outsiderIds.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      `SELECT DISTINCT album_name FROM tracks
       WHERE artist_id IN (${placeholders})
         AND album_name IS NOT NULL
       LIMIT 20`
    ).bind(...outsiderIds).all();

    let distractors = dedupe(
      (results ?? [])
        .map(r => r.album_name)
        .filter(n => n && !mixAlbumNorm.has(normalize(n)))
    );
    distractors = shuffle(distractors).slice(0, 3);
    if (distractors.length < 3) return null;

    const options = shuffle([correctName, ...distractors]);
    return {
      type,
      prompt: 'Which album IS in the mix?',
      answerKind: 'text-label',
      options: options.map(n => ({ label: n, value: normalize(n) })),
      correctValue: normalize(correctName),
    };
  }

  if (clips.length < 2) return null;

  const outsiderIds = allGenreArtists
    .filter(a => !clips.some(c => c.artistId === a.id))
    .map(a => a.id);
  if (outsiderIds.length === 0) return null;

  const placeholders = outsiderIds.map(() => '?').join(',');
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT album_name FROM tracks
     WHERE artist_id IN (${placeholders})
       AND album_name IS NOT NULL
     LIMIT 20`
  ).bind(...outsiderIds).all();

  const outsiderAlbums = dedupe(
    (results ?? [])
      .map(r => r.album_name)
      .filter(n => n && !mixAlbumNorm.has(normalize(n)))
  );
  if (outsiderAlbums.length === 0) return null;

  const correctName = outsiderAlbums[Math.floor(Math.random() * outsiderAlbums.length)];
  const distractors = mixAlbums.slice(0, 3);
  if (distractors.length < 3) return null;

  const options = shuffle([correctName, ...distractors]);
  return {
    type,
    prompt: 'Which album is NOT in the mix?',
    answerKind: 'text-label',
    options: options.map(n => ({ label: n, value: normalize(n) })),
    correctValue: normalize(correctName),
  };
}

/* ═══════════════════════════════════════════════════════════
   Question builders — Featured
   ═══════════════════════════════════════════════════════════ */

function parseFeaturedList(raw) {
  if (!raw) return [];
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

async function buildFeaturedQuestion(env, genreId, clips, allGenreArtists, type) {
  const mixFeatured = dedupe(
    clips.flatMap(c => parseFeaturedList(c.featured))
  );
  if (mixFeatured.length === 0) return null;

  const mixFeaturedNorm = new Set(mixFeatured.map(normalize));

  if (type === 'which-featured-in-mix') {
    const correctName = mixFeatured[Math.floor(Math.random() * mixFeatured.length)];

    const { results } = await env.DB.prepare(
      `SELECT DISTINCT a.name
       FROM artists a, json_each(a.genre_ids) g
       WHERE CAST(g.value AS INTEGER) = ?
         AND EXISTS (
           SELECT 1 FROM tracks t
           WHERE t.artist_id = a.id AND t.r2_key IS NOT NULL
         )
       LIMIT 20`
    ).bind(genreId).all();

    let distractors = dedupe(
      (results ?? [])
        .map(r => r.name)
        .filter(n => n && !mixFeaturedNorm.has(normalize(n)))
    );

    const primaryNames = new Set(clips.map(c => normalize(c.artistName)));
    distractors = distractors.filter(n => !primaryNames.has(normalize(n)));

    distractors = shuffle(distractors).slice(0, 3);
    if (distractors.length < 3) {
      const filler = await anyArtistNames(env, 3 - distractors.length, [
        ...mixFeatured,
        ...clips.map(c => c.artistName),
        ...distractors,
      ]);
      distractors.push(...filler.slice(0, 3 - distractors.length));
    }
    if (distractors.length < 3) return null;

    const options = shuffle([correctName, ...distractors]);
    return {
      type,
      prompt: 'Which artist is featured on one of these tracks?',
      answerKind: 'text-label',
      options: options.map(n => ({ label: n, value: normalize(n) })),
      correctValue: normalize(correctName),
    };
  }

  if (clips.length < 2) return null;

  const { results } = await env.DB.prepare(
    `SELECT DISTINCT a.name
     FROM artists a, json_each(a.genre_ids) g
     WHERE CAST(g.value AS INTEGER) = ?
       AND EXISTS (
         SELECT 1 FROM tracks t
         WHERE t.artist_id = a.id AND t.r2_key IS NOT NULL
       )
     LIMIT 20`
  ).bind(genreId).all();

  const primaryNames = new Set(clips.map(c => normalize(c.artistName)));
  const outsiders = dedupe(
    (results ?? [])
      .map(r => r.name)
      .filter(n => n
        && !mixFeaturedNorm.has(normalize(n))
        && !primaryNames.has(normalize(n))
      )
  );
  if (outsiders.length === 0) return null;

  const correctName = outsiders[Math.floor(Math.random() * outsiders.length)];
  const distractors = mixFeatured.slice(0, 3);
  if (distractors.length < 3) return null;

  const options = shuffle([correctName, ...distractors]);
  return {
    type,
    prompt: 'Which artist is NOT featured on any of these tracks?',
    answerKind: 'text-label',
    options: options.map(n => ({ label: n, value: normalize(n) })),
    correctValue: normalize(correctName),
  };
}

/* ═══════════════════════════════════════════════════════════
   Count question
   ═══════════════════════════════════════════════════════════ */

function buildCountQuestion(clips) {
  const actual = clips.length;
  const OPTIONS = [2, 3, 4, 5];
  if (!OPTIONS.includes(actual)) return null;

  const options = OPTIONS.map(n => ({ label: String(n), value: String(n) }));

  return {
    type: 'how-many-in-mix',
    prompt: 'How many tracks are in the mix?',
    answerKind: 'text-label',
    options,
    correctValue: String(actual),
  };
}

/* ═══════════════════════════════════════════════════════════
   Utilities
   ═══════════════════════════════════════════════════════════ */

async function anyArtistNames(env, limit, exclude) {
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT name FROM artists WHERE tracks_count > 0 LIMIT 20`
  ).all();
  const excludeSet = new Set(exclude.filter(Boolean).map(normalize));
  return (results ?? [])
    .map(r => r.name)
    .filter(n => !excludeSet.has(normalize(n)))
    .slice(0, limit);
}

async function pickSlotForArtist(env, artistId, years = []) {
  const slots = await slotsForArtist(env, artistId, years);
  if (slots.length === 0) return null;

  const TIERS = [
    ['middle', 'custom'],
    ['end'],
    ['start'],
  ];

  for (const tier of TIERS) {
    const matching = slots.filter(s => tier.includes(s.position));
    if (matching.length > 0) {
      return matching[Math.floor(Math.random() * matching.length)];
    }
  }

  return slots[Math.floor(Math.random() * slots.length)];
}