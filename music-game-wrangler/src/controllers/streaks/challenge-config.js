// music-game-wrangler/src/controllers/streaks/challenge-config.js
//
// SINGLE SOURCE OF TRUTH for all tunable challenge parameters.
// Change a number here, deploy the worker, and both server + client
// pick it up. No client rebuild needed.

/* ── Global caps ────────────────────────────────────────── */

export const CHALLENGE_CONFIG = {
  // Power
  powerAttemptsPerDay: 3,
  maxBonusPower:       3,

  // Streaks
  maxActiveStreaks:    5,
  roundsPerBatch:      1,

  // Points rates
  pointsPerCorrect:      2,
  pointsPerCorrectPower: 1,
  dailyPassBonus:        5,
  powerPassBonus:        2,
  defaultGenreMultiplier: 1.5,

  // ── CHALLENGE SIZING ──
  maxTotalQuestions:      45,   // Hard cap per session
  baseTotalQuestions:     18,   // Day 0 has 18 total questions
  perDayMultiplier:       3,    // Grows by 3 per streak day
  easyModeTotalQuestions: 9,    // Easy mode has 9 questions
  easyModeFailures:       3,    // Fails before easy mode kicks in
  easyModeBatches:        3,    // Easy mode has 3 batches

  // ── BATCH SIZING ──
  earlyBatches: 6,              // Day 0 has 6 batches
  lateBatches:  14,             // Plateau at 14 batches
  minQuestionsPerBatch: 3,      // Aim for exactly 3 questions per track
  maxQuestionsPerBatch: 3,      // Cap at 3 to prevent cross-track merging

  // Round-dynamic limits
  maxRoundsPerRequest: 100,
  maxTopUpAttempts: 2,          // Only try twice to avoid wasted DB queries
  maxQuestionsPerRound: 5,      //

  // Levels 
  levelMultipliers: {
    1: 1.0,
    2: 1.2,
    3: 1.5,
  },
};

/* ── The 12-slot preset deck ────────────────────────────────
   Batches are picked by index from this array. As the player's
   streak grows, they unlock more slots. Add a new level by
   adding a new preset here — no code change needed.
   ──────────────────────────────────────────────────────── */
export const PRESET_DECK = [
  // ── Phase 0: Warmup (Day 0-1) ──
  // Pure audio, no extras
  { key: 'warmup_track', level: 2, types: ['name-track', 'name-album'], instruments: 'none', rendition: 'forward', reversed: 'no', answerMode: 'choose', timer: 20, requires: [] },
  { key: 'warmup_artist', level: 2, types: ['name-artist', 'name-album'], instruments: 'none', rendition: 'forward', reversed: 'no', answerMode: 'choose', timer: 18, requires: [] },
  { key: 'warmup_mixed', level: 2, types: ['name-track', 'name-artist'], instruments: 'none', rendition: 'forward', reversed: 'no', answerMode: 'choose', timer: 18, requires: [] },

  // ── Phase 1: First Instruments (Day 2-3) ──
  // Introducing mixed instruments
  { key: 'inst_mixed_track', level: 2, types: ['name-track', 'name-album'], instruments: 'mixed', rendition: 'forward', reversed: 'no', answerMode: 'choose', timer: 20, requires: ['instruments'] },
  { key: 'inst_mixed_artist', level: 2, types: ['name-artist', 'name-album'], instruments: 'mixed', rendition: 'forward', reversed: 'no', answerMode: 'choose', timer: 18, requires: ['instruments'] },
  { key: 'inst_mixed_featured', level: 2, types: ['name-featured', 'name-position'], instruments: 'mixed', rendition: 'forward', reversed: 'no', answerMode: 'choose', timer: 18, requires: ['instruments'] },

  // ── Phase 2: Heavy Instruments (Day 4-5) ──
  // Full instrumentals
  { key: 'inst_all_track', level: 2, types: ['name-track', 'name-album'], instruments: 'all', rendition: 'forward', reversed: 'no', answerMode: 'choose', timer: 22, requires: ['instruments'] },
  { key: 'inst_all_artist', level: 2, types: ['name-artist', 'name-album'], instruments: 'all', rendition: 'forward', reversed: 'no', answerMode: 'choose', timer: 20, requires: ['instruments'] },
  { key: 'inst_all_mixed', level: 2, types: ['name-track', 'name-artist'], instruments: 'all', rendition: 'forward', reversed: 'no', answerMode: 'choose', timer: 20, requires: ['instruments'] },

  // ── Phase 3: Lyrics (Day 6-7) ──
  // Pure lyrics, no instruments
  { key: 'lyrics_track', level: 2, types: ['lyrics-track'], instruments: 'none', rendition: 'forward', reversed: 'no', answerMode: 'choose', timer: 20, requires: ['lyrics'] },
  { key: 'lyrics_artist', level: 2, types: ['lyrics-artist', 'lyrics-album'], instruments: 'none', rendition: 'forward', reversed: 'no', answerMode: 'choose', timer: 18, requires: ['lyrics'] },
  { key: 'lyrics_mixed', level: 2, types: ['lyrics-artist', 'lyrics-album', 'lyrics-track'], instruments: 'none', rendition: 'forward', reversed: 'no', answerMode: 'choose', timer: 18, requires: ['lyrics'] },

  // ── Phase 4: Lyrics + Instruments (Day 8-9) ──
  // Hybrid lyrics
  { key: 'lyrics_inst_track', level: 2, types: ['lyrics-track'], instruments: 'mixed', rendition: 'forward', reversed: 'no', answerMode: 'choose', timer: 22, requires: ['lyrics', 'instruments'] },
  { key: 'lyrics_inst_artist', level: 2, types: ['lyrics-artist'], instruments: 'mixed', rendition: 'forward', reversed: 'no', answerMode: 'choose', timer: 20, requires: ['lyrics', 'instruments'] },
  { key: 'lyrics_inst_all', level: 2, types: ['lyrics-track', 'lyrics-artist'], instruments: 'all', rendition: 'forward', reversed: 'no', answerMode: 'choose', timer: 22, requires: ['lyrics', 'instruments'] },

  // ── Phase 5: Reverse Audio (Day 10-11) ──
  // Scrambled audio, no instruments
  { key: 'rev_audio_track', level: 2, types: ['name-track', 'name-artist'], instruments: 'none', rendition: 'reverse', reversed: 'no', answerMode: 'choose', timer: 20, requires: [] },
  { key: 'rev_audio_album', level: 2, types: ['name-album', 'name-artist'], instruments: 'none', rendition: 'reverse', reversed: 'no', answerMode: 'choose', timer: 20, requires: [] },
  { key: 'rev_audio_mixed', level: 2, types: ['name-track', 'name-artist', 'name-album'], instruments: 'none', rendition: 'reverse', reversed: 'no', answerMode: 'choose', timer: 18, requires: [] },

  // ── Phase 6: Reverse Audio + Instruments (Day 12-13) ──
  // Scrambled audio + instrumentals
  { key: 'rev_inst_track', level: 2, types: ['name-track', 'name-artist'], instruments: 'mixed', rendition: 'reverse', reversed: 'no', answerMode: 'choose', timer: 22, requires: ['instruments'] },
  { key: 'rev_inst_all', level: 2, types: ['name-track', 'name-album'], instruments: 'all', rendition: 'reverse', reversed: 'no', answerMode: 'choose', timer: 22, requires: ['instruments'] },
  { key: 'rev_inst_artist', level: 2, types: ['name-artist', 'name-album'], instruments: 'all', rendition: 'reverse', reversed: 'no', answerMode: 'choose', timer: 20, requires: ['instruments'] },

  // ── Phase 7: Scrambled Text (Day 14-15) ──
  // Scrambled options, no instruments
  { key: 'rev_text_track', level: 2, types: ['name-track', 'name-artist'], instruments: 'none', rendition: 'forward', reversed: 'all', answerMode: 'choose', timer: 22, requires: [] },
  { key: 'rev_text_album', level: 2, types: ['name-album', 'name-artist'], instruments: 'none', rendition: 'forward', reversed: 'all', answerMode: 'choose', timer: 22, requires: [] },
  { key: 'rev_text_mixed', level: 2, types: ['name-track', 'name-album', 'name-artist'], instruments: 'none', rendition: 'forward', reversed: 'all', answerMode: 'choose', timer: 20, requires: [] },

  // ── Phase 8: L3 Final Boss (Day 16+) ──
  // Everything mixed, Level 3
  { key: 'l3_mix', level: 3, types: [], instruments: 'none', rendition: 'forward', reversed: 'no', answerMode: 'choose', timer: 25, requires: ['lyrics'] },
  { key: 'l3_inst_mixed', level: 3, types: [], instruments: 'mixed', rendition: 'forward', reversed: 'no', answerMode: 'choose', timer: 25, requires: ['lyrics', 'instruments'] },
  { key: 'l3_all', level: 3, types: [], instruments: 'all', rendition: 'reverse', reversed: 'all', answerMode: 'choose', timer: 30, requires: ['lyrics', 'instruments'] },
];