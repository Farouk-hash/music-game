// host-sporcle-wrangler/src/controllers/host-sporcle.js
import { DurableObject } from 'cloudflare:workers';
import { fetchQuestions } from '../question-fetcher.js';
import { chatInsert, chatList } from './chat.js';

const MIN_PLAYERS = 2;
const COUNTDOWN_MS = 10000;
const SPORCLE_TIMER_SECONDS = 20;
const TIE_BREAKER_TIMER_SECONDS = 15;
const AUTO_ADVANCE_MS_LYRICS = 10000;
const ROOM_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours

// Heartbeat: a player silent for this long is marked as left (left = 2).
// Must stay well above the 3s poll interval + mobile timer throttling.
const HEARTBEAT_TIMEOUT_MS = 30000;
const SWEEP_INTERVAL_MS = 5000;
// Lobby is more forgiving: a timed-out host loses host status, and people
// often switch apps to share the room code.
const LOBBY_HEARTBEAT_TIMEOUT_MS = 2 * 60 * 1000;

/*
  players.left values:
    0 = present
    1 = explicit leave (button / tab-close beacon) – never auto-rejoined
    2 = timed out (heartbeat) – auto-rejoins on next poll / ping
*/

export class HostSporcle extends DurableObject {
  #lastSweep = 0;

  constructor(ctx, env) {
    super(ctx, env);

    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS room (
          id                    INTEGER PRIMARY KEY CHECK (id = 1),
          phase                 TEXT NOT NULL DEFAULT 'lobby',
          mode                  TEXT NOT NULL DEFAULT 'speed',
          config                TEXT NOT NULL DEFAULT '{}',
          auto_advance_seconds  INTEGER NOT NULL DEFAULT 0,
          version               INTEGER NOT NULL DEFAULT 0,
          q_index               INTEGER NOT NULL DEFAULT 0,
          q_deadline            INTEGER,
          expires_at            INTEGER,
          created_at            INTEGER NOT NULL,
          started_at            INTEGER,
          last_error            TEXT,
          tie_breaker           INTEGER NOT NULL DEFAULT 0,
          lobby_wait_started_at INTEGER,
          lobby_wait_reason     TEXT
        );
        CREATE TABLE IF NOT EXISTS players (
          id         TEXT PRIMARY KEY,
          name       TEXT NOT NULL,
          is_host    INTEGER NOT NULL DEFAULT 0,
          ready      INTEGER NOT NULL DEFAULT 0,
          score      INTEGER NOT NULL DEFAULT 0,
          locked     INTEGER NOT NULL DEFAULT 0,
          left       INTEGER NOT NULL DEFAULT 0,
          last_seen  INTEGER NOT NULL DEFAULT 0,
          profile_id TEXT
        );
        CREATE TABLE IF NOT EXISTS questions (
          idx     INTEGER PRIMARY KEY,
          payload TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS answers (
          player_id   TEXT NOT NULL,
          q_idx       INTEGER NOT NULL,
          typed       TEXT NOT NULL,
          correct     INTEGER NOT NULL DEFAULT 0,
          answered_at INTEGER NOT NULL,
          PRIMARY KEY (player_id, q_idx)
        );
        CREATE TABLE IF NOT EXISTS messages (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          player_id   TEXT NOT NULL,
          text        TEXT NOT NULL,
          created_at  INTEGER NOT NULL
        );
      `);

      // Migration: last_seen (v70)
      try {
        ctx.storage.sql.exec(
          'ALTER TABLE players ADD COLUMN last_seen INTEGER NOT NULL DEFAULT 0'
        );
      } catch { /* column already exists */ }
      try {
        ctx.storage.sql.exec(
          'UPDATE players SET last_seen = ? WHERE last_seen = 0',
          Date.now()
        );
      } catch { /* ignore */ }

      // Migration: lobby wait window (v71)
      try {
        ctx.storage.sql.exec(
          'ALTER TABLE room ADD COLUMN lobby_wait_started_at INTEGER'
        );
      } catch { /* column already exists */ }
      try {
        ctx.storage.sql.exec(
          'ALTER TABLE room ADD COLUMN lobby_wait_reason TEXT'
        );
      } catch { /* column already exists */ }
    });
  }

  /* ── Internal helpers ─────────────────────────────────── */

  #getRoom() {
    try {
      const rows = this.ctx.storage.sql
        .exec('SELECT * FROM room WHERE id = 1')
        .toArray();
      return rows[0] ?? null;
    } catch {
      return null;
    }
  }

  #getPlayer(playerId) {
    try {
      const rows = this.ctx.storage.sql
        .exec('SELECT * FROM players WHERE id = ?', playerId)
        .toArray();
      return rows[0] ?? null;
    } catch {
      // Tables can vanish if the room was destroyed mid-request.
      return null;
    }
  }

  #bumpVersion() {
    this.ctx.storage.sql.exec('UPDATE room SET version = version + 1 WHERE id = 1');
    return this.#getRoom().version;
  }

  #now() { return Date.now(); }

  #touchExpiry() {
    this.ctx.storage.sql.exec(
      'UPDATE room SET expires_at = ? WHERE id = 1',
      this.#now() + ROOM_EXPIRY_MS
    );
  }

  /* ── Lobby wait window (alone / no-ready / host-idle) ── */

  /**
   * Recompute the lobby-wait window.
   *
   *   'alone'     – host is the only active player
   *   'no-ready'  – ≥2 active players, none of the non-hosts readied
   *   'host-idle' – ≥2 active players, ALL non-hosts readied, host hasn't started
   *   null        – not waiting (game started, or no meaningful wait)
   *
   * If the reason changes (e.g. someone joins, or someone readies),
   * the clock RESETS. If the reason is the same, the clock is preserved.
   * Only bumps the version when the reason actually changes.
   */
  #refreshLobbyWaitWindow() {
    const room = this.#getRoom();
    if (!room) return;

    // Not in lobby → no window.
    if (room.phase !== 'lobby') {
      if (room.lobby_wait_started_at != null || room.lobby_wait_reason != null) {
        this.ctx.storage.sql.exec(
          'UPDATE room SET lobby_wait_started_at = NULL, lobby_wait_reason = NULL WHERE id = 1'
        );
        this.#bumpVersion();
      }
      return;
    }

    const activeCount = this.ctx.storage.sql
      .exec('SELECT COUNT(*) AS n FROM players WHERE left = 0')
      .one().n;
    const hostCount = this.ctx.storage.sql
      .exec('SELECT COUNT(*) AS n FROM players WHERE left = 0 AND is_host = 1')
      .one().n;
    const nonHostActive = this.ctx.storage.sql
      .exec('SELECT COUNT(*) AS n FROM players WHERE left = 0 AND is_host = 0')
      .one().n;
    const readyNonHost = this.ctx.storage.sql
      .exec('SELECT COUNT(*) AS n FROM players WHERE left = 0 AND is_host = 0 AND ready = 1')
      .one().n;

    let reason = null;
    if (activeCount === 1 && hostCount === 1) {
      reason = 'alone';
    } else if (nonHostActive > 0 && readyNonHost === 0) {
      reason = 'no-ready';
    } else if (nonHostActive > 0 && readyNonHost === nonHostActive) {
      // Everyone except the host is ready — host must start.
      reason = 'host-idle';
    }

    if (reason === room.lobby_wait_reason) {
      // Same reason → keep the existing clock.
      return;
    }

    if (reason == null) {
      this.ctx.storage.sql.exec(
        'UPDATE room SET lobby_wait_started_at = NULL, lobby_wait_reason = NULL WHERE id = 1'
      );
    } else {
      this.ctx.storage.sql.exec(
        'UPDATE room SET lobby_wait_started_at = ?, lobby_wait_reason = ? WHERE id = 1',
        this.#now(), reason
      );
    }
    this.#bumpVersion();
  }

  /* ── Heartbeat ────────────────────────────────────────── */

  #touchPlayer(playerId) {
    if (!playerId) return;
    try {
      this.ctx.storage.sql.exec(
        'UPDATE players SET last_seen = ? WHERE id = ?',
        this.#now(), playerId
      );
    } catch { /* room destroyed */ }
  }

  async #heartbeat(playerId) {
    try {
      if (playerId) {
        const p = this.#getPlayer(playerId);
        if (p) {
          this.#touchPlayer(playerId);
          // Came back after a timeout (not an explicit leave).
          if (p.left === 2) {
            const room = this.#getRoom();
            if (room) await this.#rejoin(p, room);
          }
        }
      }
      await this.#sweepStale();
    } catch (e) {
      console.error('[heartbeat] failed', e);
    }
  }

  async #sweepStale() {
    const now = this.#now();
    if (now - this.#lastSweep < SWEEP_INTERVAL_MS) return;
    this.#lastSweep = now;

    const room0 = this.#getRoom();
    if (!room0) return;
    const timeout = room0.phase === 'lobby'
      ? LOBBY_HEARTBEAT_TIMEOUT_MS
      : HEARTBEAT_TIMEOUT_MS;

    const stale = this.ctx.storage.sql
      .exec(
        'SELECT id FROM players WHERE left = 0 AND last_seen > 0 AND last_seen < ?',
        now - timeout
      )
      .toArray();

    for (const row of stale) {
      const room = this.#getRoom();
      if (!room) return;
      const p = this.#getPlayer(row.id);
      if (!p || p.left) continue;
      await this.#leave(p, room, 2);
    }
  }

  /* ── Public RPC methods ───────────────────────────────── */

  async init(hostName, config = {}, mode = 'speed', autoAdvanceSeconds = 0, profileId = null) {
    const sql = this.ctx.storage.sql;
    if (this.#getRoom()) return { ok: false, error: 'Room already exists' };

    sql.exec(
      `INSERT INTO room (id, phase, mode, config, auto_advance_seconds, created_at, expires_at)
       VALUES (1, 'lobby', ?, ?, ?, ?, ?)`,
      mode,
      JSON.stringify(config ?? {}),
      autoAdvanceSeconds,
      this.#now(),
      this.#now() + ROOM_EXPIRY_MS
    );

    const hostId = crypto.randomUUID();
    sql.exec(
      'INSERT INTO players (id, name, is_host, profile_id, last_seen) VALUES (?, ?, 1, ?, ?)',
      hostId,
      hostName,
      profileId,
      this.#now()
    );

    this.#bumpVersion();
    this.#refreshLobbyWaitWindow();
    await this.ctx.storage.setAlarm(this.#now() + ROOM_EXPIRY_MS);
    return { ok: true, hostId };
  }

  async join(name, profileId = null) {
    const room = this.#getRoom();
    if (!room) return { ok: false, error: 'Room not found' };
    if (room.phase !== 'lobby') return { ok: false, error: 'Game already started' };

    const playerId = crypto.randomUUID();
    this.ctx.storage.sql.exec(
      'INSERT INTO players (id, name, profile_id, last_seen) VALUES (?, ?, ?, ?)',
      playerId,
      name,
      profileId,
      this.#now()
    );
    this.#touchExpiry();
    this.#bumpVersion();
    this.#refreshLobbyWaitWindow();
    return { ok: true, playerId };
  }

  async getState(sinceVersion = 0, playerId = null) {
    if (!this.#getRoom()) return { ok: false, error: 'Room not found' };

    await this.#heartbeat(playerId);
    const room = this.#getRoom();
    if (!room) return { ok: false, error: 'Room not found' };

    if (sinceVersion > 0 && room.version <= sinceVersion) {
      await new Promise(r => setTimeout(r, 3000));
      await this.#heartbeat(playerId);

      const fresh = this.#getRoom();
      if (!fresh) return { ok: false, error: 'Room not found' };

      if (fresh.version <= sinceVersion) {
        return { ok: true, unchanged: true, version: fresh.version };
      }
    }

    const latest = this.#getRoom();
    if (!latest) return { ok: false, error: 'Room not found' };

    return this.#buildState(latest);
  }

  #buildState(room) {
    const sql = this.ctx.storage.sql;
    const players = sql
      .exec('SELECT id, name, is_host, ready, score, locked, left, profile_id FROM players')
      .toArray();
    const config = JSON.parse(room.config ?? '{}');

    const state = {
      ok: true,
      version: room.version,
      phase: room.phase,
      mode: room.mode,
      qIndex: room.q_index,
      deadline: room.q_deadline,
      countdownEndsAt: room.phase === 'countdown'
        ? (room.started_at ?? 0) + COUNTDOWN_MS
        : null,
      autoAdvanceSeconds: room.auto_advance_seconds,
      reversed: config.reversed ?? 'no',
      rendition: config.rendition ?? 'forward',
      lastError: room.last_error ?? null,
      isTieBreaker: !!room.tie_breaker,
      roomConfig: config,
      lobbyWaitStartedAt: room.lobby_wait_started_at ?? null,
      lobbyWaitReason:    room.lobby_wait_reason     ?? null,
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        isHost: !!p.is_host,
        profileId: p.profile_id ?? null,
        ready: !!p.ready,
        score: p.score,
        locked: !!p.locked,
        left: !!p.left,
      })),
      totalQuestions: sql.exec('SELECT COUNT(*) AS n FROM questions').one().n,
    };

    if (room.phase === 'question') {
      const q = this.#getQuestion(room.q_index);
      if (q) state.question = this.#shapeQuestionForQuestionPhase(q);
    } else if (room.phase === 'reveal') {
      const q = this.#getQuestion(room.q_index);
      if (q) state.reveal = this.#shapeReveal(room, q);
    } else if (room.phase === 'finished') {
      state.finished = this.#shapeFinished();
    }

    state.messages = chatList(sql);
    return state;
  }

  #shapeQuestionForQuestionPhase(q) {
    const { correctValue, ...rest } = q;
    return rest;
  }

  #shapeReveal(room, q) {
    const answers = this.ctx.storage.sql
      .exec('SELECT player_id, typed, correct FROM answers WHERE q_idx = ?', room.q_index)
      .toArray();
    return {
      idx: q.idx,
      type: q.type,
      prompt: q.prompt,
      options: q.options,
      correctValue: q.correctValue,
      source: q.source ?? null,
      clip: q.clip,
      answers: answers.map(a => ({
        playerId: a.player_id,
        typed: a.typed,
        correct: !!a.correct,
      })),
    };
  }

  #shapeFinished() {
    const sql = this.ctx.storage.sql;

    const players = sql
      .exec('SELECT id, name, score, profile_id FROM players ORDER BY score DESC, name ASC')
      .toArray();

    const top = players[0]?.score ?? 0;
    const winners = players.filter(p => p.score === top);
    const winnerId = winners.length === 1 ? winners[0].id : null;

    const questions = sql
      .exec('SELECT idx, payload FROM questions ORDER BY idx ASC')
      .toArray();

    const perQuestion = [];
    for (const row of questions) {
      const q = JSON.parse(row.payload);
      const answers = sql
        .exec('SELECT player_id, correct FROM answers WHERE q_idx = ?', row.idx)
        .toArray();
      perQuestion.push({
        idx: row.idx,
        correctValue: q.correctValue,
        winners: answers.filter(a => a.correct).map(a => a.player_id),
      });
    }

    return {
      winnerId,
      standings: players.map(p => ({
        playerId: p.id,
        score: p.score,
        name: p.name,
        profileId: p.profile_id,
      })),
      perQuestion,
    };
  }

  async handleAction(playerId, action) {
     const room = this.#getRoom();
  if (!room) {
    // Room already destroyed. `leave`, `ping`, `rejoin`, `force_close` are
    // safe no-ops — clients might race with a destroy after a broadcast.
    const type = action?.type;
    if (
      type === 'leave' ||
      type === 'ping' ||
      type === 'rejoin' ||
      type === 'force_close'
    ) {
      return { ok: true, version: 0 };
    }
    return { ok: false, error: 'Room not found' };
  }

  const player = this.#getPlayer(playerId);
    if (!player) {
      // Player row was already deleted (e.g. hard leave in lobby).
      // Don't error — the operation is effectively already done.
      const type = action?.type;
      if (
        type === 'leave' ||
        type === 'ping' ||
        type === 'force_close'
      ) {
        return { ok: true, version: 0 };
      }
      return { ok: false, error: 'Player not in this room' };
    }

    const type = action?.type;

    // ping / leave / rejoin must work for players already marked left:
    //  - ping   → auto-rejoin when left === 2
    //  - leave  → upgrade a timeout (2) to an explicit leave (1)
    //  - rejoin → explicit rejoin
    if (type !== 'rejoin' && type !== 'ping' && type !== 'leave' && player.left) {
      return { ok: false, error: 'Player has left' };
    }

    if (type === 'ping') {
      this.#touchPlayer(playerId);
      if (player.left === 2) return this.#rejoin(player, room);
      return { ok: true, version: room.version, left: player.left === 1 };
    }

    if (type === 'ready')        return this.#ready(player, room, action);
    if (type === 'start')        return this.#start(player, room);
    if (type === 'answer')       return this.#answer(player, room, action);
    if (type === 'advance')      return this.#advance(player, room);
    // `beacon: true` is sent by the tab-close beacon. In the lobby that must
    // only MARK the player as left (so a refresh can rejoin). The explicit
    // Leave button sends no flag and still removes the player from the lobby.
    if (type === 'leave')        return this.#leave(player, room, 1, { soft: !!action.beacon });
    if (type === 'reset')        return this.#reset(player, room);
    if (type === 'rejoin')       return this.#rejoin(player, room);
    if (type === 'chat')         return this.#chat(player, room, action);
    if (type === 'start_again')  return this.#startAgain(player, room, action);
    if (type === 'force_close')  return this.#forceClose(player, room);

    return { ok: false, error: `Unknown action: ${type}` };
  }

  async #ready(player, room, action) {
    if (room.phase !== 'lobby') return { ok: false, error: 'Not in lobby' };
    if (player.is_host) return { ok: false, error: 'Host does not ready up' };

    this.ctx.storage.sql.exec(
      'UPDATE players SET ready = ? WHERE id = ?',
      action.ready ? 1 : 0,
      player.id
    );
    this.#touchExpiry();
    const version = this.#bumpVersion();
    this.#refreshLobbyWaitWindow();
    return { ok: true, version };
  }

  async #start(player, room) {
    if (room.phase !== 'lobby') return { ok: false, error: 'Not in lobby' };
    if (!player.is_host) return { ok: false, error: 'Host only' };

    const sql = this.ctx.storage.sql;
    const total = sql
      .exec('SELECT COUNT(*) AS n FROM players WHERE left = 0')
      .one().n;
    if (total < MIN_PLAYERS) {
      return { ok: false, error: `Need ${MIN_PLAYERS} players to start, ${total} present` };
    }

    const notReady = sql
      .exec('SELECT COUNT(*) AS n FROM players WHERE is_host = 0 AND ready = 0 AND left = 0')
      .one().n;
    if (notReady > 0) {
      return { ok: false, error: `${notReady} player(s) not ready` };
    }

    // Clear the lobby-wait window in the same statement that leaves the lobby.
    sql.exec(
      `UPDATE room
          SET phase = ?,
              started_at = ?,
              last_error = NULL,
              lobby_wait_started_at = NULL,
              lobby_wait_reason = NULL
        WHERE id = 1`,
      'loading',
      this.#now()
    );
    this.#touchExpiry();
    const version = this.#bumpVersion();

    this.ctx.waitUntil(this.#loadQuestionsAndCountdown());

    return { ok: true, version };
  }

  async #loadQuestionsAndCountdown() {
    const room = this.#getRoom();
    if (!room) return;

    let questions;
    try {
      const config = JSON.parse(room.config ?? '{}');
      questions = await fetchQuestions(this.env, config);
    } catch (e) {
      this.ctx.storage.sql.exec(
        `UPDATE room SET phase = 'lobby', started_at = NULL, last_error = ? WHERE id = 1`,
        `Could not load questions: ${e.message}`
      );
      this.#bumpVersion();
      this.#refreshLobbyWaitWindow();
      return;
    }

    if (questions.length === 0) {
      this.ctx.storage.sql.exec(
        `UPDATE room SET phase = 'lobby', started_at = NULL, last_error = ? WHERE id = 1`,
        'No questions available for this scope'
      );
      this.#bumpVersion();
      this.#refreshLobbyWaitWindow();
      return;
    }

    const sql = this.ctx.storage.sql;
    sql.exec('DELETE FROM questions');
    for (const q of questions) {
      sql.exec('INSERT INTO questions (idx, payload) VALUES (?, ?)', q.idx, JSON.stringify(q));
    }
    sql.exec('DELETE FROM answers');

    sql.exec(
      'UPDATE room SET phase = ?, started_at = ?, q_index = 0, q_deadline = NULL, last_error = NULL WHERE id = 1',
      'countdown',
      this.#now()
    );
    this.#bumpVersion();

    await this.ctx.storage.setAlarm(this.#now() + COUNTDOWN_MS);
  }

  async #answer(player, room, action) {
    if (room.phase !== 'question') return { ok: false, error: 'Not in question phase' };
    if (player.locked) return { ok: false, error: 'Already answered this question' };

    const existing = this.ctx.storage.sql.exec(
      'SELECT 1 FROM answers WHERE player_id = ? AND q_idx = ? LIMIT 1',
      player.id, room.q_index
    ).toArray();
    if (existing.length > 0) {
      this.ctx.storage.sql.exec('UPDATE players SET locked = 1 WHERE id = ?', player.id);
      return { ok: false, error: 'Already answered this question' };
    }

    const q = this.#getQuestion(room.q_index);
    if (!q) return { ok: false, error: 'No active question' };

    const typed = String(action.typed ?? '');
    const correct = isCorrect(q, typed) ? 1 : 0;

    this.ctx.storage.sql.exec(
      `INSERT INTO answers (player_id, q_idx, typed, correct, answered_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(player_id, q_idx) DO NOTHING`,
      player.id, room.q_index, typed, correct, this.#now()
    );
    this.ctx.storage.sql.exec('UPDATE players SET locked = 1 WHERE id = ?', player.id);
    this.#touchExpiry();

    const isTieBreaker = room.tie_breaker === 1;

    // Speed mode or tie-breaker: first correct answer ends the round.
    if ((room.mode === 'speed' || isTieBreaker) && correct === 1) {
      await this.#endQuestion();
      return { ok: true, correct: true, ended: true, version: this.#getRoom().version };
    }

    // Both modes: if everyone has answered (correct or wrong), end the round.
    const total = this.ctx.storage.sql
      .exec('SELECT COUNT(*) AS n FROM players WHERE left = 0')
      .one().n;
    const answered = this.ctx.storage.sql
      .exec(
        `SELECT COUNT(*) AS n FROM answers a
          JOIN players p ON p.id = a.player_id
         WHERE a.q_idx = ? AND p.left = 0`,
        room.q_index
      )
      .one().n;

    if (answered >= total) {
      await this.#endQuestion();
      return { ok: true, correct: correct === 1, ended: true, version: this.#getRoom().version };
    }

    const version = this.#bumpVersion();
    return { ok: true, correct: correct === 1, ended: false, version };
  }

  /* ── tie-breaker check ────────────────────────────────── */
  async #checkTieBreaker(room) {
    const sql = this.ctx.storage.sql;

    const topRow = sql.exec(
      'SELECT MAX(score) AS m FROM players WHERE left = 0'
    ).one();
    const topScore = topRow?.m ?? 0;

    const tied = sql.exec(
      'SELECT id FROM players WHERE left = 0 AND score = ?', topScore
    ).toArray();

    if (tied.length < 2) return false;

    const config = JSON.parse(room.config ?? '{}');
    config.count = 3;

    let questions = [];
    try {
      questions = await fetchQuestions(this.env, config);
    } catch (e) {
      console.error('[tie-breaker] fetch failed', e);
      return false;
    }

    if (!questions || questions.length === 0) return false;

    sql.exec('DELETE FROM questions');
    for (let i = 0; i < questions.length; i++) {
      questions[i].idx = i;
      sql.exec('INSERT INTO questions (idx, payload) VALUES (?, ?)', i, JSON.stringify(questions[i]));
    }
    sql.exec('DELETE FROM answers');

    const tiedIds = tied.map(p => p.id);
    const placeholders = tiedIds.map(() => '?').join(',');

    // Only tied players can answer. Non-tied players are locked.
    sql.exec(
      `UPDATE players SET locked = CASE WHEN id IN (${placeholders}) THEN 0 ELSE 1 END WHERE left = 0`,
      ...tiedIds
    );

    sql.exec(
      'UPDATE room SET phase = ?, q_index = 0, q_deadline = ?, started_at = ?, tie_breaker = 1 WHERE id = 1',
      'question',
      this.#now() + TIE_BREAKER_TIMER_SECONDS * 1000,
      this.#now()
    );

    this.#bumpVersion();
    await this.ctx.storage.setAlarm(this.#now() + TIE_BREAKER_TIMER_SECONDS * 1000);
    return true;
  }

  async #advance(player, room) {
    if (room.phase !== 'reveal') return { ok: false, error: 'Not in reveal phase' };
    if (!player.is_host) return { ok: false, error: 'Host only' };

    const total = this.ctx.storage.sql.exec('SELECT COUNT(*) AS n FROM questions').one().n;
    const next = room.q_index + 1;

    // ── TIE-BREAKER ADVANCE ──
    if (room.tie_breaker === 1) {
      const topRow = this.ctx.storage.sql.exec(
        'SELECT MAX(score) AS m FROM players WHERE left = 0'
      ).one();
      const topScore = topRow?.m ?? 0;
      const tied = this.ctx.storage.sql.exec(
        'SELECT id FROM players WHERE left = 0 AND score = ?', topScore
      ).toArray();

      if (tied.length === 1) {
        this.ctx.storage.sql.exec(
          'UPDATE room SET phase = ?, q_deadline = NULL WHERE id = 1',
          'finished'
        );
        this.#touchExpiry();
        const version = this.#bumpVersion();
        return { ok: true, finished: true, version };
      }

      if (next < total) {
        this.ctx.storage.sql.exec(
          'UPDATE room SET phase = ?, q_index = ?, q_deadline = ? WHERE id = 1',
          'question',
          next,
          this.#now() + TIE_BREAKER_TIMER_SECONDS * 1000
        );
        const placeholders = tied.map(() => '?').join(',');
        this.ctx.storage.sql.exec(
          `UPDATE players SET locked = CASE WHEN id IN (${placeholders}) THEN 0 ELSE 1 END WHERE left = 0`,
          ...tied.map(p => p.id)
        );
        this.#touchExpiry();
        const version = this.#bumpVersion();
        await this.ctx.storage.setAlarm(this.#now() + TIE_BREAKER_TIMER_SECONDS * 1000);
        return { ok: true, qIndex: next, version };
      }

      const stillTied = await this.#checkTieBreaker(room);
      if (stillTied) {
        return { ok: true, tieBreaker: true, version: this.#getRoom().version };
      }

      this.ctx.storage.sql.exec(
        'UPDATE room SET phase = ?, q_deadline = NULL WHERE id = 1',
        'finished'
      );
      this.#touchExpiry();
      const version = this.#bumpVersion();
      return { ok: true, finished: true, version };
    }

    // ── NORMAL GAME ADVANCE ──
    if (next >= total) {
      const isTie = await this.#checkTieBreaker(room);
      if (isTie) {
        return { ok: true, tieBreaker: true, version: this.#getRoom().version };
      }
      this.ctx.storage.sql.exec(
        'UPDATE room SET phase = ?, q_deadline = NULL WHERE id = 1',
        'finished'
      );
      this.#touchExpiry();
      const version = this.#bumpVersion();
      return { ok: true, finished: true, version };
    }

    this.ctx.storage.sql.exec(
      'UPDATE room SET phase = ?, q_index = ?, q_deadline = ? WHERE id = 1',
      'question',
      next,
      this.#now() + SPORCLE_TIMER_SECONDS * 1000
    );
    this.ctx.storage.sql.exec('UPDATE players SET locked = 0 WHERE left = 0');
    this.#touchExpiry();
    const version = this.#bumpVersion();
    await this.ctx.storage.setAlarm(this.#now() + SPORCLE_TIMER_SECONDS * 1000);
    return { ok: true, qIndex: next, version };
  }

  /*
    leftValue: 1 = explicit leave, 2 = heartbeat timeout.
  */
  async #leave(player, room, leftValue = 1, { soft = false } = {}) {
    const sql = this.ctx.storage.sql;

    // Idempotent: repeated beacons / sweeps are no-ops.
    if (player.left === 1 || (player.left === 2 && leftValue === 2)) {
      return { ok: true, version: room.version, alreadyLeft: true };
    }

    // Timed-out player now leaves explicitly: upgrade so they won't auto-rejoin.
    if (player.left === 2 && leftValue === 1) {
      sql.exec('UPDATE players SET left = 1 WHERE id = ?', player.id);
      const version = this.#bumpVersion();
      this.#refreshLobbyWaitWindow();
      return { ok: true, version };
    }

    // Lobby + deliberate Leave button → remove the row.
    // Everything else (tab-close beacon, heartbeat timeout, in-game leaves)
    // → keep the row, mark as left, so the roster shows "left" and the
    // player can come back.
    const hardDelete = room.phase === 'lobby' && !soft && leftValue === 1;

    if (hardDelete) {
      sql.exec('DELETE FROM players WHERE id = ?', player.id);

      const remaining = sql
        .exec('SELECT COUNT(*) AS n FROM players')
        .one().n;

      if (remaining === 0) {
        await this.ctx.storage.deleteAll();
        return { ok: true, version: 0 };
      }

      if (player.is_host) {
        this.#promoteNextHost();
      }
    } else {
      // Mark as left (in-game, or soft leave in the lobby).
      sql.exec('UPDATE players SET left = ? WHERE id = ?', leftValue, player.id);

      // Host left mid-game: demote and transfer host status.
      if (player.is_host) {
        sql.exec('UPDATE players SET is_host = 0 WHERE id = ?', player.id);
        this.#promoteNextHost();
      }
    }

    this.#touchExpiry();
    const version = this.#bumpVersion();
    this.#refreshLobbyWaitWindow();

    if (room.phase === 'question') {
      const total = sql
        .exec('SELECT COUNT(*) AS n FROM players WHERE left = 0')
        .one().n;
      const answered = sql
        .exec(
          `SELECT COUNT(*) AS n FROM answers a
            JOIN players p ON p.id = a.player_id
           WHERE a.q_idx = ? AND p.left = 0`,
          room.q_index
        )
        .one().n;
      if (total > 0 && answered >= total) {
        await this.#endQuestion();
      }
    }

    return { ok: true, version };
  }

  async #rejoin(player, room) {
    if (!player.left) return { ok: true, version: room.version };

    const inQuestion = room.phase === 'question';
    const existingAnswer = inQuestion
      ? this.ctx.storage.sql
          .exec(
            'SELECT 1 FROM answers WHERE player_id = ? AND q_idx = ? LIMIT 1',
            player.id, room.q_index
          )
          .toArray()
      : [];
    const hasAnsweredCurrent = existingAnswer.length > 0;

    const activeHost = this.ctx.storage.sql
      .exec('SELECT id FROM players WHERE is_host = 1 AND left = 0 LIMIT 1')
      .toArray();

    const shouldClearHostFlag =
      player.is_host &&
      activeHost.length > 0 &&
      activeHost[0].id !== player.id;

    const lockedValue = hasAnsweredCurrent ? 1 : 0;

    const setClauses = [
      'left = 0',
      `locked = ${lockedValue}`,
      'last_seen = ' + this.#now(),
      shouldClearHostFlag ? 'is_host = 0' : null,
    ]
      .filter(Boolean)
      .join(', ');

    this.ctx.storage.sql.exec(
      `UPDATE players SET ${setClauses} WHERE id = ?`,
      player.id
    );

    this.#touchExpiry();
    const version = this.#bumpVersion();
    this.#refreshLobbyWaitWindow();
    return { ok: true, version };
  }

  #promoteNextHost() {
    const sql = this.ctx.storage.sql;

    const alreadyHost = sql
      .exec('SELECT id FROM players WHERE is_host = 1 AND left = 0 LIMIT 1')
      .toArray();
    if (alreadyHost.length > 0) return;

    sql.exec('UPDATE players SET is_host = 0 WHERE is_host = 1');

    const next = sql
      .exec('SELECT id FROM players WHERE left = 0 ORDER BY rowid ASC LIMIT 1')
      .toArray();
    if (next[0]) {
      sql.exec('UPDATE players SET is_host = 1 WHERE id = ?', next[0].id);
    }
  }

  async #reset(player, room) {
    if (!player.is_host) return { ok: false, error: 'Host only' };
    if (room.phase !== 'finished' && room.phase !== 'lobby') {
      return { ok: false, error: 'Can only reset from finished or lobby' };
    }

    const sql = this.ctx.storage.sql;
    sql.exec('DELETE FROM questions');
    sql.exec('DELETE FROM answers');
    sql.exec('UPDATE players SET score = 0, ready = 0, locked = 0');
    sql.exec(
      `UPDATE room
          SET phase = 'lobby',
              q_index = 0,
              q_deadline = NULL,
              started_at = NULL,
              last_error = NULL,
              tie_breaker = 0,
              lobby_wait_started_at = NULL,
              lobby_wait_reason = NULL,
              version = version + 1
        WHERE id = 1`
    );
    this.#touchExpiry();

    const version = this.#getRoom().version;
    this.#refreshLobbyWaitWindow();
    await this.ctx.storage.deleteAlarm();
    return { ok: true, version };
  }

  /**
   * Host-only force close: destroys the room immediately.
   * Used when the lobby has been sitting idle (nobody ready, host not
   * starting, or host alone for too long).
   */
  async #forceClose(player, room) {
    if (!player.is_host) return { ok: false, error: 'Host only' };
    await this.ctx.storage.deleteAll();
    return { ok: true, version: 0 };
  }

  async alarm() {
    const room = this.#getRoom();
    if (!room) return;

    if (room.expires_at && this.#now() >= room.expires_at) {
      await this.ctx.storage.deleteAll();
      return;
    }

    if (room.phase === 'loading') {
      return;
    }

    if (room.phase === 'countdown') {
      this.ctx.storage.sql.exec(
        'UPDATE room SET phase = ?, q_deadline = ? WHERE id = 1',
        'question',
        this.#now() + SPORCLE_TIMER_SECONDS * 1000
      );
      this.#bumpVersion();
      await this.ctx.storage.setAlarm(this.#now() + SPORCLE_TIMER_SECONDS * 1000);
      return;
    }

    if (room.phase === 'question') {
      await this.#endQuestion();
      return;
    }

    if (room.phase === 'reveal') {
      const total = this.ctx.storage.sql.exec('SELECT COUNT(*) AS n FROM questions').one().n;
      const next = room.q_index + 1;

      // ── TIE-BREAKER ALARM ──
      if (room.tie_breaker === 1) {
        const topRow = this.ctx.storage.sql.exec(
          'SELECT MAX(score) AS m FROM players WHERE left = 0'
        ).one();
        const topScore = topRow?.m ?? 0;
        const tied = this.ctx.storage.sql.exec(
          'SELECT id FROM players WHERE left = 0 AND score = ?', topScore
        ).toArray();

        if (tied.length === 1) {
          this.ctx.storage.sql.exec(
            'UPDATE room SET phase = ?, q_deadline = NULL WHERE id = 1',
            'finished'
          );
          this.#touchExpiry();
          this.#bumpVersion();
          return;
        }

        if (next < total) {
          this.ctx.storage.sql.exec(
            'UPDATE room SET phase = ?, q_index = ?, q_deadline = ? WHERE id = 1',
            'question',
            next,
            this.#now() + TIE_BREAKER_TIMER_SECONDS * 1000
          );
          const placeholders = tied.map(() => '?').join(',');
          this.ctx.storage.sql.exec(
            `UPDATE players SET locked = CASE WHEN id IN (${placeholders}) THEN 0 ELSE 1 END WHERE left = 0`,
            ...tied.map(p => p.id)
          );
          this.#touchExpiry();
          this.#bumpVersion();
          await this.ctx.storage.setAlarm(this.#now() + TIE_BREAKER_TIMER_SECONDS * 1000);
          return;
        }

        const stillTied = await this.#checkTieBreaker(room);
        if (stillTied) return;

        this.ctx.storage.sql.exec(
          'UPDATE room SET phase = ?, q_deadline = NULL WHERE id = 1',
          'finished'
        );
        this.#touchExpiry();
        this.#bumpVersion();
        return;
      }

      // ── NORMAL GAME ALARM ──
      if (next >= total) {
        const isTie = await this.#checkTieBreaker(room);
        if (isTie) return;

        this.ctx.storage.sql.exec(
          'UPDATE room SET phase = ?, q_deadline = NULL WHERE id = 1',
          'finished'
        );
        this.#touchExpiry();
        this.#bumpVersion();
        return;
      }

      this.ctx.storage.sql.exec(
        'UPDATE room SET phase = ?, q_index = ?, q_deadline = ? WHERE id = 1',
        'question',
        next,
        this.#now() + SPORCLE_TIMER_SECONDS * 1000
      );
      this.ctx.storage.sql.exec('UPDATE players SET locked = 0 WHERE left = 0');
      this.#touchExpiry();
      this.#bumpVersion();
      await this.ctx.storage.setAlarm(this.#now() + SPORCLE_TIMER_SECONDS * 1000);
      return;
    }

    if (room.phase === 'finished') {
      this.ctx.storage.sql.exec(
        'UPDATE room SET expires_at = ? WHERE id = 1',
        this.#now() + ROOM_EXPIRY_MS
      );
      await this.ctx.storage.setAlarm(this.#now() + ROOM_EXPIRY_MS);
      return;
    }

    if (room.expires_at) {
      await this.ctx.storage.setAlarm(room.expires_at);
    }
  }

  async #endQuestion() {
    const room = this.#getRoom();
    const sql = this.ctx.storage.sql;
    const isTieBreaker = room.tie_breaker === 1;

    if (room.mode === 'speed' || isTieBreaker) {
      const first = sql.exec(
        `SELECT player_id FROM answers
          WHERE q_idx = ? AND correct = 1
          ORDER BY answered_at ASC LIMIT 1`,
        room.q_index
      ).toArray();
      if (first[0]) {
        sql.exec('UPDATE players SET score = score + 1 WHERE id = ?', first[0].player_id);
      }
    } else {
      sql.exec(
        `UPDATE players SET score = score + 1
          WHERE id IN (
            SELECT player_id FROM answers
             WHERE q_idx = ? AND correct = 1
          )`,
        room.q_index
      );
    }

    sql.exec('UPDATE room SET phase = ?, q_deadline = NULL WHERE id = 1', 'reveal');
    this.#touchExpiry();
    const version = this.#bumpVersion();

    const autoSec = room.auto_advance_seconds;
    if (autoSec > 0) {
      const q = this.#getQuestion(room.q_index);
      const delayMs = q?.type === 'lyrics-track'
        ? AUTO_ADVANCE_MS_LYRICS
        : autoSec * 1000;
      await this.ctx.storage.setAlarm(this.#now() + delayMs);
    }

    return version;
  }

  async debugCurrentQuestion() {
    const room = this.#getRoom();
    if (!room) return { ok: false, error: 'Room not found' };
    if (room.phase !== 'question' && room.phase !== 'reveal') {
      return { ok: false, error: 'No active question' };
    }
    const q = this.#getQuestion(room.q_index);
    return { ok: true, qIndex: room.q_index, phase: room.phase, question: q };
  }

  #getQuestion(idx) {
    const rows = this.ctx.storage.sql
      .exec('SELECT payload FROM questions WHERE idx = ?', idx)
      .toArray();
    return rows[0] ? JSON.parse(rows[0].payload) : null;
  }

  async #chat(player, room, action) {
    const result = chatInsert(
      this.ctx.storage.sql,
      player,
      action.text,
      this.#now()
    );
    if (!result.ok) return result;

    this.#touchExpiry();
    const version = this.#bumpVersion();
    return { ok: true, version };
  }

  /* ── start_again (host only, from finished) ───────────── */
  async #startAgain(player, room, action) {
    if (room.phase !== 'finished') {
      return { ok: false, error: 'Can only start again from finished' };
    }
    if (!player.is_host) {
      return { ok: false, error: 'Host only' };
    }

    const sql = this.ctx.storage.sql;

    // 1. Merge new config
    const existingConfig = JSON.parse(room.config ?? '{}');
    const newConfig = action.config || {};

    if (newConfig.count) existingConfig.count = newConfig.count;
    if (newConfig.genres !== undefined)  existingConfig.genres = newConfig.genres;
    if (newConfig.artists !== undefined) existingConfig.artists = newConfig.artists;
    if (newConfig.years !== undefined)   existingConfig.years = newConfig.years;

    const mode = newConfig.mode === 'collect' ? 'collect' : 'speed';

    sql.exec(
      'UPDATE room SET config = ?, mode = ?, last_error = NULL WHERE id = 1',
      JSON.stringify(existingConfig),
      mode
    );

    // 2. Reset players (scores, ready, locked)
    sql.exec('UPDATE players SET score = 0, ready = 0, locked = 0 WHERE left = 0');

    // 3. Clear previous questions and answers
    sql.exec('DELETE FROM questions');
    sql.exec('DELETE FROM answers');

    // 4. Reset room state to 'loading'
    sql.exec(
      `UPDATE room
          SET phase = 'loading',
              started_at = ?,
              q_index = 0,
              q_deadline = NULL,
              tie_breaker = 0,
              last_error = NULL,
              lobby_wait_started_at = NULL,
              lobby_wait_reason = NULL,
              version = version + 1
        WHERE id = 1`,
      this.#now()
    );

    this.#touchExpiry();

    // 5. Kick off the fetch in the background
    this.ctx.waitUntil(this.#loadQuestionsAndCountdown());

    return { ok: true, version: this.#getRoom().version };
  }
}

/* ─────────────────────────────────────────────────────────
   Correctness check
   ───────────────────────────────────────────────────────── */

const POSITION_LABELS = {
  start: 'البداية',
  middle: 'المنتصف',
  end: 'النهاية',
  custom: 'مقطع مخصص',
};

function canonicalPosition(raw) {
  const s = String(raw ?? '').trim();
  for (const [en, ar] of Object.entries(POSITION_LABELS)) {
    if (s === en || s === ar) return en;
  }
  return s;
}

function normalize(s) {
  return String(s ?? '').trim().toLowerCase();
}

function isCorrect(question, typed) {
  if (typed == null || typed === '') return false;
  if (question.type === 'name-position') {
    return canonicalPosition(typed) === canonicalPosition(question.correctValue);
  }
  return normalize(typed) === normalize(question.correctValue);
}