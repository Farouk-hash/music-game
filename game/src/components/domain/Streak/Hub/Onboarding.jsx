// game/src/components/domain/Streak/Hub/Onboarding.jsx
import { BorderContainer } from '@/components/layout/BorderContainer.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { IconFire, IconGenres, IconDice } from '@/icons';



export function Onboarding({ maxStreaks, onStart, onPickGenre }) {
  return (
    <div className="max-w-2xl mx-auto pb-24 px-1 min-h-screen">
      <div className="space-y-6 pt-8">
        <BorderContainer border="all" className="p-8 text-center space-y-4">
          <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Start a streak
          </p>
          <p className="text-lg font-bold flex items-center justify-center gap-2">
            <IconFire className="w-6 h-6 text-wrong" />
            Daily challenge
          </p>
          <p className="text-sm text-ink-muted">
            Show up every day to grow your streak. Up to {maxStreaks} active streaks.
          </p>
          
          <Button onClick={() => onStart(null)} className="w-full">
            <IconDice className="w-5 h-5 mr-2" /> 
            Start with Default (game picks)
          </Button>
          
          <Button variant="secondary" onClick={onPickGenre} className="w-full">
            <IconGenres className="w-4 h-4 mr-2" />
            Pick a genre
          </Button>
        </BorderContainer>
      </div>
    </div>
  );
}