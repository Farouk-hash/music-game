// game/src/components/domain/Streak/Hub/PowerStatus.jsx
import { BorderContainer } from '@/components/layout/BorderContainer.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { IconBolt, IconCoin, IconVideo } from '@/icons';


export function PowerStatus({ 
  totalPoints, 
  power, 
  maxBonus, 
  canWatchVideo, 
  grantingBonus, 
  onWatchAd 
}) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <p className="text-xs uppercase text-highlight tracking-widest">Streaks</p>
        <p className="text-3xl font-bold flex items-center justify-center gap-2">
          <IconCoin className="w-8 h-8 text-highlight" />
          {totalPoints} pts
        </p>
        <p className="text-xs text-ink-subtle flex items-center justify-center gap-1.5">
          <IconBolt className="w-4 h-4 text-highlight" />
          {power.remaining}/{power.limit} power attempts left today
        </p>
      </div>

      {canWatchVideo && (
        <BorderContainer border="all" className="p-4 space-y-2 bg-accent-soft border-accent">
          <p className="text-sm text-ink text-center font-medium flex items-center justify-center gap-2">
            <IconBolt className="w-4 h-4 text-accent-2" />
            Out of power attempts
          </p>
          <Button
            variant="secondary"
            onClick={onWatchAd}
            disabled={grantingBonus}
            className="w-full"
          >
            <IconVideo className="w-4 h-4 mr-2" />
            {grantingBonus ? 'Granting…' : 'Watch a video for +1 attempt'}
          </Button>
          <p className="text-[10px] text-ink-subtle text-center">
            Bonus limit: {power.bonus} / {maxBonus} today
          </p>
        </BorderContainer>
      )}
    </div>
  );
}