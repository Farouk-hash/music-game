// game/src/components/domain/Multiplayer/MultiplayerModal.jsx
import { useState } from 'react';
import { Modal } from '../../Modal/Modal.jsx';
import { Button } from '../../ui/Button.jsx';
import { SharedGameSettings } from '../Setup/Modals/SharedGameSettings.jsx';

const LEVELS = [
  { key: 1, label: 'Level 1', hint: 'One question per clip' },
  { key: 2, label: 'Level 2', hint: 'Multiple questions per clip' },
];

const PLAYER_COUNTS = [2, 3, 4, 5];
const ROUND_CHOICES = [3, 5, 10, 20];

function defaultNames(n) {
  return Array.from({ length: n }, (_, i) => `Player ${i + 1}`);
}

export function MultiplayerModal({
  open,
  onClose,
  onStart,
  starting,
  disabledTypes = new Set(),
  reversedClipsCount = 0,
}) {
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState(() => defaultNames(2));
  const [level, setLevel] = useState(1);
  const [roundsPerPlayer, setRoundsPerPlayer] = useState(5);

  function changePlayerCount(n) {
    setPlayerCount(n);
    setNames((prev) => {
      const next = [...prev];
      while (next.length < n) next.push(`Player ${next.length + 1}`);
      return next.slice(0, n);
    });
  }

  function setName(i, value) {
    setNames((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  }

  const canStart =
    !starting &&
    names.length === playerCount &&
    names.every(n => n.trim().length > 0);

  function handleStart() {
    if (!canStart) return;
    onStart({
      playerCount,
      names: names.map(n => n.trim()),
      level,
      roundsPerPlayer,
    });
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="rounded-lg border border-border bg-surface p-6 space-y-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
              Multiplayer
            </p>
            <h2 className="text-xl font-bold text-ink mt-1">
              Pass the device between turns
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-subtle hover:text-ink text-sm"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-ink-muted">
          Everyone plays on this device, taking turns. Rounds alternate
          between players.
        </p>

        {/* Player count */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Players
          </p>
          <div className="flex gap-2">
            {PLAYER_COUNTS.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => changePlayerCount(n)}
                aria-pressed={playerCount === n}
                className={[
                  'flex-1 h-12 rounded-md border text-base font-semibold transition-colors',
                  playerCount === n
                    ? 'bg-accent text-bg border-accent'
                    : 'bg-surface-2 text-ink-muted border-border hover:border-accent-2 hover:text-ink',
                ].join(' ')}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Names */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Names
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {names.map((name, i) => (
              <input
                key={i}
                type="text"
                value={name}
                onChange={(e) => setName(i, e.target.value)}
                dir="auto"
                maxLength={20}
                placeholder={`Player ${i + 1}`}
                className="h-10 px-3 rounded-md bg-surface-2 text-ink border border-border focus:outline-none focus:ring-2 focus:ring-accent"
              />
            ))}
          </div>
        </div>

        {/* Level */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Level
          </p>
          <div className="grid grid-cols-2 gap-2">
            {LEVELS.map(l => (
              <button
                key={l.key}
                type="button"
                onClick={() => setLevel(l.key)}
                aria-pressed={level === l.key}
                className={[
                  'rounded-md border px-3 py-3 text-left transition-colors',
                  level === l.key
                    ? 'bg-accent-soft border-accent text-ink'
                    : 'bg-surface-2 border-border text-ink-muted hover:border-accent-2 hover:text-ink',
                ].join(' ')}
              >
                <p className="text-sm font-semibold">{l.label}</p>
                <p className="text-xs mt-0.5 opacity-80">{l.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Rounds per player */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Rounds per player
          </p>
          <div className="flex gap-2">
            {ROUND_CHOICES.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setRoundsPerPlayer(n)}
                aria-pressed={roundsPerPlayer === n}
                className={[
                  'flex-1 h-10 rounded-md border text-sm font-medium transition-colors',
                  roundsPerPlayer === n
                    ? 'bg-accent text-bg border-accent'
                    : 'bg-surface-2 text-ink-muted border-border hover:border-accent-2 hover:text-ink',
                ].join(' ')}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-subtle">
            {playerCount * roundsPerPlayer} rounds total.
          </p>
        </div>

        {/* Shared game settings (rounds hidden — multiplayer has its own) */}
        <SharedGameSettings disabledTypes={disabledTypes} hideRoundCount  reversedClipsCount={reversedClipsCount}/>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={starting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleStart}
            disabled={!canStart}
            loading={starting}
          >
            {starting ? 'Starting…' : 'Play'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}