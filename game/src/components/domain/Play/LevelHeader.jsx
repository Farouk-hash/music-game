import { TimerBar } from '@/components/domain/Setup/Timer/Timerbar.jsx';
import { PromptSource } from '@/components/domain/Rounds/PromptSource.jsx';

export function LevelHeader({ session, timer, params }) {
  const isMultiQ = session.currentRound?.questions?.length > 1;

  if (!session.studyMode) {
    // Normal Mode: Timer + Audio + Contextual Hint
    return (
      <div className="flex items-center gap-4">
        {timer}
        <PromptSource round={session.currentRound} />
        <div className="flex-1">
          <p className="text-sm text-ink-muted">
            {isMultiQ 
              ? 'Listen carefully — multiple questions per clip.'
              : 'Answer the question below.'}
          </p>
        </div>
      </div>
    );
  }

  // Study Mode: Timer + Memorization Hint Only
  return (
    <div className="flex items-center gap-4 mb-4">
      {timer}
      <div className="flex-1">
        <p className="text-sm text-ink-muted">
          Memorize this clip — you will be tested on it later.
        </p>
      </div>
    </div>
  );
}