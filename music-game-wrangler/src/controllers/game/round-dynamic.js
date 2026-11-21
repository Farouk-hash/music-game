// src/controllers/game/round-dynamic.js
//
// Level-agnostic round fetcher with server-side top-up (clip-locked).
//
// v3 (free-tier): the extra builder call is made AT MOST ONCE and reused for
// every short round. Previously each short round triggered its own builder
// call (up to maxTopUps), and since a merge only happens when the extra
// round describes the SAME clip, most of those calls produced nothing.
//
//   - Only questions from extra rounds with the same clip identity are merged.
//   - Dedupe key is (type | prompt | correctValue).

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

// Identity of the clip a round is built on.
function clipKeyOf(round) {
  if (!round) return null;
  if (round.slotId != null) return `slot:${round.slotId}`;
  if (round.setId  != null) return `set:${round.setId}`;
  if (round.clip?.r2_key)   return `r2:${round.clip.r2_key}`;
  if (Array.isArray(round.clips) && round.clips.length > 0) {
    const k = round.clips[0]?.r2Key ?? round.clips[0]?.r2_key;
    if (k) return `r2:${k}`;
  }
  return null;
}

function questionKeyOf(q) {
  if (!q) return '';
  return `${q.type ?? ''}|${q.prompt ?? ''}|${q.correctValue ?? ''}`;
}

export async function getRoundDynamic(request, env, ctx) {
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
  const TOP_UP_COUNT = 3;

  async function callBuilder(count) {
    const innerReq = new Request(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, instruments, count }),
    });
    if (level === 3) return await getRoundSet(innerReq, env, ctx);
    if (level === 2) return await getRoundMulti(innerReq, env, ctx);
    return await getRound(innerReq, env, ctx);
  }

  let response;
  try {
    response = await callBuilder(requestedCount);
  } catch (err) {
    return error(`Round build failed (L${level}, ${instruments}): ${err.message}`, 500);
  }

  if (response.status !== 200) return response;

  const resBody = await response.json();
  let rounds = normalizeRounds(resBody);

  // ── Top-up: one extra builder call, reused for every short round ──
  let extraRounds = null;
  let extraFailed = false;

  async function getExtras() {
    if (extraRounds) return extraRounds;
    if (extraFailed) return [];
    try {
      const res = await callBuilder(TOP_UP_COUNT);
      if (res.status !== 200) { extraFailed = true; return []; }
      extraRounds = normalizeRounds(await res.json());
      return extraRounds;
    } catch {
      extraFailed = true;
      return [];
    }
  }

  let topUps = 0;
  for (let i = 0; i < rounds.length && topUps < maxTopUps; i++) {
    const target = rounds[i];
    if (roundQuestionCount(target) >= minQuestions) continue;
    topUps += 1;

    const targetKey = clipKeyOf(target);
    if (!targetKey) continue; // cannot identify the clip: never merge

    const extras = await getExtras();
    if (extras.length === 0) break; // nothing to merge for anyone

    const sameClip = extras.filter(r => clipKeyOf(r) === targetKey);
    if (sameClip.length === 0) continue;

    const targetQuestions = roundQuestions(target);
    const seen = new Set(targetQuestions.map(questionKeyOf));
    const fresh = sameClip.flatMap(roundQuestions).filter(q => !seen.has(questionKeyOf(q)));
    if (fresh.length === 0) continue;

    rounds[i] = { ...target, questions: targetQuestions.concat(fresh) };
  }

  // ── Final cap at minQuestions ──
  rounds = rounds.map(r => ({ ...r, questions: roundQuestions(r).slice(0, minQuestions) }));

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