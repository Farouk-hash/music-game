// game/src/components/domain/Multiplayer/TurnBanner.jsx
import { Button } from '../../ui/Button.jsx';
import { BorderContainer } from '../../layout/BorderContainer.jsx';

export function TurnBanner({
  playerName,
  roundNumber,
  totalRounds,
  onStart,
}) {
  return (
    <BorderContainer border="all" className="p-8 max-w-lg mx-auto text-center space-y-6">
      <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
        Round {roundNumber} of {totalRounds}
      </p>

      <div className="space-y-2">
        <p className="text-ink-muted text-sm">It's your turn</p>
        <p className="text-4xl font-extrabold text-ink leading-tight" dir="auto">
          {playerName}
        </p>
      </div>

      <p className="text-sm text-ink-muted">
        Pass the device if needed, then tap Start.
      </p>

      <Button size="lg" onClick={onStart}>Start</Button>
    </BorderContainer>
  );
}