// music-game-wrangler/src/controllers/collections/collections.js
import { json, error } from '../../lib/response.js';
import {
  validateCollectionName,
  validateLevels,
  validateYears,
  validateGenresIds,
  validateArtistsIds,
  validateRounds,
} from '../../utilities/collections/validate.js';
import { COLLECTIONS_PER_PROFILE_MAX } from '../../utilities/collections/limits.js';
import { chunkedIn } from '../../utilities/chunkedIn.js';
import { buildReplaceRoundsStatements } from './rounds.js';
import { parseCollectionRequest } from '../../utilities/collections/parseRequest.js';
import { persistCover } from './cover.js';
import { cachedJsonResponse, invalidateCache } from '../../lib/cache.js';

const COLLECTION_FIELDS =
  'id, profile_id, name, is_public, cover_kind, cover_r2_key, levels, years, genres_ids, artists_ids, created_at, updated_at';

const ROUND_FIELDS =
  'collection_id, position, level, question_types, answer_mode, mode, rounds, reversed_answers, reversed_audio, instruments, timer';

// ── Others-list cache ──────────────────────────────────────
const OTHERS_CACHE_KEY = 'collections:others:v1';
const OTHERS_TTL_SECONDS = 30 * 60;        // 30 min KV
const OTHERS_EDGE_TTL_SECONDS = 5 * 60;    // 5 min edge

function parseJSON(raw, fallback) {
  if (raw == null) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

export function serializeRound(row) {
  return {
    position:        row.position,
    level:           row.level,
    questionTypes:   parseJSON(row.question_types, []),
    answerMode:      row.answer_mode,
    mode:            row.mode,
    rounds:          row.rounds,
    reversedAnswers: row.reversed_answers,
    reversedAudio:   Boolean(row.reversed_audio),
    instruments:     row.instruments,
    timer:           row.timer ?? null,
  };
}

export function serializeCollection(row, rounds) {
  return {
    id:         row.id,
    profileId:  row.profile_id,
    name:       row.name,
    isPublic:   Boolean(row.is_public),
    levels:     parseJSON(row.levels, []),
    years:      parseJSON(row.years, null),
    genresIds:  parseJSON(row.genres_ids, []),
    artistsIds: parseJSON(row.artists_ids, []),
    cover: {
      kind: row.cover_kind,
      url:  row.cover_r2_key ? `/profiles/${row.profile_id}/collections/${row.id}/cover` : null,
    },
    rounds: rounds.map(serializeRound),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchRounds(env, collectionIds) {
  if (collectionIds.length === 0) return new Map();

  const rows = await chunkedIn(collectionIds, 90, async (chunk) => {
    const ph = chunk.map(() => '?').join(',');
    const res = await env.DB.prepare(
      `SELECT ${ROUND_FIELDS} FROM collection_rounds WHERE collection_id IN (${ph}) ORDER BY collection_id, position ASC`
    ).bind(...chunk).all();
    return res.results ?? [];
  });

  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.collection_id)) map.set(r.collection_id, []);
    map.get(r.collection_id).push(r);
  }
  return map;
}

export async function buildCollectionResponse(env, profileId, collectionId) {
  const row = await env.DB.prepare(
    `SELECT ${COLLECTION_FIELDS} FROM collections WHERE id = ? AND profile_id = ?`
  ).bind(collectionId, profileId).first();
  if (!row) return null;

  const roundsMap = await fetchRounds(env, [collectionId]);
  return serializeCollection(row, roundsMap.get(collectionId) ?? []);
}

/**
 * Base "others" query — no user-specific joins.
 * Cached globally for 30 min. Filtered per-request afterward.
 */
async function fetchOthersBase(env) {
  const { results } = await env.DB.prepare(
    `SELECT 
       c.id, c.profile_id, c.name, c.is_public, c.cover_kind, c.cover_r2_key, 
       c.levels, c.years, c.genres_ids, c.artists_ids, 
       c.created_at, c.updated_at,
       p.nickname AS author_nickname,
       p.avatar_r2_key AS author_avatar_r2_key,
       p.avatar_kind AS author_avatar_kind,
       p.avatar_style AS author_avatar_style,
       p.avatar_seed AS author_avatar_seed
     FROM collections c
     JOIN profiles p ON p.id = c.profile_id
     WHERE c.is_public = 1
     ORDER BY c.created_at DESC LIMIT 50`
  ).all();
  return results ?? [];
}

async function bustOthersCache(env, ctx, request) {
  const origin = new URL(request.url).origin;
  await invalidateCache(env, ctx, OTHERS_CACHE_KEY, origin);
}

// POST /profiles/:profileId/collections
export async function createCollection(request, env, ctx, { profileId }) {
  const profile = await env.DB.prepare('SELECT id FROM profiles WHERE id = ?').bind(profileId).first();
  if (!profile) return error('Profile not found', 404);

  const countRow = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM collections WHERE profile_id = ?'
  ).bind(profileId).first();
  if ((countRow?.n ?? 0) >= COLLECTIONS_PER_PROFILE_MAX) {
    return error(`Maximum ${COLLECTIONS_PER_PROFILE_MAX} collections per profile`, 400);
  }

  const parsed = await parseCollectionRequest(request);
  if (!parsed.ok) return error(parsed.error, 400);
  const { body, file } = parsed;

  const nameV = validateCollectionName(body.name);
  if (!nameV.ok) return error(nameV.error, 400);

  const levelsV = validateLevels(body.levels);
  if (!levelsV.ok) return error(levelsV.error, 400);

  const yearsV = validateYears(body.years ?? null);
  if (!yearsV.ok) return error(yearsV.error, 400);

  const genresV = validateGenresIds(body.genresIds ?? []);
  if (!genresV.ok) return error(genresV.error, 400);

  const artistsV = validateArtistsIds(body.artistsIds ?? []);
  if (!artistsV.ok) return error(artistsV.error, 400);

  const roundsV = validateRounds(body.rounds ?? [], levelsV.value);
  if (!roundsV.ok) return error(roundsV.error, 400);

  const isPublicFlag = body.isPublic ? 1 : 0;

  const insert = await env.DB.prepare(
    `INSERT INTO collections (profile_id, name, levels, years, genres_ids, artists_ids, is_public)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    profileId,
    nameV.value,
    JSON.stringify(levelsV.value),
    yearsV.value == null ? null : JSON.stringify(yearsV.value),
    JSON.stringify(genresV.value),
    JSON.stringify(artistsV.value),
    isPublicFlag,
  ).run();

  const newId = insert.meta.last_row_id;
  
  const roundStatements = buildReplaceRoundsStatements(env, newId, roundsV.value);
  if (roundStatements.length > 1) {
    await env.DB.batch(roundStatements);
  }

  if (file) {
    const coverResult = await persistCover(env, profileId, newId, file);
    if (!coverResult.ok) {
      if (isPublicFlag) await bustOthersCache(env, ctx, request);
      const collection = await buildCollectionResponse(env, profileId, newId);
      return json({ collection, coverError: coverResult.error });
    }
  }

  if (isPublicFlag) await bustOthersCache(env, ctx, request);

  const collection = await buildCollectionResponse(env, profileId, newId);
  return json({ collection });
}

// POST /profiles/:profileId/collections/clone
export async function cloneCollection(request, env, ctx, { profileId }) {
  const body = await request.json().catch(() => null);
  if (!body || body.sourceId == null) return error('sourceId is required', 400);

  const sourceId = Number(body.sourceId);
  
  const source = await env.DB.prepare(
    'SELECT id, profile_id FROM collections WHERE id = ? AND is_public = 1 AND profile_id != ?'
  ).bind(sourceId, profileId).first();
  
  if (!source) return error('Collection not found or not public', 404);

  await env.DB.prepare(
    `INSERT INTO collection_clones (profile_id, collection_id)
     VALUES (?, ?)
     ON CONFLICT(profile_id, collection_id) DO NOTHING`
  ).bind(profileId, sourceId).run();

  // Return the original collection data
  const collection = await buildCollectionResponse(env, source.profile_id, sourceId);
  return json({ collection });
}

// GET /profiles/:profileId/collections
export async function listCollections(request, env, ctx, { profileId }) {
  // 1. MY collections (never cached — user-owned)
  const { results: myRows } = await env.DB.prepare(
    `SELECT ${COLLECTION_FIELDS} FROM collections WHERE profile_id = ? ORDER BY created_at DESC`
  ).bind(profileId).all();

  // 2. CLONED collections (never cached — user-owned)
  const { results: clonedRows } = await env.DB.prepare(
    `SELECT c.*, 'clone' AS relationship
     FROM collections c
     JOIN collection_clones cc ON cc.collection_id = c.id
     WHERE cc.profile_id = ?`
  ).bind(profileId).all();

  // 3. OTHERS' public collections — CACHED (30 min)
  const othersResponse = await cachedJsonResponse(
    request, env, ctx,
    OTHERS_CACHE_KEY,
    OTHERS_TTL_SECONDS,
    OTHERS_EDGE_TTL_SECONDS,
    () => fetchOthersBase(env).then(rows => ({ rows }))
  );
  const othersBase = (await othersResponse.json()).rows ?? [];

  // Filter out the caller's own collections
  const others = othersBase.filter(r => r.profile_id !== profileId);
  const otherIds = others.map(r => r.id);

  // Per-request user-specific data
  let cloneSet = new Set();
  let followMap = new Map();

  if (otherIds.length > 0) {
    const ph = otherIds.map(() => '?').join(',');
    const { results: cloneRows } = await env.DB.prepare(
      `SELECT collection_id FROM collection_clones 
       WHERE profile_id = ? AND collection_id IN (${ph})`
    ).bind(profileId, ...otherIds).all();
    cloneSet = new Set((cloneRows ?? []).map(r => r.collection_id));

    const authorIds = [...new Set(others.map(r => r.profile_id))];
    if (authorIds.length > 0) {
      const aph = authorIds.map(() => '?').join(',');
      const { results: followRows } = await env.DB.prepare(
        `SELECT follower_id, followee_id, status FROM follows 
         WHERE (follower_id = ? AND followee_id IN (${aph}))
            OR (followee_id = ? AND follower_id IN (${aph}))`
      ).bind(profileId, ...authorIds, profileId, ...authorIds).all();
      
      for (const r of followRows ?? []) {
        const otherId = r.follower_id === profileId ? r.followee_id : r.follower_id;
        if (!followMap.has(otherId)) followMap.set(otherId, {});
        if (r.follower_id === profileId) followMap.get(otherId).mine = r.status;
        else followMap.get(otherId).theirs = r.status;
      }
    }
  }

  // Fetch rounds for everything
  const allMineIds = [...myRows.map(r => r.id), ...clonedRows.map(r => r.id)];
  const allIds = [...new Set([...allMineIds, ...otherIds])];
  const roundsMap = await fetchRounds(env, allIds);

  const serializeMine = (rows) => rows.map(row => 
    serializeCollection(row, roundsMap.get(row.id) ?? [])
  );

  const serializeOthers = (rows) => rows.map(row => {
    const rel = followMap.get(row.profile_id) ?? {};
    let followStatus = 'none';
    if (rel.mine === 'accepted' && rel.theirs === 'accepted') followStatus = 'friends';
    else if (rel.mine === 'pending') followStatus = 'requested';
    else if (rel.theirs === 'pending') followStatus = 'incoming';
    else if (rel.mine === 'accepted') followStatus = 'following';

    return {
      ...serializeCollection(row, roundsMap.get(row.id) ?? []),
      isCloned: cloneSet.has(row.id),
      followStatus,
      author: {
        profileId: row.profile_id,
        nickname: row.author_nickname,
        avatar: {
          kind: row.author_avatar_kind,
          style: row.author_avatar_style,
          seed: row.author_avatar_seed,
          url: row.author_avatar_r2_key ? `/profiles/${row.profile_id}/avatar` : null,
        },
      },
    };
  });

  return json({
    mine: [...serializeMine(myRows ?? []), ...serializeMine(clonedRows ?? [])],
    others: serializeOthers(others),
  });
}

// GET /profiles/:profileId/collections/:id
export async function getCollection(request, env, ctx, { profileId, id }) {
  const collection = await buildCollectionResponse(env, profileId, Number(id));
  if (!collection) return error('Collection not found', 404);
  return json({ collection });
}

// PUT /profiles/:profileId/collections/:id
export async function saveCollection(request, env, ctx, { profileId, id }) {
  const collectionId = Number(id);
  const existing = await env.DB.prepare(
    'SELECT id, levels, is_public FROM collections WHERE id = ? AND profile_id = ?'
  ).bind(collectionId, profileId).first();
  
  if (!existing) return error('Collection not found or you do not own it', 404);

  const parsed = await parseCollectionRequest(request);
  if (!parsed.ok) return error(parsed.error, 400);
  const { body, file } = parsed;

  const statements = [];
  const updates = [];
  const binds = [];

  let validatedLevels = null;

  if (body.name !== undefined) {
    const v = validateCollectionName(body.name);
    if (!v.ok) return error(v.error, 400);
    updates.push('name = ?'); binds.push(v.value);
  }
  if (body.levels !== undefined) {
    const v = validateLevels(body.levels);
    if (!v.ok) return error(v.error, 400);
    validatedLevels = v.value;
    updates.push('levels = ?'); binds.push(JSON.stringify(v.value));
  }
  if (body.years !== undefined) {
    const v = validateYears(body.years);
    if (!v.ok) return error(v.error, 400);
    updates.push('years = ?'); binds.push(v.value == null ? null : JSON.stringify(v.value));
  }
  if (body.genresIds !== undefined) {
    const v = validateGenresIds(body.genresIds);
    if (!v.ok) return error(v.error, 400);
    updates.push('genres_ids = ?'); binds.push(JSON.stringify(v.value));
  }
  if (body.artistsIds !== undefined) {
    const v = validateArtistsIds(body.artistsIds);
    if (!v.ok) return error(v.error, 400);
    updates.push('artists_ids = ?'); binds.push(JSON.stringify(v.value));
  }
  if (body.isPublic !== undefined) {
    updates.push('is_public = ?'); binds.push(body.isPublic ? 1 : 0);
  }

  const levelsForValidation = validatedLevels !== null ? validatedLevels : parseJSON(existing.levels, []);

  if (body.rounds !== undefined) {
    const v = validateRounds(body.rounds, levelsForValidation);
    if (!v.ok) return error(v.error, 400);
    statements.push(...buildReplaceRoundsStatements(env, collectionId, v.value));
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    statements.unshift(
      env.DB.prepare(`UPDATE collections SET ${updates.join(', ')} WHERE id = ? AND profile_id = ?`).bind(...binds, collectionId, profileId)
    );
  } else if (statements.length > 0) {
    statements.unshift(
      env.DB.prepare("UPDATE collections SET updated_at = datetime('now') WHERE id = ? AND profile_id = ?").bind(collectionId, profileId)
    );
  }

  if (statements.length === 0 && !file) return error('No updates provided', 400);

  if (statements.length > 0) await env.DB.batch(statements);

  if (file) {
    const coverResult = await persistCover(env, profileId, collectionId, file);
    if (!coverResult.ok) {
      await bustOthersCache(env, ctx, request);
      const collection = await buildCollectionResponse(env, profileId, collectionId);
      return json({ collection, coverError: coverResult.error });
    }
  }

  // Bust cache if this collection is (or was) public
  if (existing.is_public || body.isPublic) {
    await bustOthersCache(env, ctx, request);
  }

  const collection = await buildCollectionResponse(env, profileId, collectionId);
  return json({ collection });
}

// DELETE /profiles/:profileId/collections/:id
export async function deleteCollection(request, env, ctx, { profileId, id }) {
  const collectionId = Number(id);

  // Check if this is a cloned collection
  const isCloned = await env.DB.prepare(
    'SELECT 1 FROM collection_clones WHERE profile_id = ? AND collection_id = ?'
  ).bind(profileId, collectionId).first();

  if (isCloned) {
    await env.DB.prepare(
      'DELETE FROM collection_clones WHERE profile_id = ? AND collection_id = ?'
    ).bind(profileId, collectionId).run();
    return json({ ok: true, deleted: true });
  }

  // Otherwise, it's their own collection — hard delete
  const row = await env.DB.prepare(
    'SELECT cover_r2_key, is_public FROM collections WHERE id = ? AND profile_id = ?'
  ).bind(collectionId, profileId).first();

  if (!row) return json({ ok: true, deleted: false });

  await env.DB.batch([
    env.DB.prepare('DELETE FROM collection_clones WHERE collection_id = ?').bind(collectionId),
    env.DB.prepare('DELETE FROM collection_rounds WHERE collection_id = ?').bind(collectionId),
    env.DB.prepare('DELETE FROM collections WHERE id = ?').bind(collectionId),
  ]);

  if (row.cover_r2_key) {
    try { await env.AUDIO.delete(row.cover_r2_key); } catch { /* orphan tolerated */ }
  }

  if (row.is_public) await bustOthersCache(env, ctx, request);

  return json({ ok: true, deleted: true });
}