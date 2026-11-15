import { BorderContainer } from '@/components/layout/BorderContainer';
import { Button } from '@/components/ui/Button';
import { IconBolt, IconVideo } from '@/icons';


export function PowerCard({
  power,
  maxBonus,
  isGranting,
  onPlayPower,
  onWatchAd,
}) {
  const canPlayPower = power.remaining > 0;
  const canWatchVideo = !canPlayPower && power.bonus < maxBonus;

  return (
    <BorderContainer border="all" className="p-6 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
          Power play
        </p>
        <IconBolt className="w-5 h-5 text-highlight" /> 
      </div>

      <p className="text-sm text-ink-muted">
        {power.remaining} / {power.limit} attempts left today
        {power.bonus > 0 && (
          <span className="text-xs text-ink-subtle ml-1">({power.bonus} bonus)</span>
        )}
      </p>

      {canPlayPower && (
        <Button onClick={onPlayPower} className="w-full">
          <IconBolt className="w-4 h-4 mr-2" />
          Play power ({power.remaining} left)
        </Button>
      )}

      {canWatchVideo && (
        <>
          <Button
            variant="secondary"
            onClick={onWatchAd}
            disabled={isGranting}
            className="w-full"
          >
            <IconVideo className="w-4 h-4 mr-2" /> 
            {isGranting ? 'Granting…' : 'Watch a video for +1 attempt'}
          </Button>
          <p className="text-[10px] text-ink-subtle text-center">
            Bonus limit: {power.bonus} / {maxBonus} today
          </p>
        </>
      )}

      {!canPlayPower && !canWatchVideo && (
        <p className="text-xs text-ink-subtle text-center pt-2">
          Come back tomorrow for more power attempts.
        </p>
      )}
    </BorderContainer>
  );
}