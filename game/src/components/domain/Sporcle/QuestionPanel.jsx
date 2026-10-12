// game/src/components/domain/Sporcle/QuestionPanel.jsx
import { AudioPlayer } from '../Rounds/AudioPlayer.jsx';
import { OptionsGrid } from '../Rounds/OptionsGrid.jsx';

const POSITION_LABELS = {
  start: 'البداية',
  middle: 'المنتصف',
  end: 'النهاية',
  custom: 'مقطع مخصص',
};

/**
 * The question card for Sporcle — options mode only.
 *
 * Handles both audio and lyrics questions:
 *
 *   Audio questions  — have `question.clip.serveUrl`
 *   Lyrics questions — have `question.revealClip.serveUrl` (the song
 *                      the lyric came from, played at reveal).
 *                      `question.clip` is null.
 *
 * Props:
 *   question   — full question payload
 *   reveal     — `state.reveal` (has `answers`; only set in reveal phase)
 *   phase      — 'question' | 'reveal'
 *   myId       — local player ID
 *   myPick     — my submitted pick (or null)
 *   onPick     — (value) => void
 *   reversal   — { reversed, style }
 *   rendition  — 'forward' | 'reverse' (controls reveal-audio visibility)
 */
export function QuestionPanel({
  question,
  reveal,
  phase,
  myId,
  myPick,
  onPick,
  reversal = { reversed: false, style: null },
  rendition = 'forward',
}) {
  if (!question) return null;

  const type = question.type;
  const eyebrow = type ? type.replace('name-', '').replace('lyrics-', '') : '';

  const options = question.options ?? [];
  const correctValue = reveal?.correctValue ?? null;

  const labelFor = (opt) =>
    type === 'name-position'
      ? POSITION_LABELS[opt.value] ?? opt.label
      : opt.label;

  const isRevealed = phase === 'reveal';
  const hasAnswered = myPick != null;

  // Reveal audio:
  //   - Audio questions with `rendition === 'reverse'`: play the clip
  //     forwards (the question played it backwards).
  //   - Lyrics questions: play the song the lyric came from. The URL
  //     lives in `revealClip` because lyrics rounds don't have a
  //     top-level `clip`.
  const revealClipUrl =
    question.clip?.serveUrl ?? question.revealClip?.serveUrl ?? null;
  const showRevealAudio =
    !!revealClipUrl && (type === 'lyrics-track' || rendition === 'reverse');

  return (
    <div className="space-y-6">
      {/* Eyebrow */}
      {eyebrow && (
        <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
          {eyebrow}
        </p>
      )}

      {/* Prompt */}
      <p className="text-xl font-bold text-ink leading-snug">
        {question.prompt}
      </p>

      {/* Options */}
      {options.length > 0 && (
        <OptionsGrid
          options={options}
          correctValue={correctValue ?? undefined}
          picked={myPick}
          revealed={isRevealed}
          onPick={isRevealed || hasAnswered ? () => {} : onPick}
          labelFor={labelFor}
          reversal={reversal}
        />
      )}

      {/* Waiting hint */}
      {!isRevealed && hasAnswered && (
        <div className="rounded-md border border-accent-2 bg-accent-soft p-3 text-sm text-ink-muted">
          Locked in. Waiting for other players or the timer…
        </div>
      )}

      {/* Reveal block */}
      {isRevealed && reveal && (
        <RevealBlock
          reveal={reveal}
          myId={myId}
          labelFor={labelFor}
          options={options}
        />
      )}

      {/* Reveal audio */}
      {isRevealed && showRevealAudio && (
        <div className="rounded-md border border-border bg-surface-2 p-3 space-y-2">
          <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Track
          </p>
          <AudioPlayer src={revealClipUrl} autoPlay={false} />
        </div>
      )}
    </div>
  );
}

function RevealBlock({ reveal, myId, labelFor, options }) {
  const correctOpt = options.find((o) => o.value === reveal.correctValue);
  const correctLabel = correctOpt ? labelFor(correctOpt) : reveal.correctValue;

  return (
    <>
      {/* Correct answer banner */}
      <div className="rounded-md border border-correct bg-correct-soft p-3 space-y-1">
        <p className="text-xs font-semibold text-correct uppercase tracking-[0.2em]">
          Correct answer
        </p>
        <p className="text-base font-semibold text-ink" dir="auto">
          {correctLabel}
        </p>
      </div>

      {/* Per-player picks */}
      <ul className="space-y-2">
        {reveal.answers.map((a) => {
          const isMe = a.playerId === myId;
          const pickedOpt = options.find((o) => o.value === a.typed);
          const pickedLabel = pickedOpt ? labelFor(pickedOpt) : (a.typed || '—');
          return (
            <li
              key={a.playerId}
              className={[
                'flex items-center gap-3 rounded-md border px-4 py-3',
                a.correct
                  ? 'border-correct bg-correct-soft'
                  : 'border-wrong bg-wrong-soft',
              ].join(' ')}
            >
              <span className="flex-1 truncate text-ink font-medium" dir="auto">
                {isMe && (
                  <span className="text-[10px] uppercase tracking-wider text-accent mr-2">
                    you
                  </span>
                )}
                {pickedLabel}
              </span>
              <span
                className={[
                  'flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold shrink-0',
                  a.correct
                    ? 'bg-correct-soft text-correct'
                    : 'bg-wrong-soft text-wrong',
                ].join(' ')}
              >
                {a.correct ? '✓' : '✕'}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}