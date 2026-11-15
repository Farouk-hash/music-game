// music-game-wrangler/src/controllers/game/round-dynamic.js
//
// Level-agnostic round fetcher with server-side top-up.
//
// v2 — top-up is now CLIP-LOCKED:
//   - Only merges questions from extra rounds that describe the SAME clip
//     (same slotId / same clip.r2_key) as the short round being topped up.
//   - Dedupe key is (type | prompt | correctValue), not just prompt — so a
//     foreign album question can't slip through just because the target
//     round never had an album question.
//   - When a round cannot be topped up (no same-clip extras exist), it's
//     marked __toppedOut and the loop moves to the NEXT short round instead
//     of abandoning the whole top-up pass.

import { json, error } from '../../lib/response.js';
import { clamp } from '../../utilities/clamp.js';
import { getRound } from './rounds.js';
import { getRoundMulti } from './round-mutli.js';
import { getRoundSet } from './round-sets.js';
import { CHALLENGE_CONFIG } from '../streaks/challenge-config.js';

function parseLevel(raw) {
  if (raw === '1' || raw === 'one') return 1;
  if (raw === '2' || raw === 'two') return 2;
  if (raw === '3' || raw === 'three') return 3;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 3 ? n : 1;
}

function parseInstruments(raw) {
  if (raw === 'all')   return 'all';
  if (raw === 'mixed') return 'mixed';
  return 'none';
}

function normalizeRounds(body) {
  if (Array.isArray(body.rounds)) return body.rounds;
  if (Array.isArray(body.sets))   return body.sets;
  if (body.round)                 return [body.round];
  return [];
}

function roundQuestionCount(round) {
  if (Array.isArray(round.questions)) return round.questions.length;
  if (round.question) return 1;
  return 0;
}

function roundQuestions(round) {
  if (Array.isArray(round.questions)) return round.questions;
  if (round.question) return [round.question];
  return [];
}

// Identity of the clip a round is built on. Two rounds describe the same
// clip iff these match. We accept either key because L1/L2 rounds expose
// `slotId` and `clip.r2_key`, while L3 sets expose `setId` + `clips[]`.
function clipKeyOf(round) {
  if (!round) return null;
  if (round.slotId != null) return `slot:${round.slotId}`;
  if (round.setId  != null) return `set:${round.setId}`;
  if (round.clip?.r2_key)   return `r2:${round.clip.r2_key}`;
  if (Array.isArray(round.clips) && round.clips.length > 0) {
    // L3: use the first clip's r2_key as the set's identity
    const k = round.clips[0]?.r2Key ?? round.clips[0]?.r2_key;
    if (k) return `r2:${k}`;
  }
  return null;
}

// Identity of a single question. Used for dedupe during merge.
function questionKeyOf(q) {
  if (!q) return '';
  const type  = q.type ?? '';
  const prompt = q.prompt ?? '';
  const correct = q.correctValue ?? '';
  return `${type}|${prompt}|${correct}`;
}

export async function getRoundDynamic(request, env) {
  const body = await request.json().catch(() => ({}));

  const level = parseLevel(body.level);
  const instruments = parseInstruments(body.instruments);

  const requestedCount = clamp(
    Number(body.count ?? 1),
    1,
    CHALLENGE_CONFIG.maxRoundsPerRequest
  );
  const minQuestions = clamp(
    Number(body.minQuestions ?? 1),
    1,
    CHALLENGE_CONFIG.maxQuestionsPerRound
  );
  const maxTopUps = CHALLENGE_CONFIG.maxTopUpAttempts;

  // Fetch 3 rounds at a time when topping up
  const TOP_UP_COUNT = 3;

  async function callBuilder(extraBody = {}) {
    const innerReq = new Request(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        instruments,
        count: extraBody.count ?? requestedCount,
      }),
    });

    if (level === 3) return await getRoundSet(innerReq, env);
    if (level === 2) return await getRoundMulti(innerReq, env);
    return await getRound(innerReq, env);
  }

  let response;
  try {
    response = await callBuilder({ count: requestedCount });
  } catch (err) {
    return error(`Round build failed (L${level}, ${instruments}): ${err.message}`, 500);
  }

  if (response.status !== 200) return response;

  const resBody = await response.json();
  let rounds = normalizeRounds(resBody);

  // ── Server-side top-up loop (clip-locked) ─────────────
  let topUpAttempts = 0;
  while (topUpAttempts < maxTopUps) {
    // Find the next short round that we haven't already given up on.
    const shortIndex = rounds.findIndex(
      r => !r.__toppedOut && roundQuestionCount(r) < minQuestions
    );
    if (shortIndex === -1) break;
    topUpAttempts += 1;

    try {
      const extraResponse = await callBuilder({ count: TOP_UP_COUNT });
      if (extraResponse.status !== 200) {
        rounds[shortIndex] = { ...rounds[shortIndex], __toppedOut: true };
        continue;
      }

      const extraBody = await extraResponse.json();
      const extraRounds = normalizeRounds(extraBody);
      if (extraRounds.length === 0) {
        rounds[shortIndex] = { ...rounds[shortIndex], __toppedOut: true };
        continue;
      }

      const target = rounds[shortIndex];
      const targetKey = clipKeyOf(target);
      if (!targetKey) {
        // Cannot identify the target clip — never merge, ever.
        rounds[shortIndex] = { ...target, __toppedOut: true };
        continue;
      }

      // ── FIX 1: clip-lock the extras ───────────────────
      const sameClipExtras = extraRounds.filter(
        r => clipKeyOf(r) === targetKey
      );
      if (sameClipExtras.length === 0) {
        // No extra rounds about this exact clip exist. The builder already
        // extracted everything it could. Give up on this round, try next.
        rounds[shortIndex] = { ...target, __toppedOut: true };
        continue;
      }

      const targetQuestions = roundQuestions(target);

      // ── FIX 2: dedupe by (type|prompt|correctValue) ───
      const seen = new Set(targetQuestions.map(questionKeyOf));

      const allExtraQuestions = sameClipExtras.flatMap(roundQuestions);
      const fresh = allExtraQuestions.filter(
        q => !seen.has(questionKeyOf(q))
      );

      if (fresh.length === 0) {
        // Same clip, but no new questions — mark topped out, try next round.
        rounds[shortIndex] = { ...target, __toppedOut: true };
        continue;
      }

      // Merge fresh questions into the short round.
      rounds[shortIndex] = {
        ...target,
        questions: targetQuestions.concat(fresh),
      };
    } catch {
      // Network/parse failure mid-top-up: stop, don't poison the response.
      break;
    }
  }

  // ── Final cap at minQuestions, strip internal markers ──
  rounds = rounds.map(r => {
    const qs = roundQuestions(r).slice(0, minQuestions);
    const { __toppedOut, ...clean } = r;
    return { ...clean, questions: qs };
  });

  return json({
    rounds,
    meta: {
      ...(resBody.meta ?? {}),
      level,
      instruments,
      minQuestions,
      count: rounds.length,
      questionsPerRound: rounds.map(roundQuestionCount),
      generatedAt: new Date().toISOString(),
    },
  });
}