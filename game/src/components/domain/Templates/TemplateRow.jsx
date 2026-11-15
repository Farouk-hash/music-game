// game/src/components/domain/Templates/TemplateRow.jsx
import { useState } from 'react';
import { LevelBadge } from '@/components/domain/Collections/primitives/LevelBadge.jsx';
import { CollectionCover } from '@/components/domain/Collections/primitives/CollectionCover.jsx';
import { IconChevronDown, IconChevronUp, IconPlay } from '@/icons';
import { formatYears } from './templateYears.js';
import {
  getQuestionTypeLabel,
  REVERSED_ANSWER_OPTIONS,
  INSTRUMENT_OPTIONS,
  ANSWER_MODE_OPTIONS,
} from '@/constants';

/* ────────────────────────────────────────────────────────────
   Derived lookup maps
   ──────────────────────────────────────────────────────────── */

const REVERSED_LABELS    = Object.fromEntries(
  REVERSED_ANSWER_OPTIONS.map(o => [o.value, o.label])
);
const INSTRUMENTS_LABELS = Object.fromEntries(
  INSTRUMENT_OPTIONS.map(o => [o.value, o.label])
);
const ANSWER_MODE_LABELS = Object.fromEntries(
  ANSWER_MODE_OPTIONS.map(o => [o.value, o.label])
);

// Local — no shared constant yet
const GAME_MODE_LABELS = { speed: 'Speed', collect: 'Collect' };

/* ────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────── */

function formatQuestionTypes(types) {
  if (!Array.isArray(types) || types.length === 0) return 'All types';
  return types.map(t => getQuestionTypeLabel(t)).join(' · ');
}

function formatArtists(artistsIds, artistNames) {
  if (Array.isArray(artistNames) && artistNames.length > 0) {
    return artistNames.join(' · ');
  }
  if (Array.isArray(artistsIds) && artistsIds.length > 0) {
    return `${artistsIds.length} selected`;
  }
  return 'Any artist';
}

function formatGenres(genresIds, genreNames) {
  if (Array.isArray(genreNames) && genreNames.length > 0) {
    return genreNames.join(' · ');
  }
  if (Array.isArray(genresIds) && genresIds.length > 0) {
    return `${genresIds.length} selected`;
  }
  return 'Any genre';
}

function formatTimer(timer) {
  if (timer == null) return 'No timer';
  const n = Number(timer);
  if (!Number.isFinite(n) || n <= 0) return 'No timer';
  return `${n}s`;
}

/**
 * Synthesize a cover object from the flat `cover_kind` / `cover_r2_key`
 * DB columns when the server doesn't already emit a nested `cover`
 * object.
 */
function templateCoverInput(template) {
  if (template.cover) return template.cover;
  if (template.cover_kind === 'uploaded') {
    return { kind: 'uploaded', url: `/templates/${template.id}/cover` };
  }
  return null;
}

/* ────────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────────── */

export function TemplateRow({ template, onPlay }) {
  const [expanded, setExpanded] = useState(false);

  const {
    name,
    description,
    levels = [],
    rounds = [],
    author,
    isPublic,
    genresIds  = [],
    artistsIds = [],
    years,
    genreNames,
    artistNames,
  } = template;

  const yearLabel = formatYears(years);
  const yearsAny  = !yearLabel;   // true when the template targets any year

  // Header meta line — a compact at-a-glance summary.
  // We always show artists / genres / years, using "Any" for empty.
  const artistSummary = artistsIds.length === 0 ? 'Any artist' : `${artistsIds.length} artist${artistsIds.length === 1 ? '' : 's'}`;
  const genreSummary  = genresIds.length  === 0 ? 'Any genre'  : `${genresIds.length} genre${genresIds.length === 1 ? '' : 's'}`;
  const yearSummary   = yearsAny ? 'Any year' : yearLabel;

  const metaParts = [artistSummary, genreSummary, yearSummary].filter(Boolean);

  // Expandable only when there are rounds or a description to look at.
  // Scope is always present now (with "Any" fallbacks) — we still allow
  // expanding so the user can read the round-by-round settings.
  const hasDetails = rounds.length > 0 || !!description;

  const coverCollection = {
    ...template,
    cover: templateCoverInput(template),
  };

  return (
    <div className="rounded-md border border-border bg-surface overflow-hidden">
      {/* ── Header row ─────────────────────────────── */}
      <button
        type="button"
        onClick={() => hasDetails && setExpanded(e => !e)}
        aria-expanded={expanded}
        className={[
          'w-full text-left p-3 sm:p-4 flex items-start gap-3 transition-colors',
          hasDetails ? 'hover:bg-surface-2 cursor-pointer' : 'cursor-default',
        ].join(' ')}
      >
        <CollectionCover collection={coverCollection} size="md" />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-ink truncate">{name}</p>
              {description && (
                <p className="text-xs text-ink-muted line-clamp-2 mt-0.5">
                  {description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {levels.map(l => (
                <LevelBadge key={l} level={l} />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-subtle mt-1.5">
            {author?.nickname && <span>By {author.nickname}</span>}
            {metaParts.length > 0 && <span>{metaParts.join(' · ')}</span>}
            {rounds.length > 0 && (
              <span>{rounds.length} round{rounds.length === 1 ? '' : 's'}</span>
            )}
            {isPublic != null && <span>{isPublic ? 'Public' : 'Private'}</span>}
          </div>
        </div>

        {hasDetails && (
          <div className="shrink-0 text-ink-subtle mt-1">
            {expanded
              ? <IconChevronUp className="w-5 h-5" />
              : <IconChevronDown className="w-5 h-5" />}
          </div>
        )}
      </button>

      {/* ── Expanded detail panel ───────────────────── */}
      {expanded && hasDetails && (
        <div className="border-t border-border bg-surface-2/40 px-3 sm:px-4 py-4 space-y-4">

          {/* SCOPE — always rendered, uses "Any" fallbacks */}
          <section className="space-y-2">
            <p className="text-[10px] font-semibold text-highlight uppercase tracking-[0.2em]">
              Scope
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="text-ink-subtle uppercase tracking-wide">Artists</dt>
              <dd className={[
                'line-clamp-2',
                artistsIds.length === 0 ? 'text-ink-subtle italic' : 'text-ink',
              ].join(' ')} dir="auto">
                {formatArtists(artistsIds, artistNames)}
              </dd>

              <dt className="text-ink-subtle uppercase tracking-wide">Genres</dt>
              <dd className={[
                'line-clamp-2',
                genresIds.length === 0 ? 'text-ink-subtle italic' : 'text-ink',
              ].join(' ')} dir="auto">
                {formatGenres(genresIds, genreNames)}
              </dd>

              <dt className="text-ink-subtle uppercase tracking-wide">Years</dt>
              <dd className={yearsAny ? 'text-ink-subtle italic' : 'text-ink'}>
                {yearsAny ? 'Any year' : yearLabel}
              </dd>
            </dl>
          </section>

          {/* ROUNDS */}
          {rounds.length > 0 && (
            <section className="space-y-2">
              <p className="text-[10px] font-semibold text-highlight uppercase tracking-[0.2em]">
                Rounds
              </p>
              <ul className="space-y-2">
                {rounds.map((r, i) => (
                  <li
                    key={r.level ?? i}
                    className="rounded-md border border-border bg-surface p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-ink">
                        Level {r.level}
                      </p>
                      <p className="text-xs text-ink-subtle">
                        {r.rounds} clip{r.rounds === 1 ? '' : 's'}
                      </p>
                    </div>

                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                      <dt className="text-ink-subtle">Questions</dt>
                      <dd className="text-ink">
                        {formatQuestionTypes(r.questionTypes)}
                      </dd>

                      <dt className="text-ink-subtle">Answer</dt>
                      <dd className="text-ink">
                        {ANSWER_MODE_LABELS[r.answerMode] ?? r.answerMode}
                        {' · '}
                        {GAME_MODE_LABELS[r.mode] ?? r.mode}
                      </dd>

                      <dt className="text-ink-subtle">Timer</dt>
                      <dd className={
                        r.timer == null
                          ? 'text-ink-subtle italic'
                          : 'text-ink'
                      }>
                        {formatTimer(r.timer)}
                      </dd>

                      <dt className="text-ink-subtle">Answers</dt>
                      <dd className="text-ink">
                        {REVERSED_LABELS[r.reversedAnswers] ?? r.reversedAnswers}
                      </dd>

                      <dt className="text-ink-subtle">Audio</dt>
                      <dd className="text-ink">
                        {r.reversedAudio ? 'Reversed' : 'Forward'}
                      </dd>

                      <dt className="text-ink-subtle">Instruments</dt>
                      <dd className="text-ink">
                        {INSTRUMENTS_LABELS[r.instruments] ?? r.instruments}
                      </dd>
                    </dl>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {onPlay && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => onPlay(template)}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-bg font-semibold hover:bg-accent-2 transition-colors"
              >
                <IconPlay className="w-4 h-4" />
                Play
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}