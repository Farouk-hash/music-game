// music-game-wrangler/src/controllers/invites.js
import { json, error } from '../../lib/response.js';

const UUID_RE = /^[0-9a-fA-F-]{36}$/;
const CODE_RE = /^[A-Z0-9]{6}$/;

function getActor(request) {
  const url = new URL(request.url);
  const as = url.searchParams.get('as');
  if (!as || !UUID_RE.test(as)) return null;
  return as;
}

function serializeInviter(row) {
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
  };
}

/* ─────────────────────────────────────────────────────────────
   POST /invites?as=<host>
   body { roomCode, friendIds: [uuid, ...] }
   ───────────────────────────────────────────────────────────── */
export async function sendInvites(request, env) {
  const me = getActor(request);
  if (!me) return error('?as=<profileId> is required', 400);

  const body = await request.json().catch(() => null);
  const roomCode = String(body?.roomCode ?? '').trim().toUpperCase();
  const friendIds   = Array.isArray(body?.friendIds)   ? body.friendIds   : [];
  const revokedIds  = Array.isArray(body?.revokedIds)  ? body.revokedIds  : [];

  if (!CODE_RE.test(roomCode)) return error('roomCode is required', 400);

  const targets = Array.from(new Set(friendIds.filter((id) => UUID_RE.test(id))));
  const revokes = Array.from(new Set(revokedIds.filter((id) => UUID_RE.test(id))));

  // No-op if nothing to do.
  if (targets.length === 0 && revokes.length === 0) {
    return json({ ok: true, sent: 0, revoked: 0 });
  }

  if (targets.length > 50 || revokes.length > 50) {
    return error('Too many recipients', 400);
  }

  if (targets.includes(me)) return error('Cannot invite yourself', 400);

  // Verify mutual friendship for every target we're about to invite.
  // (We don't verify for revokes — you can always take back an invite.)
  if (targets.length > 0) {
    const placeholders = targets.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      `SELECT f.followee_id
         FROM follows f
        WHERE f.follower_id = ? AND f.status = 'accepted'
          AND f.followee_id IN (${placeholders})
          AND EXISTS (
            SELECT 1 FROM follows r
             WHERE r.follower_id = f.followee_id
               AND r.followee_id = f.follower_id
               AND r.status = 'accepted'
          )`
    ).bind(me, ...targets).all();

    const allowed = new Set((results ?? []).map((r) => r.followee_id));
    const rejected = targets.filter((id) => !allowed.has(id));
    if (rejected.length > 0) {
      return error(`Not friends with ${rejected.length} of the selected profiles`, 403);
    }
  }

  const statements = [];

  // Upsert invited rows.
  for (const friendId of targets) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO room_invites (profile_id, room_code, invited_by)
         VALUES (?, ?, ?)
         ON CONFLICT(profile_id, room_code)
         DO UPDATE SET
           invited_by = excluded.invited_by,
           created_at = excluded.created_at,
           seen_at    = NULL`
      ).bind(friendId, roomCode, me)
    );
  }

  // Delete revoked rows — only ones this host created for this room.
  if (revokes.length > 0) {
    const placeholders = revokes.map(() => '?').join(',');
    statements.push(
      env.DB.prepare(
        `DELETE FROM room_invites
          WHERE invited_by = ? AND room_code = ?
            AND profile_id IN (${placeholders})`
      ).bind(me, roomCode, ...revokes)
    );
  }

  await env.DB.batch(statements);

  return json({ ok: true, sent: targets.length, revoked: revokes.length });
}
/* ─────────────────────────────────────────────────────────────
   GET /invites/pending?as=<me>
   Unread invitations for the actor. Stale invites (>2h) hidden.
   ───────────────────────────────────────────────────────────── */
export async function listPendingInvites(request, env) {
  const me = getActor(request);
  if (!me) return error('?as=<profileId> is required', 400);

  const { results } = await env.DB.prepare(
    `SELECT i.id,
            i.room_code,
            i.created_at,
            p.id            AS inv_id,
            p.nickname      AS inv_nickname,
            p.avatar_kind   AS inv_avatar_kind,
            p.avatar_style  AS inv_avatar_style,
            p.avatar_seed   AS inv_avatar_seed,
            p.avatar_r2_key AS inv_avatar_r2_key
       FROM room_invites i
       JOIN profiles p ON p.id = i.invited_by
      WHERE i.profile_id = ? AND i.seen_at IS NULL
        AND i.created_at > datetime('now', '-2 hours')
      ORDER BY i.created_at DESC
      LIMIT 100`
  ).bind(me).all();

  const invites = (results ?? []).map((row) => ({
    id: row.id,
    roomCode: row.room_code,
    createdAt: row.created_at,
    inviter: serializeInviter({
      id: row.inv_id,
      nickname: row.inv_nickname,
      avatar_kind: row.inv_avatar_kind,
      avatar_style: row.inv_avatar_style,
      avatar_seed: row.inv_avatar_seed,
      avatar_r2_key: row.inv_avatar_r2_key,
    }),
  }));

  return json({ ok: true, invites });
}

/* ─────────────────────────────────────────────────────────────
   GET /invites/room?as=<host>&code=<roomCode>
   Who has this host already invited to this room? Used by the
   picker modal to pre-check friends who've already been invited.
   ───────────────────────────────────────────────────────────── */
export async function listRoomInvites(request, env) {
  const me = getActor(request);
  if (!me) return error('?as=<profileId> is required', 400);

  const url = new URL(request.url);
  const code = String(url.searchParams.get('code') ?? '').trim().toUpperCase();
  if (!CODE_RE.test(code)) return error('code is required', 400);

  const { results } = await env.DB.prepare(
    `SELECT profile_id
       FROM room_invites
      WHERE invited_by = ? AND room_code = ?`
  ).bind(me, code).all();

  return json({
    ok: true,
    invitedIds: (results ?? []).map((r) => r.profile_id),
  });
}

/* ─────────────────────────────────────────────────────────────
   POST /invites/dismiss?as=<me>
   body { inviteId }
   Hard delete — the row is gone.
   ───────────────────────────────────────────────────────────── */
export async function dismissInvite(request, env) {
  const me = getActor(request);
  if (!me) return error('?as=<profileId> is required', 400);

  const body = await request.json().catch(() => null);
  const inviteId = Number(body?.inviteId);
  if (!Number.isInteger(inviteId) || inviteId <= 0) {
    return error('inviteId is required', 400);
  }

  await env.DB.prepare(
    `DELETE FROM room_invites WHERE id = ? AND profile_id = ?`
  ).bind(inviteId, me).run();

  return json({ ok: true });
}


/* ─────────────────────────────────────────────────────────────
   POST /invites/cleanup-room
   body { roomCode }

   Internal — called by host-sporcle-wrangler when a room is
   destroyed. Deletes all invite rows for that room code.
   No `?as=` actor — this is a service-to-service call.
   ───────────────────────────────────────────────────────────── */
export async function cleanupRoomInvites(request, env) {
  const body = await request.json().catch(() => null);
  const roomCode = String(body?.roomCode ?? '').trim().toUpperCase();
  if (!CODE_RE.test(roomCode)) return error('roomCode is required', 400);

  const result = await env.DB.prepare(
    'DELETE FROM room_invites WHERE room_code = ?'
  ).bind(roomCode).run();

  return json({
    ok: true,
    deleted: result.meta?.changes ?? 0,
  });
}