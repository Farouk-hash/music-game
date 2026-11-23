import { PromptSource } from '@/components/domain/Rounds/PromptSource.jsx';
import { StudyBanner } from '../Memory/StudyBanner.jsx';
import { OptionsGrid } from '../Rounds/OptionsGrid.jsx';
import { Reveal } from '@/components/ui/Reveal.jsx';
import { ALL_TYPES, POSITION_LABELS } from '@/constants';

export function StudyContent({ session, q, reversal, labelFor }) {
  return (
    <div className="space-y-4">
      <StudyBanner onSkip={session.next} />
      
      {/* Audio/Lyrics Source */}
      <PromptSource round={session.currentRound} />
      
      {/* Instrumental Badge */}
      {session.currentRound?.source === 'instrumental' && (
        <Reveal key={`study-badge-${q.type}-${q.prompt}`} direction="down" delay={0}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-2 bg-surface-2 px-2.5 py-0.5 text-[10px] font-semibold text-accent-2 uppercase tracking-[0.15em]">
            <span aria-hidden>🎼</span> Instrumental
          </span>
        </Reveal>
      )}
      
      {/* Eyebrow Label */}
      {q.type && (
        <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
          {q.type.replace('name-', '').replace('lyrics-', '')}
        </p>
      )}
      
      {/* Prompt Text */}
      <p className="text-xl font-bold text-ink leading-snug">{q.prompt}</p>
      
      {/* Type-Specific Hint */}
      <p className="text-xs text-ink-subtle text-center -mt-2">
        {ALL_TYPES.find(t => t.value === q.type)?.hint ?? 'Study the options below carefully'}
      </p>
      
      {/* Options Grid (Non-interactive during study) */}
      <OptionsGrid
        options={q.options}
        correctValue={q.correctValue}
        picked={null}
        revealed={false}
        onPick={() => {}}
        labelFor={labelFor}
        reversal={q.type === 'lyrics-track' ? { reversed: false, style: null } : reversal}
        hiddenValue={null}
      />
    </div>
  );
}