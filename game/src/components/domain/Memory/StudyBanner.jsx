import { Reveal } from '@/components/ui/Reveal.jsx';
import { Button } from '@/components/ui/Button.jsx';

export function StudyBanner({ onSkip }) {
  return (
    <Reveal direction="up" delay={0}>
      <div className="rounded-md border border-accent bg-accent-soft p-3 space-y-2">
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-accent flex items-center justify-center gap-2">
            <span>🧠</span> Memorize This Answer
          </p>
          <p className="text-xs text-ink-muted">
            Study the options below. Click the button when you're ready to continue.
          </p>
        </div>
        <div className="flex justify-end">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={onSkip}
            className="text-xs px-3 py-1.5 h-auto"
          >
            I've Memorized It →
          </Button>
        </div>
      </div>
    </Reveal>
  );
}