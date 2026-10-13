// music-game-wrangler/src/controllers/profiles/profiles.js
import { json, error } from '../../lib/response.js';
import { generateRecoveryCode, normalizeRecoveryCode } from '../../utilities/profile/recoveryCode.js';
import {
  validateNickname,
  FAVORITES_PER_KIND_MAX,
  FAVORITES_TOTAL_MAX,
} from '../../utilities/profile/profileLimits.js';

export const PROFILE_FIELDS =
  'id, nickname, avatar_kind, avatar_style, avatar_seed, avatar_r2_key, created_at, updated_at';

export function serializeProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    nickname: row.nickname,
    avatar: {
      kind:  row.avatar_kind,
      style: row.avatar_style,
      seed:  row.avatar_seed,
      url:   row.avatar_r2_key ? `/profiles/${row.id}/avatar` : null,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializeFavorites(rows) {
  const favorites = { artists: [], genres: [], tracks: [], questionTypes: [] };
  for (const f of rows ?? []) {
    if (f.kind === 'artist')             favorites.artists.push(Number(f.value));
    else if (f.kind === 'genre')         favorites.genres.push(Number(f.value));
    else if (f.kind === 'track')         favorites.tracks.push(Number(f.value));
    else if (f.kind === 'question-type') favorites.questionTypes.push(f.value);
  }
  return favorites;
}

/**
 * Fetch a profile + its favorites, serialized for the API response.
 * Shared by every write handler that returns the full profile.
 */
export async function buildProfileResponse(env, id) {
  const row = await env.DB.prepare(
    `SELECT ${PROFILE_FIELDS} FROM profiles WHERE id = ?`
  ).bind(id).first();
  if (!row) return null;

  const { results } = await env.DB.prepare(
    'SELECT kind, value FROM profile_favorites WHERE profile_id = ?'
  ).bind(id).all();

  return {
    ...serializeProfile(row),
    favorites: serializeFavorites(results),
  };
}

/* ─────────────────────────────────────────────────────────────
   Handlers
   ───────────────────────────────────────────────────────────── */

export async function createProfile(request, env) {
  const body = await request.json().catch(() => null);
  const nick = validateNickname(body?.nickname);
  if (!nick.ok) return error(nick.error, 400);

  const id = crypto.randomUUID();

  let recoveryCode = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateRecoveryCode();
    const existing = await env.DB.prepare(
      'SELECT id FROM profiles WHERE recovery_code = ?'
    ).bind(candidate).first();
    if (!existing) { recoveryCode = candidate; break; }
  }
  if (!recoveryCode) {
    return error('Could not allocate a recovery code, try again', 500);
  }

  await env.DB.prepare(
    `INSERT INTO profiles (id, nickname, recovery_code)
     VALUES (?, ?, ?)`
  ).bind(id, nick.value, recoveryCode).run();

  const profile = await buildProfileResponse(env, id);
  return json({ profile, recoveryCode });
}

export async function recoverProfile(request, env) {
  const body = await request.json().catch(() => null);
  const code = normalizeRecoveryCode(body?.recoveryCode);
  if (!code) return error('recoveryCode is required', 400);

  const row = await env.DB.prepare(
    'SELECT id FROM profiles WHERE recovery_code = ?'
  ).bind(code).first();

  if (!row) return error('Invalid recovery code', 404);
  return json({ id: row.id });
}

export async function getProfile(request, env, { id }) {
  const profile = await buildProfileResponse(env, id);
  if (!profile) return error('Profile not found', 404);
  return json({ profile });
}

export async function patchProfile(request, env, { id }) {
  const body = await request.json().catch(() => null);
  if (!body) return error('Invalid body', 400);

  const row = await env.DB.prepare(
    'SELECT id FROM profiles WHERE id = ?'
  ).bind(id).first();
  if (!row) return error('Profile not found', 404);

  const updates = [];
  const binds = [];

  if (body.nickname !== undefined) {
    const nick = validateNickname(body.nickname);
    if (!nick.ok) return error(nick.error, 400);
    updates.push('nickname = ?');
    binds.push(nick.value);
  }

  if (body.avatar_style !== undefined) {
    updates.push('avatar_style = ?');
    binds.push(body.avatar_style ? String(body.avatar_style) : null);
  }

  if (body.avatar_seed !== undefined) {
    updates.push('avatar_seed = ?');
    binds.push(body.avatar_seed ? String(body.avatar_seed) : null);
  }

  if (body.avatar_style !== undefined) {
    updates.push("avatar_kind = 'generated'");
  }

  if (updates.length === 0) return error('No updates provided', 400);

  updates.push("updated_at = datetime('now')");

  await env.DB.prepare(
    `UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...binds, id).run();

  const profile = await buildProfileResponse(env, id);
  return json({ profile });
}

export async function saveProfile(request, env, { id }) {
  const body = await request.json().catch(() => null);
  if (!body) return error('Invalid body', 400);

  const row = await env.DB.prepare(
    'SELECT id FROM profiles WHERE id = ?'
  ).bind(id).first();
  if (!row) return error('Profile not found', 404);

  const updates = [];
  const binds = [];

  if (body.nickname !== undefined) {
    const nick = validateNickname(body.nickname);
    if (!nick.ok) return error(nick.error, 400);
    updates.push('nickname = ?');
    binds.push(nick.value);
  }

  if (body.avatar !== undefined) {
    const a = body.avatar ?? {};
    const kind = a.kind === 'uploaded' ? 'uploaded' : 'generated';

    updates.push('avatar_kind = ?');
    binds.push(kind);

    if (kind === 'generated') {
      updates.push('avatar_style = ?');
      binds.push(a.style ? String(a.style) : null);

      updates.push('avatar_seed = ?');
      binds.push(a.seed ? String(a.seed) : null);
    }
  }

  let favoritesToWrite = null;
  if (body.favorites !== undefined) {
    const f = body.favorites ?? {};

    const checkList = (raw, coerce) => {
      if (!Array.isArray(raw)) return [];
      return raw.map(coerce).filter(v => v !== null);
    };

    const asInt = (v) => {
      const n = Number(v);
      return Number.isInteger(n) && n > 0 ? n : null;
    };

    const asSlug = (v) => {
      const s = String(v ?? '').trim();
      return s.length > 0 && s.length <= 64 ? s : null;
    };

    const artists = checkList(f.artists,       asInt);
    const genres  = checkList(f.genres,        asInt);
    const tracks  = checkList(f.tracks,        asInt);
    const types   = checkList(f.questionTypes, asSlug);

    const total = artists.length + genres.length + tracks.length + types.length;

    if (artists.length > FAVORITES_PER_KIND_MAX) {
      return error(`Maximum ${FAVORITES_PER_KIND_MAX} artist favorites`, 400);
    }
    if (genres.length > FAVORITES_PER_KIND_MAX) {
      return error(`Maximum ${FAVORITES_PER_KIND_MAX} genre favorites`, 400);
    }
    if (tracks.length > FAVORITES_PER_KIND_MAX) {
      return error(`Maximum ${FAVORITES_PER_KIND_MAX} track favorites`, 400);
    }
    if (types.length > FAVORITES_PER_KIND_MAX) {
      return error(`Maximum ${FAVORITES_PER_KIND_MAX} question-type favorites`, 400);
    }
    if (total > FAVORITES_TOTAL_MAX) {
      return error(`Maximum ${FAVORITES_TOTAL_MAX} favorites total`, 400);
    }

    favoritesToWrite = { artists, genres, tracks, types };
  }

  const statements = [];

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    statements.push(
      env.DB.prepare(
        `UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`
      ).bind(...binds, id)
    );
  }

  if (favoritesToWrite) {
    statements.push(
      env.DB.prepare(
        'DELETE FROM profile_favorites WHERE profile_id = ?'
      ).bind(id)
    );

    const push = (kind, value) => {
      statements.push(
        env.DB.prepare(
          `INSERT INTO profile_favorites (profile_id, kind, value)
           VALUES (?, ?, ?)`
        ).bind(id, kind, String(value))
      );
    };

    for (const v of favoritesToWrite.artists) push('artist', v);
    for (const v of favoritesToWrite.genres)  push('genre',  v);
    for (const v of favoritesToWrite.tracks)  push('track',  v);
    for (const v of favoritesToWrite.types)   push('question-type', v);
  }

  if (statements.length === 0) {
    return error('No updates provided', 400);
  }

  await env.DB.batch(statements);

  const profile = await buildProfileResponse(env, id);
  return json({ profile });
}