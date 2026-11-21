// game/src/components/domain/Sporcle/QuestionPanel.jsx
import { POSITION_LABELS } from '@/constants/position_labels.js';
import { AudioPlayer } from '../Rounds/AudioPlayer.jsx';
import { QuestionCard } from '../Rounds/QuestionCard.jsx';

/**
 * The Sporcle question card. Reuses <QuestionCard> for the prompt +
 * options + reveal-audio, and layers Sporcle-specific pieces on top:
 *   - locked-in hint while waiting for other players / timer
 *   - per-player reveal block (correct answer banner + picks list)
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
  console.log('[QP] question.source =', question?.source, 'question.type =', question?.type);

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

  // Reveal audio: same logic as before — audio questions with reverse
  // rendition play forwards on reveal; lyrics questions play the source song.
  const revealClipUrl =
    question.clip?.serveUrl ?? question.revealClip?.serveUrl ?? null;
  const showRevealAudio =
    !!revealClipUrl && (type === 'lyrics-track' || rendition === 'reverse');

  return (
    <div className="space-y-6">
      <QuestionCard
        eyebrow={eyebrow}
        prompt={question.prompt}
        options={options}
        correctValue={correctValue ?? undefined}
        picked={myPick}
        revealed={isRevealed}
        onPick={onPick}
        labelFor={labelFor}
        source={question.source ?? null} 
        answerMode="choose"
        questionType={type}
        reversal={reversal}
        showNextButton={false}
        disabled={!isRevealed && hasAnswered}
        revealExtra={
          isRevealed && showRevealAudio
            ? <AudioPlayer src={revealClipUrl} autoPlay={false} />
            : null
        }
      />

      {!isRevealed && hasAnswered && (
        <div className="rounded-md border border-accent-2 bg-accent-soft p-3 text-sm text-ink-muted">
          Locked in. Waiting for other players or the timer…
        </div>
      )}

      {isRevealed && reveal && (
        <RevealBlock
          reveal={reveal}
          myId={myId}
          labelFor={labelFor}
          options={options}
        />
      )}
    </div>
  );
}

function RevealBlock({ reveal, myId, labelFor, options }) {
  const correctOpt = options.find((o) => o.value === reveal.correctValue);
  const correctLabel = correctOpt ? labelFor(correctOpt) : reveal.correctValue;

  return (
    <>
      <div className="rounded-md border border-correct bg-correct-soft p-3 space-y-1">
        <p className="text-xs font-semibold text-correct uppercase tracking-[0.2em]">
          Correct answer
        </p>
        <p className="text-base font-semibold text-ink" dir="auto">
          {correctLabel}
        </p>
      </div>

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