// src/controllers/game/round-sets.js
//
// Free-tier version: no D1 queries per set/question.
//   - Only a small pool of artists is loaded from KV (mixPool + outsiderPool).
//   - Outsider track/album names come from that already-loaded data.
//   - Artist / featured names come from the genre artist list (catalog).
import { json, error } from '../../lib/response.js';
import { clamp } from '../../utilities/clamp.js';
import { dedupe } from '../../utilities/dedupe.js';
import { normalize } from '../../utilities/normalize.js';
import { parseIdList } from '../../utilities/parseIdList.js';
import { shuffle } from '../../utilities/shuffle.js';
import { artistsInGenreAndYears } from './rounds-methods/resolvers-years.js';
import { artistsInGenre } from './rounds-methods/resolvers.js';
import { MAX_ROUNDS_PER_REQUEST } from './rounds-methods/work-set.js';
import {
  PoolNotReady,
  loadArtistData,
  getCatalogFromKV,
  buildCatalogIndex,
} from '../../lib/cache.js';

const MAX_COUNT = MAX_ROUNDS_PER_REQUEST;
const MIX_WORK_CAP = 8;
const OUTSIDER_WORK_CAP = 4;
const MAX_EXTRA_QUESTIONS = 2;

function pickMixSize() {
  const r = Math.random();
  if (r < 0.30) return 2;
  if (r < 0.85) return 3;
  return 4;
}

export async function getRoundSet(request, env, ctx) {
  try {
    return await handleRoundSet(request, env, ctx);
  } catch (err) {
    if (err instanceof PoolNotReady) {
      console.warn('pool not ready:', err.message);
      return error('Game data cache is not built yet. Rebuild the pool and retry.', 503);
    }
    throw err;
  }
}

async function handleRoundSet(request, env, ctx) {
  const body = await request.json().catch(() => ({}));

  const count = clamp(Number(body.count ?? 3), 1, MAX_COUNT);
  const genreIds = parseIdList(body.genres);
  const artistIds = parseIdList(body.artists);
  const years = parseIdList(body.years);
  
  //  NEW: Parse instruments mode
  const instrumentsMode =
    body.instruments === 'all'   ? 'all'   :
    body.instruments === 'mixed' ? 'mixed' :
                                   'none';

  if (genreIds.length === 0) {
    return error('Level 3 requires a genre filter.', 400);
  }
  if (artistIds.length === 1) {
    return error('Level 3 needs at least 2 artists. Provide multiple, or omit artists entirely.', 400);
  }

  const genreId = genreIds[Math.floor(Math.random() * genreIds.length)];
  const hasYears = years.length > 0;

  const rawGenreArtists = hasYears
    ? await artistsInGenreAndYears(env, genreId, years)
    : await artistsInGenre(env, genreId);
    
  const allArtistsInGenre = rawGenreArtists.filter(a => (a.tracks_count ?? 1) > 0);
  const scopeTier = hasYears ? 'genre∩years' : 'genre';

  if (allArtistsInGenre.length < 2) {
    const msg = hasYears
      ? `Genre needs at least 2 artists with clips in the selected years (found ${allArtistsInGenre.length}).`
      : `Genre needs at least 2 artists with clips to play level 3 (found ${allArtistsInGenre.length}).`;
    return error(msg, 404);
  }

  let mixCandidates = allArtistsInGenre;
  if (artistIds.length > 0) {
    const allowed = new Set(artistIds);
    mixCandidates = allArtistsInGenre.filter(a => allowed.has(a.id));
    if (mixCandidates.length < 2) {
      const msg = hasYears
        ? `The selected artists don't have enough distinct members in genre ${genreId} for the selected years (found ${mixCandidates.length}, need 2).`
        : `The selected artists don't have enough distinct members in genre ${genreId} (found ${mixCandidates.length}, need 2).`;
      return error(msg, 404);
    }
  }

  const mixPool = shuffle(mixCandidates.slice()).slice(0, MIX_WORK_CAP);
  const mixPoolIds = new Set(mixPool.map(a => a.id));
  const outsiderPool = shuffle(
    allArtistsInGenre.filter(a => !mixPoolIds.has(a.id))
  ).slice(0, OUTSIDER_WORK_CAP);

  const loaded = await loadArtistData(
    env, 'core', [...mixPool, ...outsiderPool].map(a => a.id)
  );

  const sc = { env, genreId, allArtistsInGenre, loaded, years };

  const sets = [];
  const maxAttempts = count * 4;
  let attempts = 0;

  while (sets.length < count && attempts < maxAttempts) {
    attempts += 1;
    //  NEW: Pass instrumentsMode to buildSet
    const set = await buildSet(sc, mixPool, instrumentsMode);
    if (!set) continue;
    sets.push(set);
  }

  if (sets.length === 0) {
    return error('Could not build any sets from the selected genre.', 500);
  }

  const origin = new URL(request.url).origin;
  const debug = body.debug === true || body.debug === '1';

  const publicSets = sets.map((s, i) => ({
    setId: `s${i + 1}`,
    genreId: s.genreId,
    clips: s.clips.map(c => {
      //  BULLETPROOF: Check the key itself to determine the endpoint
      const serveEndpoint = c.r2Key.startsWith('instrumentals/') 
        ? 'instrumentals/serve' 
        : 'clips/serve';
      
      return {
        index: c.index,
        slotId: c.slotId,
        serveUrl: `${origin}/${serveEndpoint}?key=${encodeURIComponent(c.r2Key)}`,
        trackName: c.trackName,
        artistName: c.artistName,
        isInstrumental: c.isInstrumental,
        ...(debug ? { position: c.position, r2Key: c.r2Key } : {}),
      };
    }),
    questions: s.questions,
  }));

  return json({
    sets: publicSets,
    meta: {
      scope: {
        genreId,
        artistCount: allArtistsInGenre.length,
        mixPoolSize: mixCandidates.length,
        workArtistCount: loaded.size,
        years,
        tier: scopeTier,
      },
      requestedSets: count,
      generatedSets: publicSets.length,
      generatedAt: new Date().toISOString(),
    },
  });
}

/* ═══════════════ helpers over already-loaded data ═══════════════ */

/**
 * Random names (track or album) from loaded artists that are NOT in the mix.
 * No D1, no KV: reads only what's already in `loaded`.
 */
function outsiderNames(sc, mixArtistIds, field, perArtist = 6) {
  const out = [];
  for (const [id, d] of sc.loaded) {
    if (mixArtistIds.has(id)) continue;
    const tracks = (d.t ?? []).filter(r => r.r2_key && r[field]);
    for (let i = 0; i < perArtist && tracks.length > 0; i++) {
      out.push(tracks[Math.floor(Math.random() * tracks.length)][field]);
    }
  }
  return dedupe(out);
}



async function pickSlotForArtistLevel3(sc, artistId, years, instrumentsMode) {
  const d = sc.loaded.get(String(artistId));
  if (!d) return null;

  const yearSet = new Set(years);
  
  const filterSlots = (slots) => {
    return slots.filter(r => {
      if (!r.r2_key) return false;
      if (years.length > 0) {
        const y = d.y?.[r.album_name];
        if (y == null || !yearSet.has(y)) return false;
      }
      return true;
    });
  };

  let candidateSlots = [];
  let isInstrumental = false;

  if (instrumentsMode === 'all') {
    candidateSlots = filterSlots(d.i ?? []);
    if (candidateSlots.length > 0) isInstrumental = true;
    else candidateSlots = filterSlots(d.t ?? []); // Graceful fallback
  } else if (instrumentsMode === 'mixed') {
    const instSlots = filterSlots(d.i ?? []);
    const trackSlots = filterSlots(d.t ?? []);
    if (instSlots.length > 0 && Math.random() < 0.5) {
      candidateSlots = instSlots;
      isInstrumental = true;
    } else {
      candidateSlots = trackSlots;
    }
  } else {
    candidateSlots = filterSlots(d.t ?? []);
  }

  if (candidateSlots.length === 0) return null;

  const TIERS = [['middle', 'custom'], ['end'], ['start']];
  for (const tier of TIERS) {
    const matching = candidateSlots.filter(s => tier.includes(s.position));
    if (matching.length > 0) {
      const slot = matching[Math.floor(Math.random() * matching.length)];
      slot._isInstrumental = isInstrumental;
      return slot;
    }
  }
  
  const slot = candidateSlots[Math.floor(Math.random() * candidateSlots.length)];
  slot._isInstrumental = isInstrumental;
  return slot;
}

async function anyArtistNames(env, limit, exclude) {
  const excludeSet = new Set(exclude.filter(Boolean).map(normalize));
  const cat = await getCatalogFromKV(env);
  let names;
  if (cat) {
    const idx = buildCatalogIndex(cat);
    names = shuffle(idx.artistsWithClips.slice()).slice(0, 30)
      .map(id => idx.artistsById.get(id)?.name);
  } else {
    const { results } = await env.DB.prepare(
      'SELECT DISTINCT name FROM artists WHERE tracks_count > 0 LIMIT 20'
    ).all();
    names = (results ?? []).map(r => r.name);
  }
  return names.filter(n => n && !excludeSet.has(normalize(n))).slice(0, limit);
}

/* ═══════════════ set building ═══════════════ */

async function buildSet(sc, candidateArtists, instrumentsMode) {
  const { env, genreId, allArtistsInGenre, years } = sc;
  const mixSize = Math.min(pickMixSize(), candidateArtists.length);
  const chosenArtists = shuffle(candidateArtists.slice()).slice(0, mixSize);

  const chosenClips = [];
  for (const artist of chosenArtists) {
    //  NEW: Use the instruments-aware picker
    const slot = await pickSlotForArtistLevel3(sc, artist.id, years, instrumentsMode);
    if (!slot) return null;

    chosenClips.push({
      artistId:       artist.id,
      artistName:     artist.name,
      slotId:         slot.id,
      trackName:      slot.name,
      r2Key:          slot.r2_key,
      position:       slot.position,
      albumName:      slot.album_name,
      featured:       slot.featured_artists,
      isInstrumental: slot._isInstrumental ?? false, //  Flag for the client
    });
  }

  const clips = shuffle(chosenClips);
  const singleTrack = clips.length === 1;

  const artistQType = singleTrack
    ? 'which-artist-in-mix'
    : (Math.random() < 0.5 ? 'which-artist-in-mix' : 'which-artist-not-in-mix');
  const trackQType = singleTrack
    ? 'which-track-in-mix'
    : (Math.random() < 0.5 ? 'which-track-in-mix' : 'which-track-not-in-mix');

  const artistQ = await buildArtistQuestion(sc, clips, allArtistsInGenre, artistQType);
  const trackQ = buildTrackQuestion(sc, clips, trackQType);
  if (!artistQ || !trackQ) return null;

  const questions = [artistQ, trackQ];
  const extras = [];

  const albumQ = buildAlbumQuestion(
    sc, clips, Math.random() < 0.5 ? 'which-album-in-mix' : 'which-album-not-in-mix'
  );
  if (albumQ) extras.push(albumQ);

  const featuredQ = await buildFeaturedQuestion(
    sc, clips, Math.random() < 0.5 ? 'which-featured-in-mix' : 'which-featured-not-in-mix'
  );
  if (featuredQ) extras.push(featuredQ);

  if (!singleTrack) {
    const countQ = buildCountQuestion(clips);
    if (countQ) extras.push(countQ);
  }

  for (const q of shuffle(extras).slice(0, MAX_EXTRA_QUESTIONS)) questions.push(q);

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
      isInstrumental: c.isInstrumental,
    })),
    questions,
  };
}







async function buildArtistQuestion(sc, clips, allGenreArtists, type) {
  const { env } = sc;
  const mixArtistIds = new Set(clips.map(c => c.artistId));
  const inMixNames = clips.map(c => c.artistName);
  const outsiders = allGenreArtists.filter(a => !mixArtistIds.has(a.id)).map(a => a.name);

  if (type === 'which-artist-in-mix') {
    const correctName = inMixNames[Math.floor(Math.random() * inMixNames.length)];

    const distractors = dedupe(shuffle(outsiders.slice())).slice(0, 3);
    if (distractors.length < 3) {
      const filler = await anyArtistNames(env, 3 - distractors.length, [...inMixNames, ...outsiders]);
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

function buildTrackQuestion(sc, clips, type) {
  const mixArtistIds = new Set(clips.map(c => String(c.artistId)));
  const mixTrackNames = clips.map(c => c.trackName);
  const mixTrackNamesNorm = new Set(mixTrackNames.map(normalize));

  const outsiderTracks = outsiderNames(sc, mixArtistIds, 'name')
    .filter(n => !mixTrackNamesNorm.has(normalize(n)));

  if (type === 'which-track-in-mix') {
    const correctName = mixTrackNames[Math.floor(Math.random() * mixTrackNames.length)];
    const distractors = shuffle(outsiderTracks.slice()).slice(0, 3);
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

function buildAlbumQuestion(sc, clips, type) {
  const mixAlbums = dedupe(clips.map(c => c.albumName).filter(Boolean));
  if (mixAlbums.length === 0) return null;
  const mixAlbumNorm = new Set(mixAlbums.map(normalize));

  const mixArtistIds = new Set(clips.map(c => String(c.artistId)));
  const outsiderAlbums = outsiderNames(sc, mixArtistIds, 'album_name')
    .filter(n => n && !mixAlbumNorm.has(normalize(n)));

  if (type === 'which-album-in-mix') {
    if (mixAlbums.length === 1 && clips.every(c => normalize(c.albumName) === normalize(mixAlbums[0]))) {
      return null;
    }
    const correctName = mixAlbums[Math.floor(Math.random() * mixAlbums.length)];
    const distractors = shuffle(outsiderAlbums.slice()).slice(0, 3);
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

function parseFeaturedList(raw) {
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

async function buildFeaturedQuestion(sc, clips, type) {
  const { env, allArtistsInGenre } = sc;
  const mixFeatured = dedupe(clips.flatMap(c => parseFeaturedList(c.featured)));
  if (mixFeatured.length === 0) return null;
  const mixFeaturedNorm = new Set(mixFeatured.map(normalize));
  const primaryNames = new Set(clips.map(c => normalize(c.artistName)));

  // Genre artist names (from the catalog list, no D1) that aren't featured or primary.
  const pool = allArtistsInGenre
    .map(a => a.name)
    .filter(n => n && !mixFeaturedNorm.has(normalize(n)) && !primaryNames.has(normalize(n)));

  if (type === 'which-featured-in-mix') {
    const correctName = mixFeatured[Math.floor(Math.random() * mixFeatured.length)];
    const distractors = shuffle(dedupe(pool)).slice(0, 3);
    if (distractors.length < 3) {
      const filler = await anyArtistNames(env, 3 - distractors.length, [
        ...mixFeatured, ...clips.map(c => c.artistName), ...distractors,
      ]);
      distractors.push(...filler);
    }
    if (distractors.length < 3) return null;

    const options = shuffle([correctName, ...distractors.slice(0, 3)]);
    return {
      type,
      prompt: 'Which artist is featured on one of these tracks?',
      answerKind: 'text-label',
      options: options.map(n => ({ label: n, value: normalize(n) })),
      correctValue: normalize(correctName),
    };
  }

  if (clips.length < 2) return null;
  const outsiders = dedupe(pool);
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

function buildCountQuestion(clips) {
  const actual = clips.length;
  const OPTIONS = [2, 3, 4, 5];
  if (!OPTIONS.includes(actual)) return null;
  return {
    type: 'how-many-in-mix',
    prompt: 'How many tracks are in the mix?',
    answerKind: 'text-label',
    options: OPTIONS.map(n => ({ label: String(n), value: String(n) })),
    correctValue: String(actual),
  };
}