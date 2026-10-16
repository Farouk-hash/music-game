// music-game-wrangler/src/controllers/follows.js
import { json, error } from '../../lib/response.js';

const UUID_RE = /^[0-9a-fA-F-]{36}$/;

/**
 * Resolve the acting profile from the `?as=<id>` query param.
 *
 * No auth in this project — the profile UUID is the credential.
 * Every write request MUST include `?as=<myProfileId>`.
 */
function getActor(request) {
  const url = new URL(request.url);
  const as = url.searchParams.get('as');
  if (!as || !UUID_RE.test(as)) return null;
  return as;
}

/**
 * Serialize a set of profile rows into the light shape the friends
 * list needs — id, nickname, avatar.
 */
function serializePlayer(row) {
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
   POST /follows?as=<me>            body { followeeId }
   ───────────────────────────────────────────────────────────── */
export async function sendRequest(request, env) {
  const me = getActor(request);
  if (!me) return error('?as=<profileId> is required', 400);

  const body = await request.json().catch(() => null);
  const followeeId = String(body?.followeeId ?? '').trim();
  if (!UUID_RE.test(followeeId)) return error('followeeId is required', 400);
  if (followeeId === me) return error('Cannot follow yourself', 400);

  // Verify both profiles exist.
  const rows = await env.DB.prepare(
    'SELECT id FROM profiles WHERE id IN (?, ?)'
  ).bind(me, followeeId).all();
  const found = new Set((rows.results ?? []).map((r) => r.id));
  if (!found.has(me)) return error('Actor profile not found', 404);
  if (!found.has(followeeId)) return error('Target profile not found', 404);

  // Does the reverse pending already exist? If so, accept the mutual
  // immediately — no second round trip.
  const reverse = await env.DB.prepare(
    `SELECT status FROM follows
      WHERE follower_id = ? AND followee_id = ?`
  ).bind(followeeId, me).first();

  const now = new Date().toISOString();

  if (reverse?.status === 'pending') {
    // Mutual accept: flip their row and insert ours, both 'accepted'.
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE follows SET status = 'accepted', accepted_at = ?
          WHERE follower_id = ? AND followee_id = ?`
      ).bind(now, followeeId, me),
      env.DB.prepare(
        `INSERT INTO follows (follower_id, followee_id, status, accepted_at)
         VALUES (?, ?, 'accepted', ?)
         ON CONFLICT(follower_id, followee_id)
         DO UPDATE SET status = 'accepted', accepted_at = ?`
      ).bind(me, followeeId, now, now),
    ]);

    return json({ ok: true, status: 'friends' });
  }

  if (reverse?.status === 'accepted') {
    // They already follow me (accepted). Just create my side accepted.
    await env.DB.prepare(
      `INSERT INTO follows (follower_id, followee_id, status, accepted_at)
       VALUES (?, ?, 'accepted', ?)
       ON CONFLICT(follower_id, followee_id) DO NOTHING`
    ).bind(me, followeeId, now).run();
    return json({ ok: true, status: 'friends' });
  }

  // Fresh request — insert pending. Idempotent.
  await env.DB.prepare(
    `INSERT INTO follows (follower_id, followee_id, status)
     VALUES (?, ?, 'pending')
     ON CONFLICT(follower_id, followee_id) DO NOTHING`
  ).bind(me, followeeId).run();

  return json({ ok: true, status: 'requested' });
}

/* ─────────────────────────────────────────────────────────────
   POST /follows/accept?as=<me>     body { followerId }
   ───────────────────────────────────────────────────────────── */
export async function acceptRequest(request, env) {
  const me = getActor(request);
  if (!me) return error('?as=<profileId> is required', 400);

  const body = await request.json().catch(() => null);
  const followerId = String(body?.followerId ?? '').trim();
  if (!UUID_RE.test(followerId)) return error('followerId is required', 400);

  const pending = await env.DB.prepare(
    `SELECT 1 FROM follows
      WHERE follower_id = ? AND followee_id = ? AND status = 'pending'`
  ).bind(followerId, me).first();

  if (!pending) return error('No pending request from that profile', 404);

  const now = new Date().toISOString();

  await env.DB.batch([
    // Flip their → me row to accepted.
    env.DB.prepare(
      `UPDATE follows SET status = 'accepted', accepted_at = ?
        WHERE follower_id = ? AND followee_id = ?`
    ).bind(now, followerId, me),
    // Auto-insert my → their row as accepted (the mutual handoff).
    env.DB.prepare(
      `INSERT INTO follows (follower_id, followee_id, status, accepted_at)
       VALUES (?, ?, 'accepted', ?)
       ON CONFLICT(follower_id, followee_id)
       DO UPDATE SET status = 'accepted', accepted_at = ?`
    ).bind(me, followerId, now, now),
  ]);

  return json({ ok: true, status: 'friends' });
}

/* ─────────────────────────────────────────────────────────────
   POST /follows/decline?as=<me>    body { followerId }
   ───────────────────────────────────────────────────────────── */
export async function declineRequest(request, env) {
  const me = getActor(request);
  if (!me) return error('?as=<profileId> is required', 400);

  const body = await request.json().catch(() => null);
  const followerId = String(body?.followerId ?? '').trim();
  if (!UUID_RE.test(followerId)) return error('followerId is required', 400);

  await env.DB.prepare(
    `DELETE FROM follows
      WHERE follower_id = ? AND followee_id = ? AND status = 'pending'`
  ).bind(followerId, me).run();

  return json({ ok: true });
}

/* ─────────────────────────────────────────────────────────────
   DELETE /follows?as=<me>&other=<id>
   Unfollow: removes both directions unconditionally.
   ───────────────────────────────────────────────────────────── */
export async function unfollow(request, env) {
  const me = getActor(request);
  if (!me) return error('?as=<profileId> is required', 400);

  const url = new URL(request.url);
  const other = url.searchParams.get('other');
  if (!UUID_RE.test(other ?? '')) return error('other is required', 400);

  await env.DB.prepare(
    `DELETE FROM follows
      WHERE (follower_id = ? AND followee_id = ?)
         OR (follower_id = ? AND followee_id = ?)`
  ).bind(me, other, other, me).run();

  return json({ ok: true });
}

/* ─────────────────────────────────────────────────────────────
   GET /follows/friends?as=<me>
   Accepted mutuals — people I follow AND who follow me.
   ───────────────────────────────────────────────────────────── */
export async function listFriends(request, env) {
  const me = getActor(request);
  if (!me) return error('?as=<profileId> is required', 400);

  const { results } = await env.DB.prepare(
    `SELECT p.id, p.nickname, p.avatar_kind, p.avatar_style, p.avatar_seed, p.avatar_r2_key
       FROM follows f
       JOIN profiles p ON p.id = f.followee_id
      WHERE f.follower_id = ? AND f.status = 'accepted'
        AND EXISTS (
          SELECT 1 FROM follows r
           WHERE r.follower_id = f.followee_id
             AND r.followee_id = f.follower_id
             AND r.status = 'accepted'
        )
      ORDER BY p.nickname COLLATE NOCASE ASC`
  ).bind(me).all();

  return json({
    ok: true,
    friends: (results ?? []).map(serializePlayer),
  });
}

/* ─────────────────────────────────────────────────────────────
   GET /follows/pending?as=<me>
   Both directions, split.
   ───────────────────────────────────────────────────────────── */
export async function listPending(request, env) {
  const me = getActor(request);
  if (!me) return error('?as=<profileId> is required', 400);

  const incoming = await env.DB.prepare(
    `SELECT p.id, p.nickname, p.avatar_kind, p.avatar_style, p.avatar_seed, p.avatar_r2_key, f.created_at
       FROM follows f
       JOIN profiles p ON p.id = f.follower_id
      WHERE f.followee_id = ? AND f.status = 'pending'
      ORDER BY f.created_at DESC`
  ).bind(me).all();

  const outgoing = await env.DB.prepare(
    `SELECT p.id, p.nickname, p.avatar_kind, p.avatar_style, p.avatar_seed, p.avatar_r2_key, f.created_at
       FROM follows f
       JOIN profiles p ON p.id = f.followee_id
      WHERE f.follower_id = ? AND f.status = 'pending'
      ORDER BY f.created_at DESC`
  ).bind(me).all();

  return json({
    ok: true,
    incoming: (incoming.results ?? []).map(serializePlayer),
    outgoing: (outgoing.results ?? []).map(serializePlayer),
  });
}

/* ─────────────────────────────────────────────────────────────
   GET /follows/status?as=<me>&target=<id>
   Single-target status, for the FollowButton.
   ───────────────────────────────────────────────────────────── */
export async function getStatus(request, env) {
  const me = getActor(request);
  if (!me) return error('?as=<profileId> is required', 400);

  const url = new URL(request.url);
  const target = url.searchParams.get('target');
  if (!UUID_RE.test(target ?? '')) return error('target is required', 400);

  if (target === me) return json({ ok: true, status: 'self' });

  const mine = await env.DB.prepare(
    `SELECT status FROM follows WHERE follower_id = ? AND followee_id = ?`
  ).bind(me, target).first();

  const theirs = await env.DB.prepare(
    `SELECT status FROM follows WHERE follower_id = ? AND followee_id = ?`
  ).bind(target, me).first();

  let status = 'none';
  if (mine?.status === 'accepted' && theirs?.status === 'accepted') status = 'friends';
  else if (mine?.status === 'pending')                              status = 'requested';
  else if (theirs?.status === 'pending')                            status = 'incoming';
  else if (mine?.status === 'accepted')                             status = 'following';

  return json({ ok: true, status });
}